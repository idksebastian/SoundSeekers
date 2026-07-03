import { useState, useRef, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../api/auth'
import { updateProfile, getFollowStats } from '../api/profile'
import { getMySongs, deleteSong } from '../api/songs'
import { getArtistAlbums } from '../api/albums'
import { usePlayer } from '../context/PlayerContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, PieChart, Pie, Legend
} from 'recharts'

const SECTIONS = [
  { id: 'stats',         label: 'Estadísticas',     icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#7c3aed', bg: '#f5f3ff', artist: true },
  { id: 'songs',         label: 'Mis canciones',    icon: 'M12 3v10.55A4 4 0 1014 17V7h4V3h-6z',                                                                                                                                                                                                                                                                                                                                                                                          color: '#10b981', bg: '#f0fdf4', artist: true },
  { id: 'edit',          label: 'Editar perfil',    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',                                                                                                                                                                                                                                                                                                                                                          color: '#3b82f6', bg: '#eff6ff' },
  { id: 'account',       label: 'Cuenta',           icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'notifications', label: 'Notificaciones',   icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',                                                                                                                                                                                                                             color: '#ec4899', bg: '#fdf2f8' },
  { id: 'danger',        label: 'Zona de peligro',  icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',                                                                                                                                                                                                                                                                                        color: '#ef4444', bg: '#fef2f2', danger: true },
]

const NAME_CHANGE_LIMIT = 2
const NAME_CHANGE_DAYS  = 30

// ✅ FIX: contamos reproducciones desde la tabla `streams` (fuente de
// verdad real: una fila por reproducción), NO desde la columna
// songs.streams, que quedó desactualizada / no se incrementa
// correctamente. Mismo problema ya corregido en Home, Player,
// ArtistProfile y Dashboard.
// ✅ FIX: contamos reproducciones desde la tabla `streams` (fuente de
// verdad real: una fila por reproducción), NO desde la columna
// songs.streams, que quedó desactualizada / no se incrementa
// correctamente. Mismo problema ya corregido en Home, Player,
// ArtistProfile y Dashboard.
//
// ✅ FIX 2: usamos la RPC get_stream_counts (agrupa en Postgres) en vez
// de traer todas las filas de `streams` y contarlas aquí — Supabase
// limita cada consulta a 1000 filas por defecto, así que las
// estadísticas de un artista con más de 1000 reproducciones totales se
// quedaban congeladas en exactamente 1000.
async function getStreamCounts(songIds) {
  if (!songIds?.length) return {}
  const { data, error } = await supabase.rpc('get_stream_counts', { song_ids: songIds })
  if (error) { console.error('streams fetch error:', error); return {} }
  const map = {}
  data?.forEach(r => { map[r.song_id] = Number(r.cnt) })
  return map
}

function IOSToggle({ on, onChange, color = '#7c3aed' }) {
  return (
    <div onClick={onChange}
      style={{ width: '44px', height: '26px', borderRadius: '13px', background: on ? color : '#d1d5db', position: 'relative', cursor: 'pointer', transition: 'background 0.25s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: on ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}/>
    </div>
  )
}

function IOSRow({ icon, iconColor = '#7c3aed', iconBg = '#f5f3ff', label, sublabel, right, onClick, border = true }) {
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fff', cursor: onClick ? 'pointer' : 'default', transition: 'background 0.15s', borderBottom: border ? '1px solid #f3f4f6' : 'none' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = '#f9fafb' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.background = '#fff' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="15" height="15" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={icon}/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: '500', color: '#111', margin: 0, lineHeight: 1.3 }}>{label}</p>
        {sublabel && <p style={{ fontSize: '12px', color: '#9ca3af', margin: '1px 0 0', lineHeight: 1.3 }}>{sublabel}</p>}
      </div>
      {right ?? (onClick && (
        <svg width="14" height="14" fill="none" stroke="#c7c7cc" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      ))}
    </div>
  )
}

function IOSGroup({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      {title && <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px 4px' }}>{title}</p>}
      <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {children}
      </div>
    </div>
  )
}

function NotificationSettings({ userId, isArtist }) {
  const STORAGE_KEY = `ss_notif_prefs_${userId}`
  const defaultPrefs = { follow: true, like: true, comment: true, feat_invite: true, presave: true }
  const [prefs, setPrefs] = useState(() => {
    try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } } catch { return defaultPrefs }
  })
  const [saved, setSaved] = useState(false)
  const toggle = (key) => setPrefs(prev => {
    const next = { ...prev, [key]: !prev[key] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    return next
  })

  const items = [
    { key: 'follow',      label: 'Nuevos seguidores',         icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',          color: '#7c3aed', bg: '#f5f3ff' },
    { key: 'like',        label: 'Likes en posts',             icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', color: '#ec4899', bg: '#fdf2f8' },
    { key: 'comment',     label: 'Comentarios',                icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: '#3b82f6', bg: '#eff6ff' },
    ...(isArtist ? [
      { key: 'feat_invite', label: 'Invitaciones a colaborar', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3', color: '#f59e0b', bg: '#fffbeb' },
      { key: 'presave',     label: 'Presaves',                  icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z',                            color: '#10b981', bg: '#f0fdf4' },
    ] : []),
  ]

  return (
    <div>
      <IOSGroup title="Quiero recibir notificaciones de">
        {items.map((item, i) => (
          <IOSRow key={item.key} icon={item.icon} iconColor={item.color} iconBg={item.bg}
            label={item.label} border={i < items.length - 1}
            right={<IOSToggle on={prefs[item.key]} onChange={() => toggle(item.key)} color={item.color} />} />
        ))}
      </IOSGroup>
      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#10b981', fontWeight: '600', marginTop: '-12px', paddingLeft: '4px' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          Guardado automáticamente
        </div>
      )}
    </div>
  )
}

/* ════════ STATS DASHBOARD ════════ */
function StatsDashboard({ stats, songStats }) {
  const COLORS = ['#7c3aed', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#6366f1']

  const barData = songStats.map(s => ({
    name: s.title.length > 12 ? s.title.slice(0, 12) + '…' : s.title,
    rep: s.streams ?? 0,
  }))

  const pieData = [
    { name: 'Singles', value: Math.max(stats.totalSongs - stats.totalAlbums * 2, 0) },
    { name: 'En álbumes', value: stats.totalAlbums * 2 },
  ].filter(d => d.value > 0)

  const engagementScore = stats.followers > 0
    ? Math.min(100, Math.round((stats.totalStreams / stats.followers) * 10))
    : 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '12px' }}>
        <p style={{ margin: '0 0 2px', fontWeight: '700', color: '#111' }}>{label}</p>
        <p style={{ margin: 0, color: '#7c3aed', fontWeight: '600' }}>{payload[0].value.toLocaleString()} rep.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '20px', padding: '20px', marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
        <div style={{ position: 'absolute', bottom: '-30px', right: '40px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}/>
        <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Total de reproducciones</p>
        <p style={{ fontSize: '42px', fontWeight: '800', color: '#fff', margin: '0 0 4px', lineHeight: 1, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.02em' }}>
          {stats.totalStreams.toLocaleString()}
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>en {stats.totalSongs} canción{stats.totalSongs !== 1 ? 'es' : ''}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {[
          { label: 'Seguidores',   value: stats.followers,   color: '#ec4899', bg: '#fdf2f8',  icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
          { label: 'Siguiendo',    value: stats.following,   color: '#3b82f6', bg: '#eff6ff',  icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { label: 'Álbumes / EPs', value: stats.totalAlbums, color: '#f59e0b', bg: '#fffbeb', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
          { label: 'Presaves',      value: stats.presaves,    color: '#6366f1', bg: '#eef2ff',  icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={card.icon}/></svg>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#111', margin: '0 0 1px', lineHeight: 1 }}>{card.value.toLocaleString()}</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, fontWeight: '500' }}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#111', margin: '0 0 2px' }}>Score de engagement</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Reproducciones por seguidor</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '28px', fontWeight: '800', color: engagementScore > 60 ? '#10b981' : engagementScore > 30 ? '#f59e0b' : '#7c3aed', margin: 0, lineHeight: 1 }}>{engagementScore}</p>
            <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>/100</p>
          </div>
        </div>
        <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${engagementScore}%`,
            borderRadius: '4px',
            background: engagementScore > 60
              ? 'linear-gradient(to right, #10b981, #34d399)'
              : engagementScore > 30
              ? 'linear-gradient(to right, #f59e0b, #fbbf24)'
              : 'linear-gradient(to right, #7c3aed, #a78bfa)',
            transition: 'width 1s ease'
          }}/>
        </div>
        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
  {engagementScore > 60 ? (
    <><svg width="11" height="11" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg> Excelente engagement</>
  ) : engagementScore > 30 ? (
    <><svg width="11" height="11" fill="none" stroke="#f59e0b" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg> Buen progreso</>
  ) : (
    <><svg width="11" height="11" fill="none" stroke="#7c3aed" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Sigue creciendo</>
  )}
</span>
        </p>
      </div>

      {barData.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#111', margin: '0 0 4px' }}>Top canciones</p>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 16px' }}>Reproducciones por canción</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Bar dataKey="rep" radius={[6, 6, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#7c3aed' : i === 1 ? '#a78bfa' : '#ddd6fe'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {pieData.length > 1 && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#111', margin: '0 0 4px' }}>Tu catálogo</p>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 8px' }}>Distribución de canciones</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]}/>)}
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: '11px', color: '#6b7280' }}>{v}</span>}/>
              <Tooltip formatter={(v) => [`${v} canciones`, '']}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {songStats.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#111', margin: 0 }}>Ranking detallado</p>
          </div>
          {songStats.map((song, idx) => {
            const max = songStats[0]?.streams ?? 1
            const pct = Math.max(5, Math.round(((song.streams ?? 0) / max) * 100))
            const medalColors = ['#f59e0b', '#9ca3af', '#cd7c2f']
            return (
              <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: idx < songStats.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <span style={{ width: '20px', textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {idx < 3 ? (
        <svg width="14" height="14" fill={medalColors[idx]} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ) : (
        <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '700' }}>{idx + 1}</span>
      )}
    </span>
                <img src={song.cover_url} alt={song.title} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#111', margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                  <div style={{ height: '4px', background: '#f3f4f6', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: idx === 0 ? 'linear-gradient(to right, #7c3aed, #a78bfa)' : '#e9d5ff', borderRadius: '2px', transition: 'width 0.8s ease' }}/>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '700', flexShrink: 0 }}>{(song.streams ?? 0).toLocaleString()}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════ */
export default function Settings() {
  const { user } = useAuth()
  const { playSong } = usePlayer()
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)

  const [activeSection, setActiveSection] = useState(null)
  const [role, setRole] = useState(null)
  const [loadingRole, setLoadingRole] = useState(true)

  const [name, setName] = useState('')
  const [artistName, setArtistName] = useState('')
  const [description, setDescription] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [socialLinks, setSocialLinks] = useState({ instagram: '', twitter: '', tiktok: '', youtube: '', website: '' })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [songStats, setSongStats] = useState([])

  const [songs, setSongs] = useState([])
  const [songStreamCounts, setSongStreamCounts] = useState({})
  const [loadingSongs, setLoadingSongs] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [songMsg, setSongMsg] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchRole = async () => {
      const { data } = await supabase.from('user_roles').select('*').eq('user_id', user.id).single()
      setRole(data)
      setName(user.user_metadata?.name ?? '')
      setArtistName(data?.artist_name ?? '')
      setDescription(data?.description ?? data?.artist_bio ?? '')
      setAvatarPreview(user.user_metadata?.avatar_url ?? null)
      setSocialLinks({ instagram: data?.instagram ?? '', twitter: data?.twitter ?? '', tiktok: data?.tiktok ?? '', youtube: data?.youtube ?? '', website: data?.website ?? '' })
      setLoadingRole(false)
    }
    fetchRole()
  }, [user])

  useEffect(() => {
    if (activeSection !== 'songs' || !user) return
    const fetch = async () => {
      setLoadingSongs(true)
      try {
        const mySongs = await getMySongs(user.id)
        setSongs(mySongs)
        // ✅ FIX: reproducciones reales desde la tabla `streams`, no la
        // columna songs.streams (desactualizada).
        const counts = await getStreamCounts(mySongs.map(s => s.id))
        setSongStreamCounts(counts)
      } catch {} finally { setLoadingSongs(false) }
    }
    fetch()
  }, [activeSection, user])

  useEffect(() => {
    if (activeSection !== 'stats' || !user) return
    const fetch = async () => {
      setLoadingStats(true)
      try {
        const [songsData, followData, albums] = await Promise.all([getMySongs(user.id), getFollowStats(user.id), getArtistAlbums(user.id)])
        // ✅ FIX: mismo cambio — contar reproducciones reales desde la
        // tabla `streams` en vez de sumar songs.streams (desactualizada).
        // Esto es lo que causaba que "Total de reproducciones", el
        // gráfico de "Top canciones" y el "Ranking detallado" mostraran
        // números distintos a los reales del perfil/Home/Explorar.
        const counts = await getStreamCounts(songsData.map(s => s.id))
        const songsWithRealStreams = songsData.map(s => ({ ...s, streams: counts[s.id] ?? 0 }))
        const totalStreams = songsWithRealStreams.reduce((a, s) => a + s.streams, 0)
        const { data: presavesData } = await supabase.from('presaves').select('id', { count: 'exact' }).in('album_id', albums.map(a => a.id))
        setStats({ totalStreams, totalSongs: songsData.length, totalAlbums: albums.length, followers: followData.followers, following: followData.following, presaves: presavesData?.length ?? 0 })
        setSongStats([...songsWithRealStreams].sort((a, b) => b.streams - a.streams).slice(0, 5))
      } catch {} finally { setLoadingStats(false) }
    }
    fetch()
  }, [activeSection, user])

  // ✅ FIX: sin esto, "Seguidores"/"Siguiendo" (y por lo tanto el score de
  // engagement, que depende de followers) solo se calculaban UNA VEZ al
  // entrar a la pestaña de Estadísticas — si alguien te seguía mientras
  // ya estabas viendo la pestaña, el número quedaba congelado hasta
  // salir y volver a entrar. Mismo patrón de Realtime que ya usa
  // Profile.jsx para su propio contador de seguidores.
  useEffect(() => {
    if (activeSection !== 'stats' || !user) return

    const channel = supabase
      .channel(`follows:settings-stats:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` }, async () => {
        const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id)
        setStats(prev => prev ? { ...prev, followers: count ?? 0 } : prev)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${user.id}` }, async () => {
        const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)
        setStats(prev => prev ? { ...prev, following: count ?? 0 } : prev)
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [activeSection, user])

  const isArtist = role?.role === 'artist'
  const nameChanges = role?.name_changes ?? 0
  const lastNameChange = role?.last_name_change ? new Date(role.last_name_change) : null
  const daysSinceLastChange = lastNameChange ? Math.floor((Date.now() - lastNameChange.getTime()) / (1000 * 60 * 60 * 24)) : NAME_CHANGE_DAYS + 1
  const canChangeName = nameChanges < NAME_CHANGE_LIMIT || daysSinceLastChange >= NAME_CHANGE_DAYS
  const remainingChanges = Math.max(0, NAME_CHANGE_LIMIT - nameChanges)
  const initialName = user?.user_metadata?.name ?? ''
  const initialArtistName = role?.artist_name ?? ''
  const initialDescription = role?.description ?? role?.artist_bio ?? ''

  const hasChanges = useMemo(() => {
    if (avatarFile) return true
    if (name !== initialName || description !== initialDescription) return true
    if (isArtist && artistName !== initialArtistName) return true
    const init = { instagram: role?.instagram ?? '', twitter: role?.twitter ?? '', tiktok: role?.tiktok ?? '', youtube: role?.youtube ?? '', website: role?.website ?? '' }
    return Object.keys(init).some(k => socialLinks[k] !== init[k])
  }, [name, artistName, description, avatarFile, socialLinks, role])

  const handleAvatarChange = (e) => { const f = e.target.files[0]; if (!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('El nombre es obligatorio.')
    if (isArtist && artistName !== initialArtistName && !canChangeName) return setError(`Podrás cambiar tu nombre artístico en ${NAME_CHANGE_DAYS - daysSinceLastChange} días.`)
    setLoading(true); setError(''); setMsg('')
    try {
      await updateProfile({ name, artistName: isArtist ? artistName : undefined, artistNameChanged: isArtist && artistName !== initialArtistName, avatarFile, description, ...socialLinks })
      setRole(prev => ({ ...prev, artist_name: isArtist ? artistName : prev?.artist_name, name_changes: (isArtist && artistName !== initialArtistName) ? (prev?.name_changes ?? 0) + 1 : prev?.name_changes, last_name_change: (isArtist && artistName !== initialArtistName) ? new Date().toISOString() : prev?.last_name_change }))
      setMsg('Perfil actualizado.')
      setAvatarFile(null)
    }
    catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault(); setError(''); setMsg('')
    if (!currentPassword) return setError('Ingresa tu contraseña actual.')
    if (newPassword.length < 6) return setError('Mínimo 6 caracteres.')
    if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden.')
    if (currentPassword === newPassword) return setError('La nueva debe ser diferente.')
    setLoading(true)
    try {
      const { error: e1 } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (e1) return setError('Contraseña actual incorrecta.')
      const { error: e2 } = await supabase.auth.updateUser({ password: newPassword })
      if (e2) return setError(e2.message)
      setMsg('Contraseña actualizada.'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch { setError('Error. Intenta de nuevo.') } finally { setLoading(false) }
  }

  const handleForgotPassword = async () => {
    setResetLoading(true); setError(''); setMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` })
    setResetLoading(false)
    if (error) return setError(error.message)
    setResetSent(true)
  }

  const handleDeleteSong = async (songId) => {
    if (confirmDeleteId !== songId) { setConfirmDeleteId(songId); return }
    setDeletingId(songId)
    try { await deleteSong(songId); setSongs(p => p.filter(s => s.id !== songId)); setConfirmDeleteId(null); setSongMsg('Canción eliminada.'); setTimeout(() => setSongMsg(''), 3000) }
    catch {} finally { setDeletingId(null) }
  }

  // ✅ FIX: el botón anterior solo hacía logout + navigate, sin borrar
  // nada de verdad — por eso el correo seguía "existiendo" para efectos
  // de registro (aunque el login sí funcionaba, porque la cuenta nunca
  // se tocó). Ahora llama a la Edge Function delete-account, que borra
  // los datos del usuario y la cuenta de Supabase Auth con permisos de
  // administrador (necesario porque el navegador no puede hacer esto
  // directamente por seguridad).
  const handleDeleteAccount = async () => {
    if (!confirm('¿Estás seguro? Esta acción no se puede deshacer. Se eliminarán tu perfil, canciones y todos tus datos.')) return
    setDeletingAccount(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar la cuenta.')
      await logoutUser()
      navigate('/register')
    } catch (err) {
      setError(`No pudimos eliminar tu cuenta: ${err.message}. Intenta de nuevo o contacta a soporte.`)
      setDeletingAccount(false)
    }
  }

  const visibleSections = SECTIONS.filter(s => !s.artist || isArtist)
  const goBack = () => { setActiveSection(null); setMsg(''); setError('') }

  if (loadingRole) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f2f7' }}>
      <svg style={{ width: '32px', height: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  )

  const displayName = isArtist ? artistName || name : name

  const renderSection = () => {
    const section = SECTIONS.find(s => s.id === activeSection)
    return (
      <div style={{ minHeight: '100vh', background: '#f2f2f7', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
          @keyframes spin { to { transform: rotate(360deg) } }
          .mood-btn:hover { transform: translateY(-2px); }
        `}</style>

        <div style={{ background: 'rgba(242,242,247,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: '52px', gap: '8px' }}>
            <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: '16px', fontWeight: '500', padding: '4px 0', fontFamily: 'inherit' }}>
              <svg width="10" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 10 17">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 1L1 8.5 9 16"/>
              </svg>
              Ajustes
            </button>
            <p style={{ flex: 1, textAlign: 'center', fontWeight: '700', fontSize: '16px', color: '#111', margin: 0 }}>{section?.label}</p>
            <div style={{ width: '70px' }}/>
          </div>
        </div>

        <div style={{ padding: '20px 16px 100px' }}>

          {/* ── ESTADÍSTICAS DASHBOARD ── */}
          {activeSection === 'stats' && (
            loadingStats ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <svg style={{ width: '28px', height: '28px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              </div>
            ) : stats ? (
              <StatsDashboard stats={stats} songStats={songStats} />
            ) : null
          )}

          {/* ── MIS CANCIONES ──
              ✅ El botón de editar ahora navega a /edit/:id, que es el
              formulario completo (EditSong.jsx) con portada, audio,
              colaboradores y créditos editables. Ya no se usa el modal
              simplificado que vivía aquí, porque no permitía editar
              colaboradores ni reemplazar el audio. */}
          {activeSection === 'songs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                  Subir canción
                </button>
              </div>

              {songMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '13px', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  {songMsg}
                </div>
              )}

              {loadingSongs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                  <svg style={{ width: '28px', height: '28px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                </div>
              ) : songs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <svg width="24" height="24" fill="none" stroke="#a78bfa" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: '#374151', margin: '0 0 4px' }}>Sin canciones aún</p>
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px' }}>Sube tu primera canción</p>
                  <button onClick={() => navigate('/upload')} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>+ Subir</button>
                </div>
              ) : (
                <IOSGroup>
                  {songs.map((song, i) => {
                    const isConfirming = confirmDeleteId === song.id
                    return (
                      <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: isConfirming ? '#fff5f5' : '#fff', borderBottom: i < songs.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <img src={song.cover_url} alt={song.title} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#7c3aed', background: '#f5f3ff', padding: '1px 8px', borderRadius: '20px', fontWeight: '600' }}>{song.genre}</span>
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{(songStreamCounts[song.id] ?? 0).toLocaleString()} rep.</span>
                          </div>
                          {isConfirming && <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600', margin: '4px 0 0' }}>¿Confirmar eliminación?</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button onClick={() => playSong(song)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f5f3ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" fill="#7c3aed" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                          </button>
                          <button onClick={() => navigate(`/edit/${song.id}`)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button onClick={() => handleDeleteSong(song.id)} disabled={deletingId === song.id}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', background: isConfirming ? '#ef4444' : '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" fill="none" stroke={isConfirming ? '#fff' : '#6b7280'} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                          {isConfirming && (
                            <button onClick={() => setConfirmDeleteId(null)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="12" height="12" fill="none" stroke="#6b7280" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </IOSGroup>
              )}
            </div>
          )}

          {/* ── EDITAR PERFIL ── */}
            {activeSection === 'edit' && (
            <div>
              {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '13px', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px' }}>{error}</div>}
              {msg   && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '13px', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px' }}>{msg}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                <div onClick={() => avatarInputRef.current?.click()} style={{ position: 'relative', cursor: 'pointer', marginBottom: '8px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#f3f4f6', border: '3px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                    {avatarPreview ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '800', color: '#fff' }}>{name?.[0]?.toUpperCase() ?? '?'}</div>}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderRadius: '50%', background: '#7c3aed', border: '2px solid #f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
                  </div>
                  <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange}/>
                </div>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Toca para cambiar foto</p>
              </div>

              <IOSGroup title="Información">
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
  <p style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nombre</p>
  <input required value={name} onChange={e => setName(e.target.value)} maxLength={50} placeholder="Tu nombre"
    style={{ width: '100%', border: '1.5px solid #e5e7eb', background: '#f9fafb', borderRadius: '10px', padding: '10px 12px', fontSize: '15px', color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
    onFocus={e => e.target.style.borderColor = '#7c3aed'}
    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
  />
</div>
                {isArtist && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nombre artístico</p>
                      <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '20px', fontWeight: '600', background: canChangeName ? '#f0fdf4' : '#fef2f2', color: canChangeName ? '#15803d' : '#dc2626' }}>
                        {canChangeName ? `${remainingChanges} cambio${remainingChanges !== 1 ? 's' : ''}` : `En ${NAME_CHANGE_DAYS - daysSinceLastChange}d`}
                      </span>
                    </div>
                    <input value={artistName} onChange={e => setArtistName(e.target.value)} disabled={!canChangeName} maxLength={50} placeholder="Tu nombre artístico"
  style={{ width: '100%', border: `1.5px solid ${canChangeName ? '#e5e7eb' : '#f3f4f6'}`, background: canChangeName ? '#f9fafb' : '#f3f4f6', borderRadius: '10px', padding: '10px 12px', fontSize: '15px', color: canChangeName ? '#111' : '#9ca3af', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
  onFocus={e => { if (canChangeName) e.target.style.borderColor = '#7c3aed' }}
  onBlur={e => e.target.style.borderColor = canChangeName ? '#e5e7eb' : '#f3f4f6'}
/>
                  </div>
                )}
                <div style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Descripción</p>
                  <textarea placeholder="Cuéntale al mundo quién eres..." value={description} onChange={e => setDescription(e.target.value)} maxLength={150} rows={3}
  style={{ width: '100%', border: '1.5px solid #e5e7eb', background: '#f9fafb', borderRadius: '10px', padding: '10px 12px', fontSize: '15px', color: '#111', outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
  onFocus={e => e.target.style.borderColor = '#7c3aed'}
  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
/>  
                  <p style={{ fontSize: '11px', color: '#d1d5db', margin: '4px 0 0', textAlign: 'right' }}>{description?.length ?? 0}/150</p>
                </div>
              </IOSGroup>

              <IOSGroup title="Redes sociales">
                {[
  { key: 'instagram', label: 'Instagram', placeholder: '@usuario' },
  { key: 'twitter',   label: 'Twitter/X',  placeholder: '@usuario' },
  { key: 'tiktok',    label: 'TikTok',     placeholder: '@usuario' },
  { key: 'youtube',   label: 'YouTube',    placeholder: 'URL del canal' },
  { key: 'website',   label: 'Sitio web',  placeholder: 'https://...' },
].map(({ key, label, placeholder }, i, arr) => (
  <div key={key} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
    <p style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
    <input type="text" placeholder={placeholder} value={socialLinks[key] ?? ''} onChange={e => setSocialLinks(p => ({ ...p, [key]: e.target.value }))}
      style={{ width: '100%', border: '1.5px solid #e5e7eb', background: '#f9fafb', borderRadius: '10px', padding: '10px 12px', fontSize: '15px', color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
      onFocus={e => e.target.style.borderColor = '#7c3aed'}
      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
    />
  </div>
))}
              </IOSGroup>

              <button onClick={handleSaveProfile} disabled={loading || !hasChanges}
                style={{ width: '100%', padding: '15px', borderRadius: '14px', background: '#7c3aed', color: '#fff', fontWeight: '700', fontSize: '16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: (!hasChanges || loading) ? 0.45 : 1, transition: 'opacity 0.2s' }}>
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* ── CUENTA ── */}
          {activeSection === 'account' && (
            <div>
              <IOSGroup title="Información de cuenta">
                {[
                  { label: 'Correo',         value: user?.email },
                  { label: 'Rol',            value: isArtist ? 'Artista' : 'Oyente' },
                  { label: 'Miembro desde',  value: new Date(user?.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' }) },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fff', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#111', margin: 0, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{value}</p>
                  </div>
                ))}
              </IOSGroup>

              <IOSGroup title="Cambiar contraseña">
                {error && <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: '13px', padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>{error}</div>}
                {msg   && <div style={{ background: '#f0fdf4', color: '#15803d',  fontSize: '13px', padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>{msg}</div>}
                {[
                  { label: 'Contraseña actual',          val: currentPassword, set: setCurrentPassword, ph: '••••••••' },
                  { label: 'Nueva contraseña',           val: newPassword,     set: setNewPassword,     ph: 'Mínimo 6 caracteres' },
                  { label: 'Confirmar nueva contraseña', val: confirmPassword, set: setConfirmPassword, ph: 'Repite la nueva' },
                ].map(({ label, val, set, ph }, i, arr) => (
                  <div key={label} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none', background: '#fff' }}>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                    <input type="password" placeholder={ph} value={val} onChange={e => set(e.target.value)}
                      style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '15px', color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}/>
                  </div>
                ))}
              </IOSGroup>

              <button onClick={handleChangePassword} disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                style={{ width: '100%', padding: '15px', borderRadius: '14px', background: '#7c3aed', color: '#fff', fontWeight: '700', fontSize: '16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '12px', opacity: (!currentPassword || !newPassword || !confirmPassword || loading) ? 0.45 : 1 }}>
                {loading ? 'Verificando...' : 'Actualizar contraseña'}
              </button>

              {resetSent ? (
                <p style={{ textAlign: 'center', fontSize: '13px', color: '#3b82f6' }}>Correo enviado a {user?.email}</p>
              ) : (
                <button onClick={handleForgotPassword} disabled={resetLoading}
                  style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', fontSize: '14px', color: '#7c3aed', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', padding: '8px' }}>
                  {resetLoading ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                </button>
              )}
            </div>
          )}

          {activeSection === 'notifications' && (
            <NotificationSettings userId={user?.id} isArtist={isArtist} />
          )}

          {activeSection === 'danger' && (
            <div>
              {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '13px', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px' }}>{error}</div>}
              <IOSGroup>
                <div style={{ padding: '16px', background: '#fff' }}>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: '#ef4444', margin: '0 0 4px' }}>Eliminar cuenta</p>
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 14px' }}>Se eliminarán todos tus datos, canciones y perfil permanentemente. Esta acción no se puede deshacer.</p>
                  <button onClick={handleDeleteAccount} disabled={deletingAccount}
                    style={{ padding: '10px 20px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', fontSize: '14px', fontWeight: '700', cursor: deletingAccount ? 'default' : 'pointer', fontFamily: 'inherit', opacity: deletingAccount ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {deletingAccount && (
                      <svg style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    )}
                    {deletingAccount ? 'Eliminando...' : 'Eliminar mi cuenta'}
                  </button>
                </div>
              </IOSGroup>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (activeSection) return renderSection()

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap'); @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ background: 'linear-gradient(160deg, #7c3aed 0%, #6d28d9 60%, #5b21b6 100%)', padding: '60px 20px 32px', textAlign: 'center', position: 'relative' }}>
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: '16px', left: '16px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ width: '88px', height: '88px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)', margin: '0 auto 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          {avatarPreview
            ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '800', color: '#fff' }}>{displayName?.[0]?.toUpperCase() ?? '?'}</div>
          }
        </div>
        <p style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '0 0 4px' }}>{displayName}</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>{user?.email}</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px', padding: '4px 12px', marginTop: '10px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }}/>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>{isArtist ? 'Artista' : 'Oyente'}</span>
        </div>
      </div>

      <div style={{ padding: '20px 16px 100px' }}>
        {isArtist && (
          <IOSGroup title="Artista">
            {visibleSections.filter(s => s.artist).map((s, i, arr) => (
              <IOSRow key={s.id} icon={s.icon} iconColor={s.color} iconBg={s.bg}
                label={s.label} border={i < arr.length - 1}
                onClick={() => { setActiveSection(s.id); setMsg(''); setError('') }} />
            ))}
          </IOSGroup>
        )}

        <IOSGroup title="Perfil y cuenta">
          {visibleSections.filter(s => !s.artist && !s.danger).map((s, i, arr) => (
            <IOSRow key={s.id} icon={s.icon} iconColor={s.color} iconBg={s.bg}
              label={s.label} border={i < arr.length - 1}
              onClick={() => { setActiveSection(s.id); setMsg(''); setError('') }} />
          ))}
        </IOSGroup>

        <IOSGroup>
          <IOSRow
            icon="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            iconColor="#ef4444" iconBg="#fef2f2"
            label="Cerrar sesión" border={false}
            onClick={async () => { await logoutUser(); navigate('/login') }}
          />
        </IOSGroup>

        <IOSGroup>
          <IOSRow
            icon={SECTIONS.find(s => s.id === 'danger').icon}
            iconColor="#ef4444" iconBg="#fef2f2"
            label="Zona de peligro"
            sublabel="Eliminar cuenta permanentemente"
            border={false}
            onClick={() => { setActiveSection('danger'); setMsg(''); setError('') }}
          />
        </IOSGroup>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#c7c7cc', marginTop: '8px' }}>SoundSeekers · v1.0</p>
      </div>
    </div>
  )
}
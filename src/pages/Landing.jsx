import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSongs } from '../api/songs'

export default function Landing() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ songs: 0, artists: 0, streams: 0 })

  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true })
    }
  }, [user, loading])

  useEffect(() => {
    getSongs().then(songs => {
      const artistIds = new Set(songs.map(s => s.user_id).filter(Boolean))
      const totalStreams = songs.reduce((acc, s) => acc + (s.streams ?? 0), 0)
      setStats({ songs: songs.length, artists: artistIds.size, streams: totalStreams })
    }).catch(() => {})
  }, [])

  if (loading) return null

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#111' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }

        .landing-nav { background: #fff; border-bottom: 1px solid #f3f4f6; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 40; }
        .landing-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .landing-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: #7c3aed; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; }
        .landing-logo-name { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; color: #111; letter-spacing: 0.04em; }
        .landing-nav-links { display: flex; align-items: center; gap: 10px; }
        .btn-outline { padding: 9px 20px; border-radius: 100px; border: 1px solid #e5e7eb; color: #374151; font-size: 13px; font-weight: 600; text-decoration: none; font-family: inherit; background: #fff; transition: all 0.15s; }
        .btn-outline:hover { border-color: #7c3aed; color: #7c3aed; }
        .btn-primary { padding: 9px 20px; border-radius: 100px; background: #7c3aed; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; font-family: inherit; box-shadow: 0 4px 12px rgba(124,58,237,0.3); transition: all 0.15s; }
        .btn-primary:hover { background: #6d28d9; }

        .hero { max-width: 1100px; margin: 0 auto; padding: 80px 32px 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        @media (max-width: 700px) { .hero { grid-template-columns: 1fr; padding: 48px 20px 40px; } .hero-visual { display: none; } }
        .hero-tag { display: inline-flex; align-items: center; gap: 7px; background: #f5f3ff; border: 1px solid #ede9fe; border-radius: 100px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #7c3aed; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 20px; }
        .hero-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; animation: pulse 2s infinite; }
        .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(3rem, 5vw, 4.5rem); color: #111; line-height: 1.05; margin: 0 0 16px; letter-spacing: 0.01em; }
        .hero-title span { background: linear-gradient(135deg, #7c3aed, #6d28d9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-desc { font-size: 15px; color: #6b7280; line-height: 1.7; margin: 0 0 28px; max-width: 400px; }
        .hero-btns { display: flex; gap: 12px; flex-wrap: wrap; }
        .hero-btn-main { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-weight: 700; font-size: 14px; padding: 13px 28px; border-radius: 100px; text-decoration: none; font-family: inherit; box-shadow: 0 4px 16px rgba(124,58,237,0.3); transition: all 0.15s; }
        .hero-btn-main:hover { opacity: 0.9; transform: scale(1.02); }
        .hero-btn-sec { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #374151; font-weight: 600; font-size: 14px; padding: 13px 24px; border-radius: 100px; text-decoration: none; font-family: inherit; border: 1px solid #e5e7eb; transition: all 0.15s; }
        .hero-btn-sec:hover { border-color: #7c3aed; color: #7c3aed; }

        .hero-visual { position: relative; }
        .hero-card-main { background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); border: 1px solid #f3f4f6; }
        .hero-card-song { display: flex; align-items: center; gap: 12px; padding: 10px; background: #f8f7ff; border-radius: 14px; margin-bottom: 10px; cursor: default; }
        .hero-card-song:last-child { margin-bottom: 0; }
        .hero-song-cover { width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .hero-song-info { flex: 1; min-width: 0; }
        .hero-song-title { font-size: 13px; font-weight: 700; color: #111; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hero-song-artist { font-size: 11px; color: #9ca3af; margin: 0; }
        .hero-play { width: 32px; height: 32px; border-radius: 50%; background: #7c3aed; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hero-badge { position: absolute; top: -12px; right: -12px; background: #7c3aed; color: #fff; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 100px; box-shadow: 0 4px 12px rgba(124,58,237,0.4); }

        .section { max-width: 1100px; margin: 0 auto; padding: 0 2rem 4rem; }
        .section-title { font-size: 1.15rem; font-weight: 800; color: #111; margin: 0 0 1.25rem; }
        .divider { height: 1px; background: #f3f4f6; max-width: 1100px; margin: 0 auto 3rem; }

        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .feature-card { background: #fff; border-radius: 20px; padding: 24px 20px; border: 1px solid #f3f4f6; box-shadow: 0 4px 16px rgba(0,0,0,0.04); transition: box-shadow 0.2s; }
        .feature-card:hover { box-shadow: 0 8px 24px rgba(124,58,237,0.1); }
        .feature-icon { width: 48px; height: 48px; border-radius: 14px; background: #f5f3ff; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .feature-title { font-size: 14px; font-weight: 800; color: #111; margin: 0 0 6px; }
        .feature-desc { font-size: 13px; color: #9ca3af; margin: 0; line-height: 1.6; }

        .stats-banner { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%); border-radius: 20px; padding: 2.5rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        @media (max-width: 600px) { .stats-banner { grid-template-columns: 1fr; } }
        .stat-number { font-family: 'Bebas Neue', sans-serif; font-size: 3rem; color: #fff; line-height: 1; margin-bottom: 4px; text-align: center; }
        .stat-label { font-size: 12px; color: rgba(255,255,255,0.65); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; text-align: center; }

        .cta-box { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%); border-radius: 24px; padding: 3.5rem 2rem; text-align: center; box-shadow: 0 20px 60px rgba(124,58,237,0.3); }
        .cta-tag { font-size: 11px; color: #c4b5fd; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px; }
        .cta-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2rem, 4vw, 3rem); color: #fff; margin: 0 0 10px; letter-spacing: 0.02em; }
        .cta-desc { color: rgba(255,255,255,0.65); font-size: 15px; margin: 0 0 1.8rem; max-width: 480px; margin-left: auto; margin-right: auto; }
        .cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .cta-btn-main { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #7c3aed; font-weight: 700; font-size: 14px; padding: 13px 28px; border-radius: 100px; text-decoration: none; transition: transform 0.15s; }
        .cta-btn-main:hover { transform: scale(1.03); }
        .cta-btn-sec { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.12); color: #fff; font-weight: 600; font-size: 14px; padding: 13px 28px; border-radius: 100px; text-decoration: none; border: 1px solid rgba(255,255,255,0.2); transition: all 0.15s; }
        .cta-btn-sec:hover { background: rgba(255,255,255,0.2); }

        .footer { background: #111; color: #fff; padding: 4rem 2rem 2rem; margin-top: 4rem; }
        .footer-inner { max-width: 1100px; margin: 0 auto; }
        .footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
        @media (max-width: 700px) { .footer-top { grid-template-columns: 1fr 1fr; gap: 2rem; } }
        .footer-brand-name { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; color: #fff; letter-spacing: 0.04em; margin: 0 0 8px; }
        .footer-brand-desc { font-size: 13px; color: #6b7280; line-height: 1.6; max-width: 260px; margin: 0 0 20px; }
        .footer-col-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
        .footer-link { display: block; font-size: 13px; color: #9ca3af; text-decoration: none; margin-bottom: 10px; transition: color 0.15s; }
        .footer-link:hover { color: #fff; }
        .footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .footer-copy { font-size: 12px; color: #4b5563; }
        .footer-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.25); border-radius: 100px; padding: 4px 12px; font-size: 11px; color: #a78bfa; font-weight: 600; }

        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)} }
      `}</style>

      {/* NAVBAR */}
      <nav className="landing-nav">
        <Link to="/" className="landing-logo">
          <div className="landing-logo-icon">SS</div>
          <span className="landing-logo-name">SoundSeekers</span>
        </Link>
        <div className="landing-nav-links">
          <Link to="/login" className="btn-outline">Iniciar sesión</Link>
          <Link to="/register" className="btn-primary">Regístrate gratis</Link>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div>
          <div className="hero-tag">
            <div className="hero-dot"/>
            Artistas emergentes latinoamericanos
          </div>
          <h1 className="hero-title">
            TU MÚSICA<br/>
            TU MOMENTO<br/>
            <span>TU PLATAFORMA</span>
          </h1>
          <p className="hero-desc">
            Descubre artistas independientes de Latinoamérica. Música sin filtros, directa de quienes la crean.
          </p>
          <div className="hero-btns">
            <Link to="/register" className="hero-btn-main">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
              Empezar gratis
            </Link>
            <Link to="/login" className="hero-btn-sec">
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        {/* Visual decorativo */}
        <div className="hero-visual">
          <div style={{ position: 'relative', animation: 'float 4s ease-in-out infinite' }}>
            <div className="hero-badge">🎵 {stats.songs > 0 ? `+${stats.songs}` : '+'} canciones</div>
            <div className="hero-card-main">
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Reproduciendo ahora</p>
              {[
                { title: 'La Cumbia del Mar', artist: 'El Combo Latino', color: '#fef3c7' },
                { title: 'Noche de Reggaeton', artist: 'Urban Kings', color: '#f5f3ff' },
                { title: 'Balada Sin Nombre', artist: 'Luna Veil', color: '#fce7f3' },
              ].map((song, i) => (
                <div key={i} className="hero-card-song">
                  <div className="hero-song-cover" style={{ background: song.color }}>
                    <svg width="20" height="20" fill="none" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                  </div>
                  <div className="hero-song-info">
                    <p className="hero-song-title">{song.title}</p>
                    <p className="hero-song-artist">{song.artist}</p>
                  </div>
                  {i === 0 && (
                    <div className="hero-play">
                      <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="divider"/>

      {/* FEATURES */}
      <div className="section">
        <h2 className="section-title">¿Por qué SoundSeekers?</h2>
        <div className="features-grid">
          {[
            { icon: <svg width="22" height="22" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>, title: 'Descubre música', desc: 'Explora canciones de artistas emergentes de Latinoamérica antes que nadie.' },
            { icon: <svg width="22" height="22" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, title: 'Por estado de ánimo', desc: 'Recomendaciones según cómo te sientes y el clima del momento.' },
            { icon: <svg width="22" height="22" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, title: 'Comunidad activa', desc: 'Comparte descubrimientos y conecta con otros amantes de la música.' },
            { icon: <svg width="22" height="22" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>, title: 'SeekeAI', desc: 'Asistente inteligente que te recomienda música según tus gustos.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="divider"/>

      {/* STATS — datos reales desde Supabase */}
      <div className="section">
        <div className="stats-banner">
          <div>
            <div className="stat-number">{stats.songs > 0 ? `${stats.songs}+` : '—'}</div>
            <div className="stat-label">Canciones publicadas</div>
          </div>
          <div>
            <div className="stat-number">{stats.artists > 0 ? `${stats.artists}+` : '—'}</div>
            <div className="stat-label">Artistas activos</div>
          </div>
          <div>
            <div className="stat-number">{stats.streams > 0 ? stats.streams.toLocaleString() : '—'}</div>
            <div className="stat-label">Reproducciones totales</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="section">
        <div className="cta-box">
          <p className="cta-tag">Únete gratis</p>
          <h2 className="cta-title">Tu sonido merece ser escuchado</h2>
          <p className="cta-desc">
            Crea tu cuenta, sube tu música y conecta con miles de oyentes que buscan nuevos talentos.
          </p>
          <div className="cta-btns">
            <Link to="/register" className="cta-btn-main">Crear cuenta gratis →</Link>
            <Link to="/login" className="cta-btn-sec">Ya tengo cuenta</Link>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <p className="footer-brand-name">SoundSeekers</p>
              <p className="footer-brand-desc">Plataforma de música emergente latinoamericana. Descubre, conecta y comparte tu sonido con el mundo.</p>
            </div>
            <div>
              <p className="footer-col-title">Plataforma</p>
              <Link to="/login" className="footer-link">Explorar música</Link>
              <Link to="/register" className="footer-link">Crear cuenta</Link>
              <Link to="/login" className="footer-link">Iniciar sesión</Link>
            </div>
            <div>
              <p className="footer-col-title">Legal</p>
              <Link to="/terminos" className="footer-link">Términos de uso</Link>
              <Link to="/privacidad" className="footer-link">Privacidad</Link>
              <Link to="/cookies" className="footer-link">Cookies</Link>
              <Link to="/contacto" className="footer-link">Contacto</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copy">© 2025 SoundSeekers. Todos los derechos reservados.</p>
            <div className="footer-badge">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
              Hecho con música en Colombia
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toggleLike, getUserLike, deletePost, updatePost } from '../api/community'
import { usePlayer } from '../context/PlayerContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return `Hace ${Math.floor(diff / 86400)} d`
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <p className="text-center text-gray-800 font-semibold text-base mb-1">¿Estás seguro?</p>
        <p className="text-center text-gray-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition font-semibold">Eliminar</button>
        </div>
      </div>
    </div>
  )
}

export default function PostCard({ post, onLikeToggle, onDeleted, onUpdated }) {
  const { user } = useAuth()
  const { playSong, currentSong, isPlaying } = usePlayer()
  const navigate = useNavigate()
  const [likeCount, setLikeCount] = useState(post.post_likes?.[0]?.count ?? 0)
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editContent, setEditContent] = useState(post.content)
  const [editSongLabel, setEditSongLabel] = useState(post.song_label ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const commentCount = post.post_comments?.[0]?.count ?? 0
  const [linkedSong, setLinkedSong] = useState(null)

  useEffect(() => {
    if (!post.song_id) return
    supabase.from('songs').select('*').eq('id', post.song_id).single()
      .then(({ data }) => { if (data) setLinkedSong(data) })
  }, [post.song_id])
  const isOwner = user?.id === post.user_id

  useEffect(() => {
    if (!user) return
    getUserLike(post.id, user.id).then(setLiked)
  }, [post.id, user])

  const handleLike = async (e) => {
    e.stopPropagation()
    if (!user || likeLoading) return
    setLikeLoading(true)
    try {
      const didLike = await toggleLike(post.id, user.id)
      setLiked(didLike)
      setLikeCount(prev => didLike ? prev + 1 : Math.max(0, prev - 1))
    } catch (err) { console.error(err) }
    finally { setLikeLoading(false) }
  }

  const handleDelete = async () => {
    try { await deletePost(post.id); onDeleted(post.id) }
    catch (err) { console.error(err) }
    finally { setConfirmDelete(false) }
  }

  const handleSaveEdit = async (e) => {
    e.stopPropagation()
    if (!editTitle.trim() || !editContent.trim()) return
    setSaving(true)
    try {
      const updated = await updatePost(post.id, { title: editTitle.trim(), content: editContent.trim(), song_label: editSongLabel.trim() || null })
      onUpdated(updated); setEditing(false)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const goToPost = () => navigate(`/community/post/${post.id}`)

  return (
    <>
      <div
        onClick={editing ? undefined : goToPost}
        style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', cursor: editing ? 'default' : 'pointer', transition: 'box-shadow 0.2s, transform 0.15s', marginBottom: '12px' }}
        onMouseEnter={e => { if (!editing) { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)' }}>

        <div style={{ padding: '20px' }}>
          {/* Autor */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid #f3f4f6' }}>
                {post.avatar_url
                  ? <img src={post.avatar_url} alt={post.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : <span style={{ fontSize: '14px', fontWeight: '700', color: '#7c3aed' }}>{post.username?.[0]?.toUpperCase() ?? '?'}</span>
                }
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#111', margin: 0, lineHeight: 1.3 }}>{post.username ?? 'Usuario'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{timeAgo(post.created_at)}</p>
                  {post.edited && <span style={{ fontSize: '11px', color: '#9ca3af', background: '#f3f4f6', padding: '1px 6px', borderRadius: '20px' }}>editado</span>}
                </div>
              </div>
            </div>

            {isOwner && (
              <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowMenu(p => !p)}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
                  </svg>
                </button>
                {showMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '36px', background: '#fff', border: '1px solid #f3f4f6', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 20, width: '140px', overflow: 'hidden' }}>
                    <button onClick={() => { setEditing(true); setShowMenu(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#374151' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      Editar
                    </button>
                    <button onClick={() => { setConfirmDelete(true); setShowMenu(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contenido */}
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} onClick={e => e.stopPropagation()}>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}/>
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', color: '#111', outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}/>
              <input value={editSongLabel} onChange={e => setEditSongLabel(e.target.value)} placeholder="Canción vinculada (opcional)"
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}/>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', fontSize: '13px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving}
                  style={{ padding: '8px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#111', margin: '0 0 8px', lineHeight: 1.35 }}>{post.title}</h2>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>
              {(linkedSong || post.song_label) && (
                <div
                  onClick={e => { e.stopPropagation(); if (linkedSong) playSong(linkedSong) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: linkedSong && currentSong?.id === linkedSong.id ? '#ede9fe' : '#f5f3ff',
                    border: '1px solid #ede9fe', borderRadius: '12px', padding: '8px 12px', marginBottom: '12px',
                    cursor: linkedSong ? 'pointer' : 'default', transition: 'background 0.15s',
                  }}>
                  {linkedSong?.cover_url ? (
                    <img src={linkedSong.cover_url} alt={linkedSong.title}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}/>
                  ) : (
                    <svg width="14" height="14" fill="#7c3aed" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: '#6d28d9', fontWeight: '600', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {linkedSong?.title || post.song_label}
                    </p>
                    {linkedSong && (
                      <p style={{ fontSize: '11px', color: '#a78bfa', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {linkedSong.display_artist || linkedSong.artist_name}
                      </p>
                    )}
                  </div>
                  {linkedSong && (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: currentSong?.id === linkedSong.id && isPlaying ? '#7c3aed' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(124,58,237,0.15)', transition: 'background 0.2s' }}>
                      {currentSong?.id === linkedSong.id && isPlaying
                        ? <svg width="10" height="10" fill="white" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                        : <svg width="10" height="10" fill="#7c3aed" viewBox="0 0 24 24" style={{ marginLeft: '1px' }}><path d="M5 3l14 9-14 9V3z"/></svg>
                      }
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer acciones */}
        {!editing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 16px 14px', borderTop: '1px solid #f9fafb' }}
            onClick={e => e.stopPropagation()}>
            {/* Like */}
            <button onClick={handleLike} disabled={!user || likeLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '100px', border: 'none', background: liked ? '#fef2f2' : 'transparent', cursor: user ? 'pointer' : 'default', fontSize: '13px', fontWeight: '600', color: liked ? '#ef4444' : '#9ca3af', transition: 'all 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => { if (user) e.currentTarget.style.background = liked ? '#fef2f2' : '#f9fafb' }}
              onMouseLeave={e => { e.currentTarget.style.background = liked ? '#fef2f2' : 'transparent' }}>
              <svg width="16" height="16" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              {likeCount > 0 && likeCount}
            </button>

            {/* Comentarios */}
            <button onClick={goToPost}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '100px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#9ca3af', transition: 'all 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.color = '#7c3aed' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              {commentCount > 0 ? `${commentCount} comentario${commentCount !== 1 ? 's' : ''}` : 'Comentar'}
            </button>

            {/* Leer más */}
            <button onClick={goToPost}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px', borderRadius: '100px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#9ca3af', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#7c3aed' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af' }}>
              Leer más
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          message="Esta publicación se eliminará permanentemente."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}
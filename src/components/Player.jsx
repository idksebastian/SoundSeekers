import { useState, useEffect, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { supabase } from '../lib/supabase';
import {
  Play, Pause, SkipBack, SkipForward, ChevronDown,
  Volume2, VolumeX, ListMusic, Mic2, Disc, Share2,
  MoreHorizontal, ChevronsDown, Shuffle, Repeat, Repeat1,
  Heart, Plus, Star, TrendingUp, Music2, ChevronUp, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Extracción de color ─────────────────────────────────────────────────────
function extractColor(imageUrl, callback) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  let cancelled = false;
  img.onload = () => {
    if (cancelled) return;
    const canvas = document.createElement('canvas');
    canvas.width = 50; canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      const pr = data[i], pg = data[i + 1], pb = data[i + 2];
      const brightness = (pr + pg + pb) / 3;
      if (brightness > 20 && brightness < 230) { r += pr; g += pg; b += pb; count++; }
    }
    if (count === 0) { callback('30, 10, 60'); return; }
    callback(`${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)}`);
  };
  img.onerror = () => { if (!cancelled) callback('30, 10, 60'); };
  img.src = imageUrl;
  return () => { cancelled = true; };
}

// ─── Equalizer animado ───────────────────────────────────────────────────────
function EqualizerBars({ isPlaying }) {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="w-[3px] rounded-full bg-white"
          style={{
            height: isPlaying ? `${6 + i * 3}px` : '3px',
            animation: isPlaying ? `eq-bar 0.${6 + i}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.1}s`,
            transition: 'height 0.3s ease',
          }}
        />
      ))}
      <style>{`@keyframes eq-bar { from { transform: scaleY(0.4); } to { transform: scaleY(1.2); } }`}</style>
    </div>
  );
}

function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

// ════════════════════════════════════════════════════════════════════════════
export default function Player() {
  const {
    currentSong, isPlaying, isVisible, setIsVisible,
    isFullscreen, setIsFullscreen, volume, progress, duration,
    playSong, pauseSong, playNext, playPrev, handleSeek, handleVolume, formatTime,
    queue, setQueue, audioRef,
  } = usePlayer();

  const [dominantColor, setDominantColor] = useState('30, 10, 60');
  const [artistInfo, setArtistInfo]       = useState(null);
  const [relatedSongs, setRelatedSongs]   = useState([]);
  const [albumTracks, setAlbumTracks]     = useState([]);
  const [nextSong, setNextSong]           = useState(null);
  const [isLiked, setIsLiked]             = useState(false);
  const [shuffle, setShuffle]             = useState(false);
  const [repeatMode, setRepeatMode]       = useState('none');
  const [showQueue, setShowQueue]         = useState(false);
  const [isMuted, setIsMuted]             = useState(false);
  const [prevVolume, setPrevVolume]       = useState(1);
  const [showOpenHint, setShowOpenHint]   = useState(false);
  const [shared, setShared]               = useState(false); // feedback de compartir
  const [addedToQueue, setAddedToQueue]   = useState({}); // feedback de añadir a cola

  const coverUrl    = currentSong?.cover_url || currentSong?.coverUrl || '';
  const artistName  = currentSong?.display_artist || currentSong?.artist_name || currentSong?.artist || 'Artista';
  const progressPct = duration ? (progress / duration) * 100 : 0;

  useEffect(() => {
    if (currentSong) setIsFullscreen(true);
  }, [currentSong?.id]);

  useEffect(() => {
    if (isFullscreen) return;
    const id = setInterval(() => {
      setShowOpenHint(true);
      setTimeout(() => setShowOpenHint(false), 1800);
    }, 8000);
    setShowOpenHint(true);
    setTimeout(() => setShowOpenHint(false), 1800);
    return () => clearInterval(id);
  }, [isFullscreen]);

  useEffect(() => {
    if (!coverUrl) return;
    return extractColor(coverUrl, setDominantColor);
  }, [coverUrl]);

  useEffect(() => {
    if (!currentSong || currentSong.isSpotify) return;
    let cancelled = false;
    setArtistInfo(null); setRelatedSongs([]); setAlbumTracks([]); setNextSong(null);

    const fetchData = async () => {
      try {
        const queries = [];
        if (currentSong.user_id) {
          queries.push(supabase.from('public_profiles').select('*').eq('user_id', currentSong.user_id).single());
        }
        if (currentSong.album_id) {
          queries.push(supabase.from('songs').select('id, title, cover_url, display_artist, audio_url, track_number, duration').eq('album_id', currentSong.album_id).order('track_number', { ascending: true }));
        } else {
          queries.push(Promise.resolve({ data: [] }));
        }
        if (currentSong.user_id) {
          let q = supabase.from('songs').select('id, title, cover_url, display_artist, audio_url').eq('user_id', currentSong.user_id).neq('id', currentSong.id).limit(4);
          if (currentSong.album_id) q = q.neq('album_id', currentSong.album_id);
          queries.push(q);
        }
        const [profileRes, albumRes, relatedRes] = await Promise.all(queries);
        if (cancelled) return;
        if (profileRes?.data) setArtistInfo(profileRes.data);
        if (albumRes?.data?.length) setAlbumTracks(albumRes.data);
        if (relatedRes?.data?.length) setRelatedSongs(relatedRes.data);
        const queueList = queue || [];
        const currentIdx = queueList.findIndex(s => s.id === currentSong.id);
        if (currentIdx !== -1 && currentIdx < queueList.length - 1) setNextSong(queueList[currentIdx + 1]);
      } catch (e) { if (!cancelled) console.error(e); }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [currentSong?.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      switch (e.code) {
        case 'Space':       e.preventDefault(); isPlaying ? pauseSong() : playSong(currentSong); break;
        case 'ArrowRight':  if (e.shiftKey) playNext(); break;
        case 'ArrowLeft':   if (e.shiftKey) playPrev(); break;
        case 'ArrowUp':     e.preventDefault(); handleVolume({ target: { value: Math.min(1, volume + 0.05) } }); break;
        case 'ArrowDown':   e.preventDefault(); handleVolume({ target: { value: Math.max(0, volume - 0.05) } }); break;
        case 'KeyM':        handleMuteToggle(); break;
        case 'Escape':      if (isFullscreen) setIsFullscreen(false); if (showQueue) setShowQueue(false); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, volume, isFullscreen, showQueue, currentSong]);

  const handleMuteToggle = useCallback(() => {
    if (isMuted) { handleVolume({ target: { value: prevVolume } }); setIsMuted(false); }
    else { setPrevVolume(volume); handleVolume({ target: { value: 0 } }); setIsMuted(true); }
  }, [isMuted, volume, prevVolume]);

  const cycleRepeat = () => setRepeatMode(p => p === 'none' ? 'all' : p === 'all' ? 'one' : 'none');
  const RepeatIcon  = repeatMode === 'one' ? Repeat1 : Repeat;

  // ── Compartir canción ──
  const handleShare = async () => {
    const text = `🎵 Escuchando "${currentSong.title}" de ${artistName} en SoundSeekers`
    const url  = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: currentSong.title, text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {}
  }

  // ── Añadir canción a la cola ──
  const handleAddToQueue = (song, e) => {
    e.stopPropagation()
    setQueue(prev => {
      const already = prev.some(s => s.id === song.id)
      if (already) return prev
      return [...prev, song]
    })
    setAddedToQueue(prev => ({ ...prev, [song.id]: true }))
    setTimeout(() => setAddedToQueue(prev => ({ ...prev, [song.id]: false })), 2000)
  }

  if (!currentSong || !isVisible) return null;

  const isCurrentTrack = (song) => song.id === currentSong?.id;

  return (
    <AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          FULLSCREEN PLAYER
      ══════════════════════════════════════════════════════ */}
      {isFullscreen && (
        <motion.div
          key="fullscreen"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden text-white"
          style={{ backgroundColor: `rgb(${dominantColor})`, transition: 'background-color 1.2s ease' }}
        >
          {/* Fondo inmersivo */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 opacity-50 blur-[120px] scale-150"
              style={{
                background: `radial-gradient(ellipse at 30% 20%, rgb(${dominantColor}), transparent 60%),
                             radial-gradient(ellipse at 70% 80%, rgb(${dominantColor}), transparent 60%)`,
                transition: 'background 1.2s ease',
              }}
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundSize: '200px 200px',
              }}
            />
          </div>

          <div className="min-h-screen flex flex-col">

            {/* Header */}
            <header className="flex-shrink-0 px-6 pt-6 pb-4 flex items-center justify-between">
              <button onClick={() => setIsFullscreen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Cerrar reproductor">
                <ChevronDown className="w-7 h-7" />
              </button>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-medium">Reproduciendo desde</p>
                <p className="text-sm font-bold mt-0.5">{currentSong.album_title || currentSong.genre || 'Tu Biblioteca'}</p>
              </div>
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Más opciones">
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </header>

            {/* Main */}
            <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 px-6 md:px-16 max-w-6xl mx-auto w-full py-4 md:py-8">

              {/* Portada */}
              <motion.div
                animate={{ scale: isPlaying ? 1 : 0.93, opacity: isPlaying ? 1 : 0.85 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="flex-shrink-0 w-64 h-64 md:w-[380px] md:h-[380px] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden ring-1 ring-white/10"
              >
                <img src={coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />
              </motion.div>

              {/* Info + Controles */}
              <div className="flex-1 w-full max-w-[480px]">

                {/* Título + acciones */}
                <div className="flex items-start justify-between mb-6">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-3xl md:text-4xl font-black leading-tight line-clamp-2 mb-1">{currentSong.title}</h1>
                    <p className="text-base text-white/60 font-medium">{artistName}</p>
                    {currentSong.album_title && (
                      <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                        <Music2 className="w-3 h-3" /> {currentSong.album_title}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <button onClick={() => setIsLiked(p => !p)} className="p-2 hover:scale-110 transition-transform" aria-label={isLiked ? 'Quitar like' : 'Dar like'}>
                      <Heart className={`w-6 h-6 transition-colors ${isLiked ? 'fill-green-400 text-green-400' : 'text-white/50 hover:text-white'}`} />
                    </button>
                    {/* Botón compartir funcional */}
                    <button onClick={handleShare} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white relative" aria-label="Compartir">
                      {shared ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Barra de progreso fullscreen */}
                <div className="mb-5">
                  <div className="relative h-1 w-full bg-white/20 rounded-full cursor-pointer group">
                    <div className="absolute h-full bg-white rounded-full transition-all group-hover:bg-green-400" style={{ width: `${progressPct}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5" style={{ left: `${progressPct}%` }} />
                    <input type="range" min={0} max={duration || 0} step={0.1} value={progress}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Progreso"
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] font-bold text-white/40 tabular-nums">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controles principales */}
                <div className="flex items-center justify-between mb-5">
                  <button onClick={() => setShuffle(p => !p)}
                    className={`p-2 rounded-full transition-colors hover:bg-white/10 ${shuffle ? 'text-green-400' : 'text-white/50 hover:text-white'}`} aria-label="Shuffle">
                    <Shuffle className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-6">
                    <button onClick={playPrev} className="text-white hover:scale-110 transition-transform" aria-label="Anterior">
                      <SkipBack className="w-7 h-7" fill="currentColor" />
                    </button>
                    <button
                      onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
                      className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-black/40"
                      aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                    >
                      {isPlaying ? <Pause className="w-7 h-7" fill="currentColor" /> : <Play className="w-7 h-7 ml-1" fill="currentColor" />}
                    </button>
                    <button onClick={playNext} className="text-white hover:scale-110 transition-transform" aria-label="Siguiente">
                      <SkipForward className="w-7 h-7" fill="currentColor" />
                    </button>
                  </div>
                  <button onClick={cycleRepeat}
                    className={`p-2 rounded-full transition-colors hover:bg-white/10 ${repeatMode !== 'none' ? 'text-green-400' : 'text-white/50 hover:text-white'}`} aria-label="Repetir">
                    <RepeatIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Volumen + cola */}
                <div className="flex items-center gap-3">
                  <button onClick={handleMuteToggle} className="text-white/50 hover:text-white transition-colors flex-shrink-0">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume}
                    onChange={handleVolume} className="flex-1 accent-white h-1 cursor-pointer" aria-label="Volumen" />
                  <button onClick={() => setShowQueue(p => !p)}
                    className={`p-2 rounded-full transition-colors hover:bg-white/10 flex-shrink-0 ${showQueue ? 'text-green-400' : 'text-white/50 hover:text-white'}`} aria-label="Cola">
                    <ListMusic className="w-4 h-4" />
                  </button>
                </div>

                <p className="mt-4 text-[10px] text-white/20 select-none text-center md:text-left">
                  Espacio · Pausar &nbsp;|&nbsp; Shift + ← → · Cambiar &nbsp;|&nbsp; M · Silenciar
                </p>
              </div>
            </main>

            {/* Scroll hint */}
            <div className="pb-6 flex flex-col items-center gap-1.5 text-white/30">
              <span className="text-[9px] font-bold uppercase tracking-widest">Desliza para ver más</span>
              <ChevronsDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Sección scrollable */}
          <div className="bg-black/40 backdrop-blur-3xl w-full border-t border-white/5">
            <div className="max-w-4xl mx-auto px-6 py-16 space-y-16">

              {/* Cola */}
              <AnimatePresence>
                {showQueue && queue.length > 0 && (
                  <motion.section initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-6 text-white/50 uppercase text-[10px] font-bold tracking-widest">
                      <ListMusic className="w-4 h-4" />
                      <span>Cola · {queue.length} canciones</span>
                    </div>
                    <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                      {queue.map((song, i) => {
                        const active = isCurrentTrack(song);
                        return (
                          <div key={song.id || i} onClick={() => playSong(song)}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${active ? 'bg-white/15 border border-white/10' : 'hover:bg-white/8'}`}>
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                              <img src={song.cover_url || song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                              {active && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><EqualizerBars isPlaying={isPlaying} /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${active ? 'text-green-400' : 'text-white'}`}>{song.title}</p>
                              <p className="text-xs text-white/40 truncate">{song.display_artist || song.artist}</p>
                            </div>
                            {!active && <Play className="w-4 h-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </div>
                        );
                      })}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Tracks del álbum + Siguiente */}
              {(albumTracks.length > 0 || nextSong) && (
                <section>
                  {albumTracks.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-4 text-white/50 uppercase text-[10px] font-bold tracking-widest">
                        <Disc className="w-4 h-4" />
                        <span>{currentSong.album_title || 'Álbum'} · {albumTracks.length} canciones</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
                        {albumTracks.map((track, i) => {
                          const active = isCurrentTrack(track);
                          return (
                            <div key={track.id} onClick={() => playSong(track)}
                              className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-all group border-b border-white/5 last:border-0 ${active ? 'bg-white/10' : 'hover:bg-white/8'}`}>
                              <div className="w-6 flex-shrink-0 text-center">
                                {active ? <EqualizerBars isPlaying={isPlaying} /> : <span className="text-xs text-white/30 group-hover:hidden">{track.track_number || i + 1}</span>}
                                {!active && <Play className="w-3 h-3 text-white/60 hidden group-hover:block mx-auto" fill="currentColor" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${active ? 'text-green-400' : 'text-white group-hover:text-green-400 transition-colors'}`}>{track.title}</p>
                                <p className="text-xs text-white/40 truncate">{track.display_artist}</p>
                              </div>
                              {track.duration && <span className="text-xs text-white/30 flex-shrink-0 tabular-nums">{formatTime(track.duration)}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {nextSong && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-3 text-white/50 uppercase text-[10px] font-bold tracking-widest">
                        <SkipForward className="w-4 h-4" />
                        <span>Siguiente en la cola</span>
                      </div>
                      <div onClick={() => playSong(nextSong)}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                        <img src={nextSong.cover_url || nextSong.coverUrl} alt={nextSong.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate group-hover:text-green-400 transition-colors">{nextSong.title}</p>
                          <p className="text-xs text-white/40 truncate">{nextSong.display_artist || nextSong.artist}</p>
                        </div>
                        <Play className="w-5 h-5 text-white/40 group-hover:text-white transition-colors flex-shrink-0" />
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Acerca del artista */}
              {artistInfo && (
                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10">
                  <div className="flex items-center gap-2 mb-8 text-white/50 uppercase text-[10px] font-bold tracking-widest">
                    <Mic2 className="w-4 h-4" />
                    <span>Acerca del artista</span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="relative flex-shrink-0">
                      <div className="w-36 h-36 rounded-full overflow-hidden shadow-2xl ring-4 ring-white/10">
                        <img src={artistInfo.avatar_url || coverUrl} alt={artistInfo.artist_name} className="w-full h-full object-cover" />
                      </div>
                      {artistInfo.is_featured && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-yellow-400 text-black text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap">
                          <Star className="w-2.5 h-2.5" fill="currentColor" /> Artista de la semana
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-3xl font-black mb-1">{artistInfo.artist_name || artistName}</h2>
                      {artistInfo.artist_genre && <p className="text-xs text-white/40 uppercase tracking-widest mb-4">{artistInfo.artist_genre}</p>}
                      <p className="text-white/55 leading-relaxed max-w-xl mb-6 text-sm">{artistInfo.artist_bio || 'Este artista aún no ha añadido una biografía.'}</p>
                      <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-6 gap-y-4">
                        <div className="text-center md:text-left">
                          <p className="font-black text-2xl">{formatNumber(artistInfo.followers)}</p>
                          <p className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">Seguidores</p>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="text-center md:text-left">
                          <div className="flex items-center gap-1 justify-center md:justify-start">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            <p className="font-black text-2xl">{formatNumber(artistInfo.monthly_streams)}</p>
                          </div>
                          <p className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">Reproducciones mensuales</p>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="text-center md:text-left">
                          <p className="font-black text-2xl">{artistInfo.artist_genre || 'Indie'}</p>
                          <p className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">Género</p>
                        </div>
                      </div>
                      {artistInfo.location && (
                        <p className="mt-4 text-xs text-white/30 flex items-center gap-1 justify-center md:justify-start">📍 {artistInfo.location}</p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Más canciones del artista */}
              {relatedSongs.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-6 text-white/50 uppercase text-[10px] font-bold tracking-widest">
                    <Music2 className="w-4 h-4" />
                    <span>Más de {artistName}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {relatedSongs.map(song => (
                      <div key={song.id} onClick={() => playSong(song)}
                        className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group">
                        <div className="relative flex-shrink-0">
                          <img src={song.cover_url} alt={song.title} className="w-14 h-14 rounded-xl object-cover" />
                          <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-5 h-5" fill="currentColor" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate group-hover:text-green-400 transition-colors">{song.title}</h4>
                          <p className="text-xs text-white/40 truncate mt-0.5">{song.display_artist}</p>
                        </div>
                        {/* Botón añadir a cola — ahora funcional */}
                        <button
                          onClick={(e) => handleAddToQueue(song, e)}
                          className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 flex-shrink-0"
                          aria-label="Añadir a cola"
                          title="Añadir a cola"
                        >
                          {addedToQueue[song.id]
                            ? <Check className="w-4 h-4 text-green-400" />
                            : <Plus className="w-4 h-4 text-white/60 hover:text-white" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════
          MINI PLAYER
      ══════════════════════════════════════════════════════ */}
      {!isFullscreen && (
        <motion.div
          key="mini"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          {/* Barra de progreso interactiva del mini player */}
          <div className="relative h-[3px] bg-gray-200 w-full group cursor-pointer">
            <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${progressPct}%` }} />
            {/* Dot handle al hacer hover */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-600 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5"
              style={{ left: `${progressPct}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ height: '12px', top: '-4px' }}
              aria-label="Progreso"
            />
          </div>

          {/* Hint */}
          <AnimatePresence>
            {showOpenHint && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap"
              >
                <ChevronUp className="w-3 h-3 animate-bounce" />
                Toca para abrir
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white border-t border-gray-100 px-4 py-2.5 flex items-center gap-3 shadow-2xl">
            {/* Portada + info */}
            <div className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer group"
              onClick={() => setIsFullscreen(true)} role="button" tabIndex={0} aria-label="Abrir reproductor completo">
              <div className="relative flex-shrink-0">
                <motion.img src={coverUrl} alt={currentSong.title} className="w-11 h-11 rounded-lg shadow-md object-cover"
                  animate={{ scale: isPlaying ? [1, 1.04, 1] : 1 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                {isPlaying && (
                  <div className="absolute inset-0 rounded-lg bg-black/30 flex items-center justify-center">
                    <EqualizerBars isPlaying={isPlaying} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate leading-tight group-hover:text-purple-600 transition-colors">{currentSong.title}</p>
                <p className="text-xs text-gray-400 truncate leading-tight">{artistName}</p>
              </div>
            </div>

            {/* Like */}
            <button onClick={() => setIsLiked(p => !p)} className="p-2 flex-shrink-0" aria-label={isLiked ? 'Quitar like' : 'Dar like'}>
              <Heart className={`w-5 h-5 transition-colors ${isLiked ? 'fill-purple-600 text-purple-600' : 'text-gray-300 hover:text-gray-500'}`} />
            </button>

            {/* Controles */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={playPrev} className="p-2 text-gray-400 hover:text-gray-800 transition-colors rounded-full hover:bg-gray-100" aria-label="Anterior">
                <SkipBack size={18} fill="currentColor" />
              </button>
              <button
                onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
                className="w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={playNext} className="p-2 text-gray-400 hover:text-gray-800 transition-colors rounded-full hover:bg-gray-100" aria-label="Siguiente">
                <SkipForward size={18} fill="currentColor" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

    </AnimatePresence>
  );
}

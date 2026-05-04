import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { supabase } from '../lib/supabase';
import { 
  Play, Pause, SkipBack, SkipForward, ChevronDown, 
  Volume2, ListMusic, Mic2, Users, Disc, Share2, 
  MoreHorizontal, ChevronsDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Función de extracción de color mejorada
function extractColor(imageUrl, callback) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 50; canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
    }
    // Oscurecemos un poco menos para que el color sea vibrante pero profundo
    callback(`${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)}`);
  };
  img.onerror = () => callback('30, 10, 60');
  img.src = imageUrl;
}

export default function Player() {
  const {
    currentSong, isPlaying, isVisible, setIsVisible,
    isFullscreen, setIsFullscreen, volume, progress, duration,
    playSong, pauseSong, playNext, playPrev, handleSeek, handleVolume, formatTime
  } = usePlayer();

  const [dominantColor, setDominantColor] = useState('30, 10, 60');
  const [artistInfo, setArtistInfo] = useState(null);
  const [relatedSongs, setRelatedSongs] = useState([]);

  const coverUrl = currentSong?.cover_url || currentSong?.coverUrl || '';
  const artistName = currentSong?.display_artist || currentSong?.artist_name || currentSong?.artist || 'Artista';

  // Efecto para extraer color
  useEffect(() => {
    if (coverUrl) extractColor(coverUrl, setDominantColor);
  }, [coverUrl]);

  // Efecto para cargar info de Supabase
  useEffect(() => {
    if (!currentSong || currentSong.isSpotify) return;
    const fetchArtistData = async () => {
      try {
        if (currentSong.user_id) {
          const { data: profile } = await supabase.from('public_profiles').select('*').eq('user_id', currentSong.user_id).single();
          setArtistInfo(profile);
          const { data: songs } = await supabase.from('songs').select('*').eq('user_id', currentSong.user_id).neq('id', currentSong.id).limit(4);
          setRelatedSongs(songs || []);
        }
      } catch (e) { console.error(e); }
    };
    fetchArtistData();
  }, [currentSong]);

  if (!currentSong || !isVisible) return null;

  return (
    <AnimatePresence>
      {isFullscreen ? (
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden text-white"
          style={{ backgroundColor: `rgb(${dominantColor})` }}
        >
          {/* Fondo Inmersivo */}
          <div className="fixed inset-0 -z-10 overflow-hidden">
            <div 
              className="absolute inset-0 opacity-40 blur-[100px] scale-150"
              style={{ background: `radial-gradient(circle at center, rgb(${dominantColor}), #000)` }}
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Contenedor Principal: Altura ajustada para forzar el scroll */}
          <div className="min-h-screen flex flex-col">
            
            {/* Header */}
            <header className="p-6 flex items-center justify-between">
              <button onClick={() => setIsFullscreen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronDown className="w-8 h-8" />
              </button>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Reproduciendo desde</p>
                <p className="text-sm font-bold">{currentSong.genre || "Tu Biblioteca"}</p>
              </div>
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </header>

            {/* Area del Reproductor (Vista PC/Laptop) */}
            <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 px-8 max-w-7xl mx-auto w-full py-8">
              
              {/* Portada */}
              <div className="w-full max-w-[320px] md:max-w-[450px] aspect-square shadow-2xl shadow-black/60 rounded-xl overflow-hidden">
                <img src={coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />
              </div>

              {/* Controles e Info */}
              <div className="flex-1 w-full max-w-[500px]">
                <div className="mb-8">
                  <h1 className="text-3xl md:text-5xl font-black mb-2 line-clamp-1">{currentSong.title}</h1>
                  <p className="text-lg md:text-xl text-white/70 font-medium">{artistName}</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="relative h-1.5 w-full bg-white/20 rounded-full cursor-pointer group">
                    <div 
                      className="absolute h-full bg-white rounded-full group-hover:bg-green-400" 
                      style={{ width: `${(progress/duration)*100}%` }}
                    />
                    <input 
                      type="range" min={0} max={duration || 0} step={0.1} value={progress} onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs font-bold text-white/50">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex items-center justify-between">
                  <button className="text-white/60 hover:text-white transition-colors"><ListMusic /></button>
                  <div className="flex items-center gap-8">
                    <button onClick={playPrev} className="hover:scale-110 transition-transform"><SkipBack fill="currentColor" /></button>
                    <button 
                      onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
                      className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={playNext} className="hover:scale-110 transition-transform"><SkipForward fill="currentColor" /></button>
                  </div>
                  <button className="text-white/60 hover:text-white transition-colors"><Share2 /></button>
                </div>

                {/* Volumen */}
                <div className="mt-10 flex items-center gap-3 w-32 mx-auto md:mx-0">
                  <Volume2 className="w-4 h-4 text-white/50" />
                  <input 
                    type="range" min={0} max={1} step={0.01} value={volume} onChange={handleVolume}
                    className="flex-1 accent-white h-1"
                  />
                </div>
              </div>
            </main>

            {/* Scroll Hint */}
            <div className="pb-8 flex flex-col items-center gap-2 animate-bounce text-white/40">
              <span className="text-[10px] font-bold uppercase tracking-widest">Desliza para ver más</span>
              <ChevronsDown />
            </div>
          </div>

          {/* SECCIÓN DETALLES (SCROLLABLE) */}
          <div className="bg-black/30 backdrop-blur-3xl w-full">
            <div className="max-w-5xl mx-auto px-6 py-20 space-y-20">
              
              {/* Acerca del Artista */}
              {artistInfo && (
                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12">
                  <div className="flex items-center gap-3 mb-8 text-white/60 uppercase text-xs font-bold tracking-widest">
                    <Mic2 className="w-4 h-4" /> <span>Acerca del artista</span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-10 items-center">
                    <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl ring-4 ring-white/10">
                      <img src={artistInfo.avatar_url || coverUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-4xl font-black mb-4">{artistInfo.artist_name || artistName}</h2>
                      <p className="text-white/60 leading-relaxed max-w-2xl mb-6">
                        {artistInfo.artist_bio || "Este artista aún no ha añadido una biografía a su perfil."}
                      </p>
                      <div className="flex justify-center md:justify-start gap-4">
                        <div className="text-center">
                          <p className="font-bold text-xl">{artistInfo.followers || '0'}</p>
                          <p className="text-[10px] text-white/40 uppercase">Seguidores</p>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-4" />
                        <div className="text-center">
                          <p className="font-bold text-xl">{artistInfo.artist_genre || 'Indie'}</p>
                          <p className="text-[10px] text-white/40 uppercase">Género</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Más canciones */}
              {relatedSongs.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-8 text-white/60 uppercase text-xs font-bold tracking-widest">
                    <Disc className="w-4 h-4" /> <span>Más de {artistName}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {relatedSongs.map(song => (
                      <div 
                        key={song.id} onClick={() => playSong(song)}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                      >
                        <img src={song.cover_url} className="w-16 h-16 rounded-lg object-cover" />
                        <div className="flex-1">
                          <h4 className="font-bold group-hover:text-green-400 transition-colors">{song.title}</h4>
                          <p className="text-xs text-white/50">{song.display_artist}</p>
                        </div>
                        <Play className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        /* MINI PLAYER (Versión optimizada) */
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-4 py-2 flex items-center gap-4 shadow-2xl">
          <div className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer" onClick={() => setIsFullscreen(true)}>
            <img src={coverUrl} className="w-12 h-12 rounded-md shadow-md" />
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{currentSong.title}</p>
              <p className="text-xs text-gray-500 truncate">{artistName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={playPrev} className="p-2 text-gray-600 hover:text-black"><SkipBack size={20} fill="currentColor" /></button>
            <button 
              onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
              className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center"
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={playNext} className="p-2 text-gray-600 hover:text-black"><SkipForward size={20} fill="currentColor" /></button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
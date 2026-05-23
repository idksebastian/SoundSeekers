from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import random
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caché simple en memoria
_cache = {}
CACHE_TTL = 300  # 5 minutos

# iTunes Search API — gratuita, sin key, previews de 30s garantizados
MOOD_QUERIES = {
    "happy":     ["reggaeton", "salsa", "cumbia", "bachata feliz", "pop latino"],
    "sad":       ["balada romantica latina", "bolero", "latin ballad sad", "desamor"],
    "energetic": ["latin trap", "reggaeton perreo", "dembow", "electro latino"],
    "calm":      ["bossa nova", "latin jazz", "acoustic latino", "flamenco"],
    "nostalgic": ["salsa clasica", "bolero clasico", "cumbia clasica", "vallenato"],
    "focused":   ["latin instrumental", "jazz latino", "flamenco guitar", "piano latino"],
}

WEATHER_QUERIES = {
    "sunny":  ["tropical", "salsa", "merengue", "caribbean"],
    "rainy":  ["ballad", "romantic latin", "soft latin"],
    "cloudy": ["indie latino", "folk latin", "acoustic"],
    "night":  ["latin night", "salsa noche", "bachata"],
    "cold":   ["acoustic guitar", "latin folk", "soft ballad"],
    "warm":   ["tropical latin", "cumbia", "salsa"],
}

async def search_itunes(term: str, limit: int = 15) -> list:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://itunes.apple.com/search",
                params={
                    "term": term,
                    "media": "music",
                    "limit": limit,
                    "country": "CO",  # Colombia
                    "lang": "es_es",
                },
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("results", [])
        except Exception as e:
            print(f"Error en iTunes API: {e}")
    return []

@app.get("/recommendations")
async def get_recommendations(mood: str, weather: str):
    cache_key = f"{mood}_{weather}"
    now = time.time()

    # Devolver caché si está fresco
    if cache_key in _cache:
        cached = _cache[cache_key]
        if now - cached["timestamp"] < CACHE_TTL:
            songs = cached["songs"].copy()
            random.shuffle(songs)
            return {"songs": songs[:8], "mood": mood, "weather": weather, "cached": True}

    mood_queries = MOOD_QUERIES.get(mood, MOOD_QUERIES["happy"])
    weather_queries = WEATHER_QUERIES.get(weather, WEATHER_QUERIES["sunny"])

    all_tracks = []

    # Hacer 2 búsquedas con queries distintas
    for _ in range(2):
        mq = random.choice(mood_queries)
        wq = random.choice(weather_queries)
        query = f"{mq} {wq}"
        tracks = await search_itunes(query)
        all_tracks.extend(tracks)

    # Si no hay suficientes, buscar solo por mood
    if len(all_tracks) < 5:
        tracks = await search_itunes(random.choice(mood_queries), limit=20)
        all_tracks.extend(tracks)

    # Filtrar solo los que tienen preview y eliminar duplicados por trackId
    seen_ids = set()
    tracks_with_preview = []
    for t in all_tracks:
        track_id = t.get("trackId")
        preview = t.get("previewUrl")
        if preview and track_id and track_id not in seen_ids:
            seen_ids.add(track_id)
            tracks_with_preview.append(t)

    random.shuffle(tracks_with_preview)

    songs = []
    for track in tracks_with_preview[:12]:
        songs.append({
            "title":      track.get("trackName", "Sin título"),
            "artist":     track.get("artistName", "Artista desconocido"),
            "coverUrl":   track.get("artworkUrl100", "").replace("100x100", "300x300"),
            "previewUrl": track.get("previewUrl"),
            "externalUrl": track.get("trackViewUrl", ""),
            "albumTitle": track.get("collectionName", ""),
            "duration":   int(track.get("trackTimeMillis", 30000) / 1000),
            "genre":      track.get("primaryGenreName", ""),
        })

    # Guardar en caché
    if songs:
        _cache[cache_key] = {"songs": songs, "timestamp": now}

    return {"songs": songs[:8], "mood": mood, "weather": weather, "cached": False}

@app.get("/health")
def health():
    return {"status": "ok", "api": "iTunes Search API", "cached_keys": list(_cache.keys())}

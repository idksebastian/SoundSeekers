from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import random
import time
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_KEY = os.getenv("GEMINI_API_KEY")

# Caché para recomendaciones de Ánimo
_cache = {}
CACHE_TTL = 300

MOOD_QUERIES = {
    "happy":     ["reggaeton feliz", "pop latino alegre", "cumbia fiesta", "salsa alegre", "bachata feliz", "pop español positivo"],
    "sad":       ["balada romántica", "canción triste latina", "desamor latino", "bolero triste", "pop triste español", "indie triste"],
    "energetic": ["reggaeton perreo", "latin trap", "electrónica latina", "urban latino", "dembow", "trap latino energía"],
    "calm":      ["acústico latino relajante", "indie español suave", "bossa nova", "flamenco suave", "jazz latino", "lo fi español"],
    "nostalgic": ["boleros clásicos", "salsa romántica", "cumbia clásica", "vallenato", "ranchera", "merengue clásico"],
    "focused":   ["instrumental latino", "flamenco moderno", "lo-fi español", "jazz latino concentración", "clásica española", "piano instrumental"],
}

WEATHER_QUERIES = {
    "sunny":  ["verano latino", "playa tropical", "salsa sol", "caribe"],
    "rainy":  ["balada lluvia", "romántico lluvioso", "indie lluvia", "melancólico"],
    "cloudy": ["melancólico español", "indie nublado", "folk latino", "gris"],
    "night":  ["noche urbana latina", "salsa noche", "reggaeton noche", "bachata noche"],
    "cold":   ["acústico invierno", "balada fría", "folk invernal", "piano frío"],
    "warm":   ["tropical español", "tarde latina", "cumbia calurosa", "salsa caliente"],
}

# ─── ENDPOINT CHAT (SeekeAI) ──────────────────────────────────────────────────

@app.post("/chat")
async def chat(request: dict):
    messages = request.get("messages", [])

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}",
            json={"contents": messages},
            timeout=30.0
        )

    if not res.is_success:
        return {"error": f"Gemini error {res.status_code}", "reply": None}

    data = res.json()
    text = (
        data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
    )
    return {"reply": text}


# ─── ENDPOINT RECOMENDACIONES (Ánimo) ────────────────────────────────────────

async def search_itunes(term: str, limit: int = 15) -> list:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://itunes.apple.com/search",
                params={
                    "term": term,
                    "media": "music",
                    "limit": limit,
                    "country": "CO",
                    "lang": "es_es",
                },
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json().get("results", [])
        except Exception as e:
            print(f"Error en iTunes API: {e}")
    return []

@app.get("/recommendations")
async def get_recommendations(mood: str, weather: str):
    cache_key = f"{mood}_{weather}"
    now = time.time()

    if cache_key in _cache:
        cached = _cache[cache_key]
        if now - cached["timestamp"] < CACHE_TTL:
            songs = cached["songs"].copy()
            random.shuffle(songs)
            return {"songs": songs[:8], "mood": mood, "weather": weather, "cached": True}

    mood_queries = MOOD_QUERIES.get(mood, MOOD_QUERIES["happy"])
    weather_queries = WEATHER_QUERIES.get(weather, WEATHER_QUERIES["sunny"])

    all_tracks = []
    for _ in range(2):
        mq = random.choice(mood_queries)
        wq = random.choice(weather_queries)
        tracks = await search_itunes(f"{mq} {wq}")
        all_tracks.extend(tracks)

    if len(all_tracks) < 5:
        tracks = await search_itunes(random.choice(mood_queries), limit=20)
        all_tracks.extend(tracks)

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

    if songs:
        _cache[cache_key] = {"songs": songs, "timestamp": now}

    return {"songs": songs[:8], "mood": mood, "weather": weather, "cached": False}


@app.get("/health")
def health():
    return {"status": "ok", "gemini": bool(GEMINI_KEY)}

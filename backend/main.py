from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MOOD_QUERIES = {
    "happy":     ["reggaeton feliz", "pop latino alegre", "cumbia fiesta", "salsa alegre"],
    "sad":       ["balada romántica", "canción triste latina", "desamor latino", "bolero triste"],
    "energetic": ["reggaeton perreo", "latin trap", "electrónica latina", "urban latino"],
    "calm":      ["acústico latino relajante", "indie español suave", "bossa nova", "flamenco suave"],
    "nostalgic": ["boleros clásicos", "salsa romántica", "cumbia clásica", "vallenato"],
    "focused":   ["instrumental latino", "flamenco moderno", "lo-fi español", "jazz latino"],
}

WEATHER_QUERIES = {
    "sunny":  ["verano latino", "playa tropical", "salsa sol"],
    "rainy":  ["balada lluvia", "romántico lluvioso", "indie lluvia"],
    "cloudy": ["melancólico español", "indie nublado", "folk latino"],
    "night":  ["noche urbana latina", "salsa noche", "reggaeton noche"],
    "cold":   ["acústico invierno", "balada fría", "folk invernal"],
    "warm":   ["tropical español", "tarde latina", "cumbia calurosa"],
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
}

@app.get("/recommendations")
async def get_recommendations(mood: str, weather: str):
    mood_queries = MOOD_QUERIES.get(mood, MOOD_QUERIES["happy"])
    weather_queries = WEATHER_QUERIES.get(weather, WEATHER_QUERIES["sunny"])

    query = f"{random.choice(mood_queries)} {random.choice(weather_queries)}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.deezer.com/search",
            params={
                "q": query,
                "limit": 20,
                "order": "RANKING",
            },
            headers=HEADERS,
            timeout=10.0
        )

    if response.status_code != 200:
        # Intentar con query más simple si falla
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.deezer.com/search",
                params={"q": random.choice(mood_queries), "limit": 20},
                headers=HEADERS,
                timeout=10.0
            )

    data = response.json()
    tracks = data.get("data", [])

    # Deezer siempre tiene previews — filtrar los que tengan preview no vacío
    tracks_with_preview = [t for t in tracks if t.get("preview") and t["preview"] != ""]

    random.shuffle(tracks_with_preview)

    songs = []
    for track in tracks_with_preview[:8]:
        songs.append({
            "title":      track["title"],
            "artist":     track["artist"]["name"],
            "coverUrl":   track["album"]["cover_medium"],
            "previewUrl": track["preview"],
            "deezerUrl":  track["link"],
            "albumTitle": track["album"]["title"],
            "duration":   track.get("duration", 30),
        })

    return {"songs": songs, "mood": mood, "weather": weather}

@app.get("/health")
def health():
    return {"status": "ok", "api": "Deezer"}

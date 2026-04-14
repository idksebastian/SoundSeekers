from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
import os
import random

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET")
))

MOOD_QUERIES = {
    "happy":     ["feliz pop latino reggaeton", "música alegre española", "fiesta latina hits"],
    "sad":       ["balada romántica española", "triste canción española", "desamor latino"],
    "energetic": ["reggaeton perreo", "latin trap urbano", "electrónica latina"],
    "calm":      ["música tranquila española", "acústico español relajante", "indie español suave"],
    "nostalgic": ["boleros clásicos españoles", "salsa romántica", "cumbia clásica"],
    "focused":   ["instrumental latino", "flamenco moderno", "música española concentración"],
}

WEATHER_QUERIES = {
    "sunny":  ["verano latino", "playa reggaeton"],
    "rainy":  ["lluvia balada española", "romántico lluvioso"],
    "cloudy": ["indie español nublado", "melancólico español"],
    "night":  ["noche latina urbano", "salsa noche"],
    "cold":   ["invierno español acústico", "frío balada"],
    "warm":   ["tarde calurosa latina", "tropical español"],
}

@app.get("/recommendations")
def get_recommendations(mood: str, weather: str):
    mood_queries = MOOD_QUERIES.get(mood, MOOD_QUERIES["happy"])
    weather_queries = WEATHER_QUERIES.get(weather, WEATHER_QUERIES["sunny"])

    query = f"{random.choice(mood_queries)} {random.choice(weather_queries)}"

    results = sp.search(
        q=query,
        type="track",
        limit=10,
        market="CO"  # Colombia tiene más previews disponibles
    )
    tracks = results["tracks"]["items"]

    # Priorizar canciones con preview disponible
    with_preview = [t for t in tracks if t.get("preview_url")]
    without_preview = [t for t in tracks if not t.get("preview_url")]

    random.shuffle(with_preview)
    random.shuffle(without_preview)

    # Primero las que tienen preview, luego las que no
    ordered = with_preview + without_preview

    songs = []
    for track in ordered[:6]:
        songs.append({
            "title":      track["name"],
            "artist":     track["artists"][0]["name"],
            "coverUrl":   track["album"]["images"][0]["url"] if track["album"]["images"] else "",
            "spotifyUrl": track["external_urls"]["spotify"],
            "previewUrl": track.get("preview_url"),
            "popularity": track.get("popularity", 0),
        })

    return {"songs": songs, "mood": mood, "weather": weather}

@app.get("/health")
def health():
    return {"status": "ok"}

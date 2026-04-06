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
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET")
))

# Palabras clave de búsqueda por ánimo + clima
MOOD_QUERIES = {
    "happy":     ["happy upbeat pop", "feel good music", "happy indie"],
    "sad":       ["sad melancholic", "heartbreak indie", "sad acoustic"],
    "energetic": ["high energy workout", "energetic electronic", "pump up"],
    "calm":      ["calm relaxing ambient", "peaceful acoustic", "chill lofi"],
    "nostalgic": ["nostalgic 90s", "nostalgic indie folk", "classic vibes"],
    "focused":   ["focus study music", "concentration instrumental", "deep focus"],
}

WEATHER_QUERIES = {
    "sunny":  ["sunny day vibes", "summer pop"],
    "rainy":  ["rainy day music", "cozy rain"],
    "cloudy": ["cloudy day indie", "grey sky music"],
    "night":  ["late night music", "midnight vibes"],
    "cold":   ["cold winter music", "cozy fireplace"],
    "warm":   ["warm summer evening", "golden hour music"],
}

@app.get("/recommendations")
def get_recommendations(mood: str, weather: str):
    mood_queries = MOOD_QUERIES.get(mood, MOOD_QUERIES["happy"])
    weather_queries = WEATHER_QUERIES.get(weather, WEATHER_QUERIES["sunny"])

    # Combinar una query de ánimo con una de clima aleatoriamente
    query = f"{random.choice(mood_queries)} {random.choice(weather_queries)}"

    results = sp.search(q=query, type="track", limit=10)
    tracks = results["tracks"]["items"]

    # Mezclar y tomar 6
    random.shuffle(tracks)
    songs = []
    for track in tracks[:6]:
        songs.append({
            "title":      track["name"],
            "artist":     track["artists"][0]["name"],
            "coverUrl":   track["album"]["images"][0]["url"] if track["album"]["images"] else "",
            "spotifyUrl": track["external_urls"]["spotify"],
            "previewUrl": track.get("preview_url"),
        })

    return {"songs": songs, "mood": mood, "weather": weather}

@app.get("/health")
def health():
    return {"status": "ok"}
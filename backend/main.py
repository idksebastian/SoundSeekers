from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import random
import time
import os
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler

load_dotenv()

GEMINI_KEY  = os.getenv("GEMINI_API_KEY")
MISTRAL_KEY = os.getenv("MISTRAL_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def publish_due_presaves():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return
    now = time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()) + 'Z'
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                f"{SUPABASE_URL}/rest/v1/albums",
                headers=headers,
                params={
                    "status": "eq.presave",
                    "presave_date": f"lte.{now}",
                    "select": "id,title,user_id,presave_date",
                }
            )
            albums = res.json() if res.is_success else []
            print(f"[Presave cron] Álbumes a publicar: {len(albums)}")

            for album in albums:
                album_id = album["id"]

                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/albums?id=eq.{album_id}",
                    headers=headers,
                    json={"status": "published"}
                )

                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/songs?album_id=eq.{album_id}",
                    headers=headers,
                    json={"status": "published"}
                )

                res_p = await client.get(
                    f"{SUPABASE_URL}/rest/v1/presaves",
                    headers=headers,
                    params={"album_id": f"eq.{album_id}", "select": "user_id"}
                )
                presavers = res_p.json() if res_p.is_success else []
                print(f"[Presave cron] Notificando {len(presavers)} presavers del álbum {album['title']}")

                for p in presavers:
                    await client.post(
                        f"{SUPABASE_URL}/rest/v1/notifications",
                        headers=headers,
                        json={
                            "user_id": p["user_id"],
                            "type": "system",
                            "from_user_id": album["user_id"],
                            "reference_id": album_id,
                            "message": f"¡\"{album['title']}\" ya está disponible! 🎵 Escúchalo ahora.",
                        }
                    )

            res_s = await client.get(
                f"{SUPABASE_URL}/rest/v1/songs",
                headers=headers,
                params={
                    "status": "eq.presave",
                    "presave_date": f"lte.{now}",
                    "select": "id,title,user_id",
                }
            )
            singles = res_s.json() if res_s.is_success else []
            print(f"[Presave cron] Singles a publicar: {len(singles)}")

            for song in singles:
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/songs?id=eq.{song['id']}",
                    headers=headers,
                    json={"status": "published"}
                )
                print(f"[Presave cron] Single publicado: {song['title']}")

        except Exception as e:
            print(f"[Presave cron] Error: {e}")


scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(publish_due_presaves, 'interval', minutes=5, id='presave_cron')
    scheduler.start()
    print("[Scheduler] Cron de presaves iniciado (cada 5 min)")
    yield
    scheduler.shutdown()
    print("[Scheduler] Cron detenido")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://soundseekers.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

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


async def call_gemini(messages: list) -> str | None:
    if not GEMINI_KEY:
        return None
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}",
                json={"contents": messages},
                timeout=30.0
            )
        if not res.is_success:
            print(f"Gemini error: {res.status_code} - {res.text[:200]}")
            return None
        data = res.json()
        return (
            data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
        ) or None
    except Exception as e:
        print(f"Gemini exception: {e}")
        return None


async def call_mistral(messages: list) -> str | None:
    if not MISTRAL_KEY:
        return None
    mistral_messages = []
    for m in messages:
        role = m.get("role", "user")
        if role == "model":
            role = "assistant"
        parts = m.get("parts", [{}])
        text = parts[0].get("text", "") if parts else ""
        mistral_messages.append({"role": role, "content": text})
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {MISTRAL_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "mistral-small-latest",
                    "messages": mistral_messages,
                    "max_tokens": 1024,
                },
                timeout=30.0
            )
        if not res.is_success:
            print(f"Mistral error: {res.status_code} - {res.text[:200]}")
            return None
        data = res.json()
        return (
            data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
        ) or None
    except Exception as e:
        print(f"Mistral exception: {e}")
        return None


@app.post("/chat")
async def chat(request: dict):
    messages = request.get("messages", [])
    reply = await call_gemini(messages)
    if not reply:
        print("Gemini falló, usando Mistral como fallback...")
        reply = await call_mistral(messages)
    if not reply:
        return {"error": "Ambos modelos fallaron", "reply": None}
    return {"reply": reply}


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

    mood_queries    = MOOD_QUERIES.get(mood, MOOD_QUERIES["happy"])
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
        preview  = t.get("previewUrl")
        if preview and track_id and track_id not in seen_ids:
            seen_ids.add(track_id)
            tracks_with_preview.append(t)

    random.shuffle(tracks_with_preview)

    songs = []
    for track in tracks_with_preview[:12]:
        songs.append({
            "title":       track.get("trackName", "Sin título"),
            "artist":      track.get("artistName", "Artista desconocido"),
            "coverUrl":    track.get("artworkUrl100", "").replace("100x100", "300x300"),
            "previewUrl":  track.get("previewUrl"),
            "externalUrl": track.get("trackViewUrl", ""),
            "albumTitle":  track.get("collectionName", ""),
            "duration":    int(track.get("trackTimeMillis", 30000) / 1000),
            "genre":       track.get("primaryGenreName", ""),
        })

    if songs:
        _cache[cache_key] = {"songs": songs, "timestamp": now}

    return {"songs": songs[:8], "mood": mood, "weather": weather, "cached": False}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "gemini":  bool(GEMINI_KEY),
        "mistral": bool(MISTRAL_KEY),
        "supabase": bool(SUPABASE_URL and SUPABASE_SERVICE_KEY),
        "scheduler": scheduler.running,
    }


@app.post("/admin/publish-presaves")
async def force_publish_presaves():
    await publish_due_presaves()
    return {"ok": True, "message": "Cron ejecutado manualmente"}
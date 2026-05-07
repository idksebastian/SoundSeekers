# SoundSeekers 🎵

## Descripción
SoundSeekers es una plataforma de descubrimiento y distribución musical enfocada en artistas emergentes latinoamericanos. Resuelve el problema de visibilidad que tienen los artistas independientes, ofreciéndoles un espacio para subir su música, conectar con oyentes y colaborar con otros artistas mediante feats. Los oyentes pueden descubrir música nueva, seguir artistas, guardar próximos lanzamientos (presave) y recibir recomendaciones personalizadas según su estado de ánimo y el clima.

## Integrantes
- Sebastian (Frontend & Backend principal — React + Supabase)
- Nicolás (Frontend colaborativo & servidor secundario — FastAPI)

## Tecnologías utilizadas
- **Lenguaje:** JavaScript (ES6+), Python
- **Framework Frontend:** React 18 + Vite + Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL) con Row Level Security
- **Autenticación:** Supabase Auth
- **Storage:** Supabase Storage (covers, audio)
- **Realtime:** Supabase Realtime (notificaciones en tiempo real)
- **Servidor secundario:** FastAPI (Python) — recomendaciones por ánimo y clima
- **Correos transaccionales:** Resend + Supabase Edge Functions
- **Despliegue:** Vercel
- **Librerías principales:**
  - `react-router-dom` — navegación
  - `@supabase/supabase-js` — cliente Supabase
  - `plus-jakarta-sans`, `bebas-neue` — tipografía (Google Fonts)

## Requisitos previos
- Node.js v18 o superior
- npm v9 o superior
- Python 3.10+ (solo si se ejecuta el servidor de recomendaciones)
- Cuenta en [Supabase](https://supabase.com) (o usar las variables de entorno del proyecto)
- Git

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/idksebastian/SoundSeekers.git
cd SoundSeekers/soundseekers
```

2. Instalar dependencias del frontend:
```bash
npm install
```

3. (Opcional) Instalar dependencias del servidor de recomendaciones:
```bash
cd ../backend
pip install -r requirements.txt
```

## Ejecución local

### Frontend
```bash
cd soundseekers
npm run dev
```
La app estará disponible en `http://localhost:5173`

### Servidor de recomendaciones (opcional)
```bash
cd backend
uvicorn main:app --reload --port 8000
```

## Base de datos

El proyecto usa **Supabase** como base de datos en la nube. Las tablas principales son:

| Tabla | Descripción |
|-------|-------------|
| `songs` | Canciones subidas por artistas |
| `albums` | Álbumes, EPs y singles |
| `user_roles` | Roles de usuario (listener / artist) |
| `profiles` | Perfiles públicos |
| `follows` | Relaciones de seguimiento |
| `notifications` | Notificaciones en tiempo real |
| `song_features` | Invitaciones de colaboración (feats) |
| `presaves` | Guardados de próximos lanzamientos |
| `posts` | Publicaciones de la comunidad |
| `post_likes` | Likes en publicaciones |
| `post_comments` | Comentarios en publicaciones |
| `admin_users` | Usuarios administradores |

Para usar el proyecto con tu propia base de datos, crea un proyecto en Supabase y ejecuta las migraciones SQL disponibles en la carpeta `/database` (si aplica), o configura las tablas manualmente según el esquema descrito.

## Variables de entorno

Crea un archivo `.env` en la carpeta `soundseekers/` con las siguientes variables:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

Puedes obtener estos valores en **Supabase → Project Settings → API**.

> ⚠️ Nunca subas el archivo `.env` al repositorio.

## Usuario de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Oyente | listener@soundseekers.co | test1234 |
| Artista | artist@soundseekers.co | test1234 |
| Admin | admin@soundseekers.co | test1234 |

> Si los usuarios de prueba no están disponibles, regístrate en la plataforma y solicita el rol de artista desde la configuración de perfil.

## Despliegue

El frontend está desplegado en **Vercel**.

Pasos generales para desplegar:

1. Conecta el repositorio de GitHub a Vercel
2. Configura las variables de entorno en Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. El build command es `npm run build`
4. El output directory es `dist`
5. Vercel detecta automáticamente Vite

## Evidencias

### Inicio — Hero Slider y descubrimiento
![Home](./evidencias/home.png)

### Explorar — Búsqueda y filtros por género
![Dashboard](./evidencias/dashboard.png)

### Perfil de artista — Tabs estilo Spotify
![Artist Profile](./evidencias/artist-profile.png)

### Reproductor fullscreen
![Player](./evidencias/player.png)

### Upload multi-paso con feats y presave
![Upload](./evidencias/upload.png)

### Ánimo y Clima Mixtape — IA con FastAPI
![Animo](./evidencias/animo.png)

> Las capturas se encuentran en la carpeta `/evidencias` del repositorio.
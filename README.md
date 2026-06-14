# SoundSeekers 

## Descripción

SoundSeekers es una plataforma de descubrimiento y distribución musical enfocada en artistas emergentes latinoamericanos. Resuelve el problema de visibilidad que tienen los artistas independientes, ofreciéndoles un espacio para subir su música, conectar con oyentes y colaborar con otros artistas mediante feats. Los oyentes pueden descubrir música nueva, seguir artistas, guardar próximos lanzamientos (presave) y recibir recomendaciones personalizadas según su estado de ánimo y el clima.

---

## Integrantes

| Nombre | Rol |
|--------|-----|
| Sebastián | Frontend & Backend principal — React + Supabase |
| Nicolás | Frontend colaborativo & servidor secundario — FastAPI |

---

## Tecnologías utilizadas

| Capa | Tecnología |
|------|-----------|
| Lenguaje principal | JavaScript (ES6+), Python 3.10+ |
| Framework frontend | React 18 + Vite |
| Estilos | Tailwind CSS |
| Base de datos | Supabase (PostgreSQL) con Row Level Security |
| Autenticación | Supabase Auth |
| Storage | Supabase Storage (covers, audio) |
| Realtime | Supabase Realtime (notificaciones en tiempo real) |
| Servidor secundario | FastAPI (Python) — recomendaciones por ánimo y clima |
| API de música | Deezer API (gratuita, sin key) |
| IA conversacional | Google Gemini 1.5 Flash |
| Correos transaccionales | Resend + Supabase Edge Functions |
| Despliegue frontend | Vercel |
| Librerías principales | react-router-dom, @supabase/supabase-js, httpx |
| Tipografía | Plus Jakarta Sans, Bebas Neue (Google Fonts) |

---

## Arquitectura del proyecto

SoundSeekers es una aplicación **full stack** con dos servicios separados:

- **Frontend**: React 18 + Vite desplegado en Vercel. Genera un directorio `dist/` con archivos estáticos optimizados.
- **Backend secundario**: FastAPI (Python) que expone una API REST para recomendaciones musicales usando Deezer. Se ejecuta localmente en desarrollo y puede desplegarse en Render.
- **Base de datos**: Supabase (PostgreSQL en la nube) — no requiere instalación local.

```
SoundSeekers/
├── src/                  # Código fuente React
│   ├── api/              # Llamadas a Supabase y APIs externas
│   ├── components/       # Componentes reutilizables
│   ├── context/          # AuthContext, PlayerContext
│   ├── pages/            # Vistas principales
│   └── lib/              # Cliente de Supabase
├── backend/              # Servidor FastAPI (Python)
│   ├── main.py           # Endpoints de recomendaciones
│   └── requirements.txt  # Dependencias Python
├── public/               # Archivos estáticos
├── .env.example          # Variables de entorno de ejemplo
├── package.json          # Dependencias Node.js
└── README.md
```

---

## Requisitos previos

- **Node.js** v18 o superior
- **npm** v9 o superior
- **Python** 3.10+ (solo para el servidor de recomendaciones)
- **pip** (gestor de paquetes Python)
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Google AI Studio](https://aistudio.google.com) (para SeekeAI)
- Git

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/idksebastian/SoundSeekers.git
cd SoundSeekers
```

### 2. Instalar dependencias del frontend

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y completa con tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus valores reales (ver sección Variables de entorno).

### 4. (Opcional) Instalar dependencias del servidor de recomendaciones

```bash
cd backend
pip install -r requirements.txt
```

---

## Ejecución local

### Frontend

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

### Servidor de recomendaciones (necesario para el módulo Ánimo)

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

El servidor estará en `http://localhost:8000`. Déjalo corriendo en una terminal separada mientras usas el módulo Ánimo.

---

## Base de datos

El proyecto usa **Supabase** como base de datos en la nube (PostgreSQL). No requiere instalación local.

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `songs` | Canciones subidas por artistas |
| `albums` | Álbumes, EPs y singles |
| `user_roles` | Roles de usuario (listener / artist) |
| `profiles` | Perfiles públicos |
| `public_profiles` | Vista pública de perfiles para el reproductor |
| `follows` | Relaciones de seguimiento |
| `notifications` | Notificaciones en tiempo real |
| `song_features` | Invitaciones de colaboración (feats) |
| `presaves` | Guardados de próximos lanzamientos |
| `posts` | Publicaciones de la comunidad |
| `post_likes` | Likes en publicaciones |
| `post_comments` | Comentarios en publicaciones |
| `admin_users` | Usuarios administradores |

### Configurar base de datos propia

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a **Project Settings → API** y copia `Project URL` y `anon public key`
3. Crea las tablas según el esquema descrito arriba
4. Configura Row Level Security (RLS) según las políticas del proyecto
5. Agrega las credenciales a tu archivo `.env`

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui

# SeekeAI (Google Gemini)
VITE_GEMINI_API_KEY=tu_gemini_api_key_aqui
```

Puedes obtener los valores de Supabase en **Project Settings → API**.
La API key de Gemini se obtiene en [aistudio.google.com](https://aistudio.google.com).

> ⚠️ **Nunca subas el archivo `.env` al repositorio.** Está incluido en `.gitignore`.

El archivo `.env.example` en la raíz del proyecto muestra todas las variables necesarias sin valores reales.

---

## Usuario de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Oyente | listener@soundseekers.co | test1234 |
| Artista | artist@soundseekers.co | test1234 |
| Admin | admin@soundseekers.co | test1234 |

> Si los usuarios de prueba no están disponibles, regístrate en la plataforma y solicita el rol de artista desde la configuración de perfil.

---

## Despliegue

### Arquitectura de despliegue

| Servicio | Plataforma | Justificación |
|----------|-----------|---------------|
| Frontend (React + Vite) | **Vercel** | Ideal para frontend moderno, detecta Vite automáticamente, deploys automáticos desde GitHub |
| Backend (FastAPI) | **Render** | Ideal para APIs Python, plan gratuito disponible, soporte nativo para uvicorn |
| Base de datos | **Supabase** (ya en la nube) | No requiere despliegue adicional |

### Desplegar frontend en Vercel

1. Visita [vercel.com](https://vercel.com) e inicia sesión con GitHub
2. Haz clic en **New Project** y selecciona el repositorio `SoundSeekers`
3. Vercel detectará Vite automáticamente
4. Configura las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
5. Build command: `npm run build`
6. Output directory: `dist`
7. Haz clic en **Deploy**

### Desplegar backend en Render

1. Visita [render.com](https://render.com) e inicia sesión con GitHub
2. Haz clic en **New → Web Service**
3. Selecciona el repositorio y la carpeta `backend/`
4. Configura:
   - Runtime: **Python**
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Haz clic en **Create Web Service**

> Una vez desplegado el backend, actualiza la URL en `src/pages/Animo.jsx` cambiando `http://localhost:8000` por la URL de Render.

---

## Pruebas post-despliegue

- [ ] La página principal carga correctamente
- [ ] Registro e inicio de sesión funcionan
- [ ] Se pueden reproducir canciones
- [ ] El módulo Ánimo devuelve recomendaciones
- [ ] La comunidad permite crear y comentar posts
- [ ] SeekeAI responde mensajes
- [ ] Las notificaciones llegan en tiempo real

---

## Riesgos y mitigación

| Riesgo | Mitigación |
|--------|-----------|
| Backend de Ánimo no disponible | El resto de la app funciona sin él; mostrar mensaje de error claro |
| Rate limiting de Deezer | Caché en memoria de 5 minutos implementado en el backend |
| Variables de entorno no configuradas | Revisar logs de Vercel/Render y comparar con `.env.example` |
| Fallo en el build de Vercel | Revisar logs, verificar que `npm run build` funcione localmente |

---

## Licencia y autoría

Proyecto desarrollado como trabajo formativo por Sebastián y Nicolás.  
© 2025 SoundSeekers — Todos los derechos reservados.

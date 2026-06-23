import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PlayerProvider, usePlayer } from './context/PlayerContext'
import { useAuth } from './context/AuthContext'
import { useEffect, useRef, lazy, Suspense } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import ArtistRoute from './components/ArtistRoute'
import PageTransition from './components/PageTransition'
import Navbar from './components/Navbar'
import Player from './components/Player'
import ChatBot from './components/ChatBot'

// ✅ Lazy loading — cada página se carga solo cuando se necesita
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Upload = lazy(() => import('./pages/Upload'))
const EditSong = lazy(() => import('./pages/EditSong'))
const Home = lazy(() => import('./pages/Home'))
const Profile = lazy(() => import('./pages/Profile'))
const Community = lazy(() => import('./pages/Community'))
const PostPage = lazy(() => import('./pages/PostPage'))
const CreatePost = lazy(() => import('./pages/CreatePost'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Animo = lazy(() => import('./pages/Animo'))
const ArtistProfile = lazy(() => import('./pages/ArtistProfile'))
const ListenerProfile = lazy(() => import('./pages/ListenerProfile'))
const Admin = lazy(() => import('./pages/Admin'))
const Requests = lazy(() => import('./pages/Requests'))
const AlbumDetail = lazy(() => import('./pages/AlbumDetail'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AI = lazy(() => import('./pages/AI'))
const Settings = lazy(() => import('./pages/Settings'))
const Terminos = lazy(() => import('./pages/Terminos'))
const Privacidad = lazy(() => import('./pages/Privacidad'))
const Cookies = lazy(() => import('./pages/Cookies'))
const Contacto = lazy(() => import('./pages/Contacto'))
const FollowersPage = lazy(() => import('./pages/FollowersPage'))

// ✅ Spinner de carga para el Suspense
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <svg className="w-8 h-8 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  )
}

function PlayerAuthBridge() {
  const { user } = useAuth()
  const { stopAndClear, restoreForUser, setActiveUserId } = usePlayer()
  const prevUserIdRef = useRef(null)

  useEffect(() => {
    const currentId = user?.id ?? null
    const prevId = prevUserIdRef.current
    if (currentId === prevId) return
    if (!currentId && prevId) {
      stopAndClear()
      setActiveUserId(null)
    } else if (currentId && currentId !== prevId) {
      if (prevId) stopAndClear()
      setActiveUserId(currentId)
      restoreForUser(currentId)
    }
    prevUserIdRef.current = currentId
  }, [user?.id])

  return null
}

function ChatBotConditional() {
  const location = useLocation()
  if (location.pathname === '/ai') return null
  return <ChatBot />
}

export default function App() {
  return (
    <PlayerProvider>
      <AuthProvider>
        <BrowserRouter>
          <PlayerAuthBridge />
          {/* ✅ Suspense wrappea todas las rutas */}
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/*" element={
                <ProtectedRoute>
                  <Navbar />
                  <PageTransition>
                    <Routes>
                      <Route path="/terminos" element={<Terminos />} />
                      <Route path="/privacidad" element={<Privacidad />} />
                      <Route path="/cookies" element={<Cookies />} />
                      <Route path="/contacto" element={<Contacto />} />
                      <Route path="/home" element={<Home />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/community" element={<Community />} />
                      <Route path="/community/post/:postId" element={<PostPage />} />
                      <Route path="/community/create" element={<CreatePost />} />
                      <Route path="/animo" element={<Animo />} />
                      <Route path="/ai" element={<AI />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/album/:albumId" element={<AlbumDetail />} />
                      <Route path="/artist/:userId" element={<ArtistProfile />} />
                      <Route path="/artist/:userId/followers" element={<FollowersPage />} />
                      <Route path="/listener/:userId" element={<ListenerProfile />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/requests" element={<Requests />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/upload" element={
                        <ArtistRoute>
                          <Upload />
                        </ArtistRoute>
                      } />
                      <Route path="/edit/:id" element={<EditSong />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </PageTransition>
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>

          <ProtectedRoute silent>
            <Player />
            <ChatBotConditional />
          </ProtectedRoute>
        </BrowserRouter>
      </AuthProvider>
    </PlayerProvider>
  )
}
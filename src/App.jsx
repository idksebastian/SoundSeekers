import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PlayerProvider, usePlayer } from './context/PlayerContext'
import { useAuth } from './context/AuthContext'
import { useEffect, useRef } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import ArtistRoute from './components/ArtistRoute'
import PageTransition from './components/PageTransition'
import Navbar from './components/Navbar'
import Player from './components/Player'
import ChatBot from './components/ChatBot'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import EditSong from './pages/EditSong'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Community from './pages/Community'
import PostPage from './pages/PostPage'
import CreatePost from './pages/CreatePost'
import NotFound from './pages/NotFound'
import Animo from './pages/Animo'
import ArtistProfile from './pages/ArtistProfile'
import ListenerProfile from './pages/ListenerProfile'
import Admin from './pages/Admin'
import Requests from './pages/Requests'
import AlbumDetail from './pages/AlbumDetail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AI from './pages/AI'
import Settings from './pages/Settings'
import Terminos from './pages/Terminos'
import Privacidad from './pages/Privacidad'
import Cookies from './pages/Cookies'
import Contacto from './pages/Contacto'
import FollowersPage from './pages/FollowersPage'

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

          <ProtectedRoute silent>
            <Player />
            <ChatBotConditional />
          </ProtectedRoute>
        </BrowserRouter>
      </AuthProvider>
    </PlayerProvider>
  )
}
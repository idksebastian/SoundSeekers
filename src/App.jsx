import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PlayerProvider } from './context/PlayerContext'
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
import NotFound from './pages/NotFound'
import Animo from './pages/Animo'
import ArtistProfile from './pages/ArtistProfile'
import Admin from './pages/Admin'
import Requests from './pages/Requests'
import AlbumDetail from './pages/AlbumDetail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AI from './pages/AI'
import Settings from './pages/Settings'

// Componente que muestra Navbar solo si el usuario está autenticado
function AppLayout({ children }) {
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas públicas — sin Navbar ni Player */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Rutas protegidas — con Navbar, PageTransition y Player */}
            <Route path="/*" element={
              <ProtectedRoute>
                <Navbar />
                <PageTransition>
                  <Routes>
                    <Route path="/home" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/animo" element={<Animo />} />
                    <Route path="/ai" element={<AI />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/album/:albumId" element={<AlbumDetail />} />
                    <Route path="/artist/:userId" element={<ArtistProfile />} />
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

          {/* Player y ChatBot fuera de las rutas pero dentro del BrowserRouter */}
          <ProtectedRoute silent>
            <Player />
            <ChatBot />
          </ProtectedRoute>
        </BrowserRouter>
      </PlayerProvider>
    </AuthProvider>
  )
}

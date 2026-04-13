import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PlayerProvider } from './context/PlayerContext'
import ProtectedRoute from './components/ProtectedRoute'
import ArtistRoute from './components/ArtistRoute'
import PageTransition from './components/PageTransition'
import Navbar from './components/Navbar'
import Player from './components/Player'
import Login from './pages/Login'
import Register from './pages/Register'
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

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <BrowserRouter>
          <Navbar />
          <PageTransition>
            <Routes>
              <Route path="/" element={<Navigate to="/home" />} />
              <Route path="/home" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/community" element={<Community />} />
              <Route path="/animo" element={<Animo />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/artist/:userId" element={<ArtistProfile />} />
              <Route path="/upload" element={
                <ProtectedRoute>
                  <ArtistRoute>
                    <Upload />
                  </ArtistRoute>
                </ProtectedRoute>
              } />
              <Route path="/edit/:id" element={
                <ProtectedRoute>
                  <EditSong />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageTransition>
          <Player />
        </BrowserRouter>
      </PlayerProvider>
    </AuthProvider>
  )
}
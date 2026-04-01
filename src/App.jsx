import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PlayerProvider } from './context/PlayerContext'
import ProtectedRoute from './components/ProtectedRoute'
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

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/home" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/edit/:id" element={<ProtectedRoute><EditSong /></ProtectedRoute>} />
            <Route path="/community" element={<Community />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Routes>
          <Player />
        </BrowserRouter>
      </PlayerProvider>
    </AuthProvider>
  )
}
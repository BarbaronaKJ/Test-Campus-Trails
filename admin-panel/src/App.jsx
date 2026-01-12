import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FacilitySearch from './pages/FacilitySearch'
import FacilityManagement from './pages/FacilityManagement'
import MapDataManager from './pages/MapDataManager'
import Notifications from './pages/Notifications'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if admin token exists
    const token = localStorage.getItem('adminToken')
    if (token) {
      // Verify token with backend
      verifyToken(token)
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async (token) => {
    try {
      const response = await fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (token, user) => {
    localStorage.setItem('adminToken', token)
    localStorage.setItem('adminUser', JSON.stringify(user))
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Login onLogin={handleLogin} />
          } 
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? 
              <Dashboard onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
          }
        />
        <Route
          path="/facilities"
          element={
            isAuthenticated ? 
              <FacilitySearch onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
          }
        />
        <Route
          path="/facility/:id"
          element={
            isAuthenticated ? 
              <FacilityManagement onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
          }
        />
        <Route
          path="/map-data"
          element={
            isAuthenticated ? 
              <MapDataManager onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
          }
        />
        <Route
          path="/notifications"
          element={
            isAuthenticated ? 
              <Notifications onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App

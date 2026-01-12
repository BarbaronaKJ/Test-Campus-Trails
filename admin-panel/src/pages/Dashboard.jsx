import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './Dashboard.css'

function Dashboard({ onLogout }) {
  const [stats, setStats] = useState({
    totalPins: 0,
    visiblePins: 0,
    invisiblePins: 0,
    totalUsers: 0,
    totalFeedbacks: 0,
    totalCampuses: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        setError('Failed to fetch statistics')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Navbar onLogout={onLogout} />
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar onLogout={onLogout} />
      <div className="container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Overview of Campus Trails system</p>
        </div>

        {error && <div className="error card">{error}</div>}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#007bff' }}>📍</div>
            <div className="stat-content">
              <h3>{stats.totalPins}</h3>
              <p>Total Pins</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#28a745' }}>👁️</div>
            <div className="stat-content">
              <h3>{stats.visiblePins}</h3>
              <p>Visible Pins</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#ffc107' }}>🔍</div>
            <div className="stat-content">
              <h3>{stats.invisiblePins}</h3>
              <p>Waypoints</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#17a2b8' }}>👥</div>
            <div className="stat-content">
              <h3>{stats.totalUsers}</h3>
              <p>Total Users</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#6f42c1' }}>💬</div>
            <div className="stat-content">
              <h3>{stats.totalFeedbacks}</h3>
              <p>Feedbacks</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fd7e14' }}>🏫</div>
            <div className="stat-content">
              <h3>{stats.totalCampuses}</h3>
              <p>Campuses</p>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/facilities" className="action-card">
              <div className="action-icon">🔍</div>
              <h3>Search Facilities</h3>
              <p>Find and view facility details</p>
            </Link>

            <Link to="/facilities" className="action-card">
              <div className="action-icon">✏️</div>
              <h3>Manage Facilities</h3>
              <p>Update facility information and status</p>
            </Link>

            <Link to="/map-data" className="action-card">
              <div className="action-icon">🗺️</div>
              <h3>Update Map Data</h3>
              <p>Manage pins, waypoints, and connections</p>
            </Link>

            <Link to="/notifications" className="action-card">
              <div className="action-icon">🔔</div>
              <h3>Send Notifications</h3>
              <p>Create and manage app notifications</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

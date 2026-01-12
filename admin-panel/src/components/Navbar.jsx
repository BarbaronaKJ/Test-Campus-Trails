import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

function Navbar({ onLogout }) {
  const location = useLocation()
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}')

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h2>Campus Trails Admin</h2>
        </div>
        <div className="navbar-menu">
          <Link 
            to="/dashboard" 
            className={`navbar-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/facilities" 
            className={`navbar-item ${location.pathname === '/facilities' ? 'active' : ''}`}
          >
            Facilities
          </Link>
          <Link 
            to="/map-data" 
            className={`navbar-item ${location.pathname === '/map-data' ? 'active' : ''}`}
          >
            Map Data
          </Link>
        </div>
        <div className="navbar-right">
          <span className="navbar-user">{adminUser.username || 'Admin'}</span>
          <button onClick={onLogout} className="button button-secondary">
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

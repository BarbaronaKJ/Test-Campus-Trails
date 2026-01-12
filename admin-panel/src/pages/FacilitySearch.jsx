import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './FacilitySearch.css'

function FacilitySearch({ onLogout }) {
  const [pins, setPins] = useState([])
  const [filteredPins, setFilteredPins] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedCampus, setSelectedCampus] = useState('all')
  const [campuses, setCampuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const categories = [
    'all',
    'Academic',
    'Administration',
    'Facilities',
    'Services',
    'Recreational',
    'Other'
  ]

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterPins()
  }, [searchQuery, selectedCategory, selectedCampus, pins])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      
      // Fetch pins
      const pinsResponse = await fetch('/api/pins?includeInvisible=false', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      // Fetch campuses
      const campusesResponse = await fetch('/api/campuses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (pinsResponse.ok && campusesResponse.ok) {
        const pinsData = await pinsResponse.json()
        const campusesData = await campusesResponse.json()
        
        // Backend returns { success, count, data } for pins
        const pins = pinsData.data || pinsData || []
        // Campuses might be array or object with data
        const campuses = Array.isArray(campusesData) ? campusesData : (campusesData.data || [])
        
        setPins(pins)
        setCampuses(campuses)
        setFilteredPins(pins)
      } else {
        const errorText = await pinsResponse.text()
        console.error('API error:', errorText)
        setError('Failed to fetch data. Please try again.')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const filterPins = () => {
    let filtered = [...pins]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(pin =>
        pin.title?.toLowerCase().includes(query) ||
        pin.description?.toLowerCase().includes(query) ||
        pin.category?.toLowerCase().includes(query)
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(pin => 
        pin.category?.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    // Filter by campus
    if (selectedCampus !== 'all') {
      filtered = filtered.filter(pin => pin.campusId === selectedCampus)
    }

    setFilteredPins(filtered)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedCampus('all')
  }

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedCampus !== 'all'

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
        <div className="page-header">
          <h1>Facility Search & Management</h1>
          <p>Search and manage campus facilities</p>
        </div>

        {error && <div className="error card">{error}</div>}

        <div className="search-filters card">
          <div className="search-bar">
            <input
              type="text"
              className="input"
              placeholder="Search facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filters">
            <div className="filter-group">
              <label className="label">Category</label>
              <select
                className="input"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="label">Campus</label>
              <select
                className="input"
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
              >
                <option value="all">All Campuses</option>
                {campuses.map(campus => (
                  <option key={campus._id} value={campus._id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="results-summary">
          <p>Found {filteredPins.length} facilities</p>
          {hasActiveFilters && (
            <button 
              className="button button-secondary" 
              onClick={clearFilters}
              style={{ marginLeft: '15px' }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="facilities-grid">
          {filteredPins.map(pin => (
            <Link 
              key={pin._id || pin.id} 
              to={`/facility/${pin._id || pin.id}`}
              className="facility-card"
            >
              {pin.image && (
                <div className="facility-image">
                  <img src={pin.image} alt={pin.title} />
                </div>
              )}
              <div className="facility-content">
                <h3>{pin.title}</h3>
                <p className="facility-category">{pin.category}</p>
                <p className="facility-description">
                  {pin.description?.substring(0, 100)}
                  {pin.description?.length > 100 ? '...' : ''}
                </p>
                <div className="facility-meta">
                  <span className={`status-badge ${pin.status || 'open'}`}>
                    {pin.status || 'Open'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredPins.length === 0 && (
          <div className="no-results card">
            <p>No facilities found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacilitySearch

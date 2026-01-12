import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import './MapDataManager.css'

function MapDataManager({ onLogout }) {
  const [pins, setPins] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)
  const [campuses, setCampuses] = useState([])
  const [selectedCampus, setSelectedCampus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewMode, setViewMode] = useState('all') // all, visible, waypoints
  const [searchQuery, setSearchQuery] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // New pin form
  const [showNewPinForm, setShowNewPinForm] = useState(false)
  const [newPinData, setNewPinData] = useState({
    title: '',
    description: '',
    category: 'Other',
    campusId: '',
    x: 0,
    y: 0,
    isVisible: true,
    neighbors: []
  })

  // Edit pin form
  const [showEditPinForm, setShowEditPinForm] = useState(false)
  const [editPinData, setEditPinData] = useState(null)

  // Map viewer state
  const [showMapViewer, setShowMapViewer] = useState(true)
  const [hoveredPin, setHoveredPin] = useState(null)
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      
      const [pinsResponse, campusesResponse] = await Promise.all([
        fetch('/api/pins?includeInvisible=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/campuses', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (pinsResponse.ok && campusesResponse.ok) {
        const pinsData = await pinsResponse.json()
        const campusesData = await campusesResponse.json()
        
        // Backend returns { success, count, data } structure
        const pins = pinsData.data || pinsData || []
        const campuses = Array.isArray(campusesData) ? campusesData : (campusesData.data || [])
        
        setPins(pins)
        setCampuses(campuses)
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

  const filteredPins = pins.filter(pin => {
    if (selectedCampus !== 'all' && pin.campusId !== selectedCampus) {
      return false
    }
    if (viewMode === 'visible' && pin.isVisible === false) {
      return false
    }
    if (viewMode === 'waypoints' && pin.isVisible !== false) {
      return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const title = (pin.title || '').toLowerCase()
      const category = (pin.category || '').toLowerCase()
      const id = String(pin._id || pin.id).toLowerCase()
      if (!title.includes(query) && !category.includes(query) && !id.includes(query)) {
        return false
      }
    }
    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredPins.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPins = filteredPins.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCampus, viewMode])

  const handleCreatePin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate required fields
    if (!newPinData.campusId) {
      setError('Please select a campus')
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/pins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPinData)
      })

      if (response.ok) {
        const createdPin = await response.json()
        // Backend returns pin object directly
        setPins([...pins, createdPin])
        setSuccess('Pin created successfully!')
        setShowNewPinForm(false)
        setNewPinData({
          title: '',
          description: '',
          category: 'Other',
          campusId: '',
          x: 0,
          y: 0,
          isVisible: true,
          neighbors: []
        })
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to create pin')
      }
    } catch (error) {
      console.error('Error creating pin:', error)
      setError('Network error. Please try again.')
    }
  }

  const handleUpdateNeighbors = async (pinId, neighbors) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/pins/${pinId}/neighbors`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ neighbors })
      })

      if (response.ok) {
        const updatedPin = await response.json()
        // Update pins list with new data
        setPins(pins.map(p => String(p._id || p.id) === String(pinId) ? updatedPin : p))
        setSuccess('Connections updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to update connections')
      }
    } catch (error) {
      console.error('Error updating neighbors:', error)
      setError('Network error. Please try again.')
    }
  }

  const handleDeletePin = async (pinId) => {
    if (!confirm('Are you sure you want to delete this pin? This will also remove it from all neighbor connections. This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/pins/${pinId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setPins(pins.filter(p => String(p._id || p.id) !== String(pinId)))
        setSuccess('Pin deleted successfully!')
        setSelectedPin(null)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to delete pin')
      }
    } catch (error) {
      console.error('Error deleting pin:', error)
      setError('Network error. Please try again.')
    }
  }

  const handleUpdatePin = async (pinId, updateData) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/pins/${pinId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const updatedPin = await response.json()
        setPins(pins.map(p => String(p._id || p.id) === String(pinId) ? updatedPin : p))
        setSuccess('Pin updated successfully!')
        setSelectedPin(null)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to update pin')
      }
    } catch (error) {
      console.error('Error updating pin:', error)
      setError('Network error. Please try again.')
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
        <div className="page-header">
          <div>
            <h1>Map Data Manager</h1>
            <p>Manage pins, waypoints, and pathfinding connections</p>
          </div>
          <button 
            className="button button-primary"
            onClick={() => setShowNewPinForm(true)}
          >
            + Add New Pin
          </button>
        </div>

        {error && <div className="error card">{error}</div>}
        {success && <div className="success card">{success}</div>}

        <div className="map-controls card">
          <div className="control-group">
            <label className="label">Search Pins</label>
            <input
              type="text"
              className="input"
              placeholder="Search by title, category, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="control-group">
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

          <div className="control-group">
            <label className="label">View Mode</label>
            <div className="view-mode-buttons">
              <button 
                className={`button ${viewMode === 'all' ? 'button-primary' : 'button-secondary'}`}
                onClick={() => setViewMode('all')}
              >
                All ({pins.length})
              </button>
              <button 
                className={`button ${viewMode === 'visible' ? 'button-primary' : 'button-secondary'}`}
                onClick={() => setViewMode('visible')}
              >
                Visible ({pins.filter(p => p.isVisible !== false).length})
              </button>
              <button 
                className={`button ${viewMode === 'waypoints' ? 'button-primary' : 'button-secondary'}`}
                onClick={() => setViewMode('waypoints')}
              >
                Waypoints ({pins.filter(p => p.isVisible === false).length})
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#7f8c8d', margin: 0 }}>
            Showing {filteredPins.length} of {pins.length} pins
          </p>
          {(searchQuery || selectedCampus !== 'all' || viewMode !== 'all') && (
            <button 
              className="button button-secondary button-small"
              onClick={() => {
                setSearchQuery('')
                setSelectedCampus('all')
                setViewMode('all')
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>

        {showNewPinForm && (
          <div className="modal-overlay" onClick={() => setShowNewPinForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add New Pin</h2>
                <button 
                  className="close-button"
                  onClick={() => setShowNewPinForm(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreatePin}>
                <div className="form-group">
                  <label className="label">Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={newPinData.title}
                    onChange={(e) => setNewPinData({...newPinData, title: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    value={newPinData.description}
                    onChange={(e) => setNewPinData({...newPinData, description: e.target.value})}
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Category *</label>
                    <select
                      className="input"
                      value={newPinData.category}
                      onChange={(e) => setNewPinData({...newPinData, category: e.target.value})}
                      required
                    >
                      <option value="Academic">Academic</option>
                      <option value="Administration">Administration</option>
                      <option value="Facilities">Facilities</option>
                      <option value="Services">Services</option>
                      <option value="Recreational">Recreational</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Campus *</label>
                    <select
                      className="input"
                      value={newPinData.campusId}
                      onChange={(e) => setNewPinData({...newPinData, campusId: e.target.value})}
                      required
                    >
                      <option value="">Select Campus</option>
                      {campuses.map(campus => (
                        <option key={campus._id} value={campus._id}>
                          {campus.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">X Coordinate *</label>
                    <input
                      type="number"
                      className="input"
                      value={newPinData.x}
                      onChange={(e) => setNewPinData({...newPinData, x: parseFloat(e.target.value)})}
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Y Coordinate *</label>
                    <input
                      type="number"
                      className="input"
                      value={newPinData.y}
                      onChange={(e) => setNewPinData({...newPinData, y: parseFloat(e.target.value)})}
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newPinData.isVisible}
                      onChange={(e) => setNewPinData({...newPinData, isVisible: e.target.checked})}
                    />
                    <span>Visible on map (uncheck for waypoint)</span>
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="button button-success">
                    Create Pin
                  </button>
                  <button 
                    type="button" 
                    className="button button-secondary"
                    onClick={() => setShowNewPinForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditPinForm && editPinData && (
          <div className="modal-overlay" onClick={() => setShowEditPinForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Pin</h2>
                <button 
                  className="close-button"
                  onClick={() => setShowEditPinForm(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault()
                handleUpdatePin(editPinData._id || editPinData.id, editPinData)
                setShowEditPinForm(false)
              }}>
                <div className="form-group">
                  <label className="label">Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={editPinData.title}
                    onChange={(e) => setEditPinData({...editPinData, title: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    value={editPinData.description || ''}
                    onChange={(e) => setEditPinData({...editPinData, description: e.target.value})}
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Category *</label>
                    <select
                      className="input"
                      value={editPinData.category}
                      onChange={(e) => setEditPinData({...editPinData, category: e.target.value})}
                      required
                    >
                      <option value="Academic">Academic</option>
                      <option value="Administration">Administration</option>
                      <option value="Facilities">Facilities</option>
                      <option value="Services">Services</option>
                      <option value="Recreational">Recreational</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Campus *</label>
                    <select
                      className="input"
                      value={editPinData.campusId}
                      onChange={(e) => setEditPinData({...editPinData, campusId: e.target.value})}
                      required
                    >
                      {campuses.map(campus => (
                        <option key={campus._id} value={campus._id}>
                          {campus.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">X Coordinate *</label>
                    <input
                      type="number"
                      className="input"
                      value={editPinData.x}
                      onChange={(e) => setEditPinData({...editPinData, x: parseFloat(e.target.value)})}
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Y Coordinate *</label>
                    <input
                      type="number"
                      className="input"
                      value={editPinData.y}
                      onChange={(e) => setEditPinData({...editPinData, y: parseFloat(e.target.value)})}
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editPinData.isVisible !== false}
                      onChange={(e) => setEditPinData({...editPinData, isVisible: e.target.checked})}
                    />
                    <span>Visible on map (uncheck for waypoint)</span>
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="button button-success">
                    Update Pin
                  </button>
                  <button 
                    type="button" 
                    className="button button-secondary"
                    onClick={() => setShowEditPinForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="pins-table-container card">
          <table className="pins-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Category</th>
                <th>Coordinates</th>
                <th>Neighbors</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPins.map(pin => (
                <tr key={pin._id || pin.id}>
                  <td className="pin-id">{String(pin._id || pin.id).substring(0, 8)}</td>
                  <td>
                    <strong>{pin.title || 'Waypoint'}</strong>
                  </td>
                  <td>
                    <span className={`type-badge ${pin.isVisible === false ? 'waypoint' : 'visible'}`}>
                      {pin.isVisible === false ? '🔍 Waypoint' : '👁️ Visible'}
                    </span>
                  </td>
                  <td>{pin.category || 'N/A'}</td>
                  <td className="coordinates">
                    ({pin.x?.toFixed(2)}, {pin.y?.toFixed(2)})
                  </td>
                  <td>
                    <span className="neighbors-count">
                      {pin.neighbors?.length || 0} connections
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        className="button button-primary button-small"
                        onClick={() => setSelectedPin(pin)}
                        title="Manage Connections"
                      >
                        Connections
                      </button>
                      <button 
                        className="button button-secondary button-small"
                        onClick={() => {
                          setEditPinData(pin)
                          setShowEditPinForm(true)
                        }}
                        title="Edit Pin"
                      >
                        Edit
                      </button>
                      <button 
                        className="button button-danger button-small"
                        onClick={() => handleDeletePin(pin._id || pin.id)}
                        title="Delete Pin"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredPins.length > 0 && (
            <div className="pagination-controls">
              <div className="pagination-info">
                <span>
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredPins.length)} of {filteredPins.length} pins
                </span>
                <select
                  className="input"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  style={{ width: 'auto', marginLeft: '15px', padding: '5px 10px' }}
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
              
              <div className="pagination-buttons">
                <button
                  className="button button-secondary button-small"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </button>
                <button
                  className="button button-secondary button-small"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                
                <div className="page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`button button-small ${currentPage === pageNum ? 'button-primary' : 'button-secondary'}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  className="button button-secondary button-small"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
                <button
                  className="button button-secondary button-small"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Map Viewer Section */}
        <div className="map-viewer-section card">
          <div className="map-viewer-header">
            <h2>Campus Map View</h2>
            <button 
              className="button button-secondary button-small"
              onClick={() => setShowMapViewer(!showMapViewer)}
            >
              {showMapViewer ? 'Hide Map' : 'Show Map'}
            </button>
          </div>
          
          {showMapViewer && (
            <div className="map-viewer-container">
              <div className="map-viewer-info">
                <p>Click on pins to view details. Hover to see coordinates. Only showing {filteredPins.length} filtered pins.</p>
              </div>
              
              <div 
                className="map-canvas"
                onClick={(e) => {
                  const svg = e.currentTarget.querySelector('svg')
                  if (svg) {
                    const rect = svg.getBoundingClientRect()
                    const relativeX = e.clientX - rect.left
                    const relativeY = e.clientY - rect.top
                    
                    // Calculate pixel coordinates in viewBox space (1920x1310)
                    const pixelX = Math.round(relativeX / rect.width * 1920)
                    const pixelY = Math.round(relativeY / rect.height * 1310)
                    console.log(`Clicked coordinates: x: ${pixelX}, y: ${pixelY}`)
                    alert(`Map coordinates:\nX: ${pixelX}\nY: ${pixelY}\n\nUse these values when creating new pins.\n\n(Map uses 1920x1310 pixel coordinate system)`)
                  }
                }}
              >
                <svg 
                  viewBox="0 0 1920 1310"
                  style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '1200px' }}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <image
                    href="/ustp-cdo-map.png"
                    width="1920"
                    height="1310"
                  />
                  
                  {/* Pin Markers */}
                  {filteredPins.map(pin => {
                    const x = pin.x || 0
                    const y = pin.y || 0
                    const isHovered = hoveredPin === pin._id || hoveredPin === pin.id
                    
                    return (
                      <g
                        key={pin._id || pin.id}
                        className={`map-pin-marker ${pin.isVisible === false ? 'waypoint' : 'visible'} ${isHovered ? 'hovered' : ''}`}
                        onMouseEnter={() => setHoveredPin(pin._id || pin.id)}
                        onMouseLeave={() => setHoveredPin(null)}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedPin(pin)
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 14 : 10}
                          className="pin-marker-circle"
                          fill={pin.isVisible === false ? '#ff9800' : '#28a745'}
                          stroke="white"
                          strokeWidth={isHovered ? 3 : 2}
                        />
                        {isHovered && (
                          <foreignObject
                            x={x - 80}
                            y={y - 70}
                            width="160"
                            height="60"
                            style={{ pointerEvents: 'none' }}
                          >
                            <div className="pin-tooltip-svg">
                              <strong>{pin.title || 'Waypoint'}</strong>
                              <div>({x}, {y})</div>
                              <div className="pin-tooltip-type">
                                {pin.isVisible === false ? '🔍 Waypoint' : '👁️ Visible'}
                              </div>
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    )
                  })}
                </svg>
              </div>
              
              <div className="map-legend">
                <h4>Legend:</h4>
                <div className="legend-items">
                  <div className="legend-item">
                    <div className="legend-marker visible"></div>
                    <span>Visible Pin ({pins.filter(p => p.isVisible !== false).length})</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-marker waypoint"></div>
                    <span>Waypoint ({pins.filter(p => p.isVisible === false).length})</span>
                  </div>
                </div>
                <p className="map-tip"><strong>Tip:</strong> Click anywhere on the map to get coordinates for new pins.</p>
              </div>
            </div>
          )}
        </div>

        {selectedPin && (
          <div className="modal-overlay" onClick={() => setSelectedPin(null)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Manage Connections: {selectedPin.title || 'Waypoint'}</h2>
                <button 
                  className="close-button"
                  onClick={() => setSelectedPin(null)}
                >
                  ×
                </button>
              </div>
              <div className="neighbors-manager">
                <div className="current-neighbors">
                  <h3>Current Connections ({selectedPin.neighbors?.length || 0})</h3>
                  <div className="neighbors-list">
                    {selectedPin.neighbors?.map(neighborId => {
                      const neighbor = pins.find(p => String(p._id || p.id) === String(neighborId))
                      return (
                        <div key={neighborId} className="neighbor-item">
                          <span>{neighbor?.title || `Pin ${neighborId}`}</span>
                          <button 
                            className="button button-danger button-small"
                            onClick={() => {
                              const newNeighbors = selectedPin.neighbors.filter(id => id !== neighborId)
                              handleUpdateNeighbors(selectedPin._id, newNeighbors)
                              setSelectedPin({...selectedPin, neighbors: newNeighbors})
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                    {(!selectedPin.neighbors || selectedPin.neighbors.length === 0) && (
                      <p className="no-neighbors">No connections yet</p>
                    )}
                  </div>
                </div>

                <div className="available-pins">
                  <h3>Available Pins</h3>
                  <div className="available-pins-list">
                    {pins
                      .filter(p => 
                        String(p._id || p.id) !== String(selectedPin._id || selectedPin.id) &&
                        !selectedPin.neighbors?.includes(String(p._id || p.id))
                      )
                      .map(pin => (
                        <div key={pin._id || pin.id} className="available-pin-item">
                          <div>
                            <strong>{pin.title || 'Waypoint'}</strong>
                            <span className="pin-type">
                              {pin.isVisible === false ? '🔍' : '👁️'}
                            </span>
                          </div>
                          <button 
                            className="button button-success button-small"
                            onClick={() => {
                              const newNeighbors = [...(selectedPin.neighbors || []), String(pin._id || pin.id)]
                              handleUpdateNeighbors(selectedPin._id, newNeighbors)
                              setSelectedPin({...selectedPin, neighbors: newNeighbors})
                            }}
                          >
                            Connect
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MapDataManager

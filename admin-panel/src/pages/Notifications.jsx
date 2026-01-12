import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Notifications.css'

function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [campuses, setCampuses] = useState([])
  const [pins, setPins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCampus, setFilterCampus] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingNotification, setEditingNotification] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'announcement',
    title: '',
    message: '',
    campusId: '',
    priority: 'normal',
    status: 'sent',
    targetAudience: 'all',
    metadata: {}
  })
  
  // Statistics
  const [stats, setStats] = useState({
    totalSent: 0,
    totalDrafts: 0,
    totalScheduled: 0,
    totalReads: 0,
    avgReadRate: 0,
    byType: {}
  })

  useEffect(() => {
    fetchCampuses()
    fetchNotifications()
    fetchStats()
  }, [currentPage, itemsPerPage, searchQuery, filterType, filterCampus, filterStatus])

  const fetchCampuses = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:3000/api/campuses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      console.log('Campuses API response:', data)
      
      // The campuses API returns 'data' not 'campuses'
      if (data.success && data.data && Array.isArray(data.data)) {
        setCampuses(data.data)
        if (data.data.length > 0 && !formData.campusId) {
          setFormData(prev => ({ ...prev, campusId: data.data[0]._id }))
        }
      } else {
        console.error('Invalid campuses response:', data)
        setCampuses([])
      }
    } catch (error) {
      console.error('Error fetching campuses:', error)
      setCampuses([])
    }
  }

  const fetchPins = async (campusId) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`http://localhost:3000/api/pins?campusId=${campusId}&includeInvisible=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setPins(data.pins.filter(pin => pin.isVisible))
      }
    } catch (error) {
      console.error('Error fetching pins:', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      
      console.log('Admin Token:', token ? 'Token exists' : 'NO TOKEN FOUND')
      
      let url = `http://localhost:3000/api/notifications?page=${currentPage}&limit=${itemsPerPage}`
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`
      if (filterType) url += `&type=${filterType}`
      if (filterCampus) url += `&campusId=${filterCampus}`
      if (filterStatus) url += `&status=${filterStatus}`
      
      console.log('Fetching notifications from:', url)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('Response status:', response.status)
      
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        console.log('Notifications received:', data.notifications.length)
        setNotifications(data.notifications)
        setTotalPages(data.pagination.pages)
        setTotalItems(data.pagination.total)
      } else {
        console.error('API returned error:', data.message)
        setError(data.message)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setError('Failed to fetch notifications: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:3000/api/notifications/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleCreateNew = () => {
    setEditingNotification(null)
    setFormData({
      type: 'announcement',
      title: '',
      message: '',
      campusId: campuses[0]?._id || '',
      priority: 'normal',
      status: 'sent',
      targetAudience: 'all',
      metadata: {}
    })
    setShowModal(true)
    if (campuses[0]?._id) {
      fetchPins(campuses[0]._id)
    }
  }

  const handleEdit = (notification) => {
    setEditingNotification(notification)
    setFormData({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      campusId: notification.campusId,
      priority: notification.priority,
      status: notification.status,
      targetAudience: notification.targetAudience,
      metadata: notification.metadata || {}
    })
    setShowModal(true)
    fetchPins(notification.campusId)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this notification?')) return
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`http://localhost:3000/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        alert('Notification deleted successfully')
        fetchNotifications()
        fetchStats()
      } else {
        alert(data.message)
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      alert('Failed to delete notification')
    }
  }

  const handleSendDraft = async (id) => {
    if (!confirm('Are you sure you want to send this notification?')) return
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`http://localhost:3000/api/notifications/${id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        alert('Notification sent successfully')
        fetchNotifications()
        fetchStats()
      } else {
        alert(data.message)
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      alert('Failed to send notification')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.title || !formData.message || !formData.campusId) {
      alert('Title, message, and campus are required')
      return
    }
    
    try {
      const token = localStorage.getItem('adminToken')
      const url = editingNotification 
        ? `http://localhost:3000/api/notifications/${editingNotification._id}`
        : 'http://localhost:3000/api/notifications'
      
      const response = await fetch(url, {
        method: editingNotification ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      if (data.success) {
        alert(data.message)
        setShowModal(false)
        fetchNotifications()
        fetchStats()
      } else {
        alert(data.message)
      }
    } catch (error) {
      console.error('Error saving notification:', error)
      alert('Failed to save notification')
    }
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // If campus changes, fetch pins for that campus
    if (field === 'campusId') {
      fetchPins(value)
    }
  }

  const handleMetadataChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      metadata: { ...prev.metadata, [field]: value }
    }))
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterType('')
    setFilterCampus('')
    setFilterStatus('')
    setCurrentPage(1)
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'announcement': return '📢'
      case 'alert': return '⚠️'
      case 'event': return '📅'
      case 'facility-update': return '🏢'
      case 'emergency': return '🚨'
      default: return '📌'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return '#95a5a6'
      case 'normal': return '#3498db'
      case 'high': return '#e67e22'
      default: return '#3498db'
    }
  }

  const getStatusBadge = (status) => {
    const colors = {
      draft: '#95a5a6',
      sent: '#28a745',
      scheduled: '#3498db'
    }
    return { color: colors[status] || '#95a5a6', text: status.charAt(0).toUpperCase() + status.slice(1) }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="notifications-container">
      <header className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p>Manage and send notifications to mobile app users</p>
        </div>
        <button className="btn-logout" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </header>

      {/* Statistics Dashboard */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📤</div>
          <div className="stat-content">
            <h3>{stats.totalSent}</h3>
            <p>Total Sent</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>{stats.totalDrafts}</h3>
            <p>Drafts</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <h3>{stats.totalScheduled}</h3>
            <p>Scheduled</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👀</div>
          <div className="stat-content">
            <h3>{stats.totalReads}</h3>
            <p>Total Reads</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="notifications-controls">
        <button className="btn-primary" onClick={handleCreateNew}>
          ➕ Create Notification
        </button>
        
        <div className="filters-group">
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
            <option value="">All Types</option>
            <option value="announcement">Announcement</option>
            <option value="alert">Alert</option>
            <option value="event">Event</option>
            <option value="facility-update">Facility Update</option>
            <option value="emergency">Emergency</option>
          </select>
          
          <select value={filterCampus} onChange={(e) => setFilterCampus(e.target.value)} className="filter-select">
            <option value="">All Campuses</option>
            {campuses && campuses.map(campus => (
              <option key={campus._id} value={campus._id}>{campus.name}</option>
            ))}
          </select>
          
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="scheduled">Scheduled</option>
          </select>
          
          <button className="btn-clear" onClick={clearFilters}>Clear Filters</button>
        </div>
      </div>

      {/* Notifications Table */}
      {loading ? (
        <div className="loading">Loading notifications...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="notifications-table-container">
            <table className="notifications-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Campus</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created</th>
                  <th>Reads</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      No notifications found
                    </td>
                  </tr>
                ) : (
                  notifications.map(notification => (
                    <tr key={notification._id}>
                      <td>
                        <span className="type-badge">
                          {getTypeIcon(notification.type)} {notification.type}
                        </span>
                      </td>
                      <td className="title-cell">{notification.title}</td>
                      <td>{campuses.find(c => c._id === notification.campusId)?.name || notification.campusId}</td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusBadge(notification.status).color }}
                        >
                          {getStatusBadge(notification.status).text}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="priority-dot"
                          style={{ backgroundColor: getPriorityColor(notification.priority) }}
                        >
                          {notification.priority}
                        </span>
                      </td>
                      <td className="date-cell">{formatDate(notification.createdAt)}</td>
                      <td className="reads-cell">{notification.readCount}</td>
                      <td className="actions-cell">
                        {notification.status === 'draft' && (
                          <button 
                            className="btn-action btn-send"
                            onClick={() => handleSendDraft(notification._id)}
                            title="Send notification"
                          >
                            ▶️
                          </button>
                        )}
                        <button 
                          className="btn-action btn-edit"
                          onClick={() => handleEdit(notification)}
                          title="Edit notification"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-action btn-delete"
                          onClick={() => handleDelete(notification._id)}
                          title="Delete notification"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination-controls">
            <div className="pagination-info">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} notifications
            </div>
            
            <div className="pagination-buttons">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn-pagination"
              >
                Previous
              </button>
              
              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn-pagination"
              >
                Next
              </button>
            </div>
            
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="items-per-page"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingNotification ? 'Edit Notification' : 'Create Notification'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="notification-form">
              {/* Basic Fields */}
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    required
                  >
                    <option value="announcement">📢 Announcement</option>
                    <option value="alert">⚠️ Alert</option>
                    <option value="event">📅 Event</option>
                    <option value="facility-update">🏢 Facility Update</option>
                    <option value="emergency">🚨 Emergency</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Campus *</label>
                  <select 
                    value={formData.campusId}
                    onChange={(e) => handleFormChange('campusId', e.target.value)}
                    required
                  >
                    <option value="">Select campus</option>
                    {campuses && campuses.map(campus => (
                      <option key={campus._id} value={campus._id}>{campus.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Title * <span className="char-count">{formData.title.length}/100</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value.slice(0, 100))}
                  placeholder="Enter notification title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Message * <span className="char-count">{formData.message.length}/500</span></label>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleFormChange('message', e.target.value.slice(0, 500))}
                  placeholder="Enter notification message"
                  rows="4"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => handleFormChange('priority', e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Audience</label>
                  <select 
                    value={formData.targetAudience}
                    onChange={(e) => handleFormChange('targetAudience', e.target.value)}
                  >
                    <option value="all">All Users</option>
                    <option value="students">Students Only</option>
                    <option value="faculty">Faculty Only</option>
                  </select>
                </div>
              </div>

              {/* Conditional Fields Based on Type */}
              {formData.type === 'event' && (
                <div className="conditional-fields">
                  <h3>Event Details</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Event Date</label>
                      <input
                        type="date"
                        value={formData.metadata.eventDate || ''}
                        onChange={(e) => handleMetadataChange('eventDate', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Event Time</label>
                      <input
                        type="time"
                        value={formData.metadata.eventTime || ''}
                        onChange={(e) => handleMetadataChange('eventTime', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Location</label>
                      <input
                        type="text"
                        value={formData.metadata.location || ''}
                        onChange={(e) => handleMetadataChange('location', e.target.value)}
                        placeholder="Event location"
                      />
                    </div>
                    <div className="form-group">
                      <label>Link to Pin (Optional)</label>
                      <select 
                        value={formData.metadata.pinId || ''}
                        onChange={(e) => handleMetadataChange('pinId', e.target.value)}
                      >
                        <option value="">None</option>
                        {pins.map(pin => (
                          <option key={pin._id} value={pin._id}>{pin.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'facility-update' && (
                <div className="conditional-fields">
                  <h3>Facility Update Details</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Select Facility *</label>
                      <select 
                        value={formData.metadata.facilityId || ''}
                        onChange={(e) => {
                          const selectedPin = pins.find(p => p._id === e.target.value)
                          handleMetadataChange('facilityId', e.target.value)
                          if (selectedPin) {
                            handleMetadataChange('facilityName', selectedPin.title)
                          }
                        }}
                        required
                      >
                        <option value="">Select facility</option>
                        {pins.map(pin => (
                          <option key={pin._id} value={pin._id}>{pin.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Facility Status</label>
                      <select 
                        value={formData.metadata.facilityStatus || ''}
                        onChange={(e) => handleMetadataChange('facilityStatus', e.target.value)}
                      >
                        <option value="">Select status</option>
                        <option value="closed">Closed</option>
                        <option value="maintenance">Under Maintenance</option>
                        <option value="reopened">Reopened</option>
                        <option value="relocated">Relocated</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {(formData.type === 'alert' || formData.type === 'emergency') && (
                <div className="conditional-fields">
                  <h3>Alert Details</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Severity Level</label>
                      <select 
                        value={formData.metadata.severity || 'medium'}
                        onChange={(e) => handleMetadataChange('severity', e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Expires At (Optional)</label>
                      <input
                        type="datetime-local"
                        value={formData.metadata.expiresAt || ''}
                        onChange={(e) => handleMetadataChange('expiresAt', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn-draft"
                  onClick={(e) => {
                    setFormData(prev => ({ ...prev, status: 'draft' }))
                    setTimeout(() => handleSubmit(e), 0)
                  }}
                >
                  💾 Save as Draft
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'sent' }))}
                >
                  📤 {editingNotification ? 'Update & Send' : 'Send Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Notifications

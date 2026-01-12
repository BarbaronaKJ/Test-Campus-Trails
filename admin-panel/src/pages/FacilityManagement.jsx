import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './FacilityManagement.css'

function FacilityManagement({ onLogout }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pin, setPin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [campuses, setCampuses] = useState([])

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    status: 'open',
    image: '',
    campusId: '',
    x: 0,
    y: 0,
    isVisible: true,
    floors: []
  })

  const categories = [
    'Academic',
    'Administration',
    'Facilities',
    'Services',
    'Recreational',
    'Other'
  ]

  const statuses = ['open', 'closed', 'maintenance']

  useEffect(() => {
    fetchPin()
    fetchCampuses()
  }, [id])

  const fetchPin = async () => {
    if (!id) {
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/pins/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Backend might return { success, data } or just the pin object
        const pinData = data.data || data
        
        setPin(pinData)
        setFormData({
          title: pinData.title || '',
          description: pinData.description || '',
          category: pinData.category || '',
          status: pinData.status || 'open',
          image: pinData.image || '',
          campusId: pinData.campusId || '',
          x: pinData.x || 0,
          y: pinData.y || 0,
          isVisible: pinData.isVisible !== false,
          floors: pinData.floors || []
        })
      } else {
        setError('Failed to fetch facility details')
      }
    } catch (error) {
      console.error('Error fetching pin:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const fetchCampuses = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/campuses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCampuses(data)
      }
    } catch (error) {
      console.error('Error fetching campuses:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/pins/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Facility updated successfully!')
        setPin(data)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to update facility')
      }
    } catch (error) {
      console.error('Error updating facility:', error)
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this facility? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/pins/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        navigate('/facilities')
      } else {
        setError('Failed to delete facility')
      }
    } catch (error) {
      console.error('Error deleting facility:', error)
      setError('Network error')
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

  if (!pin) {
    return (
      <div>
        <Navbar onLogout={onLogout} />
        <div className="container">
          <div className="error card">Facility not found</div>
          <Link to="/facilities" className="button button-primary">
            Back to Facilities
          </Link>
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
            <h1>Manage Facility</h1>
            <p>Update facility information and status</p>
          </div>
          <Link to="/facilities" className="button button-secondary">
            ← Back to Facilities
          </Link>
        </div>

        {error && <div className="error card">{error}</div>}
        {success && <div className="success card">{success}</div>}

        <div className="facility-management-layout">
          <div className="facility-form-section">
            <div className="card">
              <h2>Facility Information</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="title" className="label">Title *</label>
                  <input
                    id="title"
                    type="text"
                    name="title"
                    className="input"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description" className="label">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    className="input textarea"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category" className="label">Category *</label>
                    <select
                      id="category"
                      name="category"
                      className="input"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="status" className="label">Status *</label>
                    <select
                      id="status"
                      name="status"
                      className="input"
                      value={formData.status}
                      onChange={handleChange}
                      required
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="campusId" className="label">Campus *</label>
                  <select
                    id="campusId"
                    name="campusId"
                    className="input"
                    value={formData.campusId}
                    onChange={handleChange}
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

                <div className="form-group">
                  <label htmlFor="image" className="label">Image URL</label>
                  <input
                    id="image"
                    type="text"
                    name="image"
                    className="input"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="x" className="label">X Coordinate</label>
                    <input
                      id="x"
                      type="number"
                      name="x"
                      className="input"
                      value={formData.x}
                      onChange={handleChange}
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="y" className="label">Y Coordinate</label>
                    <input
                      id="y"
                      type="number"
                      name="y"
                      className="input"
                      value={formData.y}
                      onChange={handleChange}
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isVisible"
                      checked={formData.isVisible}
                      onChange={handleChange}
                    />
                    <span>Visible on map</span>
                  </label>
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="button button-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button" 
                    className="button button-danger"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Delete Facility
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="facility-preview-section">
            <div className="card">
              <h2>Preview</h2>
              {formData.image && (
                <div className="preview-image">
                  <img src={formData.image} alt={formData.title} />
                </div>
              )}
              <div className="preview-details">
                <h3>{formData.title || 'Untitled'}</h3>
                <p className="preview-category">{formData.category || 'No category'}</p>
                <p className="preview-description">
                  {formData.description || 'No description'}
                </p>
                <div className="preview-meta">
                  <span className={`status-badge ${formData.status}`}>
                    {formData.status}
                  </span>
                  <span className="visibility-badge">
                    {formData.isVisible ? '👁️ Visible' : '🔒 Hidden'}
                  </span>
                </div>
                <div className="preview-coordinates">
                  <p><strong>Coordinates:</strong> ({formData.x}, {formData.y})</p>
                </div>
              </div>
            </div>

            {pin.floors && pin.floors.length > 0 && (
              <div className="card">
                <h2>Floor Information</h2>
                <div className="floors-list">
                  {pin.floors.map((floor, index) => (
                    <div key={index} className="floor-item">
                      <h4>{floor.name}</h4>
                      {floor.rooms && floor.rooms.length > 0 && (
                        <p>{floor.rooms.length} rooms</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FacilityManagement

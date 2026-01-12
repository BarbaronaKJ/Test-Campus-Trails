const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Pin = require('../models/Pin');

/**
 * GET /api/pins
 * Fetch pins from the database (excludes invisible waypoints by default)
 * Query Parameters:
 *   - campusId: (optional) Filter by campus ID
 *   - includeInvisible: true/false (default: false) - Include invisible waypoints for pathfinding
 * Response: Array of pin documents (visible only, unless includeInvisible=true)
 */
router.get('/', async (req, res) => {
  try {
    const campusId = req.query.campusId || null;
    const includeInvisible = req.query.includeInvisible === 'true' || req.query.includeInvisible === '1';
    
    // Fetch pins using the new schema (all pins in one collection with isVisible flag)
    const query = campusId ? { campusId } : {};
    if (!includeInvisible) {
      query.isVisible = true;
    }
    
    const pins = await Pin.find(query).sort({ id: 1 }).lean();
    
    // Separate visible pins and invisible waypoints for response metadata
    const visiblePins = pins.filter(pin => pin.isVisible === true);
    const invisibleWaypoints = pins.filter(pin => pin.isVisible === false);
    
    // Optimize Cloudinary URLs for pins before sending
    const optimizedPins = pins.map(pin => ({
      ...pin,
      image: pin.image?.includes('res.cloudinary.com') && !pin.image.includes('f_auto,q_auto')
        ? (() => {
            const uploadIndex = pin.image.indexOf('/upload/');
            if (uploadIndex !== -1) {
              const baseUrl = pin.image.substring(0, uploadIndex + '/upload/'.length);
              const pathAfterUpload = pin.image.substring(uploadIndex + '/upload/'.length);
              return `${baseUrl}f_auto,q_auto/${pathAfterUpload}`;
            }
            return pin.image;
          })()
        : pin.image
    }));
    
    // For backward compatibility, add isInvisible flag to invisible pins
    const pinsWithFlags = optimizedPins.map(pin => ({
      ...pin,
      isInvisible: !pin.isVisible // Backward compatibility
    }));
    
    res.json({
      success: true,
      count: pinsWithFlags.length,
      pinCount: visiblePins.length,
      waypointCount: invisibleWaypoints.length,
      includeInvisible: includeInvisible,
      data: pinsWithFlags
    });
  } catch (error) {
    console.error('Error fetching pins:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pins from database',
      error: error.message
    });
  }
});

/**
 * GET /api/pins/:id
 * Fetch a single pin by ID (legacy ID or _id)
 * Query Parameters:
 *   - campusId: (optional) Filter by campus ID
 * Response: Pin document
 */
router.get('/:id', async (req, res) => {
  try {
    const pinId = req.params.id;
    const campusId = req.query.campusId || null;
    
    // Use the model's static method to find pin by ID
    const pin = await Pin.getPinById(pinId, campusId);
    
    if (!pin) {
      return res.status(404).json({
        success: false,
        message: `Pin with ID ${pinId} not found`
      });
    }
    
    // Optimize Cloudinary URL if needed
    if (pin.image?.includes('res.cloudinary.com') && !pin.image.includes('f_auto,q_auto')) {
      const uploadIndex = pin.image.indexOf('/upload/');
      if (uploadIndex !== -1) {
        const baseUrl = pin.image.substring(0, uploadIndex + '/upload/'.length);
        const pathAfterUpload = pin.image.substring(uploadIndex + '/upload/'.length);
        pin.image = `${baseUrl}f_auto,q_auto/${pathAfterUpload}`;
      }
    }
    
    // Add isInvisible for backward compatibility
    const pinWithFlags = {
      ...pin,
      isInvisible: !pin.isVisible
    };
    
    res.json({
      success: true,
      data: pinWithFlags
    });
  } catch (error) {
    console.error('Error fetching pin:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pin from database',
      error: error.message
    });
  }
});

/**
 * GET /api/pins/category/:category
 * Fetch pins by category (excludes invisible waypoints by default)
 * Query Parameters:
 *   - campusId: (REQUIRED) Filter by campus ID
 *   - includeInvisible: true/false (default: false) - Include invisible waypoints
 * Response: Array of pins in the specified category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const campusId = req.query.campusId;
    const includeInvisible = req.query.includeInvisible === 'true' || req.query.includeInvisible === '1';
    
    // campusId is required for category filtering
    if (!campusId) {
      return res.status(400).json({
        success: false,
        message: 'campusId query parameter is required'
      });
    }
    
    // Fetch pins by category using the new schema
    const pins = await Pin.getPinsByCategory(campusId, category, includeInvisible);
    
    // Optimize Cloudinary URLs
    const optimizedPins = pins.map(pin => ({
      ...pin,
      image: pin.image?.includes('res.cloudinary.com') && !pin.image.includes('f_auto,q_auto')
        ? (() => {
            const uploadIndex = pin.image.indexOf('/upload/');
            if (uploadIndex !== -1) {
              const baseUrl = pin.image.substring(0, uploadIndex + '/upload/'.length);
              const pathAfterUpload = pin.image.substring(uploadIndex + '/upload/'.length);
              return `${baseUrl}f_auto,q_auto/${pathAfterUpload}`;
            }
            return pin.image;
          })()
        : pin.image,
      isInvisible: !pin.isVisible // Backward compatibility
    }));
    
    res.json({
      success: true,
      count: optimizedPins.length,
      category,
      campusId,
      includeInvisible: includeInvisible,
      data: optimizedPins
    });
  } catch (error) {
    console.error('Error fetching pins by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pins by category',
      error: error.message
    });
  }
});

/**
 * GET /api/pins/search
 * Search pins by title (filters by campusId)
 * Query Parameters:
 *   - campusId: (REQUIRED) Filter by campus ID
 *   - q: (REQUIRED) Search query string
 *   - includeInvisible: true/false (default: false) - Include invisible waypoints
 * Response: Array of matching pins
 */
router.get('/search', async (req, res) => {
  try {
    const campusId = req.query.campusId;
    const searchQuery = req.query.q || req.query.query;
    const includeInvisible = req.query.includeInvisible === 'true' || req.query.includeInvisible === '1';
    
    // campusId and search query are required
    if (!campusId) {
      return res.status(400).json({
        success: false,
        message: 'campusId query parameter is required'
      });
    }
    
    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: 'q or query parameter is required for search'
      });
    }
    
    // Search pins using the new schemaS
    const pins = await Pin.searchPins(campusId, searchQuery, includeInvisible);
    
    // Optimize Cloudinary URLs
    const optimizedPins = pins.map(pin => ({
      ...pin,
      image: pin.image?.includes('res.cloudinary.com') && !pin.image.includes('f_auto,q_auto')
        ? (() => {
            const uploadIndex = pin.image.indexOf('/upload/');
            if (uploadIndex !== -1) {
              const baseUrl = pin.image.substring(0, uploadIndex + '/upload/'.length);
              const pathAfterUpload = pin.image.substring(uploadIndex + '/upload/'.length);
              return `${baseUrl}f_auto,q_auto/${pathAfterUpload}`;
            }
            return pin.image;
          })()
        : pin.image,
      isInvisible: !pin.isVisible // Backward compatibility
    }));
    
    res.json({
      success: true,
      count: optimizedPins.length,
      query: searchQuery,
      campusId,
      includeInvisible: includeInvisible,
      data: optimizedPins
    });
  } catch (error) {
    console.error('Error searching pins:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching pins',
      error: error.message
    });
  }
});

/**
 * POST /api/pins
 * Create a new pin (for admin use)
 * Request Body: { campusId, id, x, y, title, description, image, category, isVisible, qrCode, neighbors, buildingNumber, floors }
 */
router.post('/', async (req, res) => {
  try {
    const pinData = req.body;
    
    // Validate required fields
    if (!pinData.campusId || !pinData.id || !pinData.title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: campusId, id, title'
      });
    }
    
    // Set defaults
    if (pinData.isVisible === undefined) {
      pinData.isVisible = true; // Default to visible
    }
    
    // Check if pin with same ID and campusId already exists
    const existingPin = await Pin.findOne({ id: pinData.id, campusId: pinData.campusId });
    if (existingPin) {
      return res.status(409).json({
        success: false,
        message: `Pin with ID ${pinData.id} already exists for this campus`
      });
    }
    
    // Optimize Cloudinary URL if provided
    if (pinData.image?.includes('res.cloudinary.com') && !pinData.image.includes('f_auto,q_auto')) {
      const uploadIndex = pinData.image.indexOf('/upload/');
      if (uploadIndex !== -1) {
        const baseUrl = pinData.image.substring(0, uploadIndex + '/upload/'.length);
        const pathAfterUpload = pinData.image.substring(uploadIndex + '/upload/'.length);
        pinData.image = `${baseUrl}f_auto,q_auto/${pathAfterUpload}`;
      }
    }
    
    const pin = await Pin.create(pinData);
    
    res.status(201).json({
      success: true,
      message: 'Pin created successfully',
      data: pin
    });
  } catch (error) {
    console.error('Error creating pin:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating pin',
      error: error.message
    });
  }
});

/**
 * PUT /api/pins/:id
 * Update an existing pin (for admin use)
 * Query Parameters:
 *   - campusId: (optional) Filter by campus ID
 * Request Body: { x, y, title, description, image, category, isVisible, qrCode, neighbors, buildingNumber, floors }
 */
router.put('/:id', async (req, res) => {
  try {
    const pinId = req.params.id;
    const campusId = req.query.campusId || null;
    const updateData = req.body;
    
    // Build query
    const query = {};
    if (mongoose.Types.ObjectId.isValid(pinId)) {
      query._id = pinId;
    } else {
      query.id = isNaN(pinId) ? pinId : Number(pinId);
    }
    if (campusId) {
      query.campusId = campusId;
    }
    
    // Optimize Cloudinary URL if provided
    if (updateData.image?.includes('res.cloudinary.com') && !updateData.image.includes('f_auto,q_auto')) {
      const uploadIndex = updateData.image.indexOf('/upload/');
      if (uploadIndex !== -1) {
        const baseUrl = updateData.image.substring(0, uploadIndex + '/upload/'.length);
        const pathAfterUpload = updateData.image.substring(uploadIndex + '/upload/'.length);
        updateData.image = `${baseUrl}f_auto,q_auto/${pathAfterUpload}`;
      }
    }
    
    const pin = await Pin.findOneAndUpdate(
      query,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!pin) {
      return res.status(404).json({
        success: false,
        message: `Pin with ID ${pinId} not found`
      });
    }
    
    res.json({
      success: true,
      message: 'Pin updated successfully',
      data: pin
    });
  } catch (error) {
    console.error('Error updating pin:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating pin',
      error: error.message
    });
  }
});

/**
 * DELETE /api/pins/:id
 * Delete a pin (for admin use)
 * Query Parameters:
 *   - campusId: (optional) Filter by campus ID
 */
router.delete('/:id', async (req, res) => {
  try {
    const pinId = req.params.id;
    const campusId = req.query.campusId || null;
    
    // Build query
    const query = {};
    if (mongoose.Types.ObjectId.isValid(pinId)) {
      query._id = pinId;
    } else {
      query.id = isNaN(pinId) ? pinId : Number(pinId);
    }
    if (campusId) {
      query.campusId = campusId;
    }
    
    const pin = await Pin.findOneAndDelete(query);
    
    if (!pin) {
      return res.status(404).json({
        success: false,
        message: `Pin with ID ${pinId} not found`
      });
    }
    
    res.json({
      success: true,
      message: 'Pin deleted successfully',
      data: pin
    });
  } catch (error) {
    console.error('Error deleting pin:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting pin',
      error: error.message
    });
  }
});

module.exports = router;

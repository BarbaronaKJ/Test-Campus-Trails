const express = require('express');
const router = express.Router();
const Campus = require('../models/Campus');

/**
 * GET /api/campuses
 * Fetch all campuses from the database
 * Response: Array of campus documents
 */
router.get('/', async (req, res) => {
  try {
    const campuses = await Campus.find({}).sort({ name: 1 }).lean();
    
    res.json({
      success: true,
      count: campuses.length,
      data: campuses
    });
  } catch (error) {
    console.error('Error fetching campuses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campuses from database',
      error: error.message
    });
  }
});

/**
 * GET /api/campuses/:id
 * Fetch a single campus by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);
    
    if (!campus) {
      return res.status(404).json({
        success: false,
        message: 'Campus not found'
      });
    }
    
    res.json({
      success: true,
      data: campus
    });
  } catch (error) {
    console.error('Error fetching campus:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campus from database',
      error: error.message
    });
  }
});

/**
 * GET /api/campuses/:id/categories
 * Get categories for a specific campus
 */
router.get('/:id/categories', async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);
    
    if (!campus) {
      return res.status(404).json({
        success: false,
        message: 'Campus not found'
      });
    }
    
    res.json({
      success: true,
      campusId: campus._id,
      campusName: campus.name,
      categories: campus.categories || []
    });
  } catch (error) {
    console.error('Error fetching campus categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campus categories',
      error: error.message
    });
  }
});

/**
 * POST /api/campuses
 * Create a new campus (for admin use)
 * Request Body: { name, mapImage, categories, coordinates: { x, y } }
 */
router.post('/', async (req, res) => {
  try {
    const { name, mapImage, categories, coordinates } = req.body;
    
    // Validate required fields
    if (!name || !mapImage) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, mapImage'
      });
    }
    
    // Check if campus with same name already exists
    const existingCampus = await Campus.findOne({ name });
    if (existingCampus) {
      return res.status(409).json({
        success: false,
        message: `Campus with name "${name}" already exists`
      });
    }
    
    const campusData = {
      name,
      mapImage,
      categories: categories || [],
      coordinates: coordinates || { x: 0, y: 0 }
    };
    
    const campus = await Campus.create(campusData);
    
    res.status(201).json({
      success: true,
      message: 'Campus created successfully',
      data: campus
    });
  } catch (error) {
    console.error('Error creating campus:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating campus',
      error: error.message
    });
  }
});

/**
 * PUT /api/campuses/:id
 * Update an existing campus (for admin use)
 * Request Body: { name, mapImage, categories, coordinates: { x, y } }
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, mapImage, categories, coordinates } = req.body;
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (mapImage !== undefined) updateData.mapImage = mapImage;
    if (categories !== undefined) updateData.categories = categories;
    if (coordinates !== undefined) updateData.coordinates = coordinates;
    
    const campus = await Campus.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!campus) {
      return res.status(404).json({
        success: false,
        message: 'Campus not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Campus updated successfully',
      data: campus
    });
  } catch (error) {
    console.error('Error updating campus:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating campus',
      error: error.message
    });
  }
});

/**
 * DELETE /api/campuses/:id
 * Delete a campus (for admin use)
 * Note: This should also delete all associated pins, feedbacks, etc. (cascade delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const campus = await Campus.findByIdAndDelete(req.params.id);
    
    if (!campus) {
      return res.status(404).json({
        success: false,
        message: 'Campus not found'
      });
    }
    
    // TODO: Cascade delete - remove all pins, feedbacks, etc. associated with this campus
    // This should be handled by the web admin panel with proper confirmation
    
    res.json({
      success: true,
      message: 'Campus deleted successfully',
      data: campus
    });
  } catch (error) {
    console.error('Error deleting campus:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting campus',
      error: error.message
    });
  }
});

module.exports = router;

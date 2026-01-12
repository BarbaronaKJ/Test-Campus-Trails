const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Pin = require('../models/Pin');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Campus = require('../models/Campus');

// Middleware to verify admin token
const verifyAdminToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or inactive admin account' 
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const admin = await Admin.findOne({ username });
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Verify token
router.get('/verify', verifyAdminToken, (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.admin._id,
      username: req.admin.username,
      email: req.admin.email,
      role: req.admin.role
    }
  });
});

// Get dashboard statistics
router.get('/stats', verifyAdminToken, async (req, res) => {
  try {
    const [totalPins, visiblePins, totalUsers, totalFeedbacks, totalCampuses] = await Promise.all([
      Pin.countDocuments(),
      Pin.countDocuments({ isVisible: { $ne: false } }),
      User.countDocuments(),
      Feedback.countDocuments(),
      Campus.countDocuments()
    ]);

    const invisiblePins = totalPins - visiblePins;

    res.json({
      totalPins,
      visiblePins,
      invisiblePins,
      totalUsers,
      totalFeedbacks,
      totalCampuses
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Update pin
router.put('/pins/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const pin = await Pin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!pin) {
      return res.status(404).json({
        success: false,
        message: 'Pin not found'
      });
    }

    res.json(pin);
  } catch (error) {
    console.error('Error updating pin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pin',
      error: error.message
    });
  }
});

// Create new pin
router.post('/pins', verifyAdminToken, async (req, res) => {
  try {
    const pinData = req.body;
    const pin = new Pin(pinData);
    await pin.save();

    res.status(201).json(pin);
  } catch (error) {
    console.error('Error creating pin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pin',
      error: error.message
    });
  }
});

// Delete pin
router.delete('/pins/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pin = await Pin.findByIdAndDelete(id);

    if (!pin) {
      return res.status(404).json({
        success: false,
        message: 'Pin not found'
      });
    }

    // Remove this pin from other pins' neighbors arrays
    await Pin.updateMany(
      { neighbors: id },
      { $pull: { neighbors: id } }
    );

    res.json({
      success: true,
      message: 'Pin deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting pin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete pin',
      error: error.message
    });
  }
});

// Update pin neighbors
router.put('/pins/:id/neighbors', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { neighbors } = req.body;

    const pin = await Pin.findByIdAndUpdate(
      id,
      { neighbors },
      { new: true }
    );

    if (!pin) {
      return res.status(404).json({
        success: false,
        message: 'Pin not found'
      });
    }

    res.json(pin);
  } catch (error) {
    console.error('Error updating neighbors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update neighbors',
      error: error.message
    });
  }
});

// Get all users (with pagination)
router.get('/users', verifyAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Get all feedbacks (with pagination)
router.get('/feedbacks', verifyAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const feedbacks = await Feedback.find()
      .populate('userId', 'username email')
      .populate('pinId', 'title category')
      .populate('campusId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Feedback.countDocuments();

    res.json({
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedbacks',
      error: error.message
    });
  }
});

module.exports = router;

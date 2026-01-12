const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Pin = require('../models/Pin');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Middleware to verify admin token
 */
const verifyAdminToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
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

/**
 * Middleware to verify user token (for mobile app)
 */
const verifyUserToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid user account' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

/**
 * ADMIN ROUTES
 */

// Create and send notification
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      campusId,
      metadata,
      priority,
      status,
      scheduledFor,
      targetAudience
    } = req.body;

    // Validation
    if (!type || !title || !message || !campusId) {
      return res.status(400).json({
        success: false,
        message: 'Type, title, message, and campus are required'
      });
    }

    // Create notification
    const notification = new Notification({
      type,
      title,
      message,
      campusId,
      metadata: metadata || {},
      priority: priority || 'normal',
      status: status || 'sent',
      scheduledFor,
      targetAudience: targetAudience || 'all',
      createdBy: req.admin._id,
      sentAt: status === 'sent' ? new Date() : null
    });

    await notification.save();

    // Populate createdBy field
    await notification.populate('createdBy', 'username email');

    res.status(201).json({
      success: true,
      message: status === 'draft' ? 'Notification saved as draft' : 'Notification sent successfully',
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
});

// Get all notifications (with pagination and filters)
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      campusId,
      type,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (campusId) query.campusId = campusId;
    if (type) query.type = type;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.find(query)
      .populate('createdBy', 'username email')
      .populate('metadata.pinId', 'title category')
      .populate('metadata.facilityId', 'title category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

// Get notification statistics (MUST be before /:id route)
router.get('/admin/stats', verifyAdminToken, async (req, res) => {
  try {
    const { campusId, startDate, endDate } = req.query;

    const query = { isActive: true };
    if (campusId) query.campusId = campusId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const totalSent = await Notification.countDocuments({ ...query, status: 'sent' });
    const totalDrafts = await Notification.countDocuments({ ...query, status: 'draft' });
    const totalScheduled = await Notification.countDocuments({ ...query, status: 'scheduled' });
    
    const notifications = await Notification.find({ ...query, status: 'sent' });
    const totalReads = notifications.reduce((sum, n) => sum + n.readCount, 0);
    const avgReadRate = totalSent > 0 ? (totalReads / totalSent).toFixed(2) : 0;

    // Get counts by type
    const byType = await Notification.aggregate([
      { $match: { ...query, status: 'sent' } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalSent,
        totalDrafts,
        totalScheduled,
        totalReads,
        avgReadRate,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// Get single notification
router.get('/:id', verifyAdminToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('metadata.pinId', 'title category x y')
      .populate('metadata.facilityId', 'title category x y');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification',
      error: error.message
    });
  }
});

// Update notification
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      campusId,
      metadata,
      priority,
      status,
      scheduledFor,
      targetAudience
    } = req.body;

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Update fields
    if (type) notification.type = type;
    if (title) notification.title = title;
    if (message) notification.message = message;
    if (campusId) notification.campusId = campusId;
    if (metadata) notification.metadata = metadata;
    if (priority) notification.priority = priority;
    if (status) notification.status = status;
    if (scheduledFor) notification.scheduledFor = scheduledFor;
    if (targetAudience) notification.targetAudience = targetAudience;

    await notification.save();
    await notification.populate('createdBy', 'username email');

    res.json({
      success: true,
      message: 'Notification updated successfully',
      notification
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: error.message
    });
  }
});

// Delete notification (soft delete)
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isActive = false;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
});

// Send a draft notification
router.post('/:id/send', verifyAdminToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Notification has already been sent'
      });
    }

    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification sent successfully',
      notification
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: error.message
    });
  }
});

/**
 * MOBILE APP ROUTES
 */

// Get active notifications for mobile app (user's campus)
router.get('/mobile/list', verifyUserToken, async (req, res) => {
  try {
    const { campusId, page = 1, limit = 20 } = req.query;

    if (!campusId) {
      return res.status(400).json({
        success: false,
        message: 'Campus ID is required'
      });
    }

    // Find campus by name (e.g., "USTP-CDO")
    const campus = await require('../models/Campus').findOne({ name: campusId });
    
    if (!campus) {
      return res.status(404).json({
        success: false,
        message: 'Campus not found'
      });
    }

    const query = {
      campusId: campus._id, // Query using the ObjectId
      status: 'sent',
      isActive: true
    };

    // Don't show expired alerts/emergencies
    const now = new Date();
    query.$or = [
      { 'metadata.expiresAt': { $exists: false } },
      { 'metadata.expiresAt': null },
      { 'metadata.expiresAt': { $gte: now } }
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.find(query)
      .populate('metadata.pinId', 'title category x y')
      .populate('metadata.facilityId', 'title category x y')
      .sort({ priority: -1, createdAt: -1 }) // High priority first
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: skip + notifications.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching mobile notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

// Mark notification as read (increment read count)
router.post('/:id/read', verifyUserToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.readCount += 1;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
});

// Get unread count for mobile app
router.get('/mobile/unread-count', verifyUserToken, async (req, res) => {
  try {
    const { campusId, lastChecked } = req.query;

    if (!campusId) {
      return res.status(400).json({
        success: false,
        message: 'Campus ID is required'
      });
    }

    // Find campus by name (e.g., "USTP-CDO")
    const campus = await require('../models/Campus').findOne({ name: campusId });
    
    if (!campus) {
      return res.status(404).json({
        success: false,
        message: 'Campus not found'
      });
    }

    const query = {
      campusId: campus._id, // Query using the ObjectId
      status: 'sent',
      isActive: true
    };

    // Count notifications created after lastChecked timestamp
    if (lastChecked) {
      query.createdAt = { $gt: new Date(lastChecked) };
    }

    const count = await Notification.countDocuments(query);

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting unread count',
      error: error.message
    });
  }
});

module.exports = router;

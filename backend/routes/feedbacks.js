const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Pin = require('../models/Pin');

/**
 * GET /api/feedbacks
 * Get feedbacks (filtered by campusId and/or pinId)
 * Query Parameters:
 *   - campusId: (optional) Filter by campus ID
 *   - pinId: (optional) Filter by pin ID
 *   - userId: (optional) Filter by user ID
 */
router.get('/', async (req, res) => {
  try {
    const { campusId, pinId, userId } = req.query;
    const query = {};
    
    if (campusId) query.campusId = campusId;
    if (pinId) query.pinId = pinId;
    if (userId) query.userId = userId;
    
    const feedbacks = await Feedback.find(query)
      .populate('userId', 'username email displayName profilePicture')
      .populate('pinId', 'title category image')
      .populate('campusId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedbacks',
      error: error.message
    });
  }
});

/**
 * GET /api/feedbacks/pin/:pinId
 * Get feedbacks for a specific pin (filtered by campusId)
 * Query Parameters:
 *   - campusId: (REQUIRED) Filter by campus ID
 */
router.get('/pin/:pinId', async (req, res) => {
  try {
    const { pinId } = req.params;
    const { campusId } = req.query;
    
    if (!campusId) {
      return res.status(400).json({
        success: false,
        message: 'campusId query parameter is required'
      });
    }
    
    const feedbacks = await Feedback.getFeedbackByPin(pinId, campusId);
    
    res.json({
      success: true,
      count: feedbacks.length,
      pinId,
      campusId,
      data: feedbacks
    });
  } catch (error) {
    console.error('Error fetching feedbacks for pin:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedbacks for pin',
      error: error.message
    });
  }
});

/**
 * GET /api/feedbacks/user/:userId
 * Get feedbacks by a specific user (filtered by campusId)
 * Query Parameters:
 *   - campusId: (optional) Filter by campus ID
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { campusId } = req.query;
    
    const feedbacks = await Feedback.getFeedbackByUser(userId, campusId || null);
    
    res.json({
      success: true,
      count: feedbacks.length,
      userId,
      campusId: campusId || 'all',
      data: feedbacks
    });
  } catch (error) {
    console.error('Error fetching feedbacks for user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedbacks for user',
      error: error.message
    });
  }
});

/**
 * POST /api/feedbacks
 * Create a new feedback (requires authentication)
 * Request Body: { pinId, campusId, comment, rating (optional) }
 */
router.post('/', async (req, res) => {
  try {
    const { pinId, campusId, comment, rating } = req.body;
    
    // Get userId from token (if authentication middleware is added)
    // For now, require userId in body (should be replaced with auth middleware)
    const userId = req.body.userId || req.headers['x-user-id'];
    
    if (!userId || !pinId || !campusId || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, pinId, campusId, comment'
      });
    }
    
    // Validate comment length
    if (comment.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 500 characters'
      });
    }
    
    // Verify pin exists and belongs to campus
    const pin = await Pin.findOne({ _id: pinId, campusId });
    if (!pin) {
      return res.status(404).json({
        success: false,
        message: 'Pin not found for this campus'
      });
    }
    
    const feedbackData = {
      userId,
      pinId,
      campusId,
      comment: comment.trim(),
      rating: rating || null
    };
    
    const feedback = await Feedback.createFeedback(feedbackData);
    
    res.status(201).json({
      success: true,
      message: 'Feedback created successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating feedback',
      error: error.message
    });
  }
});

/**
 * PUT /api/feedbacks/:id
 * Update a feedback (requires authentication - user can only update their own)
 * Request Body: { comment, rating (optional) }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, rating } = req.body;
    
    // Get userId from token (if authentication middleware is added)
    const userId = req.body.userId || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }
    
    // Verify user owns this feedback
    if (feedback.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own feedback'
      });
    }
    
    if (comment !== undefined) {
      if (comment.trim().length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Comment cannot exceed 500 characters'
        });
      }
      feedback.comment = comment.trim();
    }
    
    if (rating !== undefined) {
      feedback.rating = rating;
    }
    
    await feedback.save();
    
    const updatedFeedback = await Feedback.findById(id)
      .populate('userId', 'username email displayName profilePicture')
      .lean();
    
    res.json({
      success: true,
      message: 'Feedback updated successfully',
      data: updatedFeedback
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating feedback',
      error: error.message
    });
  }
});

/**
 * DELETE /api/feedbacks/:id
 * Delete a feedback (requires authentication - user can only delete their own)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get userId from token (if authentication middleware is added)
    const userId = req.body.userId || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }
    
    // Verify user owns this feedback (or is admin)
    if (feedback.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own feedback'
      });
    }
    
    await Feedback.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting feedback',
      error: error.message
    });
  }
});

module.exports = router;

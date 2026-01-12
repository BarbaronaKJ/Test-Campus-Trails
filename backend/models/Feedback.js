const mongoose = require('mongoose');

/**
 * Feedback Schema - Stores user feedback/comments for pins
 * Separate from Pins to keep map queries fast
 * Fetched only when a user opens building details
 */
const feedbackSchema = new mongoose.Schema({
  // Foreign Key → User._id
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Foreign Key → Pin._id
  pinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pin',
    required: true,
    index: true
  },
  
  // Foreign Key → Campus._id (for filtering feedback by campus)
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },
  
  // Comment/feedback text (max 500 characters)
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  // Optional: Rating (1-5 stars)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'feedbacks'
});

// Update the updatedAt field before saving
feedbackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound indexes for common queries
feedbackSchema.index({ pinId: 1, campusId: 1 });
feedbackSchema.index({ userId: 1, campusId: 1 });
feedbackSchema.index({ pinId: 1, createdAt: -1 }); // For sorting by newest first

// Static method to get feedback for a specific pin
feedbackSchema.statics.getFeedbackByPin = async function(pinId, campusId = null) {
  const query = { pinId };
  if (campusId) {
    query.campusId = campusId;
  }
  return await this.find(query)
    .populate('userId', 'username email displayName profilePicture')
    .sort({ createdAt: -1 }) // Newest first
    .lean();
};

// Static method to get feedback by user
feedbackSchema.statics.getFeedbackByUser = async function(userId, campusId = null) {
  const query = { userId };
  if (campusId) {
    query.campusId = campusId;
  }
  return await this.find(query)
    .populate('pinId', 'id title category image')
    .populate('campusId', 'name')
    .sort({ createdAt: -1 })
    .lean();
};

// Static method to get feedback for a campus
feedbackSchema.statics.getFeedbackByCampus = async function(campusId) {
  return await this.find({ campusId })
    .populate('userId', 'username email displayName profilePicture')
    .populate('pinId', 'title category')
    .sort({ createdAt: -1 })
    .lean();
};

// Static method to create feedback
feedbackSchema.statics.createFeedback = async function(feedbackData) {
  const feedback = new this(feedbackData);
  await feedback.save();
  return await this.findById(feedback._id)
    .populate('userId', 'username email displayName profilePicture')
    .lean();
};

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
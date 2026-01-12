const mongoose = require('mongoose');

/**
 * Notification Schema - Stores notifications sent to mobile app users
 */
const notificationSchema = new mongoose.Schema({
  // Notification type
  type: {
    type: String,
    enum: ['announcement', 'alert', 'event', 'facility-update', 'emergency'],
    required: true
  },
  
  // Basic notification content
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  
  // Campus association
  campusId: {
    type: String,
    required: true,
    index: true
  },
  
  // Type-specific metadata
  metadata: {
    // For 'event' type
    eventDate: {
      type: Date
    },
    eventTime: {
      type: String
    },
    location: {
      type: String,
      trim: true
    },
    pinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pin'
    },
    
    // For 'facility-update' type
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pin'
    },
    facilityName: {
      type: String,
      trim: true
    },
    facilityStatus: {
      type: String,
      enum: ['closed', 'maintenance', 'reopened', 'relocated', 'other']
    },
    
    // For 'alert'/'emergency' type
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    expiresAt: {
      type: Date
    }
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'sent', 'scheduled'],
    default: 'sent'
  },
  
  scheduledFor: {
    type: Date
  },
  
  // Admin tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  sentAt: {
    type: Date
  },
  
  // Engagement tracking
  readCount: {
    type: Number,
    default: 0
  },
  
  // Visibility controls
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'faculty'],
    default: 'all'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ campusId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index({ isActive: 1, type: 1 });

// Virtual for calculating read rate
notificationSchema.virtual('readRate').get(function() {
  // This would need total recipient count to be meaningful
  // For now, just return the read count
  return this.readCount;
});

// Automatically set sentAt when status changes to 'sent'
notificationSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'sent' && !this.sentAt) {
    this.sentAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);

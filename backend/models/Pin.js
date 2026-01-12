const mongoose = require('mongoose');

/**
 * Pin Schema - Handles both Visible Facilities and Invisible Waypoints
 * Links to Campus via campusId for filtering
 */
const pinSchema = new mongoose.Schema({
  // Foreign Key → Campus._id
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },
  
  // Unique identifier for the pin (can be number or string)
  // This is the legacy ID from pinsData.js, kept for backward compatibility
  id: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Position on the map (x, y coordinates)
  x: {
    type: Number,
    required: true,
    default: 0
  },
  
  y: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Display title (e.g., "ICT Building", "Main Entrance")
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  // Full description
  description: {
    type: String,
    trim: true,
    default: null
  },
  
  // Category (e.g., "Laboratory", "Office", "Canteen")
  category: {
    type: String,
    trim: true,
    default: 'Other',
    index: true
  },
  
  // Boolean: True for map pins (visible facilities), False for pathfinding waypoints
  isVisible: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  
  // QR Code identifier (e.g., "ict_bldg_001")
  qrCode: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  
  // Image URL (Cloudinary URL or local asset path)
  // Only used for visible pins, waypoints don't need images
  image: {
    type: String,
    trim: true,
    default: null
  },
  
  // Neighbors array for pathfinding (array of pin IDs that connect to this pin)
  neighbors: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
    index: true
  },
  
  // Optional: Building number (for buildings 1-52)
  buildingNumber: {
    type: Number,
    default: null,
    index: true
  },
  
  // Floors array with nested rooms
  floors: [{
    level: {
      type: Number,
      required: true
    },
    floorPlan: {
      type: String, // Image URL (e.g., "ict_f1.png")
      trim: true,
      default: null
    },
    rooms: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      image: {
        type: String, // Image URL (e.g., "room_402.jpg")
        trim: true,
        default: null
      },
      description: {
        type: String,
        trim: true,
        default: null
      }
    }]
  }],
  
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
  collection: 'pins' // Collection name for all pins (visible and invisible)
});

// Update the updatedAt field before saving
pinSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound indexes for common queries
pinSchema.index({ campusId: 1, isVisible: 1 });
pinSchema.index({ campusId: 1, category: 1 });
pinSchema.index({ campusId: 1, title: 1 });
pinSchema.index({ id: 1 }); // Legacy ID index (for backward compatibility)

// Static method to get all pins for a campus (optionally filter by visibility)
pinSchema.statics.getPinsByCampus = async function(campusId, includeInvisible = false) {
  const query = { campusId };
  if (!includeInvisible) {
    query.isVisible = true;
  }
  return await this.find(query).sort({ id: 1 }).lean();
};

// Static method to get pins by category for a campus
pinSchema.statics.getPinsByCategory = async function(campusId, category, includeInvisible = false) {
  const query = { campusId, category };
  if (!includeInvisible) {
    query.isVisible = true;
  }
  return await this.find(query).sort({ id: 1 }).lean();
};

// Static method to search pins by title for a campus
pinSchema.statics.searchPins = async function(campusId, searchQuery, includeInvisible = false) {
  const query = {
    campusId,
    title: { $regex: searchQuery, $options: 'i' }
  };
  if (!includeInvisible) {
    query.isVisible = true;
  }
  return await this.find(query).sort({ id: 1 }).lean();
};

// Static method to get pin by ID (legacy ID or _id)
pinSchema.statics.getPinById = async function(pinId, campusId = null) {
  const query = {};
  
  // Try to match by legacy id (number/string) or _id (ObjectId)
  if (mongoose.Types.ObjectId.isValid(pinId)) {
    query._id = pinId;
  } else {
    query.id = isNaN(pinId) ? pinId : Number(pinId);
  }
  
  if (campusId) {
    query.campusId = campusId;
  }
  
  return await this.findOne(query).lean();
};

// Static method to get all pins (for pathfinding - includes invisible waypoints)
pinSchema.statics.getAllPins = async function(campusId = null) {
  const query = {};
  if (campusId) {
    query.campusId = campusId;
  }
  return await this.find(query).sort({ id: 1 }).lean();
};

const Pin = mongoose.model('Pin', pinSchema);

module.exports = Pin;
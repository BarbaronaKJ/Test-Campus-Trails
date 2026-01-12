const mongoose = require('mongoose');

/**
 * Campus Schema - The root/parent collection
 * When a user selects a campus, it filters all other data (pins, etc.)
 */
const campusSchema = new mongoose.Schema({
  // Campus name (e.g., "USTP-CDO", "USTP-Alubijid")
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  
  // Map image URL (Cloudinary URL or local asset path)
  mapImage: {
    type: String,
    required: true,
    trim: true
  },
  
  // Custom categories list per campus (e.g., ["Laboratory", "Office", "Canteen"])
  categories: {
    type: [String],
    default: [],
    trim: true
  },
  
  // Center point coordinates for initial map rendering
  coordinates: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  collection: 'campuses' // Explicit collection name
});

// Indexes are defined in the schema fields above

// Static method to get all campuses
campusSchema.statics.getAllCampuses = async function() {
  return await this.find({}).sort({ name: 1 }).lean();
};

// Static method to get campus by name
campusSchema.statics.getCampusByName = async function(name) {
  return await this.findOne({ name }).lean();
};

const Campus = mongoose.model('Campus', campusSchema);

module.exports = Campus;
/**
 * Migration Script: Import pins from pinsData.js to MongoDB
 * 
 * This script reads the local pinsData.js file and imports all pins into MongoDB
 * Uses the new schema where all pins (visible and invisible) go into the 'pins' collection
 * with isVisible flag: true for visible pins, false for waypoints
 * Run this after setting up your MongoDB connection: node backend/scripts/migratePins.js
 */

const mongoose = require('mongoose');
const Pin = require('../models/Pin');
const Campus = require('../models/Campus');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Optimize Cloudinary URL with f_auto and q_auto parameters
 */
const optimizeCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }
  
  if (url.includes('f_auto,q_auto')) {
    return url;
  }
  
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) {
    return url;
  }
  
  const baseUrl = url.substring(0, uploadIndex + '/upload/'.length);
  const pathAfterUpload = url.substring(uploadIndex + '/upload/'.length);
  
  return `${baseUrl}f_auto,q_auto/${pathAfterUpload}`;
};

/**
 * Convert local pin data to MongoDB format
 */
const convertPinForMongoDB = (pin, campusId, isVisible) => {
  // Handle image: convert require() to URL string or keep URL string
  let imageUrl = pin.image;
  
  // If it's a require() object (number from React Native require()), use placeholder
  if (typeof pin.image === 'number') {
    // Local asset - use a placeholder Cloudinary URL
    imageUrl = 'https://res.cloudinary.com/dun83uvdm/image/upload/f_auto,q_auto/v1768038877/openfield_ypsemx.jpg';
  } else if (typeof pin.image === 'string') {
    // Already a URL string, optimize it
    imageUrl = optimizeCloudinaryUrl(pin.image);
  } else {
    // Fallback for any other type
    imageUrl = 'https://res.cloudinary.com/dun83uvdm/image/upload/f_auto,q_auto/v1768038877/openfield_ypsemx.jpg';
  }
  
  // Extract building number if title is numeric
  let buildingNumber = null;
  if (!isNaN(pin.title) && !isNaN(parseInt(pin.title))) {
    buildingNumber = parseInt(pin.title);
  }
  
  // Determine category based on existing logic
  let category = 'Other';
  const title = pin.title?.toString().toUpperCase() || '';
  const description = pin.description?.toUpperCase() || '';
  
  if (buildingNumber && buildingNumber >= 1 && buildingNumber <= 52) {
    category = 'Buildings';
  } else if (title.includes('ME') || description.includes('MAIN ENTRANCE')) {
    category = 'Main Entrance';
  } else if (title.includes('SL') || title.includes('BF') || title.includes('DC') || title.includes('MC') || title.includes('OF')) {
    category = 'Amenities';
  } else {
    category = 'Other';
  }
  
  return {
    campusId: campusId, // Required: link to campus
    id: pin.id, // Legacy ID for backward compatibility
    x: pin.x,
    y: pin.y,
    title: pin.title?.toString() || pin.id?.toString() || '',
    description: pin.description || pin.title?.toString() || pin.id?.toString() || 'Pin',
    image: isVisible ? imageUrl : null, // Only visible pins need images
    category: category,
    isVisible: isVisible, // true for visible pins, false for waypoints
    qrCode: null, // Can be set later via web panel
    neighbors: pin.neighbors || [],
    buildingNumber: buildingNumber,
    floors: [], // Can be added later via web panel
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

/**
 * Load pins from pinsData.js by reading and parsing the file
 * Handles ES module syntax and require() statements
 */
const loadPinsFromFile = async () => {
  const pinsDataPath = path.join(__dirname, '../../pinsData.js');
  
  if (!fs.existsSync(pinsDataPath)) {
    throw new Error(`pinsData.js not found at: ${pinsDataPath}`);
  }
  
  console.log(`📖 Reading pins from ${pinsDataPath}...`);
  let fileContent = fs.readFileSync(pinsDataPath, 'utf8');
  
  // Replace require() statements with placeholder strings
  // Pattern: require('./assets/USTP.jpg') -> './assets/USTP.jpg'
  fileContent = fileContent.replace(/require\(['"]([^'"]+)['"]\)/g, (match, path) => {
    // For local assets, we'll use a placeholder Cloudinary URL
    return `"https://res.cloudinary.com/dun83uvdm/image/upload/f_auto,q_auto/v1768038877/openfield_ypsemx.jpg"`;
  });
  
  // Remove export statement and create a module that returns the pins
  fileContent = fileContent.replace(/export const pins = /, 'const pins = ');
  fileContent = fileContent + '\nmodule.exports = { pins };';
  
  // Write to a temporary file
  const tempFilePath = path.join(__dirname, 'tempPinsData.js');
  fs.writeFileSync(tempFilePath, fileContent, 'utf8');
  
  try {
    // Require the temporary file
    const pinsModule = require(tempFilePath);
    const pins = pinsModule.pins;
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);
    
    return pins;
  } catch (error) {
    // Clean up temporary file on error
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    throw error;
  }
};

/**
 * Create or find default campus
 */
const getOrCreateDefaultCampus = async () => {
  // Try to find existing campus named "USTP-CDO"
  let campus = await Campus.findOne({ name: 'USTP-CDO' });
  
  if (!campus) {
    // Create default campus if it doesn't exist
    console.log('📌 Creating default campus "USTP-CDO"...');
    campus = await Campus.create({
      name: 'USTP-CDO',
      mapImage: 'ustp-cdo-map.png', // Default map image
      categories: ['Buildings', 'Main Entrance', 'Amenities', 'Other'], // Default categories
      coordinates: {
        x: 0,
        y: 0
      }
    });
    console.log('   ✅ Created default campus\n');
  } else {
    console.log('📌 Using existing campus "USTP-CDO"\n');
  }
  
  return campus;
};

/**
 * Main migration function
 */
const migratePins = async () => {
  try {
    // Load pins from file
    console.log('📖 Loading pins from pinsData.js...');
    const pins = await loadPinsFromFile();
    console.log(`✅ Loaded ${pins.length} pins from pinsData.js\n`);

    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set. Please create a .env file in the backend folder.');
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB Atlas');
    console.log(`   Database: ${mongoose.connection.name}\n`);

    // Get or create default campus
    const campus = await getOrCreateDefaultCampus();
    const campusId = campus._id;

    // Separate visible pins and invisible waypoints
    const visiblePins = pins.filter(pin => !pin.isInvisible);
    const invisibleWaypoints = pins.filter(pin => pin.isInvisible === true);
    
    console.log(`📊 Found ${visiblePins.length} visible pins and ${invisibleWaypoints.length} invisible waypoints\n`);

    // Clear existing pins (optional - comment out if you want to keep existing data)
    const existingPinCount = await Pin.countDocuments({ campusId });
    if (existingPinCount > 0) {
      console.log(`⚠️  Found ${existingPinCount} existing pins for this campus in database.`);
      console.log('   Clearing existing pins...');
      await Pin.deleteMany({ campusId });
      console.log('   ✅ Existing pins cleared\n');
    }

    // Convert and insert all pins (visible + invisible)
    const allPins = [...visiblePins, ...invisibleWaypoints];
    console.log(`📦 Migrating ${allPins.length} total pins (${visiblePins.length} visible + ${invisibleWaypoints.length} invisible) to 'pins' collection...\n`);
    
    // Convert all pins
    const convertedPins = allPins.map(pin => {
      const isVisible = !pin.isInvisible;
      return convertPinForMongoDB(pin, campusId, isVisible);
    });
    
    // Filter out invalid pins and ensure required fields exist
    const validPins = convertedPins
      .filter(pin => pin.id !== undefined && pin.id !== null)
      .map(pin => ({
        ...pin,
        description: pin.description || pin.title || `Pin ${pin.id}` || 'Pin'
      }));
    
    console.log(`   Converting ${validPins.length} valid pins...`);
    
    // Insert pins in batches
    const batchSize = 10;
    let pinsInserted = 0;
    let pinsSkipped = 0;
    let pinsErrors = 0;

    for (let i = 0; i < validPins.length; i += batchSize) {
      const batch = validPins.slice(i, i + batchSize);
      
      for (const pinData of batch) {
        try {
          // Check if pin already exists (by legacy id and campusId)
          const existingPin = await Pin.findOne({ id: pinData.id, campusId });
          if (existingPin) {
            console.log(`   ⚠️  Skipping pin ${pinData.id} (${pinData.title}) - already exists`);
            pinsSkipped++;
            continue;
          }
          
          await Pin.create(pinData);
          pinsInserted++;
          if (pinsInserted % 10 === 0) {
            console.log(`   ✅ Inserted ${pinsInserted}/${validPins.length} pins...`);
          }
        } catch (error) {
          if (error.code === 11000) {
            console.log(`   ⚠️  Skipping pin ${pinData.id} (${pinData.title}) - duplicate ID`);
            pinsSkipped++;
          } else {
            console.error(`   ❌ Error inserting pin ${pinData.id} (${pinData.title}):`, error.message);
            pinsErrors++;
          }
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully inserted: ${pinsInserted} pins`);
    console.log(`   ⚠️  Skipped: ${pinsSkipped} pins`);
    if (pinsErrors > 0) {
      console.log(`   ❌ Errors: ${pinsErrors} pins`);
    }
    console.log(`   📝 Total processed: ${validPins.length} pins\n`);

    // Verify migration
    const finalPinCount = await Pin.countDocuments({ campusId });
    const visibleCount = await Pin.countDocuments({ campusId, isVisible: true });
    const invisibleCount = await Pin.countDocuments({ campusId, isVisible: false });
    
    console.log(`✅ Migration completed!`);
    console.log(`   Total pins in database for this campus: ${finalPinCount}`);
    console.log(`   Visible pins: ${visibleCount}`);
    console.log(`   Invisible waypoints: ${invisibleCount}`);
    
    if (finalPinCount > 0) {
      console.log('\n🧪 Next steps:');
      console.log('   - You can now test the API: curl http://localhost:3000/api/pins');
      console.log('   - Add more campuses via MongoDB Compass or the web panel');
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 MongoDB connection closed');
    }
    process.exit(0);
  }
};

// Run migration
console.log('🚀 Starting pin migration to MongoDB...\n');
migratePins();

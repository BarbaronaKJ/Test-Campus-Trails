/**
 * Script to Add Missing Invisible Pins to MongoDB
 * 
 * This script adds invisible waypoints (road network points) to the database
 * that are used for pathfinding but not displayed to users.
 * 
 * Run: node backend/scripts/addInvisiblePins.js
 */

const mongoose = require('mongoose');
const Pin = require('../models/Pin');
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
const convertPinForMongoDB = (pin) => {
  // Handle image: invisible pins don't need images, but use a placeholder
  let imageUrl = pin.image;
  
  if (typeof pin.image === 'number') {
    imageUrl = 'https://res.cloudinary.com/dun83uvdm/image/upload/f_auto,q_auto/v1768038877/openfield_ypsemx.jpg';
  } else if (typeof pin.image === 'string') {
    imageUrl = optimizeCloudinaryUrl(pin.image);
  } else {
    // For invisible waypoints, use a placeholder
    imageUrl = 'https://res.cloudinary.com/dun83uvdm/image/upload/f_auto,q_auto/v1768038877/openfield_ypsemx.jpg';
  }
  
  // Extract building number if title is numeric (invisible pins won't have this)
  let buildingNumber = null;
  if (!isNaN(pin.title) && !isNaN(parseInt(pin.title))) {
    const num = parseInt(pin.title);
    // Only set building number for actual buildings (1-52), not waypoints (1000+)
    if (num >= 1 && num <= 52) {
      buildingNumber = num;
    }
  }
  
  // Invisible waypoints use "Waypoint" category
  let category = pin.isInvisible ? 'Waypoint' : 'Other';
  
  return {
    id: pin.id,
    x: pin.x,
    y: pin.y,
    title: pin.title?.toString() || pin.id?.toString() || '',
    description: pin.description || pin.title?.toString() || `Waypoint ${pin.id}`,
    image: imageUrl,
    category: category,
    neighbors: pin.neighbors || [],
    buildingNumber: buildingNumber,
    isInvisible: pin.isInvisible === true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

/**
 * Load pins from pinsData.js
 */
const loadPinsFromFile = async () => {
  const pinsDataPath = path.join(__dirname, '../../pinsData.js');
  
  if (!fs.existsSync(pinsDataPath)) {
    throw new Error(`pinsData.js not found at: ${pinsDataPath}`);
  }
  
  console.log(`📖 Reading pins from ${pinsDataPath}...`);
  let fileContent = fs.readFileSync(pinsDataPath, 'utf8');
  
  // Replace require() statements with placeholder strings
  fileContent = fileContent.replace(/require\(['"]([^'"]+)['"]\)/g, () => {
    return `"https://res.cloudinary.com/dun83uvdm/image/upload/f_auto,q_auto/v1768038877/openfield_ypsemx.jpg"`;
  });
  
  // Remove export statement and create a module that returns the pins
  fileContent = fileContent.replace(/export const pins = /, 'const pins = ');
  fileContent = fileContent + '\nmodule.exports = { pins };';
  
  // Write to a temporary file
  const tempFilePath = path.join(__dirname, 'tempPinsData.js');
  fs.writeFileSync(tempFilePath, fileContent, 'utf8');
  
  try {
    const pinsModule = require(tempFilePath);
    const pins = pinsModule.pins;
    fs.unlinkSync(tempFilePath);
    return pins;
  } catch (error) {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    throw error;
  }
};

/**
 * Main function to add invisible pins
 */
const addInvisiblePins = async () => {
  try {
    // Load pins from file
    console.log('📖 Loading pins from pinsData.js...');
    const pins = await loadPinsFromFile();
    console.log(`✅ Loaded ${pins.length} pins from pinsData.js\n`);

    // Filter only invisible pins
    const invisiblePins = pins.filter(pin => pin.isInvisible === true);
    console.log(`🔍 Found ${invisiblePins.length} invisible waypoints\n`);

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

    // Convert invisible pins
    console.log(`📦 Converting ${invisiblePins.length} invisible waypoints...\n`);
    const convertedPins = invisiblePins.map(convertPinForMongoDB);

    // Insert invisible pins (skip if already exists)
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const pinData of convertedPins) {
      try {
        // Check if pin with this ID already exists
        const existingPin = await Pin.findOne({ id: pinData.id });
        if (existingPin) {
          // Update existing pin to ensure isInvisible is set correctly
          if (existingPin.isInvisible !== true) {
            await Pin.updateOne({ id: pinData.id }, { isInvisible: true });
            console.log(`   ✅ Updated pin ${pinData.id} (${pinData.title}) - set isInvisible to true`);
          } else {
            console.log(`   ⚠️  Skipping pin ${pinData.id} (${pinData.title}) - already exists`);
          }
          skipped++;
          continue;
        }
        
        await Pin.create(pinData);
        inserted++;
        if (inserted % 10 === 0) {
          console.log(`   ✅ Inserted ${inserted}/${convertedPins.length} invisible pins...`);
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`   ⚠️  Skipping pin ${pinData.id} (${pinData.title}) - duplicate ID`);
          skipped++;
        } else {
          console.error(`   ❌ Error inserting pin ${pinData.id} (${pinData.title}):`, error.message);
          errors++;
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully inserted: ${inserted} invisible pins`);
    console.log(`   ⚠️  Skipped (already exists): ${skipped} invisible pins`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors} invisible pins`);
    }
    console.log(`   📝 Total processed: ${convertedPins.length} invisible pins\n`);

    // Verify
    const invisibleCount = await Pin.countDocuments({ isInvisible: true });
    const totalCount = await Pin.countDocuments();
    console.log(`✅ Operation completed!`);
    console.log(`   Total pins in database: ${totalCount}`);
    console.log(`   Invisible waypoints: ${invisibleCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 MongoDB connection closed');
    }
    process.exit(0);
  }
};

// Run script
console.log('🚀 Adding invisible waypoints to MongoDB...\n');
addInvisiblePins();

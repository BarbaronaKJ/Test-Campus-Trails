/**
 * Script to Add Missing Waypoints to MongoDB
 * 
 * This script adds waypoints (invisible road network points) to the 'waypoints' collection
 * that are used for pathfinding but not displayed to users.
 * 
 * Run: node backend/scripts/addWaypoints.js
 */

const mongoose = require('mongoose');
const Waypoint = require('../models/Waypoint');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
 * Main function to add waypoints
 */
const addWaypoints = async () => {
  try {
    // Load pins from file
    console.log('📖 Loading pins from pinsData.js...');
    const pins = await loadPinsFromFile();
    console.log(`✅ Loaded ${pins.length} pins from pinsData.js\n`);

    // Filter only invisible waypoints
    const invisibleWaypoints = pins.filter(pin => pin.isInvisible === true);
    console.log(`🔍 Found ${invisibleWaypoints.length} invisible waypoints\n`);

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

    // Convert waypoints
    console.log(`📦 Converting ${invisibleWaypoints.length} waypoints...\n`);
    const convertedWaypoints = invisibleWaypoints.map(pin => ({
      id: pin.id,
      x: pin.x,
      y: pin.y,
      title: pin.title?.toString() || pin.id?.toString() || '',
      description: pin.description || pin.title?.toString() || `Waypoint ${pin.id}`,
      neighbors: pin.neighbors || [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert waypoints (skip if already exists)
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 10;

    for (let i = 0; i < convertedWaypoints.length; i += batchSize) {
      const batch = convertedWaypoints.slice(i, i + batchSize);
      
      for (const waypointData of batch) {
        try {
          // Check if waypoint with this ID already exists
          const existingWaypoint = await Waypoint.findOne({ id: waypointData.id });
          if (existingWaypoint) {
            console.log(`   ⚠️  Skipping waypoint ${waypointData.id} (${waypointData.title}) - already exists`);
            skipped++;
            continue;
          }
          
          await Waypoint.create(waypointData);
          inserted++;
          if (inserted % 10 === 0) {
            console.log(`   ✅ Inserted ${inserted}/${convertedWaypoints.length} waypoints...`);
          }
        } catch (error) {
          if (error.code === 11000) {
            console.log(`   ⚠️  Skipping waypoint ${waypointData.id} (${waypointData.title}) - duplicate ID`);
            skipped++;
          } else {
            console.error(`   ❌ Error inserting waypoint ${waypointData.id} (${waypointData.title}):`, error.message);
            errors++;
          }
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully inserted: ${inserted} waypoints`);
    console.log(`   ⚠️  Skipped (already exists): ${skipped} waypoints`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors} waypoints`);
    }
    console.log(`   📝 Total processed: ${convertedWaypoints.length} waypoints\n`);

    // Verify
    const waypointCount = await Waypoint.countDocuments();
    const pinCount = await Pin.countDocuments();
    console.log(`✅ Operation completed!`);
    console.log(`   Total pins in database: ${pinCount}`);
    console.log(`   Total waypoints in database: ${waypointCount}`);
    console.log(`   Total items: ${pinCount + waypointCount}`);

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
console.log('🚀 Adding waypoints to MongoDB waypoints collection...\n');
addWaypoints();

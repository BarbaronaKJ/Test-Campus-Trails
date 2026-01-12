/**
 * Script to add floors and rooms to existing pins in MongoDB
 * 
 * Usage:
 *   node scripts/addFloorsAndRooms.js
 * 
 * This script allows you to add floors and rooms to building pins.
 * You can modify the data below to add floors/rooms to specific buildings.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Pin = require('../models/Pin');

// Example data structure for floors and rooms
// Modify this to match your building data
const buildingFloorsData = {
  // Example: Building 9 (ICT Building)
  // Find the pin by id, title, or description
  '9': {
    floors: [
      {
        level: 0, // Ground Floor
        floorPlan: 'https://cloudinary.com/ict-ground-floor.png', // Cloudinary URL or local path
        rooms: [
          {
            name: 'ICT 101',
            image: 'https://cloudinary.com/ict-101.jpg', // Cloudinary URL or local path
            description: 'Computer Laboratory'
          },
          {
            name: 'ICT 102',
            image: 'https://cloudinary.com/ict-102.jpg',
            description: 'Networking Lab'
          }
        ]
      },
      {
        level: 1, // 2nd Floor
        floorPlan: 'https://cloudinary.com/ict-2nd-floor.png',
        rooms: [
          {
            name: 'ICT 201',
            image: 'https://cloudinary.com/ict-201.jpg',
            description: 'Software Development Lab'
          },
          {
            name: 'ICT 202',
            image: 'https://cloudinary.com/ict-202.jpg',
            description: 'Database Lab'
          }
        ]
      },
      {
        level: 2, // 3rd Floor
        floorPlan: 'https://cloudinary.com/ict-3rd-floor.png',
        rooms: [
          {
            name: 'ICT 301',
            image: 'https://cloudinary.com/ict-301.jpg',
            description: 'Research Lab'
          }
        ]
      },
      {
        level: 3, // 3rd Floor
        floorPlan: 'https://cloudinary.com/ict-3rd-floor.png',
        rooms: [
          {
            name: 'ICT 301',
            image: 'https://cloudinary.com/ict-301.jpg',
            description: 'Research Lab'
          }
        ]
      }
     
    ]
  }
  // Add more buildings here...
  // '10': { floors: [...] },
  // '11': { floors: [...] },
};

/**
 * Add floors and rooms to a pin
 */
async function addFloorsAndRooms() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB');
    console.log(`   Database: ${mongoose.connection.name}\n`);

    // Process each building
    for (const [buildingId, data] of Object.entries(buildingFloorsData)) {
      console.log(`\n📦 Processing Building ID: ${buildingId}`);

      // Find the pin by id (can be number or string)
      // Try both number and string to handle type mismatches
      let pin = await Pin.findOne({ id: parseInt(buildingId) });
      if (!pin) {
        pin = await Pin.findOne({ id: buildingId });
      }
      // Also try by buildingNumber if id doesn't match
      if (!pin) {
        pin = await Pin.findOne({ buildingNumber: parseInt(buildingId) });
      }
      
      if (!pin) {
        console.log(`   ⚠️  Pin with id "${buildingId}" not found. Skipping...`);
        console.log(`   💡 Tip: Check if the id is a number or string in your database`);
        continue;
      }

      console.log(`   ✅ Found: ${pin.title || pin.description}`);

      // Check if floors already exist
      if (pin.floors && pin.floors.length > 0) {
        console.log(`   ⚠️  This pin already has ${pin.floors.length} floor(s).`);
        console.log(`   Options:`);
        console.log(`   1. Replace all floors (will delete existing floors)`);
        console.log(`   2. Add new floors (will keep existing floors)`);
        console.log(`   3. Skip this building`);
        
        // For script automation, we'll replace by default
        // You can modify this logic to prompt or merge instead
        console.log(`   → Replacing existing floors...`);
      }

      // Update the pin with new floors
      pin.floors = data.floors;
      await pin.save();

      console.log(`   ✅ Successfully added ${data.floors.length} floor(s) with ${data.floors.reduce((sum, floor) => sum + floor.rooms.length, 0)} total room(s)`);
      
      // Log details
      data.floors.forEach((floor, index) => {
        const floorName = floor.level === 0 ? 'Ground Floor' : `${floor.level + 1}${getOrdinalSuffix(floor.level + 1)} Floor`;
        console.log(`      Floor ${index + 1}: ${floorName} (${floor.rooms.length} rooms)`);
      });
    }

    console.log('\n✅ All buildings processed successfully!');
    console.log('\n📝 Note: Restart your backend server if it\'s running to see the changes.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

/**
 * Get ordinal suffix (st, nd, rd, th)
 */
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

// Run the script
if (require.main === module) {
  addFloorsAndRooms();
}

module.exports = { addFloorsAndRooms };

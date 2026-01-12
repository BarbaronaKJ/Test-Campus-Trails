# Invisible Pins Migration Guide

Invisible pins (waypoints) are road network points used for pathfinding but not displayed to users. This guide explains how to add them to MongoDB.

## Overview

- **Invisible pins** are waypoints that form the road network for pathfinding
- They have `isInvisible: true` in the database
- They are included in pathfinding calculations but not shown on the map
- There are approximately **69 invisible waypoints** in `pinsData.js` (IDs starting with 1001, 1001.1, etc.)

## Adding Invisible Pins

### Option 1: Run Full Migration (Recommended)

The main migration script (`migratePins.js`) already handles invisible pins. If you haven't run it yet, or want to re-run it:

```bash
cd backend
node scripts/migratePins.js
```

This will:
- Import ALL pins (visible and invisible) from `pinsData.js`
- Preserve the `isInvisible` flag for waypoints
- Clear existing pins and re-import everything

### Option 2: Add Only Missing Invisible Pins

If you already have visible pins in the database and only want to add invisible waypoints:

```bash
cd backend
node scripts/addInvisiblePins.js
```

This script will:
- Load invisible pins from `pinsData.js`
- Check which ones are missing from the database
- Add only the missing invisible pins
- Update existing pins to ensure `isInvisible` flag is set correctly

## Verifying Invisible Pins

After migration, verify invisible pins are in the database:

### Using MongoDB Compass/Atlas:
1. Open your database (e.g., `campus-trails`)
2. Navigate to the `pins` collection
3. Filter by: `{ "isInvisible": true }`
4. You should see approximately 69 waypoints (IDs: 1001, 1001.1, 1002, etc.)

### Using API:
```bash
# Get all pins including invisible ones
curl "http://localhost:3000/api/pins?includeInvisible=true"

# Get only invisible pins (using MongoDB query)
# Note: The API doesn't have a filter for only invisible pins,
# but you can check the response to see which pins have isInvisible: true
```

### Check Count:
```bash
# In MongoDB Compass/Atlas, run:
db.pins.countDocuments({ isInvisible: true })

# Should return: ~69
```

## Invisible Pin Properties

Invisible waypoints have the following properties:
- `isInvisible: true` - Flag indicating this pin is not displayed
- `category: "Waypoint"` - Category for waypoints
- `description: "Waypoint {id}"` or `title` - Description/title
- `neighbors: [...]` - Array of connected pin IDs for pathfinding
- `image: "<placeholder URL>"` - Placeholder image (not displayed)

## Notes

- **Pathfinding requires invisible pins**: The pathfinding algorithm needs these waypoints to calculate routes between buildings
- **Invisible pins are excluded by default**: The API endpoint `/api/pins` excludes invisible pins unless `?includeInvisible=true` is used
- **Frontend filters invisible pins**: The React Native app automatically filters out pins with `isInvisible: true` when displaying the map

## Troubleshooting

### Invisible pins not in database:
1. Run the migration script: `node backend/scripts/migratePins.js`
2. Or run the invisible pins script: `node backend/scripts/addInvisiblePins.js`
3. Verify using MongoDB Compass/Atlas

### Pathfinding not working:
1. Check that invisible pins exist in database
2. Verify that `includeInvisible=true` is used when fetching pins for pathfinding
3. Check that `neighbors` arrays are properly set on all pins

### Pins showing on map that shouldn't:
1. Check that pins have `isInvisible: true` in database
2. Verify frontend is filtering by `isInvisible` field
3. Check API is excluding invisible pins by default

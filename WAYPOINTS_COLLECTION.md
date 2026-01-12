# Waypoints Collection Setup Guide

Invisible pins (waypoints) are now stored in a **separate MongoDB collection** called `waypoints` instead of using the `isInvisible` flag in the `bldg_pins` collection.

## Overview

- **`bldg_pins` collection**: Contains only visible building pins (buildings, facilities, etc.)
- **`waypoints` collection**: Contains invisible waypoints (road network points for pathfinding)

This separation provides:
- Better organization and clarity
- Easier management of waypoints separately from visible pins
- Cleaner data structure
- Better performance (smaller queries for visible pins)

## Database Structure

### Building Pins Collection (`bldg_pins`)
- Contains visible building pins only
- Used for displaying on the map
- Fields: `id`, `x`, `y`, `title`, `description`, `image`, `category`, `neighbors`, `buildingNumber`, etc.

### Waypoints Collection (`waypoints`)
- Contains invisible waypoints only
- Used for pathfinding calculations
- Fields: `id`, `x`, `y`, `title`, `description`, `neighbors`
- No `image` or `category` fields (not needed for waypoints)

## Migration

### Option 1: Full Migration (Recommended for Fresh Setup)

Run the updated migration script which separates pins and waypoints:

```bash
cd backend
node scripts/migratePins.js
```

This will:
- Extract visible pins from `pinsData.js` → insert into `bldg_pins` collection
- Extract invisible waypoints from `pinsData.js` → insert into `waypoints` collection
- Clear existing data in both collections before migration

### Option 2: Add Only Waypoints

If you already have visible pins in the database and only want to add waypoints:

```bash
cd backend
node scripts/addWaypoints.js
```

This will:
- Load invisible waypoints from `pinsData.js`
- Add them to the `waypoints` collection
- Skip waypoints that already exist

## API Behavior

The API endpoint `/api/pins` now works as follows:

### Without `includeInvisible` parameter (default):
```
GET /api/pins
```
- Returns only visible pins from the `bldg_pins` collection
- Response includes: `pinCount`, `waypointCount: 0`, `includeInvisible: false`

### With `includeInvisible=true` parameter:
```
GET /api/pins?includeInvisible=true
```
- Returns visible pins from `bldg_pins` collection
- Returns waypoints from `waypoints` collection
- Combines both and adds `isInvisible: true` flag to waypoints for backward compatibility
- Response includes: `pinCount`, `waypointCount`, `includeInvisible: true`

### Response Format

```json
{
  "success": true,
  "count": 150,
  "pinCount": 81,
  "waypointCount": 69,
  "includeInvisible": true,
  "data": [
    // Visible pins (from bldg_pins collection)
    { "id": 0, "title": "ME", "description": "Main Entrance", ... },
    // Waypoints (from waypoints collection, with isInvisible: true)
    { "id": 1001, "title": "1001", "isInvisible": true, ... },
    ...
  ]
}
```

## Frontend Compatibility

The frontend code remains **fully compatible**:
- The API still returns waypoints with `isInvisible: true` flag when `includeInvisible=true`
- Frontend filtering logic (`pin.isInvisible === true`) still works
- No changes needed to frontend code

## Verifying the Setup

### Using MongoDB Compass/Atlas:

1. **Check Building Pins Collection:**
   - Navigate to `bldg_pins` collection
   - Should see ~81 visible pins (buildings, facilities, etc.)
   - No waypoints (IDs starting with 1001, etc.)

2. **Check Waypoints Collection:**
   - Navigate to `waypoints` collection
   - Should see ~69 waypoints (IDs: 1001, 1001.1, 1002, etc.)
   - All waypoints have `title` and `description` fields
   - All waypoints have `neighbors` array

### Using API:

```bash
# Get only visible pins
curl "http://localhost:3000/api/pins"
# Response: pinCount: 81, waypointCount: 0

# Get pins + waypoints (for pathfinding)
curl "http://localhost:3000/api/pins?includeInvisible=true"
# Response: pinCount: 81, waypointCount: 69, count: 150
```

## Benefits of Separate Collections

1. **Clearer Organization**: Visible pins and waypoints are clearly separated
2. **Better Performance**: Queries for visible pins don't include waypoints
3. **Easier Management**: Can manage waypoints separately from pins
4. **Simpler Queries**: No need to filter by `isInvisible` flag
5. **Backward Compatible**: API still returns waypoints with `isInvisible: true` for frontend compatibility

## Notes

- The frontend code **does not need to be changed** - the API handles the combination
- Waypoints are automatically included when `includeInvisible=true` is used
- Pathfinding continues to work as before (uses combined pins + waypoints)
- The `isInvisible` field is still added to waypoints in API responses for backward compatibility

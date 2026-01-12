# How to Add Building Floors and Rooms

This guide explains how to add floors and rooms to building pins in your MongoDB database.

## Data Structure

Floors and rooms are stored as nested arrays in the `Pin` model:

```javascript
{
  floors: [
    {
      level: 0,              // 0 = Ground Floor, 1 = 2nd Floor, 2 = 3rd Floor, etc.
      floorPlan: "url",      // Image URL for the floor plan (Cloudinary or local)
      rooms: [
        {
          name: "ICT 101",           // Room name/identifier (required)
          image: "url",              // Room image URL (optional)
          description: "Computer Lab" // Room description (optional)
        }
      ]
    }
  ]
}
```

## Method 1: Using the Script (Recommended)

### Step 1: Edit the Script

Open `backend/scripts/addFloorsAndRooms.js` and modify the `buildingFloorsData` object:

```javascript
const buildingFloorsData = {
  '9': {  // Building ID (from your pins)
    floors: [
      {
        level: 0, // Ground Floor
        floorPlan: 'https://your-cloudinary.com/ict-ground-floor.png',
        rooms: [
          {
            name: 'ICT 101',
            image: 'https://your-cloudinary.com/ict-101.jpg',
            description: 'Computer Laboratory'
          },
          {
            name: 'ICT 102',
            image: 'https://your-cloudinary.com/ict-102.jpg',
            description: 'Networking Lab'
          }
        ]
      },
      {
        level: 1, // 2nd Floor
        floorPlan: 'https://your-cloudinary.com/ict-2nd-floor.png',
        rooms: [
          {
            name: 'ICT 201',
            image: 'https://your-cloudinary.com/ict-201.jpg',
            description: 'Software Development Lab'
          }
        ]
      }
    ]
  },
  '10': {  // Another building
    floors: [
      // ... add floors for building 10
    ]
  }
};
```

### Step 2: Run the Script

```bash
cd backend
node scripts/addFloorsAndRooms.js
```

The script will:
- Connect to MongoDB
- Find each building by ID
- Add/update floors and rooms
- Show progress and results

## Method 2: Using MongoDB Compass (GUI)

### Step 1: Open MongoDB Compass

1. Connect to your MongoDB database
2. Navigate to the `pins` collection
3. Find the building pin you want to update

### Step 2: Edit the Document

1. Click on the pin document
2. Find the `floors` field (or add it if it doesn't exist)
3. Click "Edit Document"
4. Add the floors array:

```json
{
  "floors": [
    {
      "level": 0,
      "floorPlan": "https://cloudinary.com/ict-ground-floor.png",
      "rooms": [
        {
          "name": "ICT 101",
          "image": "https://cloudinary.com/ict-101.jpg",
          "description": "Computer Laboratory"
        }
      ]
    }
  ]
}
```

5. Click "Update"

## Method 3: Using MongoDB Shell

### Connect to MongoDB

```bash
mongosh "your-mongodb-connection-string"
```

### Update a Pin

```javascript
// Find and update a pin by ID
db.pins.updateOne(
  { id: 9 },  // Building ID
  {
    $set: {
      floors: [
        {
          level: 0,
          floorPlan: "https://cloudinary.com/ict-ground-floor.png",
          rooms: [
            {
              name: "ICT 101",
              image: "https://cloudinary.com/ict-101.jpg",
              description: "Computer Laboratory"
            },
            {
              name: "ICT 102",
              image: "https://cloudinary.com/ict-102.jpg",
              description: "Networking Lab"
            }
          ]
        },
        {
          level: 1,
          floorPlan: "https://cloudinary.com/ict-2nd-floor.png",
          rooms: [
            {
              name: "ICT 201",
              image: "https://cloudinary.com/ict-201.jpg",
              description: "Software Development Lab"
            }
          ]
        }
      ]
    }
  }
);
```

## Method 4: Using API Endpoint (Future)

You can also create an API endpoint to add floors/rooms. Example:

```javascript
// POST /api/pins/:id/floors
router.post('/:id/floors', async (req, res) => {
  const { floors } = req.body;
  const pin = await Pin.findById(req.params.id);
  pin.floors = floors;
  await pin.save();
  res.json({ success: true, data: pin });
});
```

## Floor Level Mapping

- `level: 0` = Ground Floor
- `level: 1` = 2nd Floor
- `level: 2` = 3rd Floor
- `level: 3` = 4th Floor
- etc.

The frontend automatically converts these to display names:
- `0` → "Ground Floor"
- `1` → "2nd Floor"
- `2` → "3rd Floor"
- etc.

## Image URLs

You can use:
- **Cloudinary URLs**: `https://res.cloudinary.com/your-cloud/image/upload/v123/ict-101.jpg`
- **Local paths**: `/assets/ict-101.jpg` (for local assets)
- **Full URLs**: Any valid image URL

## Example: Complete Building with Multiple Floors

```javascript
{
  id: 9,
  title: "ICT Building",
  floors: [
    {
      level: 0,
      floorPlan: "https://cloudinary.com/ict-ground-floor.png",
      rooms: [
        { name: "ICT 101", image: "...", description: "Lab 1" },
        { name: "ICT 102", image: "...", description: "Lab 2" }
      ]
    },
    {
      level: 1,
      floorPlan: "https://cloudinary.com/ict-2nd-floor.png",
      rooms: [
        { name: "ICT 201", image: "...", description: "Lab 3" },
        { name: "ICT 202", image: "...", description: "Lab 4" }
      ]
    },
    {
      level: 2,
      floorPlan: "https://cloudinary.com/ict-3rd-floor.png",
      rooms: [
        { name: "ICT 301", image: "...", description: "Lab 5" }
      ]
    }
  ]
}
```

## Tips

1. **Find Building IDs**: Query your database to see existing pin IDs:
   ```javascript
   db.pins.find({ isVisible: true }, { id: 1, title: 1, description: 1 })
   ```

2. **Update Existing Floors**: The script replaces all floors. To merge, modify the script logic.

3. **Validate Data**: Make sure:
   - `level` is a number (0, 1, 2, etc.)
   - `name` is required for each room
   - Image URLs are valid (or null)

4. **Test**: After adding floors/rooms, test in your app:
   - Open the building details modal
   - Check if floors appear correctly
   - Verify rooms are listed under each floor

## Troubleshooting

### Floors not showing in app
- Restart your backend server
- Clear app cache
- Verify the pin has `isVisible: true`

### Rooms not appearing
- Check that `rooms` array is not empty
- Verify `name` field exists for each room
- Check console for errors

### Images not loading
- Verify image URLs are accessible
- Check Cloudinary URLs are correct
- Ensure images are uploaded to Cloudinary

## Next Steps

1. **Upload Images**: Upload floor plans and room images to Cloudinary
2. **Add Data**: Use the script or MongoDB to add floors/rooms
3. **Test**: Verify in the app that floors and rooms display correctly
4. **Iterate**: Add more buildings as needed

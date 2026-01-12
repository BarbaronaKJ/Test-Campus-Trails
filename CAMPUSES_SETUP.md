# Campuses MongoDB Setup Guide

Campuses are now dynamically fetched from MongoDB instead of being a constant. This allows you to manage campuses directly in MongoDB.

## Backend Setup

### 1. Campus Model

The Campus model is located at `backend/models/Campus.js`. It has the following schema:

```javascript
{
  name: String (required, unique),  // e.g., "USTP-CDO", "USTP-Alubijid"
  order: Number (optional, default: 0),  // For sorting campuses
  active: Boolean (optional, default: true)  // To enable/disable campuses
}
```

### 2. API Endpoints

- **GET `/api/campuses`** - Fetch all active campuses
- **GET `/api/campuses/all`** - Fetch all campuses (including inactive)
- **GET `/api/campuses/:id`** - Fetch a single campus by ID

### 3. Add Campuses to MongoDB

You can add campuses directly in MongoDB Compass or Atlas:

1. **Open MongoDB Compass** or MongoDB Atlas
2. **Select your database** (e.g., `campus-trails`)
3. **Navigate to the `campuses` collection**
4. **Click "Insert Document"**
5. **Add a campus document:**

```json
{
  "name": "USTP-CDO",
  "order": 0,
  "active": true
}
```

6. **Add more campuses:**

```json
[
  { "name": "USTP-CDO", "order": 0, "active": true },
  { "name": "USTP-Alubijid", "order": 1, "active": true },
  { "name": "USTP-Claveria", "order": 2, "active": true },
  { "name": "USTP-Jasaan", "order": 3, "active": true },
  { "name": "USTP-Oroquieta", "order": 4, "active": true },
  { "name": "USTP-Panaon", "order": 5, "active": true },
  { "name": "USTP-Villanueva", "order": 6, "active": true }
]
```

## Frontend Behavior

- **On App Load**: The app automatically fetches campuses from the API
- **Fallback**: If the API fails, it uses default campuses: `['USTP-CDO', 'USTP-Alubijid', 'USTP-Claveria', 'USTP-Jasaan', 'USTP-Oroquieta', 'USTP-Panaon', 'USTP-Villanueva']`
- **State Management**: Campuses are stored in React state and can be updated dynamically

## Editing Campuses

You can edit campuses directly in MongoDB:

1. **Change campus name**: Update the `name` field
2. **Reorder campuses**: Update the `order` field (lower numbers appear first)
3. **Enable/disable campuses**: Set `active` to `true` or `false`
4. **Add new campuses**: Insert new documents with unique `name` values
5. **Delete campuses**: Remove documents from the collection

The app will fetch the updated list on the next load or when you refresh the app.

## Notes

- Campus names must be unique
- Only active campuses (where `active: true`) are returned by `/api/campuses`
- The `/api/campuses/all` endpoint returns all campuses including inactive ones
- Campuses are sorted by `order` (ascending), then by `name` (ascending)

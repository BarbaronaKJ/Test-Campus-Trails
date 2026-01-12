# Campus Trails Admin Panel - Complete Setup Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation & Setup](#installation--setup)
4. [Backend Configuration](#backend-configuration)
5. [Frontend Configuration](#frontend-configuration)
6. [Running the Admin Panel](#running-the-admin-panel)
7. [Features & Usage](#features--usage)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

---

## Overview

The Campus Trails Admin Panel is a web-based management interface for the Campus Trails mobile application. It provides administrators with powerful tools to manage facilities, update map data, and monitor system statistics.

### Key Features

- **Authentication System**: Secure JWT-based admin login
- **Dashboard**: Real-time statistics and quick actions
- **Facility Management**: Search, view, update, and delete facilities
- **Status Management**: Update facility status (Open, Closed, Maintenance)
- **Map Data Editor**: Manage pins, waypoints, and pathfinding connections
- **Multi-Campus Support**: Manage multiple campus locations

### Tech Stack

- **Frontend**: React 18 + Vite + React Router
- **Backend**: Node.js + Express + MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: Pure CSS (no external UI libraries)

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js**: Version 16.x or higher
- **npm**: Version 8.x or higher (comes with Node.js)
- **MongoDB Atlas**: Account with active cluster
- **Git**: For version control
- **Text Editor**: VS Code recommended

Check your versions:

```bash
node --version    # Should be v16.x or higher
npm --version     # Should be 8.x or higher
```

---

## Installation & Setup

### Step 1: Install Admin Panel Dependencies

Navigate to the admin panel directory and install dependencies:

```bash
cd admin-panel
npm install
```

This will install:

- `react` & `react-dom`: Core React libraries
- `react-router-dom`: Routing for single-page application
- `axios`: HTTP client for API requests
- `vite`: Fast development server and build tool
- `react-leaflet` & `leaflet`: Map visualization (optional, for future features)

### Step 2: Install Backend Dependencies

If not already installed, ensure the backend has all required packages:

```bash
cd ../backend
npm install
```

Required packages (should already be in package.json):

- `express`: Web server framework
- `mongoose`: MongoDB ODM
- `jsonwebtoken`: JWT authentication
- `bcryptjs`: Password hashing
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variables

---

## Backend Configuration

### Step 1: Update Environment Variables

Edit `backend/.env` to ensure these variables are set:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/campus-trails
PORT=3000
CORS_ORIGINS=*
JWT_SECRET=your-super-secret-key-change-this-in-production
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Important**:

- Replace `your-super-secret-key-change-this-in-production` with a strong random string
- For production, change `CORS_ORIGINS` to specific domain: `http://localhost:5173,https://yourdomain.com`

### Step 2: Create Admin Account

Run the admin creation script:

```bash
cd backend
node scripts/createAdmin.js
```

**Output:**

```
✅ Default admin account created successfully!

Login credentials:
  Username: admin
  Password: Admin@123

⚠️  Please change the password after first login!
```

**Default Credentials:**

- **Username**: `admin`
- **Password**: `Admin@123`

### Step 3: Verify Backend Setup

Start the backend server:

```bash
npm run backend
# Or from backend directory:
node server.js
```

**Expected Output:**

```
✅ MongoDB Atlas connected successfully
   Database: campus-trails
   Host: cluster0.xxxxx.mongodb.net
🚀 Server running on port 3000
   Environment: development
   API Base: http://localhost:3000/api
```

Test the health endpoint:

```bash
curl http://localhost:3000/health
```

Should return:

```json
{
  "success": true,
  "message": "Campus Trails API Server is running",
  "timestamp": "2026-01-13T..."
}
```

---

## Frontend Configuration

### Step 1: Verify Vite Configuration

Check `admin-panel/vite.config.js` has the correct proxy settings:

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

**What this does:**

- Runs dev server on port 5173
- Proxies all `/api/*` requests to backend at `http://localhost:3000`
- Avoids CORS issues during development

### Step 2: Understand the App Structure

```
admin-panel/
├── index.html              # Entry HTML file
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Main app with routing
    ├── App.css             # Global styles
    ├── index.css           # Base CSS reset
    ├── components/
    │   ├── Navbar.jsx      # Navigation component
    │   └── Navbar.css      # Navbar styles
    └── pages/
        ├── Login.jsx       # Login page
        ├── Login.css       # Login styles
        ├── Dashboard.jsx   # Dashboard page
        ├── Dashboard.css   # Dashboard styles
        ├── FacilitySearch.jsx      # Search facilities
        ├── FacilitySearch.css      # Search styles
        ├── FacilityManagement.jsx  # Edit single facility
        ├── FacilityManagement.css  # Edit styles
        ├── MapDataManager.jsx      # Manage map data
        └── MapDataManager.css      # Map manager styles
```

---

## Running the Admin Panel

### Development Mode

**Option 1: Run Both Simultaneously (Recommended)**

From the root directory:

```bash
npm run dev
```

This runs both backend (port 3000) and admin panel (port 5173) concurrently.

**Option 2: Run Separately**

Terminal 1 - Backend:

```bash
cd backend
npm start
# or
node server.js
```

Terminal 2 - Admin Panel:

```bash
cd admin-panel
npm run dev
```

### Access the Admin Panel

Open your browser and navigate to:

```
http://localhost:5173
```

**Login with default credentials:**

- Username: `admin`
- Password: `Admin@123`

### Production Build

To build the admin panel for production:

```bash
cd admin-panel
npm run build
```

This creates an optimized build in `admin-panel/dist/`.

To preview the production build:

```bash
npm run preview
```

---

## Features & Usage

### 1. Login Page

**URL**: `http://localhost:5173/login`

**Features:**

- JWT-based authentication
- Token stored in localStorage
- Auto-redirect if already logged in
- Error handling for invalid credentials

**First-time Login:**

1. Enter username: `admin`
2. Enter password: `Admin@123`
3. Click "Login"
4. You'll be redirected to the dashboard

**Security Note**: The admin panel verifies the token on every page load. If the token is invalid or expired, you'll be redirected to login.

---

### 2. Dashboard

**URL**: `http://localhost:5173/dashboard`

**Features:**

- **Statistics Cards**: Real-time counts for:

  - Total Pins (all pins in database)
  - Visible Pins (pins shown on map)
  - Waypoints (invisible pathfinding nodes)
  - Total Users
  - Total Feedbacks
  - Total Campuses

- **Quick Actions**: Direct links to:
  - Search Facilities
  - Manage Facilities
  - Update Map Data

**How It Works:**

- Dashboard fetches stats from `/api/admin/stats` on load
- Stats are cached; refresh page to update
- Color-coded cards for easy visualization

---

### 3. Facility Search & Browse

**URL**: `http://localhost:5173/facilities`

**Features:**

- **Search Bar**: Search by facility name, description, or category
- **Category Filter**: Filter by Academic, Administration, Facilities, etc.
- **Campus Filter**: Filter by specific campus
- **Results Grid**: Card-based layout with:
  - Facility image (if available)
  - Title and category
  - Description preview
  - Status badge (Open/Closed/Maintenance)

**Usage:**

1. Enter search terms in the search bar
2. Select category from dropdown (optional)
3. Select campus from dropdown (optional)
4. Results update in real-time
5. Click any facility card to edit

**Tips:**

- Leave filters on "All" to see everything
- Search is case-insensitive
- Results show facility count

---

### 4. Facility Management (Edit Page)

**URL**: `http://localhost:5173/facility/:id`

**Features:**

- **Edit Form**: Update all facility details:

  - Title (required)
  - Description (text area)
  - Category (dropdown)
  - Status (open/closed/maintenance)
  - Campus (dropdown)
  - Image URL (Cloudinary link)
  - X & Y coordinates
  - Visibility toggle (visible/waypoint)

- **Live Preview**: See changes before saving
- **Delete Option**: Remove facility permanently
- **Floor Information**: View building floors and rooms (read-only)

**How to Update a Facility:**

1. Navigate to facility (via search page)
2. Edit desired fields in the form
3. Click "Save Changes"
4. Confirmation message appears
5. Changes sync to MongoDB and mobile app

**Updating Status:**

- **Open**: Normal operations, shown in green
- **Closed**: Temporarily closed, shown in red
- **Maintenance**: Under maintenance, shown in yellow

**Coordinate System:**

- X: Horizontal position on map (0-100 scale)
- Y: Vertical position on map (0-100 scale)
- Used for pin placement on mobile app map

**Deleting a Facility:**

1. Click "Delete Facility" button (red)
2. Confirm deletion in browser alert
3. Facility removed from database
4. Removed from all neighbors' connections
5. Redirected to facilities list

---

### 5. Map Data Manager

**URL**: `http://localhost:5173/map-data`

**Features:**

- **View Modes**:

  - **All**: Show all pins (visible + waypoints)
  - **Visible**: Show only visible facilities
  - **Waypoints**: Show only invisible pathfinding nodes

- **Campus Filter**: Filter by specific campus
- **Pin Table**: Comprehensive list with:

  - Pin ID (first 8 characters)
  - Title/Name
  - Type (Visible/Waypoint badge)
  - Category
  - Coordinates
  - Neighbor count
  - Manage button

- **Create New Pin**: Add pins or waypoints
- **Connection Manager**: Edit pathfinding graph

**Creating a New Pin:**

1. Click "+ Add New Pin" button
2. Fill out the form:
   - **Title**: Name of location (required for visible pins)
   - **Description**: Details about location
   - **Category**: Type of facility
   - **Campus**: Which campus it belongs to
   - **X/Y Coordinates**: Map position
   - **Visible checkbox**: Check for facility, uncheck for waypoint
3. Click "Create Pin"
4. Pin appears in table

**Creating a Waypoint (Invisible Pin):**

- Same as creating a pin, but **uncheck "Visible on map"**
- Used for pathfinding only, not shown to users
- Give it a descriptive title (e.g., "Waypoint-1", "Path-Junction-A")

**Managing Connections (Pathfinding):**

1. Click "Manage" button for any pin
2. **Current Connections**: Shows pins already connected
   - Click "Remove" to disconnect
3. **Available Pins**: Shows pins not yet connected
   - Click "Connect" to create connection
4. Changes save automatically

**Understanding the Pathfinding System:**

- Each pin has a `neighbors` array with IDs of connected pins
- Connections are **directional** in database (A→B) but used bidirectionally by app
- A\* algorithm uses these connections to find shortest path
- Connect waypoints to create paths between visible facilities

**Best Practices:**

- Connect nearby pins (within ~50-100 units)
- Create waypoints at path intersections
- Test pathfinding in mobile app after changes
- Document waypoint naming convention (e.g., WP-Building-1)

---

## Security Considerations

### Authentication & Authorization

**Token-Based Security:**

- JWT tokens expire after 7 days (configurable in `backend/routes/admin.js`)
- Tokens stored in localStorage (consider httpOnly cookies for production)
- Every API request includes `Authorization: Bearer <token>` header
- Backend verifies token on every admin route

**Password Security:**

- Passwords hashed with bcrypt (10 salt rounds)
- Never stored or transmitted in plain text
- Admin model includes password comparison method

**Recommended Production Changes:**

1. **Change Default Admin Password:**

   ```bash
   # Use the resetUserPassword script adapted for admins
   # Or manually update in MongoDB Compass
   ```

2. **Strengthen JWT Secret:**

   - Generate a strong random key: `openssl rand -base64 32`
   - Update `.env` file with new secret

3. **Restrict CORS Origins:**

   ```env
   # Instead of:
   CORS_ORIGINS=*

   # Use specific domains:
   CORS_ORIGINS=http://localhost:5173,https://admin.yourdomain.com
   ```

4. **Enable HTTPS:**

   - Use SSL certificates for production
   - Update Vite config for HTTPS in dev

5. **Rate Limiting:**

   - Add express-rate-limit to prevent brute force attacks
   - Example:
     ```javascript
     const rateLimit = require("express-rate-limit");
     const loginLimiter = rateLimit({
       windowMs: 15 * 60 * 1000, // 15 minutes
       max: 5, // 5 attempts
     });
     app.use("/api/admin/login", loginLimiter);
     ```

6. **Session Management:**
   - Consider implementing refresh tokens
   - Add logout endpoint to invalidate tokens
   - Track active sessions in database

---

## Troubleshooting

### Common Issues & Solutions

#### 1. "Cannot connect to backend" / Network Error

**Symptoms:**

- Login fails with "Network error"
- Dashboard shows loading spinner forever
- Console shows `ERR_CONNECTION_REFUSED`

**Solutions:**

```bash
# Check if backend is running
curl http://localhost:3000/health

# If not running, start it:
cd backend
node server.js

# Check for port conflicts:
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Mac/Linux
```

**Verify Vite proxy:**

- Check `admin-panel/vite.config.js` has correct target
- Restart Vite dev server after config changes

---

#### 2. "Invalid token" / Auto-logout

**Symptoms:**

- Logged out immediately after login
- Redirected to login page unexpectedly

**Solutions:**

```bash
# Check JWT_SECRET is consistent
# In backend/.env:
JWT_SECRET=your-secret-key

# Clear browser localStorage:
# Open DevTools (F12) → Application → Local Storage
# Delete 'adminToken' and 'adminUser'

# Try logging in again
```

**Token Expiration:**

- Tokens expire after 7 days by default
- Modify expiration in `backend/routes/admin.js`:
  ```javascript
  const token = jwt.sign(
    { id: admin._id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: "30d" } // Change to 30 days
  );
  ```

---

#### 3. "Admin not found" / Login Fails

**Symptoms:**

- Username/password correct but login fails
- Console shows "Invalid credentials"

**Solutions:**

```bash
# Verify admin exists in database
# Open MongoDB Compass
# Connect to cluster
# Browse to campus-trails → admins collection

# If no admin exists, create one:
cd backend
node scripts/createAdmin.js

# Check admin is active:
# In MongoDB Compass, find admin document
# Verify: isActive: true
```

---

#### 4. Facility Images Not Loading

**Symptoms:**

- Image placeholder shows instead of facility photo
- Broken image icon in browser

**Solutions:**

- Verify image URL is valid Cloudinary link
- Check URL format: `https://res.cloudinary.com/...`
- Test URL in browser directly
- Ensure Cloudinary account is active

**Image URL Format:**

```
https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/filename.jpg
```

---

#### 5. "Failed to fetch data" on Dashboard

**Symptoms:**

- Stats show 0 for all counts
- Error message appears

**Solutions:**

```bash
# Check MongoDB connection
# In backend console, look for:
# "✅ MongoDB Atlas connected successfully"

# Verify collections exist:
# Open MongoDB Compass
# Check campus-trails database has:
# - pins
# - users
# - feedbacks
# - campuses
# - admins

# If collections empty, run migration scripts:
cd backend
node scripts/migratePins.js
node scripts/addWaypoints.js
```

---

#### 6. Vite Build Errors

**Symptoms:**

- `npm run dev` fails
- Module not found errors

**Solutions:**

```bash
# Clear node_modules and reinstall:
cd admin-panel
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache:
rm -rf node_modules/.vite

# Restart dev server:
npm run dev
```

---

#### 7. Map Data Manager - Changes Not Saving

**Symptoms:**

- Click "Connect" but neighbor not added
- Success message shows but table unchanged

**Solutions:**

- Check browser console for errors
- Verify admin token is valid
- Refresh page to see latest data
- Check MongoDB directly to confirm changes

**Debug Mode:**

```javascript
// Add to MapDataManager.jsx handleUpdateNeighbors:
console.log("Updating pin:", pinId);
console.log("New neighbors:", neighbors);
console.log("Response:", await response.json());
```

---

### Getting Help

**Log Files:**

- Backend logs: Check terminal where `node server.js` is running
- Frontend logs: Open browser DevTools (F12) → Console tab

**Debugging Steps:**

1. Check browser console for errors
2. Check backend terminal for error logs
3. Verify MongoDB connection
4. Test API endpoints with Postman/curl
5. Check network tab in DevTools

**Useful Commands:**

```bash
# Test backend API
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'

# Check admin panel is running
curl http://localhost:5173

# View backend logs with timestamps
node server.js | tee backend.log
```

---

## API Reference

### Admin Authentication Endpoints

#### POST `/api/admin/login`

**Description**: Authenticate admin user and get JWT token

**Request Body:**

```json
{
  "username": "admin",
  "password": "Admin@123"
}
```

**Response (Success 200):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@campustrails.com",
    "role": "super-admin"
  }
}
```

**Response (Error 401):**

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

#### GET `/api/admin/verify`

**Description**: Verify JWT token validity

**Headers:**

```
Authorization: Bearer <token>
```

**Response (Success 200):**

```json
{
  "success": true,
  "admin": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@campustrails.com",
    "role": "super-admin"
  }
}
```

**Response (Error 401):**

```json
{
  "success": false,
  "message": "Invalid token"
}
```

---

### Admin Statistics Endpoints

#### GET `/api/admin/stats`

**Description**: Get dashboard statistics

**Headers:**

```
Authorization: Bearer <token>
```

**Response (Success 200):**

```json
{
  "totalPins": 150,
  "visiblePins": 120,
  "invisiblePins": 30,
  "totalUsers": 450,
  "totalFeedbacks": 89,
  "totalCampuses": 3
}
```

---

### Pin Management Endpoints

#### PUT `/api/admin/pins/:id`

**Description**: Update existing pin

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Updated Library",
  "description": "Main campus library",
  "category": "Academic",
  "status": "open",
  "image": "https://res.cloudinary.com/...",
  "campusId": "507f1f77bcf86cd799439011",
  "x": 45.5,
  "y": 67.8,
  "isVisible": true
}
```

**Response (Success 200):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Updated Library",
  "description": "Main campus library",
  ...
}
```

---

#### POST `/api/admin/pins`

**Description**: Create new pin

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "New Building",
  "description": "Newly constructed building",
  "category": "Academic",
  "campusId": "507f1f77bcf86cd799439011",
  "x": 50.0,
  "y": 50.0,
  "isVisible": true,
  "neighbors": []
}
```

**Response (Success 201):**

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "New Building",
  ...
}
```

---

#### DELETE `/api/admin/pins/:id`

**Description**: Delete pin and remove from all neighbors

**Headers:**

```
Authorization: Bearer <token>
```

**Response (Success 200):**

```json
{
  "success": true,
  "message": "Pin deleted successfully"
}
```

**Response (Error 404):**

```json
{
  "success": false,
  "message": "Pin not found"
}
```

---

#### PUT `/api/admin/pins/:id/neighbors`

**Description**: Update pin's pathfinding connections

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "neighbors": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014"
  ]
}
```

**Response (Success 200):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Building A",
  "neighbors": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014"
  ],
  ...
}
```

---

### User & Feedback Endpoints

#### GET `/api/admin/users`

**Description**: Get paginated list of users

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request:**

```
GET /api/admin/users?page=2&limit=50
```

**Response (Success 200):**

```json
{
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "username": "john_doe",
      "email": "john@example.com",
      "createdAt": "2026-01-01T00:00:00.000Z",
      ...
    }
  ],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 450,
    "pages": 9
  }
}
```

---

#### GET `/api/admin/feedbacks`

**Description**: Get paginated list of feedbacks

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (Success 200):**

```json
{
  "feedbacks": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": {
        "username": "john_doe",
        "email": "john@example.com"
      },
      "pinId": {
        "title": "Library",
        "category": "Academic"
      },
      "campusId": {
        "name": "USTP-CDO"
      },
      "comment": "Great facility!",
      "rating": 5,
      "createdAt": "2026-01-13T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 89,
    "pages": 5
  }
}
```

---

## Additional Configuration

### Adding More Admin Accounts

**Method 1: Using MongoDB Compass**

1. Open MongoDB Compass
2. Connect to your cluster
3. Navigate to `campus-trails` → `admins` collection
4. Click "Insert Document"
5. Add document:
   ```json
   {
     "username": "newadmin",
     "password": "$2a$10$...", // Use bcrypt hash
     "email": "newadmin@example.com",
     "role": "admin",
     "isActive": true,
     "createdAt": "2026-01-13T00:00:00.000Z"
   }
   ```

**Method 2: Create Admin Script (Recommended)**

Create `backend/scripts/addAdmin.js`:

```javascript
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI);

const addAdmin = async () => {
  const admin = new Admin({
    username: "moderator",
    password: "Moderator@123",
    email: "moderator@campustrails.com",
    role: "moderator",
  });

  await admin.save();
  console.log("Admin created!");
  process.exit(0);
};

addAdmin();
```

Run:

```bash
node backend/scripts/addAdmin.js
```

---

### Customizing the Admin Panel

#### Changing Colors & Theme

Edit `admin-panel/src/App.css`:

```css
/* Change primary color */
.button-primary {
  background-color: #007bff; /* Change this */
}

/* Change navbar color */
.navbar {
  background-color: #2c3e50; /* Change this */
}
```

#### Adding New Pages

1. Create page component: `admin-panel/src/pages/NewPage.jsx`
2. Create styles: `admin-panel/src/pages/NewPage.css`
3. Add route in `admin-panel/src/App.jsx`:
   ```javascript
   <Route
     path="/new-page"
     element={
       isAuthenticated ? (
         <NewPage onLogout={handleLogout} />
       ) : (
         <Navigate to="/login" replace />
       )
     }
   />
   ```
4. Add link to Navbar: `admin-panel/src/components/Navbar.jsx`

---

## Deployment

### Option 1: Deploy Admin Panel as Static Site

**Build for production:**

```bash
cd admin-panel
npm run build
```

**Deploy `dist/` folder to:**

- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

**Update API base URL:**
Create `admin-panel/.env.production`:

```env
VITE_API_URL=https://your-backend-domain.com
```

Update API calls to use:

```javascript
const API_URL = import.meta.env.VITE_API_URL || '';
fetch(`${API_URL}/api/admin/login`, ...);
```

---

### Option 2: Deploy with Backend (Same Server)

**Serve admin panel from Express:**

Edit `backend/server.js`:

```javascript
const path = require("path");

// Serve admin panel static files
app.use("/admin", express.static(path.join(__dirname, "../admin-panel/dist")));

// Fallback to index.html for admin routes
app.get("/admin/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../admin-panel/dist/index.html"));
});
```

**Build and start:**

```bash
cd admin-panel
npm run build

cd ../backend
node server.js
```

Access at: `http://your-server.com/admin`

---

## Backup & Maintenance

### Database Backup

**Export MongoDB data:**

```bash
# Using mongodump (requires MongoDB tools)
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/campus-trails"

# Using MongoDB Compass
# 1. Open Compass
# 2. Connect to cluster
# 3. Click database
# 4. Export → JSON/CSV
```

**Restore data:**

```bash
mongorestore --uri="mongodb+srv://..." /path/to/backup
```

---

### Regular Maintenance Tasks

**Weekly:**

- Review new feedbacks
- Check facility statuses
- Monitor user registrations

**Monthly:**

- Update facility information
- Review and remove inactive users
- Check pathfinding connections

**As Needed:**

- Add new pins/waypoints
- Update map coordinates
- Modify facility statuses

---

## Future Enhancements

Potential features for future development:

1. **User Management**:

   - View, edit, suspend, delete users
   - View user activity history
   - Export user data

2. **Feedback Management**:

   - View and respond to user feedback
   - Mark feedback as resolved
   - Generate feedback reports

3. **Analytics Dashboard**:

   - User engagement metrics
   - Popular facilities
   - Search trends
   - Pathfinding usage stats

4. **Bulk Operations**:

   - Import pins from CSV
   - Export pin data
   - Batch update statuses

5. **Map Visualization**:

   - Visual map editor with drag-and-drop pins
   - Live preview of pathfinding routes
   - Campus map overlay with Leaflet

6. **Notifications**:

   - Send push notifications to mobile users
   - Announce facility closures
   - System announcements

7. **Role-Based Access**:

   - Super Admin: Full access
   - Admin: Manage pins and users
   - Moderator: View-only access

8. **Audit Logs**:
   - Track all admin actions
   - View change history
   - Rollback capabilities

---

## Support & Resources

### Documentation

- **React**: https://react.dev/
- **React Router**: https://reactrouter.com/
- **Vite**: https://vitejs.dev/
- **Express**: https://expressjs.com/
- **Mongoose**: https://mongoosejs.com/

### Tools

- **MongoDB Compass**: GUI for MongoDB
- **Postman**: API testing tool
- **VS Code**: Recommended editor

### Contact

For issues or questions:

- Check [Troubleshooting](#troubleshooting) section
- Review error logs in browser console
- Check backend terminal output

---

## Conclusion

You now have a fully functional admin panel for Campus Trails!

**Quick Start Checklist:**

- ✅ Backend running on port 3000
- ✅ Admin account created
- ✅ Admin panel running on port 5173
- ✅ Logged in successfully
- ✅ Dashboard showing stats

**Next Steps:**

1. Change default admin password
2. Update JWT secret in production
3. Add more admin accounts if needed
4. Customize styling/branding
5. Deploy to production server

Happy managing! 🎉

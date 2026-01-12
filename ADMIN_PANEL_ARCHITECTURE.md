# Campus Trails Admin Panel - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN PANEL (React)                      │
│                   http://localhost:5173                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │Dashboard │  │Facilities│  │ Map Data │   │
│  │  Page    │  │   Page   │  │   Page   │  │   Page   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘        │
│                         │                                    │
│                    React Router                              │
│                         │                                    │
│                    API Calls                                 │
│                  (fetch/axios)                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP Requests (/api/*)
                      │ Authorization: Bearer <JWT>
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 BACKEND SERVER (Express)                     │
│                   http://localhost:3000                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Admin Routes                         │  │
│  │  /api/admin/login          - Admin login             │  │
│  │  /api/admin/verify         - Token verification      │  │
│  │  /api/admin/stats          - Dashboard statistics    │  │
│  │  /api/admin/pins/:id       - Update/Delete pin       │  │
│  │  /api/admin/pins           - Create pin              │  │
│  │  /api/admin/pins/:id/neighbors - Update connections │  │
│  │  /api/admin/users          - Get users list          │  │
│  │  /api/admin/feedbacks      - Get feedbacks list      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Middleware (Auth)                       │  │
│  │  verifyAdminToken() - JWT verification               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Mongoose ODM
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  MongoDB Atlas Database                      │
│                  campus-trails database                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  admins  │  │   pins   │  │  users   │  │campuses  │   │
│  │          │  │          │  │          │  │          │   │
│  │ username │  │  title   │  │ username │  │   name   │   │
│  │ password │  │  x, y    │  │  email   │  │ location │   │
│  │  email   │  │neighbors │  │ activity │  │          │   │
│  │   role   │  │          │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────┐                                               │
│  │feedbacks │                                               │
│  │          │                                               │
│  │  userId  │                                               │
│  │  pinId   │                                               │
│  │ comment  │                                               │
│  │  rating  │                                               │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────┐                                    ┌──────────┐
│  Admin   │                                    │ Backend  │
│  Panel   │                                    │  Server  │
└────┬─────┘                                    └────┬─────┘
     │                                                │
     │  1. POST /api/admin/login                     │
     │    { username, password }                     │
     ├──────────────────────────────────────────────>│
     │                                                │
     │                     2. Verify credentials     │
     │                        (bcrypt compare)       │
     │                                                │
     │                     3. Generate JWT           │
     │                        (7 day expiration)     │
     │                                                │
     │  4. Return { token, admin }                   │
     │<──────────────────────────────────────────────┤
     │                                                │
     │  5. Store in localStorage                     │
     │     - adminToken                              │
     │     - adminUser                               │
     │                                                │
     │  6. All subsequent requests:                  │
     │     Authorization: Bearer <token>             │
     ├──────────────────────────────────────────────>│
     │                                                │
     │                     7. Verify token           │
     │                        (jwt.verify)           │
     │                                                │
     │  8. Return data                               │
     │<──────────────────────────────────────────────┤
     │                                                │
```

## Page Flow & Features

```
┌─────────────────────────────────────────────────────────────┐
│                        LOGIN PAGE                            │
│  • JWT authentication                                        │
│  • Token stored in localStorage                              │
│  • Protected route redirect                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ Successful login
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      DASHBOARD PAGE                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Statistics Cards (real-time counts)                  │  │
│  │  • Total Pins        • Visible Pins                   │  │
│  │  • Waypoints         • Total Users                    │  │
│  │  • Feedbacks         • Campuses                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Quick Actions (navigation links)                     │  │
│  │  • Search Facilities  • Manage Facilities             │  │
│  │  • Update Map Data                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└───┬─────────────────────┬───────────────────┬───────────────┘
    │                     │                   │
    ▼                     ▼                   ▼
┌─────────┐      ┌────────────────┐   ┌─────────────┐
│FACILITY │      │   FACILITY     │   │  MAP DATA   │
│ SEARCH  │─────>│  MANAGEMENT    │   │   MANAGER   │
└─────────┘      └────────────────┘   └─────────────┘
```

### Facility Search Page

```
┌─────────────────────────────────────────────────────┐
│  Search Bar: [________________]                     │
│                                                      │
│  Filters:  Category: [All ▼]  Campus: [All ▼]     │
│                                                      │
│  Results: 45 facilities found                       │
│                                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐           │
│  │ [🏛️] │  │ [📚] │  │ [🏢] │  │ [🍴] │           │
│  │ Bldg │  │ Lib  │  │Admin │  │Cafe  │           │
│  │ Open │  │ Open │  │Closed│  │ Open │           │
│  └──────┘  └──────┘  └──────┘  └──────┘           │
│                                                      │
│  Click any card to edit ───────────────────────────>│
└─────────────────────────────────────────────────────┘
```

### Facility Management Page (Edit)

```
┌───────────────────────────────────────────────────────────┐
│  ← Back to Facilities        Manage Facility              │
├────────────────────────────┬──────────────────────────────┤
│  EDIT FORM                 │  PREVIEW                     │
│                            │                              │
│  Title: [_____________]    │  ┌─────────────────────┐    │
│  Description:              │  │    [Image]          │    │
│  [____________________]    │  └─────────────────────┘    │
│  [____________________]    │                              │
│                            │  Building Name               │
│  Category: [Academic ▼]    │  Academic                    │
│  Status: [Open ▼]          │  Description here...         │
│  Campus: [USTP-CDO ▼]      │                              │
│  Image URL: [_________]    │  🟢 Open                     │
│  X: [45.5]  Y: [67.8]      │  👁️ Visible                  │
│  ☑ Visible on map          │  Coordinates: (45.5, 67.8)  │
│                            │                              │
│  [💾 Save Changes]          │  FLOOR INFORMATION           │
│  [🗑️ Delete Facility]       │  Floor 1: 8 rooms           │
│                            │  Floor 2: 10 rooms          │
└────────────────────────────┴──────────────────────────────┘
```

### Map Data Manager Page

```
┌─────────────────────────────────────────────────────────┐
│  Map Data Manager              [+ Add New Pin]          │
│                                                          │
│  Campus: [USTP-CDO ▼]                                   │
│  View: [All] [Visible] [Waypoints]                      │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ ID      │ Title      │ Type      │ Neighbors  │    │
│  ├────────────────────────────────────────────────┤    │
│  │ 507f1f │ Library    │ 👁️ Visible │ 3  [Manage]│    │
│  │ 5a8b2c │ Admin Bldg │ 👁️ Visible │ 5  [Manage]│    │
│  │ 6d3e4f │ Waypoint-1 │ 🔍 Waypoint│ 2  [Manage]│    │
│  │ 7c9a1b │ Cafeteria  │ 👁️ Visible │ 4  [Manage]│    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Click "Manage" to edit connections                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Manage Connections: Library                      [×]   │
├─────────────────────┬───────────────────────────────────┤
│ CURRENT CONNECTIONS │ AVAILABLE PINS                    │
│                     │                                   │
│ • Admin Bldg        │ Cafeteria      [Connect]         │
│   [Remove]          │ Waypoint-2     [Connect]         │
│ • Waypoint-1        │ Sports Center  [Connect]         │
│   [Remove]          │ Dormitory      [Connect]         │
│ • Engineering Bldg  │                                   │
│   [Remove]          │                                   │
└─────────────────────┴───────────────────────────────────┘
```

## Data Models

### Admin Model

```javascript
{
  _id: ObjectId,
  username: String,      // Unique, required
  password: String,      // Bcrypt hashed, required
  email: String,         // Unique, required
  role: String,          // 'super-admin', 'admin', 'moderator'
  createdAt: Date,       // Auto timestamp
  lastLogin: Date,       // Updated on login
  isActive: Boolean      // Account status
}
```

### Pin Model (Used by Admin Panel)

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  category: String,      // 'Academic', 'Administration', etc.
  status: String,        // 'open', 'closed', 'maintenance'
  image: String,         // Cloudinary URL
  campusId: ObjectId,    // Reference to Campus
  x: Number,             // Map X coordinate (0-100)
  y: Number,             // Map Y coordinate (0-100)
  isVisible: Boolean,    // true = facility, false = waypoint
  neighbors: [String],   // Array of pin IDs for pathfinding
  floors: [Object]       // Array of floor/room data
}
```

## Security Features

```
┌─────────────────────────────────────────────────────────┐
│  AUTHENTICATION LAYER                                    │
│  • JWT tokens with 7-day expiration                     │
│  • Bcrypt password hashing (10 salt rounds)             │
│  • Token stored in localStorage                          │
│  • Auto-redirect on token expiration                    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  AUTHORIZATION MIDDLEWARE                                │
│  • verifyAdminToken() on all admin routes               │
│  • Checks token validity (jwt.verify)                   │
│  • Verifies admin account is active                     │
│  • Returns 401 if invalid/expired                       │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  API PROTECTION                                          │
│  • All /api/admin/* routes require Bearer token         │
│  • CORS configured for specific origins                 │
│  • Input validation on all endpoints                    │
│  • Error handling with sanitized messages               │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack Details

### Frontend

- **React 18**: Component-based UI
- **React Router 6**: Client-side routing with protected routes
- **Vite**: Fast HMR and optimized builds
- **Pure CSS**: No UI framework dependencies
- **Fetch API**: HTTP requests with Bearer token authentication

### Backend

- **Express.js**: RESTful API server
- **Mongoose**: MongoDB object modeling
- **JWT**: Token-based authentication
- **Bcrypt**: Password hashing
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment variable management

### Database

- **MongoDB Atlas**: Cloud-hosted NoSQL database
- **Collections**: admins, pins, users, feedbacks, campuses
- **Indexes**: Optimized queries on username, email, campusId

## Development Workflow

```
┌──────────────────────────────────────────────────────┐
│  DEVELOPMENT ENVIRONMENT                              │
│                                                       │
│  Terminal 1:                  Terminal 2:            │
│  ┌──────────────────┐        ┌─────────────────┐    │
│  │  Backend Server  │        │  Admin Panel    │    │
│  │  Port: 3000      │        │  Port: 5173     │    │
│  │  node server.js  │        │  npm run dev    │    │
│  └──────────────────┘        └─────────────────┘    │
│         │                            │               │
│         └────────────────────────────┘               │
│                      │                               │
│         Vite Proxy: /api/* → :3000                   │
│                                                       │
│  OR use: npm run dev:admin (runs both)              │
└──────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌──────────────────────────────────────────────────────┐
│  PRODUCTION ENVIRONMENT                               │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  Static Hosting (Netlify/Vercel)             │   │
│  │  ├─ index.html                                │   │
│  │  ├─ /assets/main.js                           │   │
│  │  └─ /assets/main.css                          │   │
│  └─────────────┬────────────────────────────────┘   │
│                │ API Calls                           │
│                ▼                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Backend Server (VPS/Cloud)                   │   │
│  │  ├─ HTTPS enabled                             │   │
│  │  ├─ Rate limiting                              │   │
│  │  └─ CORS: specific domains                    │   │
│  └─────────────┬────────────────────────────────┘   │
│                │                                     │
│                ▼                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  MongoDB Atlas                                 │   │
│  │  ├─ IP whitelist                               │   │
│  │  ├─ Backup enabled                             │   │
│  │  └─ SSL connection                             │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## File Structure Map

```
Test-Campus-Trails/
│
├── admin-panel/                   # 🆕 Admin web interface
│   ├── src/
│   │   ├── pages/                # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FacilitySearch.jsx
│   │   │   ├── FacilityManagement.jsx
│   │   │   └── MapDataManager.jsx
│   │   ├── components/           # Reusable components
│   │   │   └── Navbar.jsx
│   │   ├── App.jsx               # Main app with routing
│   │   ├── main.jsx              # Entry point
│   │   ├── App.css               # Global styles
│   │   └── index.css             # CSS reset
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── routes/
│   │   ├── admin.js              # 🆕 Admin API routes
│   │   ├── pins.js
│   │   ├── auth.js
│   │   └── ...
│   ├── models/
│   │   ├── Admin.js              # 🆕 Admin user model
│   │   ├── Pin.js
│   │   └── ...
│   ├── scripts/
│   │   ├── createAdmin.js        # 🆕 Create admin account
│   │   └── ...
│   └── server.js                 # Updated with admin routes
│
├── ADMIN_PANEL_SETUP.md          # 🆕 Complete setup guide
├── ADMIN_PANEL_QUICK_REFERENCE.md # 🆕 Quick reference
└── ADMIN_PANEL_INSTALLATION_CHECKLIST.md # 🆕 Checklist

🆕 = New files for admin panel
```

---

**This architecture provides a complete, secure, and scalable admin panel for managing the Campus Trails application.**

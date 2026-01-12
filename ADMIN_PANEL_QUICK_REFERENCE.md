# Admin Panel - Quick Reference

## 🚀 Quick Start

### First-Time Setup

```bash
# 1. Install dependencies
cd admin-panel
npm install

# 2. Start backend
cd ../backend
node server.js

# 3. Create admin account (in another terminal)
cd backend
node scripts/createAdmin.js

# 4. Start admin panel (in another terminal)
cd ../admin-panel
npm run dev

# 5. Login at http://localhost:5173
# Username: admin
# Password: Admin@123
```

### Development (After Setup)

```bash
# From root directory - run both backend & admin panel:
npm run dev:admin

# Or run separately:
# Terminal 1:
npm run backend

# Terminal 2:
npm run admin
```

---

## 🔑 Default Login

- **URL**: `http://localhost:5173/login`
- **Username**: `admin`
- **Password**: `Admin@123`
- ⚠️ **Change password after first login!**

---

## 📋 Common Tasks

### Update Facility Status

1. Go to Facilities → Search for facility
2. Click facility card
3. Change "Status" dropdown (Open/Closed/Maintenance)
4. Click "Save Changes"

### Add New Facility

1. Go to Map Data → Click "+ Add New Pin"
2. Fill form (title, category, campus, coordinates)
3. Check "Visible on map" (for facilities)
4. Click "Create Pin"

### Add Waypoint (for pathfinding)

1. Go to Map Data → Click "+ Add New Pin"
2. Fill form with descriptive title (e.g., "WP-Junction-1")
3. **Uncheck** "Visible on map"
4. Set X/Y coordinates
5. Click "Create Pin"

### Connect Pins (Pathfinding)

1. Go to Map Data
2. Find pin in table → Click "Manage"
3. In Available Pins section → Click "Connect" for nearby pins
4. Connections save automatically
5. Close modal

### Search Facilities

1. Go to Facilities
2. Type in search bar (searches title, description, category)
3. Use filters: Category dropdown, Campus dropdown
4. Click facility card to edit

---

## 🔧 API Endpoints (for testing)

### Test Login

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```

### Test Stats (requires token)

```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🐛 Troubleshooting

### "Network Error" on Login

```bash
# Check backend is running:
curl http://localhost:3000/health

# If not, start it:
cd backend
node server.js
```

### "Invalid Token" / Auto-Logout

```bash
# Clear browser localStorage:
# 1. Open DevTools (F12)
# 2. Application → Local Storage
# 3. Delete 'adminToken' and 'adminUser'
# 4. Try logging in again
```

### Admin Account Not Working

```bash
# Recreate admin account:
cd backend
node scripts/createAdmin.js
```

### Port Already in Use

```bash
# Windows - find and kill process:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5173 | xargs kill -9
```

---

## 📁 File Structure

```
admin-panel/
├── src/
│   ├── pages/
│   │   ├── Login.jsx              # Login page
│   │   ├── Dashboard.jsx          # Dashboard with stats
│   │   ├── FacilitySearch.jsx     # Search/browse facilities
│   │   ├── FacilityManagement.jsx # Edit single facility
│   │   └── MapDataManager.jsx     # Manage pins & connections
│   ├── components/
│   │   └── Navbar.jsx             # Navigation bar
│   └── App.jsx                    # Main app with routing
└── vite.config.js                 # Vite config with proxy

backend/
├── routes/
│   └── admin.js                   # Admin API routes
├── models/
│   └── Admin.js                   # Admin user model
└── scripts/
    └── createAdmin.js             # Create admin account
```

---

## 🔒 Security Checklist

- [ ] Changed default admin password
- [ ] Updated JWT_SECRET in backend/.env
- [ ] Set specific CORS_ORIGINS (not \*)
- [ ] Using HTTPS in production
- [ ] Enabled rate limiting for login
- [ ] Regular database backups

---

## 📞 Need Help?

1. Check [ADMIN_PANEL_SETUP.md](ADMIN_PANEL_SETUP.md) for full guide
2. Review [Troubleshooting section](#-troubleshooting) above
3. Check browser console for errors (F12)
4. Check backend terminal for error logs
5. Verify MongoDB connection in backend console

---

## 🎯 Key URLs

| Service         | URL                          | Description               |
| --------------- | ---------------------------- | ------------------------- |
| Admin Panel     | http://localhost:5173        | Web admin interface       |
| Backend API     | http://localhost:3000        | Backend server            |
| Health Check    | http://localhost:3000/health | Verify backend is running |
| MongoDB Compass | mongodb+srv://...            | Database management       |

---

## ⚡ Keyboard Shortcuts (Browser)

- `F12` - Open DevTools
- `Ctrl/Cmd + Shift + R` - Hard refresh (clear cache)
- `Ctrl/Cmd + K` - Clear console
- `F5` - Refresh page

---

## 📊 Dashboard Stats Explained

- **Total Pins**: All pins in database (visible + waypoints)
- **Visible Pins**: Facilities shown on mobile app map
- **Waypoints**: Invisible pathfinding nodes
- **Total Users**: Registered mobile app users
- **Total Feedbacks**: User feedback submissions
- **Total Campuses**: Number of campus locations

---

## 🗺️ Coordinate System

- **X coordinate**: Horizontal position (0-100 scale)
- **Y coordinate**: Vertical position (0-100 scale)
- Based on percentage of map dimensions
- Used for pin placement on mobile app map

**Tips:**

- Keep facilities near actual map position
- Use waypoints to connect distant facilities
- Test pathfinding in mobile app after changes

---

## 💡 Best Practices

### Pin Management

- Use descriptive titles for waypoints (e.g., "WP-Building-A-North")
- Keep coordinates accurate to map
- Add images for all visible facilities
- Update status promptly (closures, maintenance)

### Pathfinding

- Connect pins within ~50-100 units distance
- Create waypoints at path intersections
- Test routes in mobile app after changes
- Document waypoint naming convention

### Security

- Log out when done
- Don't share admin credentials
- Change password regularly
- Review audit logs (if enabled)

---

**Quick Command Reference:**

```bash
# Install admin panel
cd admin-panel && npm install

# Run everything together
npm run dev:admin

# Create admin account
cd backend && node scripts/createAdmin.js

# Build for production
cd admin-panel && npm run build

# Test backend API
curl http://localhost:3000/health
```

---

🎉 **Ready to go! Start with `npm run dev:admin` from the root directory.**

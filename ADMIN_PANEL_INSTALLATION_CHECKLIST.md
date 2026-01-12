# Admin Panel Installation Checklist

Follow this checklist to ensure your admin panel is properly set up and functional.

## ✅ Pre-Installation

- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm 8+ installed (`npm --version`)
- [ ] Backend folder exists with working MongoDB connection
- [ ] MongoDB Atlas cluster is accessible
- [ ] Backend `.env` file configured with valid credentials

## ✅ Backend Setup

### 1. Environment Variables

- [ ] `backend/.env` file exists
- [ ] `MONGODB_URI` is set to valid Atlas connection string
- [ ] `JWT_SECRET` is set (use strong random key)
- [ ] `PORT` is set (default: 3000)
- [ ] `CORS_ORIGINS` configured (use `*` for dev)

### 2. Admin Routes

- [ ] `backend/routes/admin.js` file exists
- [ ] `backend/models/Admin.js` file exists
- [ ] `backend/server.js` includes admin routes:
  ```javascript
  app.use("/api/admin", require("./routes/admin"));
  ```

### 3. Create Admin Account

```bash
cd backend
node scripts/createAdmin.js
```

- [ ] Script ran successfully
- [ ] Default credentials displayed:
  - Username: `admin`
  - Password: `Admin@123`

### 4. Test Backend

```bash
cd backend
node server.js
```

- [ ] Server starts without errors
- [ ] MongoDB connection successful
- [ ] Port 3000 is listening
- [ ] Health check works: `curl http://localhost:3000/health`

## ✅ Admin Panel Setup

### 1. Install Dependencies

```bash
cd admin-panel
npm install
```

- [ ] All packages installed successfully
- [ ] No peer dependency warnings
- [ ] `node_modules` folder created

### 2. Verify Files Exist

- [ ] `admin-panel/package.json`
- [ ] `admin-panel/vite.config.js`
- [ ] `admin-panel/index.html`
- [ ] `admin-panel/src/main.jsx`
- [ ] `admin-panel/src/App.jsx`
- [ ] `admin-panel/src/pages/Login.jsx`
- [ ] `admin-panel/src/pages/Dashboard.jsx`
- [ ] `admin-panel/src/pages/FacilitySearch.jsx`
- [ ] `admin-panel/src/pages/FacilityManagement.jsx`
- [ ] `admin-panel/src/pages/MapDataManager.jsx`
- [ ] `admin-panel/src/components/Navbar.jsx`

### 3. Configuration Check

Open `admin-panel/vite.config.js`:

- [ ] Port is set to 5173
- [ ] Proxy target is `http://localhost:3000`
- [ ] React plugin is configured

## ✅ First Run

### 1. Start Backend (Terminal 1)

```bash
cd backend
node server.js
```

- [ ] Backend running without errors
- [ ] Listening on port 3000

### 2. Start Admin Panel (Terminal 2)

```bash
cd admin-panel
npm run dev
```

- [ ] Vite dev server starts
- [ ] Opens on `http://localhost:5173`
- [ ] No compilation errors

### 3. Test Login

- [ ] Navigate to `http://localhost:5173`
- [ ] Login page displays correctly
- [ ] Enter credentials:
  - Username: `admin`
  - Password: `Admin@123`
- [ ] Login succeeds
- [ ] Redirected to Dashboard

### 4. Test Dashboard

- [ ] Dashboard loads successfully
- [ ] Statistics cards display numbers
- [ ] Quick action links work
- [ ] Navbar shows admin username
- [ ] Logout button visible

### 5. Test Facilities Page

- [ ] Navigate to Facilities (from navbar or quick actions)
- [ ] Facilities grid displays
- [ ] Search bar works
- [ ] Category filter works
- [ ] Campus filter works
- [ ] Click a facility card - opens edit page

### 6. Test Facility Edit

- [ ] Facility details load
- [ ] Form fields populated correctly
- [ ] Can edit fields
- [ ] "Save Changes" button works
- [ ] Success message appears
- [ ] Preview section updates

### 7. Test Map Data Manager

- [ ] Navigate to Map Data
- [ ] Pin table displays
- [ ] View mode buttons work (All/Visible/Waypoints)
- [ ] Campus filter works
- [ ] Click "Manage" on a pin - modal opens
- [ ] Can add/remove connections
- [ ] "+ Add New Pin" button works

## ✅ Optional: Concurrent Run

From root directory:

```bash
npm run dev:admin
```

- [ ] Both backend and admin panel start together
- [ ] Can access admin panel at `http://localhost:5173`
- [ ] API requests work correctly

## ✅ Production Readiness

Before deploying to production:

### Security

- [ ] Changed default admin password
- [ ] Updated `JWT_SECRET` to strong random key
- [ ] Changed `CORS_ORIGINS` from `*` to specific domains
- [ ] Enabled HTTPS
- [ ] Added rate limiting to login endpoint

### Database

- [ ] MongoDB Atlas IP whitelist configured
- [ ] Database backup strategy in place
- [ ] Connection string uses secure credentials

### Build

- [ ] Run `npm run build` in admin-panel
- [ ] Build succeeds without errors
- [ ] `dist/` folder created
- [ ] Preview works: `npm run preview`

## ✅ Troubleshooting Tests

If anything doesn't work, verify:

### "Cannot connect to backend"

```bash
# Test backend is running
curl http://localhost:3000/health

# Should return JSON with "success": true
```

- [ ] Backend is running
- [ ] Port 3000 is not blocked
- [ ] Vite proxy is configured correctly

### "Invalid credentials"

```bash
# Verify admin exists in MongoDB
# Open MongoDB Compass
# Navigate to campus-trails -> admins collection
```

- [ ] Admin document exists
- [ ] `isActive` is `true`
- [ ] Password is hashed (starts with `$2a$`)

### "Network Error"

```bash
# Check browser console (F12)
# Look for CORS or network errors
```

- [ ] Backend CORS is configured (`CORS_ORIGINS=*` for dev)
- [ ] Backend is accessible from browser
- [ ] Proxy in vite.config.js is correct

### Login Success but Immediate Logout

```bash
# Check browser console for token errors
# Clear localStorage and try again
```

- [ ] JWT_SECRET matches between login and verify
- [ ] Token is being saved to localStorage
- [ ] Token verification endpoint works

## 📝 Post-Installation

After successful installation:

1. **Change Default Password**

   - Login with default credentials
   - (Feature to be added: Profile/Settings page)
   - For now, update directly in MongoDB

2. **Create Additional Admins** (if needed)

   ```bash
   # Modify and run:
   node backend/scripts/createAdmin.js
   ```

3. **Test All Features**

   - Create a test pin
   - Edit a facility
   - Update connections
   - Search facilities

4. **Bookmark URLs**
   - Admin Panel: `http://localhost:5173`
   - Backend API: `http://localhost:3000`
   - Health Check: `http://localhost:3000/health`

## 🎉 Installation Complete!

If all items are checked, your admin panel is ready to use!

### Quick Reference

- **Admin Panel**: http://localhost:5173
- **Username**: admin
- **Password**: Admin@123 (change this!)
- **Start Command**: `npm run dev:admin` (from root)

### Next Steps

1. Explore the dashboard
2. Update facility statuses
3. Manage map data
4. Add new pins/waypoints
5. Test pathfinding in mobile app

### Documentation

- Full Guide: `ADMIN_PANEL_SETUP.md`
- Quick Reference: `ADMIN_PANEL_QUICK_REFERENCE.md`
- Admin Panel README: `admin-panel/README.md`

---

**Need Help?** Check the troubleshooting section in [ADMIN_PANEL_SETUP.md](ADMIN_PANEL_SETUP.md)

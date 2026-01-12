# Backend Server Restart Required

The campuses API route has been added, but you need to **restart your backend server** for the changes to take effect.

## Steps to Restart Backend Server

1. **Stop the current backend server:**
   - If running in a terminal, press `Ctrl+C` to stop it
   - Or find the process and kill it: `lsof -ti:3000 | xargs kill`

2. **Start the backend server again:**
   ```bash
   cd backend
   npm start
   ```

3. **Verify the campuses endpoint is working:**
   - Check the server console for: `API endpoint: http://localhost:3000/api/pins`
   - Test the endpoint: `curl http://localhost:3000/api/campuses` (or visit in browser)
   - You should see: `{"success":true,"count":0,"data":[]}` (empty array until you add campuses to MongoDB)

## Adding Campuses to MongoDB

Once the server is restarted and the endpoint is working, you can add campuses to MongoDB:

1. **Open MongoDB Compass or Atlas**
2. **Connect to your database** (e.g., `campus-trails`)
3. **Navigate to the `campuses` collection**
4. **Click "Insert Document"** and add:

```json
{
  "name": "USTP-CDO",
  "order": 0,
  "active": true
}
```

5. **Add more campuses as needed** (see `CAMPUSES_SETUP.md` for details)

## Note

The 404 error you're seeing is because the backend server was started **before** the `/api/campuses` route was added. After restarting, the route will be available.

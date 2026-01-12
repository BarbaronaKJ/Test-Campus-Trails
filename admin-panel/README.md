# Campus Trails Admin Panel

Web-based administration interface for the Campus Trails mobile application.

## Features

- 🔐 **Secure Authentication** - JWT-based admin login
- 📊 **Dashboard** - Real-time statistics and system overview
- 🏢 **Facility Management** - Search, edit, and update campus facilities
- 🗺️ **Map Data Editor** - Manage pins, waypoints, and pathfinding connections
- 🏫 **Multi-Campus Support** - Handle multiple campus locations
- 📱 **Responsive Design** - Works on desktop and tablet

## Quick Start

### Prerequisites

- Node.js 16+
- Backend server running on port 3000

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## Default Login

**Username:** `admin`  
**Password:** `Admin@123`

⚠️ Change password after first login!

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client (for future use)
- **Pure CSS** - No external UI libraries

## Project Structure

```
src/
├── pages/           # Page components
├── components/      # Reusable components
├── App.jsx          # Main app with routing
└── main.jsx         # Entry point
```

## Configuration

### API Proxy

Vite proxies `/api/*` requests to backend. Edit `vite.config.js` to change:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true
  }
}
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Documentation

See [ADMIN_PANEL_SETUP.md](../ADMIN_PANEL_SETUP.md) for comprehensive setup guide.

See [ADMIN_PANEL_QUICK_REFERENCE.md](../ADMIN_PANEL_QUICK_REFERENCE.md) for quick reference.

## License

Part of the Campus Trails project.

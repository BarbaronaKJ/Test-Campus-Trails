# Campus Trails

An interactive campus map application built with React Native and Expo, featuring pathfinding, pin filtering, and detailed facility information. Includes a web-based admin panel for managing facilities and map data.

## 📁 Project Structure

```
Campus-Trails/
├── App.js                 # Main application component
├── index.js              # Entry point (Expo registration)
├── pinsData.js           # Pin data (coordinates, descriptions, neighbors)
├── styles.js             # All StyleSheet definitions
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── metro.config.js       # Metro bundler configuration
│
├── admin-panel/          # 🆕 Web-based admin interface
│   ├── src/
│   │   ├── pages/        # Admin pages (Login, Dashboard, etc.)
│   │   └── components/   # Reusable components
│   └── package.json      # Admin panel dependencies
│
├── backend/              # Express server & MongoDB integration
│   ├── routes/
│   │   ├── admin.js      # 🆕 Admin API routes
│   │   ├── pins.js
│   │   └── auth.js
│   ├── models/
│   │   ├── Admin.js      # 🆕 Admin user model
│   │   ├── Pin.js
│   │   └── User.js
│   └── server.js
│
├── assets/               # Image assets
│   ├── ustp-cdo-map.png  # Main campus map image
│   ├── USTP.jpg          # Default building image
│   └── ...               # Other images and icons
│
├── constants/            # Application constants
│   └── index.js          # Campus list and other constants
│
├── utils/                # Utility functions
│   ├── pathfinding.js   # A* pathfinding algorithm
│   └── categoryFilter.js # Category filtering logic
│
└── components/           # React components (reserved for future use)
```

## 📄 File Descriptions

### Core Files

- **`App.js`** - Main application component containing:

  - State management for modals, pathfinding, filters, and UI
  - Map rendering with zoom and pan functionality
  - Pin visualization with SVG overlays
  - Modal components (Settings, Filter, Search, etc.)
  - Event handlers and user interactions

- **`pinsData.js`** - Pin data structure containing:

  - Pin coordinates (x, y) for map positioning
  - Building titles and descriptions
  - Image references
  - Neighbor connections for pathfinding
  - Visibility flags (invisible waypoints)

- **`styles.js`** - Centralized StyleSheet definitions:
  - Component styles (buttons, modals, headers, footers)
  - Layout styles (containers, positioning)
  - Modal styles (animations, backgrounds)
  - Filter and category styles

### Utility Files

- **`utils/pathfinding.js`** - Pathfinding algorithms:

  - `distance(p1, p2)` - Calculates Euclidean distance between two points
  - `buildGraph()` - Constructs graph from pin neighbor connections
  - `aStarPathfinding(startId, endId)` - A\* algorithm implementation for finding optimal paths

- **`utils/categoryFilter.js`** - Category filtering system:
  - `categoryKeywords` - Mapping of categories to search keywords
  - `allCategoryKeys` - Array of all available category keys
  - `pinMatchesSelected(pin, selectedCategories)` - Checks if pin matches selected categories

### Constants

- **`constants/index.js`** - Application constants:
  - `campuses` - List of available campus locations

## 🚀 Features

### Map Features

- **Interactive Map** - Pan and zoom functionality with high-resolution campus map
- **Pin Visualization** - Color-coded pins for different building types
- **Pathfinding** - A\* algorithm for finding optimal routes between buildings
- **Category Filtering** - Filter pins by building type, amenities, and services

### UI Components

- **Search Modal** - Search for buildings and facilities
- **Filter Modal** - Category-based filtering with visual selection
- **Pathfinding Panel** - Select start and destination points for navigation
- **Settings Modal** - App settings and about information
- **Pin Detail Modal** - Detailed information about selected buildings
- **View All Pins Modal** - List view of all facilities

### Navigation

- **Campus Switcher** - Switch between different campus locations
- **Path Visualization** - Visual path display on map
- **Location Picker** - Select start and destination points

## 🛠️ Installation & Setup

### Prerequisites

Before you begin, make sure you have the following installed on your computer:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/downloads)
- **Expo CLI** (we'll install this in the setup steps)
- **Expo Go app** on your mobile device (for testing on real device)
  - [Android - Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)

### Step-by-Step Setup Guide for Beginners

#### Step 1: Install Git (if not already installed)

1. Download Git from [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. Run the installer and follow the setup wizard
3. Use default settings unless you know what you're doing
4. Verify installation by opening a terminal/command prompt and typing:
   ```bash
   git --version
   ```
   You should see a version number (e.g., `git version 2.40.0`)

#### Step 2: Install Node.js (if not already installed)

1. Download Node.js from [https://nodejs.org/](https://nodejs.org/)
2. Choose the LTS (Long Term Support) version
3. Run the installer and follow the setup wizard
4. Verify installation by opening a terminal/command prompt and typing:
   ```bash
   node --version
   npm --version
   ```
   You should see version numbers for both

#### Step 3: Pull the Project from Git

**Option A: Clone the Repository (First Time Setup)**

1. Open a terminal/command prompt
2. Navigate to where you want to store the project (e.g., `cd Documents` or `cd Desktop`)
3. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
   Replace `<repository-url>` with the actual Git repository URL (e.g., `https://github.com/username/Campus-Trails.git`)
4. Navigate into the project folder:
   ```bash
   cd Campus-Trails
   ```

**Option B: Pull Latest Changes (If Project Already Exists)**

1. Open a terminal/command prompt
2. Navigate to the project folder:
   ```bash
   cd path/to/Campus-Trails
   ```
3. Pull the latest changes from Git:
   ```bash
   git pull origin main
   ```
   (Note: Replace `main` with `master` if your repository uses `master` as the default branch)

#### Step 4: Install Project Dependencies

1. Make sure you're in the project folder (`Campus-Trails`)
2. Install all required packages:
   ```bash
   npm install
   ```
   This may take a few minutes. Wait for it to complete.

#### Step 5: Install Expo CLI Globally

1. Install Expo CLI on your computer:
   ```bash
   npm install -g expo-cli
   ```
   (You may need administrator/sudo privileges for this)

#### Step 6: Start the Development Server

1. Make sure you're still in the `Campus-Trails` folder
2. Start the Expo development server:

   ```bash
   npm start
   ```

   or

   ```bash
   expo start
   ```

3. You should see:
   - A QR code in your terminal
   - Options to press keys for different platforms
   - A web interface (usually opens automatically at `http://localhost:19002`)

#### Step 7: Run the App on Your Device

**Option A: Using Expo Go App (Recommended for Beginners)**

1. Install **Expo Go** app on your phone:

   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Make sure your phone and computer are on the same Wi-Fi network

3. Scan the QR code:

   - **Android**: Open Expo Go app → Tap "Scan QR code" → Scan the QR code from terminal
   - **iOS**: Open Camera app → Point at QR code → Tap the notification that appears

4. The app should load on your device!

**Option B: Using an Emulator/Simulator**

- **Android Emulator**: Press `a` in the terminal (requires Android Studio setup)
- **iOS Simulator**: Press `i` in the terminal (requires Xcode on macOS only)

### Troubleshooting Common Issues

**Problem: `git` command not found**

- Solution: Make sure Git is installed and added to your system PATH. Restart your terminal after installation.

**Problem: `npm` command not found**

- Solution: Make sure Node.js is installed. Restart your terminal after installation.

**Problem: `npm install` fails with errors**

- Solution: Try deleting `node_modules` folder and `package-lock.json`, then run `npm install` again:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

**Problem: Expo Go can't connect to the development server**

- Solution:
  - Make sure both devices are on the same Wi-Fi network
  - Try using tunnel mode: `expo start --tunnel`
  - Check if your firewall is blocking the connection

**Problem: Port already in use**

- Solution: Kill the process using the port or use a different port:
  ```bash
  expo start --port 8082
  ```

**Problem: Can't pull from Git (authentication required)**

- Solution: You may need to set up Git credentials:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```
  For private repositories, you may need to set up SSH keys or use a personal access token.

### Daily Workflow

**Starting Work:**

1. Open terminal
2. Navigate to project: `cd path/to/Campus-Trails`
3. Pull latest changes: `git pull origin main`
4. Start development server: `npm start`
5. Scan QR code with Expo Go app

**Ending Work:**

1. Stop the development server (press `Ctrl+C` in terminal)
2. Commit and push your changes (if you made any):
   ```bash
   git add .
   git commit -m "Description of your changes"
   git push origin main
   ```

## � Admin Panel

Campus Trails includes a powerful web-based admin panel for managing facilities, map data, and user content.

### Features

- **Dashboard** - Real-time statistics and system overview
- **Facility Management** - Search, edit, update, and delete facilities
- **Status Updates** - Change facility status (Open, Closed, Maintenance)
- **Map Data Editor** - Manage pins, waypoints, and pathfinding connections
- **Multi-Campus Support** - Handle multiple campus locations

### Quick Start

**1. Install Admin Panel Dependencies**

```bash
cd admin-panel
npm install
```

**2. Create Admin Account**

```bash
cd backend
node scripts/createAdmin.js
```

Default credentials:

- Username: `admin`
- Password: `Admin@123`

**3. Start Admin Panel**

```bash
# From root directory - runs both backend & admin panel:
npm run dev:admin

# Or separately:
# Terminal 1 - Backend:
npm run backend

# Terminal 2 - Admin Panel:
npm run admin
```

**4. Access Admin Panel**

- Open browser: `http://localhost:5173`
- Login with default credentials
- Change password after first login!

### Documentation

- **Complete Setup Guide**: [ADMIN_PANEL_SETUP.md](ADMIN_PANEL_SETUP.md)
- **Quick Reference**: [ADMIN_PANEL_QUICK_REFERENCE.md](ADMIN_PANEL_QUICK_REFERENCE.md)
- **Installation Checklist**: [ADMIN_PANEL_INSTALLATION_CHECKLIST.md](ADMIN_PANEL_INSTALLATION_CHECKLIST.md)
- **Architecture Overview**: [ADMIN_PANEL_ARCHITECTURE.md](ADMIN_PANEL_ARCHITECTURE.md)

## �📦 Dependencies

### Core Dependencies

- `expo` - Expo framework
- `react` & `react-native` - React and React Native core
- `react-native-svg` - SVG rendering for map overlays
- `react-native-image-pan-zoom` - Map pan and zoom functionality
- `@expo/vector-icons` - Icon library (FontAwesome)

### Development Dependencies

- `@babel/core` - Babel transpiler
- `react-native-svg-transformer` - SVG file transformer

## 🏗️ Architecture

### State Management

The application uses React hooks for state management:

- `useState` - Component state (modals, selections, filters)
- `useRef` - Animation values and references
- `useEffect` - Side effects and animations

### Component Organization

- **Main App Component** - Contains all UI and logic
- **Utility Functions** - Separated into `utils/` for reusability
- **Styles** - Centralized in `styles.js` for maintainability
- **Constants** - Application-wide constants in `constants/`

### Data Flow

1. Pin data loaded from `pinsData.js`
2. User interactions trigger state updates
3. Filters applied via `categoryFilter.js`
4. Pathfinding calculated via `pathfinding.js`
5. UI updates based on state changes

## 🎨 Styling

All styles are centralized in `styles.js` using React Native's `StyleSheet.create()`. This includes:

- Layout styles (containers, positioning)
- Component styles (buttons, modals, cards)
- Animation styles (transforms, opacity)
- Color schemes and themes

## 🔧 Configuration

### Expo Configuration (`app.json`)

- App name, version, and orientation
- Icon and splash screen settings
- Platform-specific configurations

### Metro Configuration (`metro.config.js`)

- Bundler settings for asset handling
- SVG transformer configuration

## 📝 Notes

- The map uses a high-resolution coordinate system (3387x3172)
- Pathfinding uses A\* algorithm with bi-directional graph connections
- Category filtering supports multiple keyword matching
- All modals include smooth animations with spring physics

## 👥 Contributors

- Kenth Jonard Barbarona
- Cyle Audrey Villarte
- Rafael Estorosas
- Christian Ferdinand Reantillo
- Gwynnever Tutor

**USTP-BSIT**

## 📄 License

This project is private and proprietary.

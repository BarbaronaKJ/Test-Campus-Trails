// Rooms are now stored in database (Pin model floors/rooms structure)

/**
 * Flatten all rooms from a pin's floors/rooms structure for search
 * @param {Object} pin - Pin object with floors/rooms structure
 * @returns {Array} Array of all rooms with floor and building info
 */
export const getAllRooms = (pin) => {
  if (!pin || !pin.floors || !Array.isArray(pin.floors)) {
    return [];
  }
  
  const rooms = [];
  pin.floors.forEach((floor) => {
    if (floor.rooms && Array.isArray(floor.rooms)) {
      floor.rooms.forEach(room => {
        rooms.push({
          ...room,
          floor: `Floor ${floor.level}`,
          floorLevel: floor.level,
          buildingId: pin.buildingNumber || pin.id,
          type: 'room'
        });
      });
    }
  });
  return rooms;
};

/**
 * Filter pins based on search query (excludes invisible waypoints)
 * @param {Array} pins - Array of all pins (may include invisible waypoints)
 * @param {string} searchQuery - Search query string
 * @returns {Array} Filtered visible pins matching search query
 */
export const getFilteredPins = (pins, searchQuery) => {
  // Filter out invisible waypoints first, then apply search query
  return pins.filter((pin) => {
    // Exclude invisible waypoints from search results
    if (pin.isInvisible === true) {
      return false;
    }
    // Apply search query filter
    return (pin.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
           (pin.description || '').toLowerCase().includes(searchQuery.toLowerCase());
  });
};

/**
 * Filter rooms based on search query
 * @param {Array} allRooms - Array of all rooms
 * @param {string} searchQuery - Search query string
 * @returns {Array} Filtered rooms
 */
export const getFilteredRooms = (allRooms, searchQuery) => {
  return allRooms.filter((room) =>
    (room.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (room.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
};

/**
 * Combine filtered pins and rooms for search results
 * @param {Array} filteredPins - Filtered pins
 * @param {Array} filteredRooms - Filtered rooms
 * @param {number} limit - Maximum number of results (default: 5)
 * @returns {Array} Combined search results
 */
export const getSearchResults = (filteredPins, filteredRooms, limit = 5) => {
  const results = [];
  
  // Add filtered pins
  filteredPins.forEach(pin => {
    results.push({ ...pin, type: 'pin' });
  });
  
  // Add filtered rooms
  filteredRooms.forEach(room => {
    results.push(room);
  });
  
  return results.slice(0, limit);
};

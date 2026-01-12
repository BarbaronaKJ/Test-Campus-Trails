import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Image, ImageBackground, Modal, Text, TouchableOpacity, Pressable, TextInput, FlatList, Dimensions, ScrollView, Switch, Animated, BackHandler, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageZoom from 'react-native-image-pan-zoom';
import Icon from 'react-native-vector-icons/FontAwesome';
import Svg, { Circle, Text as SvgText, Polyline, G } from 'react-native-svg';
import { styles } from './styles';
import { aStarPathfinding } from './utils/pathfinding';
import { allCategoryKeys, pinMatchesSelected, categoryPinIds } from './utils/categoryFilter';
// Campuses are now fetched from MongoDB API instead of constants
// Rooms are now stored in database (Pin model floors/rooms structure)
import { interpolateColor, interpolateBlueColor, interpolateRedColor, THROTTLE_MS } from './utils/colorInterpolation';
import { getPinCategory, getCategorizedPins } from './utils/pinCategories';
import { getAllRooms, getFilteredPins, getFilteredRooms, getSearchResults } from './utils/searchUtils';
import { handlePinPress as handlePinPressUtil, savePin as savePinUtil, handleCampusChange as handleCampusChangeUtil } from './utils/handlers';
import { getOptimizedImage, clearImageCache, ExpoImage } from './utils/imageUtils';
import { usePins } from './utils/usePins';
import { getProfilePictureUrl, uploadToCloudinaryDirect, CLOUDINARY_CONFIG } from './utils/cloudinaryUtils';
import * as ImagePicker from 'expo-image-picker';
import { loadUserData, saveUserData, addFeedback, addSavedPin, removeSavedPin, getActivityStats, updateSettings, updateProfile } from './utils/userStorage';
import { register, login, getCurrentUser, updateUserProfile, updateUserActivity, changePassword, logout, fetchCampuses, forgotPassword } from './services/api';
import { useBackHandler } from './utils/useBackHandler';

const { width, height } = Dimensions.get('window');

const App = () => {
  // Fetch pins from MongoDB API with fallback to local pinsData
  // Set useApi to false to disable API fetching and use local data only
  const { pins, loading: pinsLoading, error: pinsError, isUsingLocalFallback, refetch: refetchPins } = usePins(true);

  // Campuses state - fetched from MongoDB API
  const [campuses, setCampuses] = useState(['USTP-CDO']); // Default fallback
  const [campusesLoading, setCampusesLoading] = useState(false);
  const [campusesError, setCampusesError] = useState(null);

  const [selectedPin, setSelectedPin] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSearchVisible, setSearchVisible] = useState(false);
  const [isCampusVisible, setCampusVisible] = useState(false);
  const [savedPins, setSavedPins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomScale, setZoomScale] = useState(1);
  // Zoom and pan state for programmatic control
  const [zoomToPin, setZoomToPin] = useState(null); // { pin, zoom, panX, panY }
  
  // Modals state
  const [isPinsModalVisible, setPinsModalVisible] = useState(false);
  // Settings Modal State (replaces About modal)
  const [isSettingsVisible, setSettingsVisible] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general'); // 'general' | 'about'
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Path line style setting (dot, dash, or solid)
  const [pathLineStyle, setPathLineStyle] = useState('dash'); // 'dot', 'dash', or 'solid'
  
  // Color settings for active pins during pathfinding
  const [pointAColorLight, setPointAColorLight] = useState({ r: 100, g: 181, b: 246 }); // Light blue default
  const [pointAColorDark, setPointAColorDark] = useState({ r: 25, g: 118, b: 210 }); // Dark blue default
  const [pointBColorLight, setPointBColorLight] = useState({ r: 239, g: 83, b: 80 }); // Light red default
  const [pointBColorDark, setPointBColorDark] = useState({ r: 198, g: 40, b: 40 }); // Dark red default
  
  // Check for existing auth token on app load
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        // Check if user explicitly logged out (don't restore if logout flag is set)
        const wasLoggedOut = await AsyncStorage.getItem('wasLoggedOut');
        if (wasLoggedOut === 'true') {
          // Clear the flag and all stored data, reset all state
          console.log('User was logged out - clearing all data and resetting state');
          await AsyncStorage.removeItem('wasLoggedOut');
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('currentUser');
          await AsyncStorage.removeItem('campus_trails_user'); // Clear user storage data
          
          // Reset all auth state to ensure clean logout
          setIsLoggedIn(false);
          setAuthToken(null);
          setCurrentUser(null);
          setUserProfile({ username: '', email: '', profilePicture: null });
          setSavedPins([]);
          setFeedbackHistory([]);
          
          // Show auth modal to allow login
          setAuthModalVisible(true);
          setUserProfileVisible(false);
          setAuthTab('login');
          
          return;
        }

        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUserStr = await AsyncStorage.getItem('currentUser');
        const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
        
        if (storedToken && storedUser) {
          // Verify token is still valid by fetching current user
          try {
            const user = await getCurrentUser(storedToken);
            
            // Token is valid, restore session
            console.log('Token valid - restoring session for user:', user.username);
            setAuthToken(storedToken);
            setCurrentUser(user);
            setIsLoggedIn(true);
            
            // Update user profile state
            setUserProfile({
              username: user.username,
              email: user.email || '',
              profilePicture: user.profilePicture || null,
            });
            
            // Update saved pins and feedback history
            // Ensure saved pins have image property by fetching full pin data
            if (user.activity) {
              const savedPinsFromDB = user.activity.savedPins || [];
              // If we have pins loaded, enrich saved pins with image data
              if (pins && pins.length > 0) {
                const enrichedSavedPins = savedPinsFromDB.map(savedPin => {
                  const fullPin = pins.find(p => p.id === savedPin.id);
                  return fullPin ? fullPin : savedPin; // Use full pin data if available
                });
                setSavedPins(enrichedSavedPins);
              } else {
                setSavedPins(savedPinsFromDB);
              }
              setFeedbackHistory(user.activity.feedbackHistory || []);
            }
            
            // Update settings
            if (user.settings) {
              setAlertPreferences({
                facilityUpdates: user.settings.alerts?.facilityUpdates !== false,
                securityAlerts: user.settings.alerts?.securityAlerts !== false,
              });
            }
          } catch (error) {
            // Token is invalid, expired, or user deleted from DB - clear all stored auth
            console.error('Token validation failed - user may be deleted from DB:', error);
            
            // Clear all AsyncStorage data
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('currentUser');
            await AsyncStorage.removeItem('wasLoggedOut');
            await AsyncStorage.removeItem('campus_trails_user'); // Clear user storage data
            
            // Reset all auth state
            setIsLoggedIn(false);
            setAuthToken(null);
            setCurrentUser(null);
            setUserProfile({ username: '', email: '', profilePicture: null });
            setSavedPins([]);
            setFeedbackHistory([]);
            
            // Show auth modal to allow login
            setAuthModalVisible(true);
            setUserProfileVisible(false);
            setAuthTab('login');
          }
        } else {
          // No stored token/user - ensure clean state but DON'T show login screen automatically
          // User can access login through the footer button
          console.log('No stored auth data - user can login via footer button');
          setIsLoggedIn(false);
          setAuthToken(null);
          setCurrentUser(null);
          // Don't automatically show login screen on first launch
          // setAuthModalVisible(false);
          // setUserProfileVisible(false);
        }
      } catch (error) {
        console.error('Error restoring auth:', error);
        // On any error, clear everything but don't automatically show login
        // User can login via footer button
        try {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('currentUser');
          await AsyncStorage.removeItem('wasLoggedOut');
          await AsyncStorage.removeItem('campus_trails_user');
        } catch (clearError) {
          console.error('Error clearing AsyncStorage:', clearError);
        }
        setIsLoggedIn(false);
        setAuthToken(null);
        setCurrentUser(null);
        // Don't automatically show login screen on error
        // setAuthModalVisible(false);
        // setUserProfileVisible(false);
      }
    };
    
    restoreAuth();
  }, []);

  // Function to load campuses from MongoDB API
  const loadCampuses = async () => {
    try {
      setCampusesLoading(true);
      setCampusesError(null);
      const fetchedCampuses = await fetchCampuses();
      setCampuses(fetchedCampuses);
    } catch (error) {
      console.error('Failed to fetch campuses from API, using default:', error);
      setCampusesError(error.message);
      // Keep default campuses on error (fallback)
      setCampuses(['USTP-CDO', 'USTP-Alubijid', 'USTP-Claveria', 'USTP-Jasaan', 'USTP-Oroquieta', 'USTP-Panaon', 'USTP-Villanueva']);
    } finally {
      setCampusesLoading(false);
    }
  };

  // Fetch campuses from MongoDB API on component mount
  useEffect(() => {
    loadCampuses();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [settingsTab, fadeAnim]);
  // Filter Modal State
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState({});
  
  // Pathfinding State
  const [pathfindingMode, setPathfindingMode] = useState(false);
  const [showPathfindingPanel, setShowPathfindingPanel] = useState(false);
  const [pointA, setPointA] = useState(null);
  const [pointB, setPointB] = useState(null);
  const [path, setPath] = useState([]);
  // Track if pathfinding panel should be rendered (for animation)
  const [pathfindingPanelRendered, setPathfindingPanelRendered] = useState(false);
  // Track if pins modal should be rendered (for animation)
  const [pinsModalRendered, setPinsModalRendered] = useState(false);
  // Pin Selector Modal State (for pathfinding location selection)
  const [isPinSelectorModalVisible, setPinSelectorModalVisible] = useState(false);
  const [pinSelectorModalRendered, setPinSelectorModalRendered] = useState(false);
  // Track if settings modal should be rendered (for animation)
  const [settingsRendered, setSettingsRendered] = useState(false);
  // Track if filter modal should be rendered (for animation)
  const [filterModalRendered, setFilterModalRendered] = useState(false);
  // Track if search modal should be rendered (for animation)
  const [searchRendered, setSearchRendered] = useState(false);
  // Track if campus modal should be rendered (for animation)
  const [campusRendered, setCampusRendered] = useState(false);
  // Track if pin detail modal should be rendered (for animation)
  const [pinDetailModalRendered, setPinDetailModalRendered] = useState(false);
  // Track if building details modal should be rendered (for animation)
  const [buildingDetailsRendered, setBuildingDetailsRendered] = useState(false);
  const [isBuildingDetailsVisible, setBuildingDetailsVisible] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(0); // Floor level (0 = Ground Floor, 1 = 2nd Floor, etc.)
  const [cameFromPinDetails, setCameFromPinDetails] = useState(false);
  // User Auth Modal State (combines Login and Registration)
  const [isAuthModalVisible, setAuthModalVisible] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register' | 'forgot'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  // Animated driver for pathfinding panel slide-in/out
  const pathfindingSlideAnim = useRef(new Animated.Value(0)).current;
  // Animated driver for pins modal slide-in/out
  const pinsModalSlideAnim = useRef(new Animated.Value(0)).current;
  // Animated driver for pin selector modal slide-in/out
  const pinSelectorModalSlideAnim = useRef(new Animated.Value(0)).current;
  // Animated driver for settings modal slide-in/out
  const settingsSlideAnim = useRef(new Animated.Value(0)).current;
  // Animated driver for filter modal slide
  const filterModalSlideAnim = useRef(new Animated.Value(0)).current;
  // Animated driver for search modal fade
  const searchAnim = useRef(new Animated.Value(0)).current;
  // Animated driver for campus modal fade
  const campusAnim = useRef(new Animated.Value(0)).current;
  // Animated driver for pin detail modal scale/fade
  const pinDetailModalAnim = useRef(new Animated.Value(0)).current;
  // Animated driver for auth modal slide
  const authModalSlideAnim = useRef(new Animated.Value(0)).current;
  const [authModalRendered, setAuthModalRendered] = useState(false);
  
  // User Profile State
  const [isUserProfileVisible, setUserProfileVisible] = useState(false);
  const [userProfileTab, setUserProfileTab] = useState('saved'); // 'saved' | 'feedback' | 'settings'
  const userProfileSlideAnim = useRef(new Animated.Value(0)).current;
  const [userProfileRendered, setUserProfileRendered] = useState(false);
  
  // User Data State
  const [userProfile, setUserProfile] = useState({
    username: '',
    email: '',
    profilePicture: null, // Cloudinary URL
  });
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [daysActive, setDaysActive] = useState(1);
  
  // Alert Preferences State
  const [alertPreferences, setAlertPreferences] = useState({
    facilityUpdates: true,
    securityAlerts: true,
  });
  
  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // Feedback Modal State
  const [isFeedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackModalRendered, setFeedbackModalRendered] = useState(false);
  const feedbackModalFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Fullscreen Image Viewer State
  const [isFullscreenImageVisible, setFullscreenImageVisible] = useState(false);
  const [fullscreenImageSource, setFullscreenImageSource] = useState(null);
  
  // Feedback Modal Animation (fade in/out)
  useEffect(() => {
    if (isFeedbackModalVisible) {
      // Set to initial opacity first (before render to avoid flash)
      feedbackModalFadeAnim.setValue(0);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setFeedbackModalRendered(true);
        // Animate in with fade
        requestAnimationFrame(() => {
          Animated.timing(feedbackModalFadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (feedbackModalRendered) {
      // Animate out first
      Animated.timing(feedbackModalFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setFeedbackModalRendered(false);
      });
    }
  }, [isFeedbackModalVisible, feedbackModalFadeAnim, feedbackModalRendered]);

  useEffect(() => {
    if (showPathfindingPanel) {
      // Set to bottom position first (before render to avoid flash)
      pathfindingSlideAnim.setValue(300);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setPathfindingPanelRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.spring(pathfindingSlideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (pathfindingPanelRendered) {
      // Animate out first
      Animated.timing(pathfindingSlideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setPathfindingPanelRendered(false);
      });
    }
  }, [showPathfindingPanel, pathfindingSlideAnim, pathfindingPanelRendered]);

  useEffect(() => {
    if (isPinsModalVisible) {
      // Set to bottom position first (before render to avoid flash)
      pinsModalSlideAnim.setValue(300);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setPinsModalRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.spring(pinsModalSlideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (pinsModalRendered) {
      // Animate out first
      Animated.timing(pinsModalSlideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setPinsModalRendered(false);
      });
    }
  }, [isPinsModalVisible, pinsModalSlideAnim, pinsModalRendered]);

  // Pin Selector Modal Animation (same as Pins Modal - slide from bottom)
  useEffect(() => {
    if (isPinSelectorModalVisible) {
      // Set to bottom position first (before render to avoid flash)
      pinSelectorModalSlideAnim.setValue(300);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setPinSelectorModalRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.spring(pinSelectorModalSlideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (pinSelectorModalRendered) {
      // Animate out first
      Animated.timing(pinSelectorModalSlideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setPinSelectorModalRendered(false);
      });
    }
  }, [isPinSelectorModalVisible, pinSelectorModalSlideAnim, pinSelectorModalRendered]);

  // Settings Modal Animation
  useEffect(() => {
    if (isSettingsVisible) {
      // Set to bottom position first (before render to avoid flash)
      settingsSlideAnim.setValue(height);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setSettingsRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.spring(settingsSlideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (settingsRendered) {
      // Animate out first
      Animated.timing(settingsSlideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setSettingsRendered(false);
      });
    }
  }, [isSettingsVisible, settingsSlideAnim, settingsRendered, height]);

  // Filter Modal Animation (slide from bottom like Settings modal)
  useEffect(() => {
    if (isFilterModalVisible) {
      // Set to bottom position first (before render to avoid flash)
      filterModalSlideAnim.setValue(height);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setFilterModalRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.spring(filterModalSlideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (filterModalRendered) {
      // Animate out first
      Animated.timing(filterModalSlideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setFilterModalRendered(false);
      });
    }
  }, [isFilterModalVisible, filterModalSlideAnim, filterModalRendered, height]);

  // Search Modal Animation
  useEffect(() => {
    if (isSearchVisible) {
      // Set to initial opacity first (before render to avoid flash)
      searchAnim.setValue(0);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setSearchRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.spring(searchAnim, {
            toValue: 1,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (searchRendered) {
      // Animate out first
      Animated.timing(searchAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setSearchRendered(false);
      });
    }
  }, [isSearchVisible, searchAnim, searchRendered]);

  // Campus Modal Animation
  useEffect(() => {
    if (isCampusVisible) {
      // Set to initial opacity first (before render to avoid flash)
      campusAnim.setValue(0);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setCampusRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.spring(campusAnim, {
            toValue: 1,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (campusRendered) {
      // Animate out first
      Animated.timing(campusAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setCampusRendered(false);
      });
    }
  }, [isCampusVisible, campusAnim, campusRendered]);

  // Building Details Modal Animation (slide in, fade out)
  const buildingDetailsSlideAnim = useRef(new Animated.Value(0)).current;
  const buildingDetailsFadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isBuildingDetailsVisible) {
      // Set default floor to first floor from database when modal opens
      if (selectedPin?.floors && selectedPin.floors.length > 0) {
        const firstFloor = selectedPin.floors[0];
        setSelectedFloor(firstFloor.level);
      } else {
        setSelectedFloor(0); // Default to Ground Floor (level 0)
      }
      // Set to bottom position first (before render to avoid flash)
      buildingDetailsSlideAnim.setValue(300);
      buildingDetailsFadeAnim.setValue(0);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setBuildingDetailsRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.parallel([
            Animated.spring(buildingDetailsSlideAnim, {
              toValue: 0,
              tension: 65,
              friction: 11,
              useNativeDriver: true,
            }),
            Animated.timing(buildingDetailsFadeAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        });
      });
    } else if (buildingDetailsRendered) {
      // Fade out first
      Animated.timing(buildingDetailsFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setBuildingDetailsRendered(false);
      });
    }
  }, [isBuildingDetailsVisible, buildingDetailsSlideAnim, buildingDetailsFadeAnim, buildingDetailsRendered, selectedPin]);

  // Auth Modal Animation (same as Settings Modal - slide from bottom)
  useEffect(() => {
    if (isAuthModalVisible) {
      // Set to bottom position first (before render to avoid flash)
      authModalSlideAnim.setValue(height);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setAuthModalRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.spring(authModalSlideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (authModalRendered) {
      // Animate out first
      Animated.timing(authModalSlideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setAuthModalRendered(false);
      });
    }
  }, [isAuthModalVisible, authModalSlideAnim, authModalRendered, height]);

  // User Profile Modal Animation (same as Settings Modal - slide from bottom)
  useEffect(() => {
    if (isUserProfileVisible) {
      // Set to bottom position first (before render to avoid flash)
      userProfileSlideAnim.setValue(height);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setUserProfileRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.spring(userProfileSlideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (userProfileRendered) {
      // Animate out first
      Animated.timing(userProfileSlideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Hide after animation completes
        setUserProfileRendered(false);
      });
    }
  }, [isUserProfileVisible, userProfileSlideAnim, userProfileRendered, height]);

  // Pin Detail Modal Animation
  useEffect(() => {
    if (isModalVisible) {
      // Set to bottom position first (before render to avoid flash)
      pinDetailModalAnim.setValue(height);
      // Use requestAnimationFrame to ensure smooth render timing
      requestAnimationFrame(() => {
        setPinDetailModalRendered(true);
        // Animate in with spring for smoothness
        requestAnimationFrame(() => {
          Animated.spring(pinDetailModalAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        });
      });
    } else if (pinDetailModalRendered) {
      // Skip animation if transitioning to Building Details Modal
      if (cameFromPinDetails) {
        // Hide immediately without animation
        setPinDetailModalRendered(false);
        setClickedPin(null); // Reset clicked pin when modal closes
      } else {
        // Animate out first
        Animated.timing(pinDetailModalAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          // Hide after animation completes
          setPinDetailModalRendered(false);
          setClickedPin(null); // Reset clicked pin when modal closes
        });
      }
    }
  }, [isModalVisible, pinDetailModalAnim, pinDetailModalRendered, cameFromPinDetails, height]);
  
  // Pathfinding location selector state
  const [activeSelector, setActiveSelector] = useState(null); // 'A' for start, 'B' for destination
  const [clickedPin, setClickedPin] = useState(null); // Track clicked pin for color change
  const [highlightedPinOnMap, setHighlightedPinOnMap] = useState(null); // Track pin to highlight on map
  
  // Color breathing animation for active pins (slow, smooth transition between sky blue and blue)
  const colorBreathAnim = useRef(new Animated.Value(0)).current;
  const [colorBreathValue, setColorBreathValue] = useState(0);
  const colorBreathAnimationRef = useRef(null);
  
  // Separate animations for pointA (blue) and pointB (red)
  const pointAAnim = useRef(new Animated.Value(0)).current;
  const [pointAValue, setPointAValue] = useState(0);
  const pointAAnimationRef = useRef(null);
  
  const pointBAnim = useRef(new Animated.Value(0)).current;
  const [pointBValue, setPointBValue] = useState(0);
  const pointBAnimationRef = useRef(null);
  
  const lastUpdateTime = useRef(0);
  const lastUpdateTimeA = useRef(0);
  const lastUpdateTimeB = useRef(0);
  
  // Wrapper functions for color interpolation with current state
  const interpolateColorWrapper = (value) => interpolateColor(value);
  const interpolateBlueColorWrapper = (value) => interpolateBlueColor(value, pointAColorLight, pointAColorDark);
  const interpolateRedColorWrapper = (value) => interpolateRedColor(value, pointBColorLight, pointBColorDark);
  
  // Animation for general active pins (highlighted, clicked)
  useEffect(() => {
    const hasActivePin = highlightedPinOnMap !== null || clickedPin !== null;
    
    if (hasActivePin) {
      colorBreathAnim.setValue(0);
      
      const listener = colorBreathAnim.addListener(({ value }) => {
        const now = Date.now();
        if (now - lastUpdateTime.current >= THROTTLE_MS) {
          setColorBreathValue(value);
          lastUpdateTime.current = now;
        }
      });
      
      colorBreathAnimationRef.current = Animated.loop(
        Animated.timing(colorBreathAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
        })
      );
      colorBreathAnimationRef.current.start();
      
      return () => {
        colorBreathAnim.removeListener(listener);
        if (colorBreathAnimationRef.current) {
          colorBreathAnimationRef.current.stop();
        }
        lastUpdateTime.current = 0;
      };
    } else {
      if (colorBreathAnimationRef.current) {
        colorBreathAnimationRef.current.stop();
      }
      colorBreathAnim.setValue(0);
      setColorBreathValue(0);
      lastUpdateTime.current = 0;
    }
  }, [highlightedPinOnMap, clickedPin, colorBreathAnim]);
  
  // Animation for pointA (blue shades, very slow pulse)
  useEffect(() => {
    if (pointA && (showPathfindingPanel || pathfindingMode)) {
      pointAAnim.setValue(0);
      
      const listener = pointAAnim.addListener(({ value }) => {
        const now = Date.now();
        if (now - lastUpdateTimeA.current >= THROTTLE_MS) {
          setPointAValue(value);
          lastUpdateTimeA.current = now;
        }
      });
      
      pointAAnimationRef.current = Animated.loop(
        Animated.timing(pointAAnim, {
          toValue: 1,
          duration: 5000, // 5 seconds per cycle (very slow)
          useNativeDriver: false,
        })
      );
      pointAAnimationRef.current.start();
      
      return () => {
        pointAAnim.removeListener(listener);
        if (pointAAnimationRef.current) {
          pointAAnimationRef.current.stop();
        }
      };
    } else {
      if (pointAAnimationRef.current) {
        pointAAnimationRef.current.stop();
      }
      pointAAnim.setValue(0);
      setPointAValue(0);
    }
  }, [pointA, showPathfindingPanel, pathfindingMode, pointAAnim]);
  
  // Animation for pointB (red shades, very slow pulse)
  useEffect(() => {
    if (pointB && (showPathfindingPanel || pathfindingMode)) {
      pointBAnim.setValue(0);
      
      const listener = pointBAnim.addListener(({ value }) => {
        const now = Date.now();
        if (now - lastUpdateTimeB.current >= THROTTLE_MS) {
          setPointBValue(value);
          lastUpdateTimeB.current = now;
        }
      });
      
      pointBAnimationRef.current = Animated.loop(
        Animated.timing(pointBAnim, {
          toValue: 1,
          duration: 5000, // 5 seconds per cycle (very slow)
          useNativeDriver: false,
        })
      );
      pointBAnimationRef.current.start();
      
      return () => {
        pointBAnim.removeListener(listener);
        if (pointBAnimationRef.current) {
          pointBAnimationRef.current.stop();
        }
      };
    } else {
      if (pointBAnimationRef.current) {
        pointBAnimationRef.current.stop();
      }
      pointBAnim.setValue(0);
      setPointBValue(0);
    }
  }, [pointB, showPathfindingPanel, pathfindingMode, pointBAnim]);
  // Handle Android back button
  useBackHandler({
    isBuildingDetailsVisible,
    cameFromPinDetails,
    isModalVisible,
    isFilterModalVisible,
    isSettingsVisible,
    isPinsModalVisible,
    showPathfindingPanel,
    isSearchVisible,
    isCampusVisible,
    isAuthModalVisible,
    isUserProfileVisible,
    isFeedbackModalVisible,
    setBuildingDetailsVisible,
    setModalVisible,
    setCameFromPinDetails,
    setFilterModalVisible,
    setSettingsVisible,
    setPinsModalVisible,
    setPinSelectorModalVisible,
    setShowPathfindingPanel,
    setPathfindingMode,
    setPath,
    setPointA,
    setPointB,
    setActiveSelector,
    setSearchVisible,
    setCampusVisible,
    setAuthModalVisible,
    setUserProfileVisible,
    setFeedbackModalVisible,
  });

  
  // Handle zoom to pin - workaround for react-native-image-pan-zoom limitations
  useEffect(() => {
    if (zoomToPin && zoomToPin.zoom) {
      // Since react-native-image-pan-zoom doesn't support direct programmatic control,
      // we use a workaround: force remount with a new key to reset the component
      // This is not ideal but works as a fallback
      // The pin is already highlighted, making it easy to find
      
      // Try to access internal state through ref
      if (imageZoomRef.current) {
        const ref = imageZoomRef.current;
        // Try to find and call internal methods
        if (ref._component) {
          // Access the internal component if available
          const internal = ref._component;
          if (internal.setNativeProps) {
            // Try to set native props directly
            // This is a workaround that may not work with all versions
          }
        }
      }
      
      // Force remount as fallback (resets zoom/pan but highlights pin)
      setImageZoomKey(prev => prev + 1);
      
      // Clear after a delay
      setTimeout(() => {
        setZoomToPin(null);
      }, 500);
    }
  }, [zoomToPin]);
  
  // ImageZoom ref for programmatic control
  const imageZoomRef = useRef(null);
  // Key for forcing ImageZoom remount when zooming to pin
  const [imageZoomKey, setImageZoomKey] = useState(0);
  
  // Alert Modal State
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Building 9 room data
  const [alertMessage, setAlertMessage] = useState('');

  // Flatten all rooms from Building 9 for search
  const allRooms = React.useMemo(() => getAllRooms(), []);

  const filteredPins = React.useMemo(() => getFilteredPins(pins, searchQuery), [pins, searchQuery]);
  const filteredRooms = React.useMemo(() => getFilteredRooms(allRooms, searchQuery), [allRooms, searchQuery]);

  // Combine pins and rooms for search results
  const searchResults = React.useMemo(() => 
    getSearchResults(filteredPins, filteredRooms, 2), 
    [filteredPins, filteredRooms]
  );

  const handlePinPress = (pin) => {
    handlePinPressUtil(pin, setSelectedPin, setClickedPin, setHighlightedPinOnMap, {
      setSearchVisible,
      setCampusVisible,
      setFilterModalVisible,
      setShowPathfindingPanel,
      setSettingsVisible,
      setPinsModalVisible,
      setModalVisible
    });
  };

  const savePin = async () => {
    if (selectedPin) {
      // Check if user is logged in
      if (!isLoggedIn || !authToken) {
        Alert.alert(
          'Login Required',
          'You must be logged in to save pins. Please login to continue.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Login',
              onPress: () => {
                setModalVisible(false); // Close pin details modal
                setAuthModalVisible(true);
                setAuthTab('login');
              },
            },
          ]
        );
        return;
      }

      try {
        // Check if pin is already saved
        const isSaved = savedPins.some(p => p.id === selectedPin.id);
        let updatedSavedPins;
        
        if (!isSaved) {
          // Ensure selectedPin has all properties including image before saving
          const pinToSave = {
            ...selectedPin,
            image: selectedPin.image || null, // Preserve image property
          };
          
          // Add pin locally
          updatedSavedPins = [...savedPins, pinToSave];
          setSavedPins(updatedSavedPins);
          
          // Save to AsyncStorage (for offline/guest mode)
          await addSavedPin(pinToSave);
          
          // Sync with database if logged in
          if (isLoggedIn && authToken) {
            try {
              await updateUserActivity(authToken, {
                savedPins: updatedSavedPins,
              });
              // Update current user data
              const updatedUser = await getCurrentUser(authToken);
              setCurrentUser(updatedUser);
              // Ensure saved pins have image property from full pins array
              if (updatedUser.activity && updatedUser.activity.savedPins && pins && pins.length > 0) {
                const enrichedSavedPins = updatedUser.activity.savedPins.map(savedPin => {
                  const fullPin = pins.find(p => p.id === savedPin.id);
                  return fullPin ? fullPin : savedPin;
                });
                setSavedPins(enrichedSavedPins);
              }
            } catch (error) {
              console.error('Error syncing saved pin to database:', error);
              // Continue with local save even if database sync fails
            }
          }
          
          Alert.alert('Success', 'Pin saved successfully!');
        } else {
          // Remove pin locally
          updatedSavedPins = savedPins.filter(p => p.id !== selectedPin.id);
          setSavedPins(updatedSavedPins);
          
          // Remove from AsyncStorage
          await removeSavedPin(selectedPin.id);
          
          // Sync with database if logged in
          if (isLoggedIn && authToken) {
            try {
              await updateUserActivity(authToken, {
                savedPins: updatedSavedPins,
              });
              // Update current user data
              const updatedUser = await getCurrentUser(authToken);
              setCurrentUser(updatedUser);
            } catch (error) {
              console.error('Error syncing saved pin removal to database:', error);
              // Continue with local save even if database sync fails
            }
          }
          
          Alert.alert('Success', 'Pin removed from saved pins');
        }
      } catch (error) {
        console.error('Error saving pin:', error);
        Alert.alert('Error', 'Failed to save pin. Please try again.');
      }
    }
  };

  const handleCampusChange = (campus) => {
    handleCampusChangeUtil(setCampusVisible);
  };

  // Handle profile picture upload (Direct Upload to Cloudinary)
  const handleProfilePictureUpload = async (imageUri) => {
    try {
      if (!isLoggedIn || !authToken) {
        Alert.alert('Error', 'Please login to change your profile picture');
        return;
      }

      // Show uploading status (we'll show success/error after)
      // Upload directly to Cloudinary (bypasses Express server)
      const uploadResult = await uploadToCloudinaryDirect(
        imageUri,
        CLOUDINARY_CONFIG.cloudName,
        CLOUDINARY_CONFIG.uploadPreset
      );

      // Use secure_url for MongoDB storage (we'll apply transformations on display)
      const newProfilePicture = uploadResult.secure_url;

      // Update local state immediately
      setUserProfile({
        ...userProfile,
        profilePicture: newProfilePicture,
      });

      // Update database via API (save only the URL, not transformations)
      await updateUserProfile(authToken, {
        profilePicture: newProfilePicture,
      });
      
      // Update current user data to reflect changes
      const updatedUser = await getCurrentUser(authToken);
      setCurrentUser(updatedUser);
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Profile picture upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile picture. Please check your Cloudinary upload preset configuration.');
    }
  };


  const toggleFilterModal = () => {
    setFilterModalVisible(!isFilterModalVisible);
    if (!isFilterModalVisible) {
      // Close other modals when opening filter
      setSearchVisible(false);
      setCampusVisible(false);
      setShowPathfindingPanel(false);
      setSettingsVisible(false);
      setPinsModalVisible(false);
      setModalVisible(false);
    }
  };


  const selectAllCategories = () => {
    const obj = {};
    allCategoryKeys.forEach(k => obj[k] = true);
    setSelectedCategories(obj);
  };

  const clearAllCategories = () => setSelectedCategories({});

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleSearch = () => {
    setSearchVisible(!isSearchVisible);
    if (!isSearchVisible) {
      // Close other modals when opening search
      setCampusVisible(false);
      setFilterModalVisible(false);
      setShowPathfindingPanel(false);
      setSettingsVisible(false);
      setPinsModalVisible(false);
      setModalVisible(false);
    }
  };
  
  const toggleCampus = () => {
    setCampusVisible(!isCampusVisible);
    if (!isCampusVisible) {
      // Close other modals when opening campus
      setSearchVisible(false);
      setFilterModalVisible(false);
      setShowPathfindingPanel(false);
      setSettingsVisible(false);
      setPinsModalVisible(false);
      setModalVisible(false);
    }
  };
  
  const togglePinsModal = () => {
    setPinsModalVisible(!isPinsModalVisible);
    if (!isPinsModalVisible) {
      // Close other modals when opening pins modal
      setSearchVisible(false);
      setCampusVisible(false);
      setFilterModalVisible(false);
      setShowPathfindingPanel(false);
      setSettingsVisible(false);
      setModalVisible(false);
      setAuthModalVisible(false);
      // Clear activeSelector when opening normally (not from pathfinding)
      setActiveSelector(null);
    } else {
      // Clear activeSelector when closing
      setActiveSelector(null);
    }
  };

  const toggleAuthModal = () => {
    // If logged in, show User Profile instead of Auth Modal
    if (isLoggedIn && !isAuthModalVisible) {
      setUserProfileVisible(true);
      return;
    }
    // If not logged in or explicitly opening auth modal, show auth screen
    setAuthModalVisible(!isAuthModalVisible);
    if (!isAuthModalVisible) {
      // Close other modals when opening auth modal
      setSearchVisible(false);
      setCampusVisible(false);
      setFilterModalVisible(false);
      setShowPathfindingPanel(false);
      setSettingsVisible(false);
      setModalVisible(false);
      setPinsModalVisible(false);
      setUserProfileVisible(false);
      setAuthTab('login'); // Reset to login tab when opening
    }
  };

  // Force show auth modal (for logout scenarios)
  const forceShowAuthModal = () => {
    setAuthModalVisible(true);
    setUserProfileVisible(false);
    setAuthTab('login');
  };

  // Validation helper functions
  const validateUsername = (username) => {
    if (!username || username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    return null;
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    // Check for capital letter
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one capital letter';
    }
    // Check for symbol (non-alphanumeric character)
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one symbol';
    }
    return null;
  };


  const resetPathfinding = () => {
    setPathfindingMode(false);
    setShowPathfindingPanel(false);
    setPointA(null);
    setPointB(null);
    setPath([]);
    // Clear highlighted pin when resetting pathfinding
    setHighlightedPinOnMap(null);
  };

  const handleStartPathfinding = () => {
    if (!pointA || !pointB) {
      setAlertMessage('Please select both start and end points');
      setShowAlertModal(true);
      return;
    }

    // Force strict equality check to avoid self-selection issues
    if (pointA.id == pointB.id) {
      setAlertMessage('Start and end points cannot be the same');
      setShowAlertModal(true);
      return;
    }

    setTimeout(() => {
      try {
        // Pass all pins (including invisible waypoints) to pathfinding algorithm
        const foundPath = aStarPathfinding(pointA.id, pointB.id, pins);
        
        if (foundPath.length > 0) {
          // DEBUGGING: Show path length in console (comment out for production)
          console.log(`Path found with ${foundPath.length} steps:`, foundPath.map(p => p.id));
          
          setPath(foundPath);
          setPathfindingMode(true);
          setShowPathfindingPanel(false);
          // No alert on success - path is shown on map
        } else {
          Alert.alert('Pathfinding Error', 'No path found.');
        }
      } catch (error) {
        console.error(error);
        setAlertMessage('Error calculating path');
        setShowAlertModal(true);
      }
    }, 0);
  };

  const swapPoints = () => {
    const temp = pointA;
    setPointA(pointB);
    setPointB(temp);
  };

  const openLocationPicker = (selector) => {
    setActiveSelector(selector);
    // Close other modals when opening location picker
    setSearchVisible(false);
    setCampusVisible(false);
    setFilterModalVisible(false);
    setSettingsVisible(false);
    setModalVisible(false);
    setPinsModalVisible(false);
    // Open Pin Selector Modal for location selection
    setPinSelectorModalVisible(true);
  };

  // Calculate image dimensions
  const imageWidth = width * 1.5; 
  const imageHeight = (imageWidth * 1310) / 1920; 

  // Compute pins visible after applying category filters
  // Always include pathfinding active pins (pointA and pointB) even if filtered out
  // Exclude invisible waypoints from display (they're still in pins array for pathfinding)
  const visiblePinsForRender = pins.filter(pin => {
    // Exclude invisible waypoints from display
    if (pin.isInvisible === true) {
      return false;
    }
    // Always show pathfinding active pins
    if ((pointA && pin.id === pointA.id) || (pointB && pin.id === pointB.id)) {
      return true;
    }
    // Apply category filter for other pins
    return pinMatchesSelected(pin, selectedCategories);
  });

  // Helper function to get category for a pin (for View All Pins modal)
  // Organize pins by category for View All Pins modal
  const categorizedPins = React.useMemo(() => {
    if (!pins || pins.length === 0) return [];
    return getCategorizedPins(pins);
  }, [pins]);

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        {/* Help button (left) to keep center button centered */}
        <TouchableOpacity style={styles.headerButtonLeft} onPress={() => alert('Help coming soon!')}>
          <Icon name="question-circle" size={20} color="white" />
        </TouchableOpacity>

        {/* Change Campus Button (Center) */}
        <TouchableOpacity style={styles.headerButtonCenter} onPress={toggleCampus}>
          <Icon name="exchange" size={20} color="white" />
          <Text style={styles.buttonText}>USTP-CDO</Text>
        </TouchableOpacity>

        {/* Search Button (Right) */}
        <TouchableOpacity style={styles.headerButtonRight} onPress={toggleSearch}>
          <Icon name={isSearchVisible ? "times" : "search"} size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filter Button (moved) - sits between Search and Pathfinding */}
      <TouchableOpacity style={styles.filterButtonBetween} onPress={toggleFilterModal}>
        <Icon name={Object.values(selectedCategories).some(val => val === true) ? "times" : "filter"} size={20} color="white" />
      </TouchableOpacity>

      {/* Pathfinding Toggle Button - Now positioned below Search button with same design */}
      <TouchableOpacity 
        style={styles.pathfindingButtonBelowSearch}
        onPress={() => {
          if (showPathfindingPanel || pathfindingMode) {
            resetPathfinding();
          } else {
            // Close other modals when opening pathfinding panel
            setSearchVisible(false);
            setCampusVisible(false);
            setFilterModalVisible(false);
            setSettingsVisible(false);
            setPinsModalVisible(false);
            setModalVisible(false);
            setShowPathfindingPanel(true);
            setPathfindingMode(false);
            setPath([]);
          }
        }}
      >
        <Icon name={(showPathfindingPanel || pathfindingMode) ? "times" : "location-arrow"} size={20} color="white" />
      </TouchableOpacity>

      {/* Bottom Pathfinding Navigation Card */}
      {pathfindingPanelRendered && (
        <Animated.View 
          style={[
            styles.bottomNavCard, 
            { 
              transform: [{ translateY: pathfindingSlideAnim }],
              opacity: pathfindingSlideAnim.interpolate({
                inputRange: [0, 150, 300],
                outputRange: [1, 0.5, 0],
              }),
            }
          ]}
        >
          {/* Header */}
          <Pressable style={styles.modalHeaderWhite} onPress={resetPathfinding}>
            <Text style={[styles.modalTitleWhite, { marginBottom: 0, flex: 1, textAlign: 'center' }]}>Navigation</Text>
          </Pressable>
          <View style={styles.lineDark}></View>
          
          {/* Content */}
          <View style={{ backgroundColor: '#f5f5f5', padding: 20 }}>
          {/* Origin/Destination Display */}
          <View style={styles.locationRow}>
            <TouchableOpacity 
              style={styles.locationItem}
              onPress={() => openLocationPicker('A')}
            >
                <View style={[
                  styles.locationIconContainer,
                  {
                    backgroundColor: pointA && (showPathfindingPanel || pathfindingMode) 
                      ? interpolateBlueColorWrapper(pointAValue) 
                      : `rgb(${pointAColorDark.r}, ${pointAColorDark.g}, ${pointAColorDark.b})`
                  }
                ]}>
                  <Icon 
                    name="crosshairs" 
                    size={18} 
                    color="#ffffff" 
                  />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Your place (Start)</Text>
                <Text style={styles.locationValue}>
                  {pointA ? pointA.description : 'Tap to select location...'}
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.swapButtonSmall} onPress={swapPoints}>
              <Icon name="exchange" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.locationRow}>
            <TouchableOpacity 
              style={styles.locationItem}
              onPress={() => openLocationPicker('B')}
            >
                <View style={[
                  styles.locationIconContainer,
                  {
                    backgroundColor: pointB && (showPathfindingPanel || pathfindingMode) 
                      ? interpolateRedColorWrapper(pointBValue) 
                      : `rgb(${pointBColorDark.r}, ${pointBColorDark.g}, ${pointBColorDark.b})`
                  }
                ]}>
                  <Icon 
                    name="map-marker" 
                    size={18} 
                    color="#ffffff" 
                  />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Destination</Text>
                <Text style={styles.locationValue} numberOfLines={1}>
                  {pointB ? pointB.description : 'Tap to select destination...'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Go Now Button */}
          <TouchableOpacity 
            style={[styles.goNowButton, (!pointA || !pointB) && styles.goNowButtonDisabled]} 
            onPress={handleStartPathfinding}
            disabled={!pointA || !pointB}
          >
            <Icon name="paper-plane" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.goNowButtonText}>Go Now</Text>
          </TouchableOpacity>
        </View>
        </Animated.View>
      )}

      {/* Map with Zoom */}
      <View style={styles.imageContainer}>
        <ImageZoom
          key={imageZoomKey}
          ref={imageZoomRef}
          cropWidth={width}
          cropHeight={height}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          minScale={1}
          maxScale={3}
          enableCentering={false}
          cropOffset={0}
          onScaleChanged={(scale) => {
            setZoomScale(scale);
            // Clear zoom target when user manually changes zoom
            if (zoomToPin && Math.abs(scale - zoomToPin.zoom) > 0.2) {
              setZoomToPin(null);
            }
          }}
        >
          <View style={{ width: imageWidth, height: imageHeight }}>
            <Image
              source={require('./assets/ustp-cdo-map.png')}
              style={{ width: imageWidth, height: imageHeight }}
              resizeMode="contain"
            />
            {/* Overlay SVG for Pins and Path */}
            <Svg 
              height={imageHeight} 
              width={imageWidth} 
              viewBox="0 0 1920 1310"
              style={StyleSheet.absoluteFill}
            >
              {/* Draw pathfinding path if exists */}
              {path.length > 0 && (
                <Polyline
                  points={path.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#00D4FF" // Sky blue
                  strokeWidth={Math.max(3, 12 / zoomScale)} 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={
                    pathLineStyle === 'dash' 
                      ? `${Math.max(8, 20 / zoomScale)} ${Math.max(12, 30 / zoomScale)}` 
                      : pathLineStyle === 'dot' 
                        ? `0 ${Math.max(16, 32 / zoomScale)}` 
                        : undefined
                  }
                  strokeDashoffset={pathLineStyle === 'dot' ? Math.max(8, 16 / zoomScale) : undefined}
                  opacity="1"
                />
              )}
              
              {visiblePinsForRender.map((pin) => {
                // HIDE INVISIBLE WAYPOINTS
                // We don't render the circle or text, but they are still used for the path line
                if (pin.isInvisible) return null;
                
                // Determine pin color based on state
                let fillColor = "#f0f0f0"; // Default light gray
                let strokeColor = "#4a4a4a"; // Medium gray outline
                let strokeWidth = 2.5;
                let radius = 20 / zoomScale;
                let isActive = false; // Track if pin is active for pulsing animation
                
                // Check if pin is highlighted on map (from "Show on Map" button)
                if (highlightedPinOnMap === pin.id) {
                  radius = 24 / zoomScale;
                  strokeWidth = 3;
                  isActive = true;
                }
                // Check if pin is clicked/selected
                else if (clickedPin === pin.id) {
                  radius = 24 / zoomScale;
                  strokeWidth = 3;
                  isActive = true;
                }
                // Check if pin is in pathfinding mode
                else if (showPathfindingPanel || pathfindingMode) {
                  if (pointA && pin.id === pointA.id) {
                    radius = 24 / zoomScale;
                    strokeWidth = 3;
                    isActive = true;
                    // Use blue shades for pointA
                    fillColor = interpolateBlueColorWrapper(pointAValue);
                    const colorMatch = fillColor.match(/\d+/g);
                    if (colorMatch && colorMatch.length >= 3) {
                      const r = Math.max(0, Math.round(parseInt(colorMatch[0]) - 20));
                      const g = Math.max(0, Math.round(parseInt(colorMatch[1]) - 20));
                      const b = Math.max(0, Math.round(parseInt(colorMatch[2]) - 20));
                      strokeColor = `rgb(${r}, ${g}, ${b})`;
                    } else {
                      strokeColor = `rgb(${Math.max(0, pointAColorDark.r - 20)}, ${Math.max(0, pointAColorDark.g - 20)}, ${Math.max(0, pointAColorDark.b - 20)})`; // Fallback dark blue
                    }
                  } else if (pointB && pin.id === pointB.id) {
                    radius = 24 / zoomScale;
                    strokeWidth = 3;
                    isActive = true;
                    // Use red shades for pointB
                    fillColor = interpolateRedColorWrapper(pointBValue);
                    const colorMatch = fillColor.match(/\d+/g);
                    if (colorMatch && colorMatch.length >= 3) {
                      const r = Math.max(0, Math.round(parseInt(colorMatch[0]) - 20));
                      const g = Math.max(0, Math.round(parseInt(colorMatch[1]) - 20));
                      const b = Math.max(0, Math.round(parseInt(colorMatch[2]) - 20));
                      strokeColor = `rgb(${r}, ${g}, ${b})`;
                    } else {
                      strokeColor = `rgb(${Math.max(0, pointBColorDark.r - 20)}, ${Math.max(0, pointBColorDark.g - 20)}, ${Math.max(0, pointBColorDark.b - 20)})`; // Fallback dark red
                    }
                  } else if (path.some(p => p.id === pin.id)) {
                    fillColor = "#FFD700"; // Golden yellow for path waypoints
                    strokeColor = "#FFA500";
                    strokeWidth = 2.5;
                  }
                }
                
                // Apply breathing color animation for active pins (sky blue to blue) - only for non-pathfinding active pins
                // Note: pointA and pointB colors are already set above in pathfinding mode
                if (isActive && !(showPathfindingPanel || pathfindingMode)) {
                  fillColor = interpolateColorWrapper(colorBreathValue);
                  // Stroke color slightly darker than fill for better contrast
                  const colorMatch = fillColor.match(/\d+/g);
                  if (colorMatch && colorMatch.length >= 3) {
                    const r = Math.max(0, Math.round(parseInt(colorMatch[0]) - 20));
                    const g = Math.max(0, Math.round(parseInt(colorMatch[1]) - 20));
                    const b = Math.max(0, Math.round(parseInt(colorMatch[2]) - 20));
                    strokeColor = `rgb(${r}, ${g}, ${b})`;
                  } else {
                    strokeColor = "#0099CC"; // Fallback
                  }
                }
                
                // Calculate subtle pulsing radius for active pins (breathing effect)
                let pulseValue = 0;
                if (isActive) {
                  if (pointA && pin.id === pointA.id) {
                    pulseValue = pointAValue;
                  } else if (pointB && pin.id === pointB.id) {
                    pulseValue = pointBValue;
                  } else {
                    pulseValue = colorBreathValue;
                  }
                }
                const pulseRadius = isActive ? radius + (Math.abs(Math.sin(pulseValue * Math.PI * 2)) * 8 / zoomScale) : 0;
                const pulseOpacity = isActive ? Math.abs(Math.sin(pulseValue * Math.PI * 2)) * 0.3 : 0;
                
                // Calculate touch area radius (larger for better touch detection on Samsung)
                const touchRadius = Math.max(radius + 8, 28 / zoomScale);
                
                return (
                  <G 
                    key={pin.id} 
                    onPress={() => handlePinPress(pin)}
                    onPressIn={() => handlePinPress(pin)}
                  >
                    {/* Invisible larger circle for better touch detection (especially on Samsung) */}
                    <Circle
                      cx={pin.x}
                      cy={pin.y}
                      r={touchRadius}
                      fill="transparent"
                      stroke="transparent"
                      strokeWidth={0}
                      onPress={() => handlePinPress(pin)}
                      onPressIn={() => handlePinPress(pin)}
                    />
                    {/* Pulsing circle behind active pins */}
                    {isActive && pulseRadius > 0 && (
                      <Circle
                        cx={pin.x}
                        cy={pin.y}
                        r={pulseRadius}
                        fill={fillColor}
                        opacity={pulseOpacity}
                      />
                    )}
                    {/* Pin Circle */}
                    <Circle
                      cx={pin.x}
                      cy={pin.y}
                      r={radius}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth / zoomScale}
                    />
                    {/* Building Number Text */}
                    <SvgText
                      x={pin.x}
                      y={pin.y + (4 / zoomScale)}
                      fill={fillColor === "#f0f0f0" || fillColor === "#ffffff" ? "#000000" : "#ffffff"}
                      fontSize={Math.max(13, 15 / zoomScale)}
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {pin.title}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
            
            {/* TouchableOpacity overlays for better touch detection on Samsung devices */}
            {visiblePinsForRender.map((pin) => {
              // Skip invisible waypoints
              if (pin.isInvisible) return null;
              
              // Calculate touch area size (larger for better detection)
              const touchSize = Math.max(40, 56 / zoomScale);
              const pinRadius = Math.max(20, 24 / zoomScale);
              
              return (
                <TouchableOpacity
                  key={`touch-${pin.id}`}
                  style={{
                    position: 'absolute',
                    left: pin.x - touchSize / 2,
                    top: pin.y - touchSize / 2,
                    width: touchSize,
                    height: touchSize,
                    borderRadius: touchSize / 2,
                    backgroundColor: 'transparent',
                    // Ensure touch events work on Samsung
                    zIndex: 10,
                  }}
                  activeOpacity={0.7}
                  onPress={() => handlePinPress(pin)}
                  // Prevent conflicts with ImageZoom pan gestures
                  delayPressIn={0}
                  delayPressOut={0}
                />
              );
            })}
          </View>
        </ImageZoom>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerButton} 
          onPress={() => {
            // Close other modals when opening settings
            setSearchVisible(false);
            setCampusVisible(false);
            setFilterModalVisible(false);
            setShowPathfindingPanel(false);
            setPinsModalVisible(false);
            setModalVisible(false);
            setSettingsVisible(true);
          }}>
          <Icon name="cog" size={20} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.middleFooterButton} onPress={togglePinsModal}>
          <Icon name="list" size={20} color="white" />
          <Text style={styles.buttonText}>View All Pins</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton} 
          onPress={() => {
            if (isLoggedIn) {
              // If logged in, show User Profile modal
              setUserProfileVisible(true);
            } else {
              // If not logged in, show Auth Modal
              toggleAuthModal();
            }
          }}
        >
          <Icon name="user" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* --- MODALS --- */}

      {/* Settings Modal */}
      <Modal
        visible={settingsRendered}
        transparent={true}
        animationType="none"
        onRequestClose={() => setSettingsVisible(false)}
      >
        {settingsRendered && (
          <Animated.View 
            style={[
              StyleSheet.absoluteFill,
              styles.settingsScreen,
              {
                transform: [{ translateY: settingsSlideAnim }],
              }
            ]}
          >
          <View style={styles.modalHeaderWhite}>
            <Text style={[styles.modalTitleWhite, { marginBottom: 0, flex: 1, textAlign: 'center' }]}>Settings</Text>
          </View>
          <View style={styles.lineDark}></View>

          <View style={[styles.settingsTabRow, { backgroundColor: 'white', paddingHorizontal: 20, paddingBottom: 10 }]}>
            <TouchableOpacity onPress={() => setSettingsTab('general')} style={[styles.settingsTabButton, settingsTab === 'general' && styles.settingsTabActive, { flex: 1 }]}>
              <Text style={settingsTab === 'general' ? styles.settingsTabActiveText : { color: '#333' }}>General</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSettingsTab('about'); fadeAnim.setValue(0); }} style={[styles.settingsTabButton, settingsTab === 'about' && styles.settingsTabActive, { flex: 1 }]}>
              <Text style={settingsTab === 'about' ? styles.settingsTabActiveText : { color: '#333' }}>About Us</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.lineDark}></View>

          <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            {settingsTab === 'general' && (
              <Animated.ScrollView style={[styles.aboutContent, { opacity: fadeAnim }]}>
                {/* Pathfinding Category */}
                <View style={styles.settingsCategoryContainer}>
                  <Text style={styles.settingsCategoryTitle}>Pathfinding</Text>
                  
                  {/* Path Line Style Selection */}
                  <View style={styles.settingItem}>
                    <View style={styles.settingItemContent}>
                      <Text style={styles.settingLabel}>Path Line Style</Text>
                      <Text style={styles.settingDescription}>Choose between dot, dash, or solid line</Text>
        </View>
                  </View>
                  <View style={[styles.pathLineStyleContainer, { marginTop: 15 }]}>
                  <TouchableOpacity
                    style={[styles.pathLineStyleButton, pathLineStyle === 'dot' && styles.pathLineStyleButtonActive]}
                    onPress={() => setPathLineStyle('dot')}
                  >
                    <Text style={[styles.pathLineStyleButtonText, pathLineStyle === 'dot' && styles.pathLineStyleButtonTextActive]}>Dot</Text>
              </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pathLineStyleButton, pathLineStyle === 'dash' && styles.pathLineStyleButtonActive]}
                    onPress={() => setPathLineStyle('dash')}
                  >
                    <Text style={[styles.pathLineStyleButtonText, pathLineStyle === 'dash' && styles.pathLineStyleButtonTextActive]}>Dash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pathLineStyleButton, pathLineStyle === 'solid' && styles.pathLineStyleButtonActive]}
                    onPress={() => setPathLineStyle('solid')}
                  >
                    <Text style={[styles.pathLineStyleButtonText, pathLineStyle === 'solid' && styles.pathLineStyleButtonTextActive]}>Solid</Text>
              </TouchableOpacity>
            </View>

                  {/* Point A Color Picker */}
                  <View style={styles.settingItem}>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingLabel}>Start Point Color (Point A)</Text>
                    <Text style={styles.settingDescription}>Select light and dark shades for the start point</Text>
                  </View>
                </View>
                <View style={[styles.colorPickerContainer, { marginTop: 15 }]}>
                  <View style={styles.colorPickerRow}>
                    <Text style={styles.colorPickerLabel}>Light:</Text>
                    <View style={styles.colorSwatchesContainer}>
                      {[
                        { r: 100, g: 181, b: 246, name: 'Blue' },
                        { r: 129, g: 212, b: 250, name: 'Light Blue' },
                        { r: 144, g: 202, b: 249, name: 'Sky Blue' },
                        { r: 77, g: 182, b: 172, name: 'Teal' },
                        { r: 129, g: 199, b: 132, name: 'Green' },
                        { r: 255, g: 183, b: 77, name: 'Orange' },
                      ].map((color, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.colorSwatch,
                            {
                              backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                              borderWidth: pointAColorLight.r === color.r && pointAColorLight.g === color.g && pointAColorLight.b === color.b ? 3 : 1,
                              borderColor: pointAColorLight.r === color.r && pointAColorLight.g === color.g && pointAColorLight.b === color.b ? '#28a745' : '#ccc',
                            }
                          ]}
                          onPress={() => setPointAColorLight(color)}
                        />
                      ))}
                    </View>
                  </View>
                  <View style={styles.colorPickerRow}>
                    <Text style={styles.colorPickerLabel}>Dark:</Text>
                    <View style={styles.colorSwatchesContainer}>
                      {[
                        { r: 25, g: 118, b: 210, name: 'Blue' },
                        { r: 3, g: 169, b: 244, name: 'Light Blue' },
                        { r: 2, g: 136, b: 209, name: 'Sky Blue' },
                        { r: 0, g: 150, b: 136, name: 'Teal' },
                        { r: 56, g: 142, b: 60, name: 'Green' },
                        { r: 230, g: 126, b: 34, name: 'Orange' },
                      ].map((color, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.colorSwatch,
                            {
                              backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                              borderWidth: pointAColorDark.r === color.r && pointAColorDark.g === color.g && pointAColorDark.b === color.b ? 3 : 1,
                              borderColor: pointAColorDark.r === color.r && pointAColorDark.g === color.g && pointAColorDark.b === color.b ? '#28a745' : '#ccc',
                            }
                          ]}
                          onPress={() => setPointAColorDark(color)}
                        />
                      ))}
                    </View>
                  </View>
                </View>

                  {/* Point B Color Picker */}
                  <View style={styles.settingItem}>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingLabel}>Destination Color (Point B)</Text>
                    <Text style={styles.settingDescription}>Select light and dark shades for the destination</Text>
                  </View>
                </View>
                <View style={[styles.colorPickerContainer, { marginTop: 15 }]}>
                  <View style={styles.colorPickerRow}>
                    <Text style={styles.colorPickerLabel}>Light:</Text>
                    <View style={styles.colorSwatchesContainer}>
                      {[
                        { r: 239, g: 83, b: 80, name: 'Red' },
                        { r: 255, g: 112, b: 67, name: 'Deep Orange' },
                        { r: 255, g: 152, b: 0, name: 'Amber' },
                        { r: 156, g: 39, b: 176, name: 'Purple' },
                        { r: 233, g: 30, b: 99, name: 'Pink' },
                        { r: 63, g: 81, b: 181, name: 'Indigo' },
                      ].map((color, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.colorSwatch,
                            {
                              backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                              borderWidth: pointBColorLight.r === color.r && pointBColorLight.g === color.g && pointBColorLight.b === color.b ? 3 : 1,
                              borderColor: pointBColorLight.r === color.r && pointBColorLight.g === color.g && pointBColorLight.b === color.b ? '#28a745' : '#ccc',
                            }
                          ]}
                          onPress={() => setPointBColorLight(color)}
                        />
                      ))}
                    </View>
                  </View>
                  <View style={styles.colorPickerRow}>
                    <Text style={styles.colorPickerLabel}>Dark:</Text>
                    <View style={styles.colorSwatchesContainer}>
                      {[
                        { r: 198, g: 40, b: 40, name: 'Red' },
                        { r: 216, g: 67, b: 21, name: 'Deep Orange' },
                        { r: 245, g: 124, b: 0, name: 'Amber' },
                        { r: 123, g: 31, b: 162, name: 'Purple' },
                        { r: 194, g: 24, b: 91, name: 'Pink' },
                        { r: 40, g: 53, b: 147, name: 'Indigo' },
                      ].map((color, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.colorSwatch,
                            {
                              backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                              borderWidth: pointBColorDark.r === color.r && pointBColorDark.g === color.g && pointBColorDark.b === color.b ? 3 : 1,
                              borderColor: pointBColorDark.r === color.r && pointBColorDark.g === color.g && pointBColorDark.b === color.b ? '#28a745' : '#ccc',
                            }
                          ]}
                          onPress={() => setPointBColorDark(color)}
                        />
                      ))}
                    </View>
                  </View>
                </View>
                </View>
                
                {/* Data & Database Category */}
                <View style={[styles.settingsCategoryContainer, { marginTop: 30, marginBottom: 20 }]}>
                  <Text style={styles.settingsCategoryTitle}>Data & Database</Text>
                  
                  <View style={styles.settingItem}>
                    <View style={styles.settingItemContent}>
                      <Text style={styles.settingLabel}>Refresh Data</Text>
                      <Text style={styles.settingDescription}>Reload all data from database (pins and user data)</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#28a745',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      marginTop: 10,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                    }}
                    onPress={async () => {
                      try {
                        // Refresh pins from database
                        if (refetchPins) {
                          await refetchPins();
                        }
                        
                        // Refresh campuses from database
                        await loadCampuses();
                        
                        // Refresh user data from database if logged in
                        if (isLoggedIn && authToken) {
                          try {
                            const updatedUser = await getCurrentUser(authToken);
                            if (updatedUser) {
                              setCurrentUser(updatedUser);
                              setUserProfile({
                                username: updatedUser.username,
                                email: updatedUser.email || '',
                                profilePicture: updatedUser.profilePicture || null,
                              });
                              
                              // Update saved pins and feedback history
                              if (updatedUser.activity) {
                                if (updatedUser.activity.savedPins) {
                                  setSavedPins(updatedUser.activity.savedPins);
                                }
                                if (updatedUser.activity.feedbackHistory) {
                                  setFeedbackHistory(updatedUser.activity.feedbackHistory);
                                }
                              }
                            }
                          } catch (userError) {
                            console.error('Error refreshing user data:', userError);
                          }
                        }
                        
                        Alert.alert('Success', 'Data refreshed successfully from database');
                      } catch (error) {
                        console.error('Error refreshing data:', error);
                        Alert.alert('Error', 'Failed to refresh data. Please try again.');
                      }
                    }}
                  >
                    <Icon name="refresh" size={16} color="white" style={{ marginRight: 8 }} />
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>Refresh Data</Text>
                  </TouchableOpacity>
                </View>

                {/* Storage Category */}
                <View style={[styles.settingsCategoryContainer, { marginTop: 30, marginBottom: 20 }]}>
                  <Text style={styles.settingsCategoryTitle}>Storage</Text>
                  
                  <View style={styles.settingItem}>
                    <View style={styles.settingItemContent}>
                      <Text style={styles.settingLabel}>Clear Cache</Text>
                      <Text style={styles.settingDescription}>Clear all cached images to free up storage space</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#dc3545',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      marginTop: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                    }}
                    onPress={async () => {
                      Alert.alert(
                        'Clear Cache',
                        'Are you sure you want to clear all cached images? This will free up storage but images will need to be reloaded.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Clear',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                const success = await clearImageCache();
                                if (success) {
                                  Alert.alert('Success', 'Image cache cleared successfully');
                                } else {
                                  Alert.alert('Error', 'Failed to clear cache. This feature requires expo-image v1.12.8+');
                                }
                              } catch (error) {
                                console.error('Error clearing cache:', error);
                                Alert.alert('Error', 'Failed to clear cache');
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Icon name="trash" size={16} color="white" style={{ marginRight: 8 }} />
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>Clear Cache</Text>
                  </TouchableOpacity>
                </View>
              </Animated.ScrollView>
            )}

            {settingsTab === 'about' && (
              <Animated.ScrollView style={[styles.aboutContent, { opacity: fadeAnim }]}>
                <View style={styles.aboutSection}>
                  <Text style={[styles.aboutTitle, { color: '#333' }]}>Campus Trails</Text>
                  <View style={styles.aboutLine}></View>
                  <Text style={[styles.aboutLabel, { color: '#555' }]}>Members:</Text>
                  <View style={styles.membersList}>
                    <Text style={[styles.memberItem, { color: '#666' }]}>Kenth Jonard Barbarona</Text>
                    <Text style={[styles.memberItem, { color: '#666' }]}>Cyle Audrey Villarte</Text>
                    <Text style={[styles.memberItem, { color: '#666' }]}>Rafael Estorosas</Text>
                    <Text style={[styles.memberItem, { color: '#666' }]}>Christian Ferdinand Reantillo</Text>
                    <Text style={[styles.memberItem, { color: '#666' }]}>Gwynnever Tutor</Text>
                  </View>
                  <Text style={[styles.classYear, { color: '#28a745' }]}>USTP-BSIT</Text>
                </View>
              </Animated.ScrollView>
            )}
          </View>
          </Animated.View>
        )}
      </Modal>

      {/* User Profile Modal - Bottom Slide-in Panel */}
      <Modal
        visible={userProfileRendered}
        transparent={true}
        animationType="none"
        onRequestClose={() => setUserProfileVisible(false)}
      >
        {userProfileRendered && (
          <>
            <Animated.View 
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: '#f5f5f5',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  overflow: 'hidden',
                  transform: [{ translateY: userProfileSlideAnim }],
                  opacity: userProfileSlideAnim.interpolate({
                    inputRange: [0, 150, 300],
                    outputRange: [1, 0.5, 0],
                  }),
                }
              ]}
            >
              <View style={styles.modalHeaderWhite}>
                <Text style={[styles.modalTitleWhite, { marginBottom: 0, flex: 1, textAlign: 'center' }]}>User Profile</Text>
              </View>
              <View style={styles.lineDark}></View>

              {/* Activity Counter Cards */}
              <View style={{ backgroundColor: '#f5f5f5', padding: 20, paddingBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                  <View style={[styles.activityCard, { flex: 1, marginRight: 8 }]}>
                    <Icon name="bookmark" size={24} color="#28a745" />
                    <Text style={styles.activityCardNumber}>{savedPins.length}</Text>
                    <Text style={styles.activityCardLabel}>Bookmarks</Text>
                  </View>
                  <View style={[styles.activityCard, { flex: 1, marginHorizontal: 8 }]}>
                    <Icon name="star" size={24} color="#ffc107" />
                    <Text style={styles.activityCardNumber}>{feedbackHistory.length}</Text>
                    <Text style={styles.activityCardLabel}>Reviews</Text>
                  </View>
                  <View style={[styles.activityCard, { flex: 1, marginLeft: 8 }]}>
                    <Icon name="calendar" size={24} color="#17a2b8" />
                    <Text style={styles.activityCardNumber}>{daysActive}</Text>
                    <Text style={styles.activityCardLabel}>Days Active</Text>
                  </View>
                </View>
              </View>

              {/* Tab Row */}
              <View style={[styles.settingsTabRow, { backgroundColor: '#f5f5f5', paddingHorizontal: 20, paddingBottom: 10 }]}>
                <TouchableOpacity 
                  onPress={() => setUserProfileTab('saved')} 
                  style={[styles.settingsTabButton, userProfileTab === 'saved' && styles.settingsTabActive, { flex: 1 }]}
                >
                  <Text style={userProfileTab === 'saved' ? styles.settingsTabActiveText : { color: '#333' }}>Saved Pins</Text>
              </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setUserProfileTab('feedback')} 
                  style={[styles.settingsTabButton, userProfileTab === 'feedback' && styles.settingsTabActive, { flex: 1 }]}
                >
                  <Text style={userProfileTab === 'feedback' ? styles.settingsTabActiveText : { color: '#333' }}>Feedback</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setUserProfileTab('settings')} 
                  style={[styles.settingsTabButton, userProfileTab === 'settings' && styles.settingsTabActive, { flex: 1 }]}
                >
                  <Text style={userProfileTab === 'settings' ? styles.settingsTabActiveText : { color: '#333' }}>Account</Text>
              </TouchableOpacity>
            </View>

              <View style={styles.lineDark}></View>

              {/* Tab Content */}
              <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                {userProfileTab === 'saved' && (
                  <ScrollView contentContainerStyle={{ padding: 20 }}>
                    {savedPins.length === 0 ? (
                      <View style={{ alignItems: 'center', padding: 40 }}>
                        <Icon name="bookmark-o" size={48} color="#ccc" />
                        <Text style={{ marginTop: 16, color: '#666', fontSize: 16 }}>No saved pins yet</Text>
                        <Text style={{ marginTop: 8, color: '#999', fontSize: 14, textAlign: 'center' }}>Save pins from the map to view them here</Text>
                      </View>
                    ) : (
                      savedPins.map((pin) => (
                        <TouchableOpacity
                          key={pin.id.toString()}
                          style={styles.facilityButton}
                          onPress={() => {
                            handlePinPress(pin);
                            setUserProfileVisible(false);
                          }}
                        >
                          {(() => {
                            // Handle different image formats
                            if (!pin.image) {
                              return (
                                <View style={[styles.facilityButtonImage, { backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }]}>
                                  <Icon name="image" size={30} color="#999" />
                                </View>
                              );
                            }
                            
                            const imageSource = getOptimizedImage(pin.image);
                            
                            // If it's a local require (number type), use Image
                            if (typeof imageSource === 'number') {
                              return <Image source={imageSource} style={styles.facilityButtonImage} resizeMode="cover" />;
                            }
                            
                            // If it's an object without uri (local asset), use Image
                            if (imageSource && typeof imageSource === 'object' && !imageSource.uri) {
                              return <Image source={imageSource} style={styles.facilityButtonImage} resizeMode="cover" />;
                            }
                            
                            // If it's a string or object with uri (remote URL), use ExpoImage
                            if (typeof imageSource === 'string' || (imageSource && imageSource.uri)) {
                              return <ExpoImage source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource} style={styles.facilityButtonImage} contentFit="cover" cachePolicy="disk" />;
                            }
                            
                            // Fallback to placeholder
                            return (
                              <View style={[styles.facilityButtonImage, { backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }]}>
                                <Icon name="image" size={30} color="#999" />
                              </View>
                            );
                          })()}
                          <View style={[styles.facilityButtonContent, { flex: 1 }]}>
                            <Text style={styles.facilityName}>{pin.description}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              removeSavedPin(pin.id);
                              setSavedPins(savedPins.filter(p => p.id !== pin.id));
                              if (isLoggedIn && authToken) {
                                const updatedSavedPins = savedPins.filter(p => p.id !== pin.id);
                                updateUserActivity(authToken, { savedPins: updatedSavedPins }).catch(err => console.error('Error updating saved pins:', err));
                              }
                            }}
                            style={{
                              padding: 10,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                            }}
                          >
                            <Icon name="heart" size={20} color="#dc3545" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                )}

                {userProfileTab === 'feedback' && (
                  <ScrollView contentContainerStyle={{ padding: 20 }}>
                    {feedbackHistory.length === 0 ? (
                      <View style={{ alignItems: 'center', padding: 40 }}>
                        <Icon name="star-o" size={48} color="#ccc" />
                        <Text style={{ marginTop: 16, color: '#666', fontSize: 16 }}>No feedback yet</Text>
                        <Text style={{ marginTop: 8, color: '#999', fontSize: 14, textAlign: 'center' }}>Give feedback on buildings to see your review history here</Text>
                      </View>
                    ) : (
                      feedbackHistory.map((feedback) => (
                        <View key={feedback.id} style={[styles.facilityButton, { backgroundColor: 'white', marginBottom: 12, padding: 15 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[styles.facilityName, { flex: 1 }]}>{feedback.pinTitle}</Text>
                            <View style={{ flexDirection: 'row' }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Icon
                                  key={star}
                                  name={star <= feedback.rating ? 'star' : 'star-o'}
                                  size={16}
                                  color={star <= feedback.rating ? '#ffc107' : '#ccc'}
                                />
                              ))}
                            </View>
                          </View>
                          {feedback.comment && (
                            <Text style={{ color: '#666', fontSize: 14, marginTop: 8 }}>{feedback.comment}</Text>
                          )}
                          <Text style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                            {new Date(feedback.date).toLocaleDateString()}
                          </Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                )}

                {userProfileTab === 'settings' && (
                  <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                  >
                    <ScrollView
                      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {/* Profile Picture Section */}
                      <View style={{ alignItems: 'center', marginBottom: 30 }}>
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              // Request permissions first
                              const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                              if (mediaLibraryStatus !== 'granted') {
                                Alert.alert('Permission Required', 'We need access to your media library to select a profile picture.');
                                return;
                              }

                              const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
                              
                              // Show options
                              Alert.alert(
                                'Change Profile Picture',
                                'Select a source',
                                [
                                  {
                                    text: 'Camera',
                                    onPress: async () => {
                                      try {
                                        if (cameraStatus !== 'granted') {
                                          Alert.alert('Permission Required', 'We need access to your camera to take a photo.');
                                          return;
                                        }
                                        
                                        const result = await ImagePicker.launchCameraAsync({
                                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                          allowsEditing: true,
                                          aspect: [1, 1],
                                          quality: 0.8,
                                        });

                                        if (!result.canceled && result.assets && result.assets[0]) {
                                          await handleProfilePictureUpload(result.assets[0].uri);
                                        }
                                      } catch (error) {
                                        console.error('Camera error:', error);
                                        Alert.alert('Error', 'Failed to take photo. Please try again.');
                                      }
                                    }
                                  },
                                  {
                                    text: 'Gallery',
                                    onPress: async () => {
                                      try {
                                        const result = await ImagePicker.launchImageLibraryAsync({
                                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                          allowsEditing: true,
                                          aspect: [1, 1],
                                          quality: 0.8,
                                        });

                                        if (!result.canceled && result.assets && result.assets[0]) {
                                          await handleProfilePictureUpload(result.assets[0].uri);
                                        }
                                      } catch (error) {
                                        console.error('Gallery error:', error);
                                        Alert.alert('Error', 'Failed to select image. Please try again.');
                                      }
                                    }
                                  },
                                  { text: 'Cancel', style: 'cancel' }
                                ]
                              );
                            } catch (error) {
                              console.error('Image picker error:', error);
                              Alert.alert('Error', 'Failed to open image picker. Please try again.');
                            }
                          }}
                        >
                          <View style={{
                            width: 120,
                            height: 120,
                            borderRadius: 60,
                            backgroundColor: '#ddd',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 3,
                            borderColor: '#28a745',
                            overflow: 'hidden',
                          }}>
                            {userProfile.profilePicture ? (
                              <Image
                                source={{ uri: getProfilePictureUrl(userProfile.profilePicture, { circular: true, width: 200, height: 200 }) }}
                                style={{ width: 120, height: 120 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <Icon name="user" size={60} color="#999" />
                            )}
                          </View>
                          <View style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: '#28a745',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 3,
                            borderColor: 'white',
                          }}>
                            <Icon name="camera" size={16} color="white" />
                          </View>
                        </TouchableOpacity>
                        <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>
                          {userProfile.username || 'Tap to add profile picture'}
                        </Text>
                      </View>

                      {/* Password Change Section */}
                      <View style={styles.settingsCategoryContainer}>
                        <Text style={styles.settingsCategoryTitle}>Change Password</Text>
                        
                        <View style={[styles.settingItem, { width: '100%' }]}>
                          <View style={[styles.authPasswordContainer, { width: '100%' }]}>
                            <TextInput
                              style={[styles.authInput, { flex: 1, paddingRight: 40, width: '100%' }]}
                              placeholder="Enter old password"
                              secureTextEntry={!showOldPassword}
                              value={oldPassword}
                              onChangeText={setOldPassword}
                              placeholderTextColor="#999"
                            />
                            <TouchableOpacity 
                              onPress={() => setShowOldPassword(!showOldPassword)} 
                              style={[styles.authPasswordToggle, { position: 'absolute', right: 8 }]}
                            >
                              <Icon name={showOldPassword ? 'eye' : 'eye-slash'} size={16} color="#666" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={[styles.settingItem, { marginTop: 20 }]}>
                          <View style={styles.authPasswordContainer}>
                            <TextInput
                              style={[
                                styles.authInput, 
                                { flex: 1, paddingRight: 40, width: '100%' },
                                newPasswordError && { borderColor: '#dc3545', borderWidth: 1 }
                              ]}
                              placeholder="Enter new password"
                              secureTextEntry={!showNewPassword}
                              value={newPassword}
                              onChangeText={(text) => {
                                setNewPassword(text);
                                if (text.length > 0) {
                                  const error = validatePassword(text);
                                  setNewPasswordError(error || '');
                                } else {
                                  setNewPasswordError('');
                                }
                                // Clear confirm password error if passwords now match
                                if (confirmPassword && text === confirmPassword) {
                                  setConfirmPasswordError('');
                                }
                              }}
                              onBlur={() => {
                                if (newPassword.length > 0) {
                                  const error = validatePassword(newPassword);
                                  setNewPasswordError(error || '');
                                }
                              }}
                              placeholderTextColor="#999"
                            />
                            <TouchableOpacity 
                              onPress={() => setShowNewPassword(!showNewPassword)} 
                              style={[styles.authPasswordToggle, { position: 'absolute', right: 8 }]}
                            >
                              <Icon name={showNewPassword ? 'eye' : 'eye-slash'} size={16} color="#666" />
                            </TouchableOpacity>
                          </View>
                          {newPasswordError && newPassword.length > 0 && (
                            <View style={{ marginTop: 4 }}>
                              <Text style={{ color: '#dc3545', fontSize: 12 }}>{newPasswordError}</Text>
                            </View>
                          )}
                        </View>

                        <View style={[styles.settingItem, { marginTop: 20 }]}>
                          <View style={styles.authPasswordContainer}>
                            <TextInput
                              style={[
                                styles.authInput, 
                                { flex: 1, paddingRight: 40, width: '100%' },
                                confirmPasswordError && { borderColor: '#dc3545', borderWidth: 1 }
                              ]}
                              placeholder="Confirm new password"
                              secureTextEntry={!showConfirmPassword}
                              value={confirmPassword}
                              onChangeText={(text) => {
                                setConfirmPassword(text);
                                if (text.length > 0 && newPassword.length > 0) {
                                  if (text !== newPassword) {
                                    setConfirmPasswordError('Passwords do not match');
                                  } else {
                                    setConfirmPasswordError('');
                                  }
                                } else {
                                  setConfirmPasswordError('');
                                }
                              }}
                              onBlur={() => {
                                if (confirmPassword.length > 0 && newPassword.length > 0) {
                                  if (confirmPassword !== newPassword) {
                                    setConfirmPasswordError('Passwords do not match');
                                  } else {
                                    setConfirmPasswordError('');
                                  }
                                }
                              }}
                              placeholderTextColor="#999"
                            />
                            <TouchableOpacity 
                              onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
                              style={[styles.authPasswordToggle, { position: 'absolute', right: 8 }]}
                            >
                              <Icon name={showConfirmPassword ? 'eye' : 'eye-slash'} size={16} color="#666" />
                            </TouchableOpacity>
                          </View>
                          {confirmPassword.length > 0 && (
                            <View style={{ marginTop: 4 }}>
                              {confirmPasswordError ? (
                                <Text style={{ color: '#dc3545', fontSize: 12 }}>{confirmPasswordError}</Text>
                              ) : confirmPassword === newPassword && newPassword.length > 0 ? (
                                <Text style={{ color: '#28a745', fontSize: 12 }}>✓ Passwords match</Text>
                              ) : null}
                            </View>
                          )}
                        </View>

                        <TouchableOpacity
                          style={[styles.authButton, { marginTop: 20, backgroundColor: '#28a745' }]}
                          onPress={async () => {
                            try {
                              // Validate password fields
                              if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
                                Alert.alert('Error', 'Please fill in all password fields');
                                return;
                              }

                              // Validate new password format
                              const passwordError = validatePassword(newPassword);
                              if (passwordError) {
                                Alert.alert('Error', passwordError);
                                return;
                              }

                              // Check if new passwords match
                              if (newPassword !== confirmPassword) {
                                Alert.alert('Error', 'New passwords do not match');
                                return;
                              }

                              // Check if user is logged in
                              if (!authToken) {
                                Alert.alert('Error', 'Please login to change your password');
                                return;
                              }

                              // Call password change API
                              await changePassword(authToken, oldPassword, newPassword);
                              
                              Alert.alert('Success', 'Password changed successfully!');
                              setOldPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                              setNewPasswordError('');
                              setConfirmPasswordError('');
                            } catch (error) {
                              console.error('Password change error:', error);
                              const errorMessage = error?.message || error?.toString() || 'Failed to change password. Please check your old password and try again.';
                              Alert.alert('Error', errorMessage);
                            }
                          }}
                        >
                          <Text style={styles.authButtonText}>Change Password</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Logout Section */}
                      <View style={[styles.settingsCategoryContainer, { marginTop: 30 }]}>
                        <TouchableOpacity
                          style={[styles.authButton, { marginTop: 10, backgroundColor: '#dc3545' }]}
                          onPress={() => {
                            // Show confirmation dialog
                            Alert.alert(
                              'Logout',
                              'Are you sure you want to logout?',
                              [
                                { text: 'Cancel', style: 'cancel', onPress: () => {} },
                                {
                                  text: 'Logout',
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      // Call logout API if logged in
                                      if (authToken) {
                                        try {
                                          await logout(authToken);
                                        } catch (error) {
                                          console.error('Logout API error:', error);
                                          // Continue with logout even if API call fails
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Logout API error:', error);
                                    }

                                    // Clear auth state (always execute regardless of API call result)
                                    setIsLoggedIn(false);
                                    setAuthToken(null);
                                    setCurrentUser(null);
                                    setUserProfile({ username: '', email: '', profilePicture: null });
                                    setSavedPins([]);
                                    setFeedbackHistory([]);
                                    setOldPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setNewPasswordError('');
                                    setConfirmPasswordError('');
                                    
                                    // Clear ALL AsyncStorage data and set logout flag
                                    try {
                                      // Set logout flag first
                                      await AsyncStorage.setItem('wasLoggedOut', 'true');
                                      
                                      // Clear all auth-related data
                                      await AsyncStorage.removeItem('authToken');
                                      await AsyncStorage.removeItem('currentUser');
                                      await AsyncStorage.removeItem('campus_trails_user'); // Clear user storage data
                                      
                                      console.log('Logout: All AsyncStorage data cleared');
                                    } catch (storageError) {
                                      console.error('Error clearing AsyncStorage on logout:', storageError);
                                    }
                                    
                                    console.log('Logout: Auth state cleared, redirecting to login');
                                    
                                    // Close User Profile screen first
                                    setUserProfileVisible(false);
                                    
                                    // Immediately show auth modal with login tab
                                    setAuthModalVisible(true);
                                    setAuthTab('login');
                                    
                                    // Ensure auth modal is rendered and visible
                                    setTimeout(() => {
                                      // Force re-render auth modal if needed
                                      setAuthModalVisible(true);
                                      setAuthTab('login');
                                    }, 100);
                                  }
                                }
                              ],
                              { cancelable: true }
                            );
                          }}
                        >
                          <Text style={styles.authButtonText}>Logout</Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </KeyboardAvoidingView>
                )}
              </View>
            </Animated.View>
          </>
        )}
      </Modal>

      {/* Feedback Modal with Fade Animation */}
      <Modal
        visible={feedbackModalRendered}
        transparent={true}
        animationType="none"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        {feedbackModalRendered && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: feedbackModalFadeAnim,
              }
            ]}
          >
            <View 
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: '#f5f5f5',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  overflow: 'hidden',
                }
              ]}
            >
            <View style={styles.modalHeaderWhite}>
              <Text style={[styles.modalTitleWhite, { marginBottom: 0, flex: 1, textAlign: 'center' }]}>
                Give Feedback - {selectedPin?.description || selectedPin?.title}
              </Text>
            </View>
            <View style={styles.lineDark}></View>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
              <ScrollView style={{ padding: 20 }}>
                {/* Rating Section */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.settingLabel, { marginBottom: 12 }]}>Rating</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setFeedbackRating(star)}
                        style={{ padding: 8 }}
                      >
                        <Icon
                          name={star <= feedbackRating ? 'star' : 'star-o'}
                          size={32}
                          color={star <= feedbackRating ? '#ffc107' : '#ccc'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Comment Section */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.settingLabel, { marginBottom: 12 }]}>Comment</Text>
                  <TextInput
                    style={[styles.authInput, { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                    placeholder="Enter your feedback here... (max 250 characters)"
                    multiline
                    numberOfLines={4}
                    maxLength={250}
                    value={feedbackComment}
                    onChangeText={setFeedbackComment}
                    placeholderTextColor="#999"
                  />
                  <Text style={{ color: '#666', fontSize: 12, marginTop: 4, textAlign: 'right' }}>
                    {feedbackComment.length}/250
                  </Text>
                  {feedbackComment.length > 0 && feedbackComment.length <= 5 && (
                    <Text style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
                      Feedback must be more than 5 characters
                    </Text>
                  )}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.authButton, 
                    { 
                      backgroundColor: '#28a745', 
                      marginTop: 10,
                      opacity: feedbackComment.trim().length > 5 ? 1 : 0.5,
                    }
                  ]}
                  disabled={feedbackComment.trim().length <= 5}
                  onPress={async () => {
                    try {
                      if (feedbackComment.trim().length <= 5) {
                        Alert.alert('Error', 'Feedback must be more than 5 characters');
                        return;
                      }

                      if (feedbackComment.trim().length > 250) {
                        Alert.alert('Error', 'Feedback cannot exceed 250 characters');
                        return;
                      }

                      if (selectedPin) {
                        // Create feedback entry - ensure all fields match backend schema
                        const feedbackEntry = {
                          id: Date.now(), // Number type
                          pinId: selectedPin.id, // Number type
                          pinTitle: selectedPin.description || selectedPin.title || 'Unknown', // String type
                          rating: feedbackRating, // Number type (1-5)
                          comment: feedbackComment.trim(), // String type (validated: > 5 and <= 250)
                          date: new Date().toISOString(), // ISO string for Date type
                        };
                        
                        // Ensure all required fields are present
                        if (!feedbackEntry.pinId || !feedbackEntry.pinTitle || !feedbackEntry.comment) {
                          Alert.alert('Error', 'Invalid feedback data. Please try again.');
                          return;
                        }
                        
                        // Sync with database first if logged in (to ensure it's saved to MongoDB)
                        if (isLoggedIn && authToken) {
                          try {
                            console.log('Starting feedback save process...');
                            console.log('Feedback entry:', feedbackEntry);
                            
                            // Get current user data from database to ensure we have the latest feedbackHistory
                            const currentUser = await getCurrentUser(authToken);
                            console.log('Current user from DB:', currentUser);
                            const currentFeedbackHistory = currentUser.activity?.feedbackHistory || [];
                            console.log('Current feedback history from DB:', currentFeedbackHistory);
                            
                            // Add new feedback entry to the current feedback history
                            const updatedFeedbackHistory = [...currentFeedbackHistory, feedbackEntry];
                            console.log('Updated feedback history to save:', updatedFeedbackHistory);
                            
                            // Save to MongoDB
                            console.log('Saving to MongoDB...');
                            const saveResult = await updateUserActivity(authToken, {
                              feedbackHistory: updatedFeedbackHistory,
                            });
                            console.log('Save result from API:', saveResult);
                            
                            // Verify the save by fetching updated user
                            console.log('Verifying save by fetching updated user...');
                            const updatedUser = await getCurrentUser(authToken);
                            console.log('Updated user from DB after save:', updatedUser);
                            console.log('Feedback history in updated user:', updatedUser.activity?.feedbackHistory);
                            
                            setCurrentUser(updatedUser);
                            
                            // Update local state with confirmed data from database
                            if (updatedUser.activity && updatedUser.activity.feedbackHistory) {
                              console.log('Setting feedback history from DB:', updatedUser.activity.feedbackHistory);
                              setFeedbackHistory(updatedUser.activity.feedbackHistory);
                            } else {
                              console.log('No feedback history in DB response, using local:', updatedFeedbackHistory);
                              setFeedbackHistory(updatedFeedbackHistory);
                            }
                            
                            // Save to AsyncStorage (for offline/guest mode)
                            await addFeedback({
                              pinId: selectedPin.id,
                              pinTitle: feedbackEntry.pinTitle,
                              rating: feedbackRating,
                              comment: feedbackComment.trim(),
                            });
                            
                            console.log('✅ Feedback saved successfully to MongoDB:', feedbackEntry);
                            
                            // Reset form first
                            setFeedbackComment('');
                            setFeedbackRating(5);
                            
                            // Close feedback screen
                            setFeedbackModalVisible(false);
                            
                            // Show success popup after a brief delay
                            setTimeout(() => {
                              Alert.alert(
                                'Success',
                                'Thank you for your feedback!',
                                [{ text: 'OK', style: 'default' }],
                                { cancelable: false }
                              );
                            }, 300);
                          } catch (error) {
                            console.error('❌ Error syncing feedback to database:', error);
                            console.error('Error details:', {
                              message: error.message,
                              stack: error.stack,
                              response: error.response,
                            });
                            
                            // Check if error is due to validation
                            if (error.message && error.message.includes('more than 5 characters')) {
                              Alert.alert('Error', 'Feedback must be more than 5 characters');
                              return;
                            }
                            if (error.message && error.message.includes('250 characters')) {
                              Alert.alert('Error', 'Feedback cannot exceed 250 characters');
                              return;
                            }
                            // Show error but don't save locally if database fails
                            Alert.alert('Error', error.message || 'Failed to save feedback to database. Please try again.');
                            return;
                          }
                        } else {
                          // Not logged in - save locally only
                          const updatedFeedbackHistory = [...feedbackHistory, feedbackEntry];
                          setFeedbackHistory(updatedFeedbackHistory);
                          
                          // Save to AsyncStorage (for offline/guest mode)
                          await addFeedback({
                            pinId: selectedPin.id,
                            pinTitle: feedbackEntry.pinTitle,
                            rating: feedbackRating,
                            comment: feedbackComment.trim(),
                          });
                          
                          // Reset form first
                          setFeedbackComment('');
                          setFeedbackRating(5);
                          
                          // Close feedback screen
                          setFeedbackModalVisible(false);
                          
                          // Show success popup after a brief delay
                          setTimeout(() => {
                            Alert.alert(
                              'Success',
                              'Thank you for your feedback! (Saved locally)',
                              [{ text: 'OK', style: 'default' }],
                              { cancelable: false }
                            );
                          }, 300);
                        }
                      }
                    } catch (error) {
                      console.error('Error saving feedback:', error);
                      Alert.alert('Error', error.message || 'Failed to save feedback. Please try again.');
                    }
                  }}
                >
                  <Text style={styles.authButtonText}>Submit Feedback</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
            </View>
          </Animated.View>
        )}
      </Modal>

      {/* Filter Modal (replaces QR scanner) */}
      <Modal
        visible={filterModalRendered}
        transparent={true}
        animationType="none"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        {filterModalRendered && (
          <Animated.View 
            style={[
              StyleSheet.absoluteFill,
              styles.settingsScreen,
              {
                transform: [{ translateY: filterModalSlideAnim }],
              }
            ]}
          >
            <View style={styles.modalHeaderWhite}>
              <Text style={[styles.modalTitleWhite, { marginBottom: 0, flex: 1, textAlign: 'center' }]}>Filter Pins</Text>
            </View>
            <View style={styles.lineDark}></View>
            
            {/* Selection Controls */}
            <View style={styles.filterTopControls}>
              <TouchableOpacity onPress={selectAllCategories} style={styles.filterSelectAllButton}>
                <Text style={styles.filterSelectAllButtonText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearAllCategories} style={styles.filterClearAllButton}>
                <Text style={styles.filterClearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Category Groups */}
            <ScrollView style={{ width: '100%', backgroundColor: '#f5f5f5', paddingHorizontal: 16 }}>
              {[
                { 
                  title: 'Building Legends', 
                  items: [
                    { name: 'Commercial Zone', color: '#FF0000' },
                    { name: 'Admin / Operation Zone', color: '#800080' },
                    { name: 'Academic Core Zone', color: '#0000FF' },
                    { name: 'Auxiliary Services Zone', color: '#808080' }
                  ]
                },
                { 
                  title: 'Essentials & Utilities', 
                  items: [
                    { name: 'Dining', color: '#FFA500' },
                    { name: 'Comfort Rooms (CR)', color: '#ADD8E6' }
                  ]
                },
                { 
                  title: 'Research', 
                  items: [
                    { name: 'Research Zones', color: '#9C27B0' }
                  ]
                },
                { 
                  title: 'Safety & Access', 
                  items: [
                    { name: 'Clinic', color: '#FF0000' },
                    { name: 'Parking', color: '#D3D3D3' },
                    { name: 'Security', color: '#0000FF' }
                  ]
                }
              ].map(group => (
                <View key={group.title} style={styles.categoryGroup}>
                  <View style={styles.categoryHeaderContainer}>
                    <Text style={styles.categoryHeaderText}>{group.title}</Text>
                    <View style={styles.categoryHeaderUnderline}></View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    {group.items.map(item => (
                      <TouchableOpacity 
                        key={item.name} 
                        style={[
                          styles.filterCategoryButton,
                          { width: '48%' }, // 2 columns with small gap
                          selectedCategories[item.name] && styles.filterCategoryButtonSelected
                        ]} 
                        onPress={() => toggleCategory(item.name)}
                      >
                        <ImageBackground 
                          source={getOptimizedImage(require('./assets/USTP.jpg'))} 
                          style={styles.filterCategoryButtonImage}
                          resizeMode="cover"
                          imageStyle={styles.filterCategoryButtonImageStyle}
                        >
                          <View style={styles.filterCategoryButtonContent}>
                            <Text style={styles.filterCategoryButtonText}>{item.name}</Text>
                            {selectedCategories[item.name] && (
                              <Icon name="check" size={16} color="#4CAF50" style={{ marginLeft: 'auto' }} />
                            )}
                          </View>
                        </ImageBackground>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={{ backgroundColor: '#f5f5f5', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
              <TouchableOpacity style={[styles.closeButton, { alignSelf: 'stretch', marginTop: 8 }]} onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.closeText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </Modal>

      {/* Screen for Pin Details (Clicked from map) */}
      {pinDetailModalRendered && (
        <Pressable 
          style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}
          onPress={() => setModalVisible(false)}
        >
          <Animated.View 
            style={[
              styles.pinDetailModalPanel,
              {
                transform: [{ translateY: pinDetailModalAnim }],
                opacity: pinDetailModalAnim.interpolate({
                  inputRange: [0, height / 2, height],
                  outputRange: [1, 0.5, 0],
                }),
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
              <View style={styles.modalHeaderWhite}>
                <Text style={[styles.modalTitleWhite, { marginBottom: 0, flex: 1, marginRight: 12, paddingRight: 4, fontSize: 12 }]} numberOfLines={2} ellipsizeMode="tail">{selectedPin?.description}</Text>
              </View>
              <View style={styles.lineDark}></View>
              <ScrollView 
                style={{ flex: 1, backgroundColor: '#f5f5f5' }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}
              >
                <View style={{ backgroundColor: '#f5f5f5', paddingBottom: 4 }}>
            {(() => {
              const imageSource = getOptimizedImage(selectedPin?.image);
              if (typeof imageSource === 'number' || (imageSource && typeof imageSource === 'object' && !imageSource.uri)) {
                // Local asset - use React Native Image
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setFullscreenImageSource(imageSource);
                      setFullscreenImageVisible(true);
                    }}
                    activeOpacity={0.9}
                  >
                    <Image source={imageSource} style={styles.pinImage} resizeMode="cover" />
                  </TouchableOpacity>
                );
              } else {
                // Remote URL - use ExpoImage for caching
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setFullscreenImageSource(imageSource);
                      setFullscreenImageVisible(true);
                    }}
                    activeOpacity={0.9}
                  >
                    <ExpoImage source={imageSource} style={styles.pinImage} contentFit="cover" cachePolicy="disk" />
                  </TouchableOpacity>
                );
              }
            })()}
                </View>
                <View style={[styles.actionButtons, { backgroundColor: '#f5f5f5', paddingVertical: 4 }]}>
                  <TouchableOpacity 
                    style={[styles.iconButton, { flex: 1, marginRight: 5, width: 0 }]} 
                    onPress={() => {
                      if (selectedPin) {
                        // Set current pin as destination
                        setPointB(selectedPin);
                        // Close pin detail modal
              setModalVisible(false);
                        // Close other modals
                        setSearchVisible(false);
                        setCampusVisible(false);
                        setFilterModalVisible(false);
                        setSettingsVisible(false);
                        setPinsModalVisible(false);
                        // Open pathfinding panel
                        setShowPathfindingPanel(true);
                        setPathfindingMode(false);
                        setPath([]);
                      }
                    }}
                  >
                    <Icon name="location-arrow" size={16} color="white" />
                    <Text style={[styles.buttonText, { fontSize: 11 }]} numberOfLines={1}>Navigate</Text>
              </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.iconButton, { flex: 1, marginLeft: 5, width: 0 }]} 
                    onPress={() => {
                      if (selectedPin) {
                        // Highlight pin on map
                        setHighlightedPinOnMap(selectedPin.id);
                        // Close pin detail modal
                        setModalVisible(false);
                        // Close other modals
                        setSearchVisible(false);
                        setCampusVisible(false);
                        setFilterModalVisible(false);
                        setSettingsVisible(false);
                        setPinsModalVisible(false);
                        // Note: react-native-image-pan-zoom doesn't support programmatic zoom/pan
                        // The pin is highlighted in cyan color, making it easy to locate
                        // User can manually zoom/pan to the highlighted pin
                        setZoomToPin({ pin: selectedPin });
                      }
                    }}
                  >
                    <Icon name="map-marker" size={16} color="white" />
                    <Text style={[styles.buttonText, { fontSize: 11 }]} numberOfLines={1}>Show on Map</Text>
              </TouchableOpacity>
            </View>
                <View style={{ backgroundColor: '#f5f5f5', paddingTop: 4 }}>
                  <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={() => {
                      if (selectedPin && selectedPin.id === 9) {
                        setCameFromPinDetails(true);
                        // Close modal immediately without animation
                        setPinDetailModalRendered(false);
                        setModalVisible(false);
                        setBuildingDetailsVisible(true);
                        // Set first floor from database, or default to level 0
                        const firstFloor = selectedPin?.floors?.[0];
                        setSelectedFloor(firstFloor ? firstFloor.level : 0);
                      } else {
                        setModalVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.buttonText}>View More Details</Text>
                  </TouchableOpacity>
                 </View>
              </ScrollView>
            </Animated.View>
        </Pressable>
      )}

      {/* Building Details Screen - Bottom Slide-in Panel */}
      <Modal
        visible={buildingDetailsRendered && selectedPin && selectedPin.id === 9}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          setBuildingDetailsVisible(false);
          if (cameFromPinDetails) {
            setCameFromPinDetails(false);
            setModalVisible(true);
          }
        }}
      >
        {buildingDetailsRendered && (
          <Animated.View 
            style={[
              StyleSheet.absoluteFill,
              styles.settingsScreen,
              {
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                overflow: 'hidden',
                transform: [{ translateY: buildingDetailsSlideAnim }],
                opacity: buildingDetailsFadeAnim,
              }
            ]}
          >
            <ScrollView 
              style={styles.buildingDetailsContent}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={styles.buildingDetailsImageContainer}>
                {(() => {
                  const imageSource = getOptimizedImage(selectedPin.image);
                  if (typeof imageSource === 'number' || (imageSource && typeof imageSource === 'object' && !imageSource.uri)) {
                    // Local asset - use React Native Image
                    return (
                      <TouchableOpacity
                        onPress={() => {
                          setFullscreenImageSource(imageSource);
                          setFullscreenImageVisible(true);
                        }}
                        activeOpacity={0.9}
                      >
                        <Image source={imageSource} style={styles.buildingDetailsImage} resizeMode="cover" />
                      </TouchableOpacity>
                    );
                  } else {
                    // Remote URL - use ExpoImage for caching
                    return (
                      <TouchableOpacity
                        onPress={() => {
                          setFullscreenImageSource(imageSource);
                          setFullscreenImageVisible(true);
                        }}
                        activeOpacity={0.9}
                      >
                        <ExpoImage source={imageSource} style={styles.buildingDetailsImage} contentFit="cover" cachePolicy="disk" />
                      </TouchableOpacity>
                    );
                  }
                })()}
        </View>
              
              <View style={styles.buildingDetailsNameContainer}>
                <Text style={styles.buildingDetailsName}>{selectedPin.description}</Text>
              </View>
              
              <Text style={styles.buildingDetailsSectionTitle}>BUILDING LAYOUT DETAILS:</Text>
              
              <View style={styles.floorButtonsContainer}>
                {selectedPin?.floors && selectedPin.floors.length > 0 ? (
                  selectedPin.floors.map((floor) => {
                    // Format floor name: level 0 = "Ground Floor", level 1+ = "2nd Floor", "3rd Floor", etc.
                    const floorName = floor.level === 0 
                      ? 'Ground Floor' 
                      : floor.level === 1 
                        ? '2nd Floor' 
                        : floor.level === 2 
                          ? '3rd Floor' 
                          : `${floor.level + 1}th Floor`;
                    
                    return (
                      <TouchableOpacity
                        key={floor.level}
                        style={[
                          styles.floorButton,
                          selectedFloor === floor.level && styles.floorButtonSelected
                        ]}
                        onPress={() => setSelectedFloor(floor.level)}
                      >
                        <Text style={[
                          styles.floorButtonText,
                          selectedFloor === floor.level && styles.floorButtonTextSelected
                        ]}>
                          {floorName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.floorButtonText}>No floors available</Text>
                )}
              </View>
              
              <View style={styles.giveFeedbackButtonContainer}>
                <TouchableOpacity 
                  style={[styles.giveFeedbackButton, { flex: 1, marginRight: 8 }]}
                  onPress={() => {
                    if (selectedPin) {
                      setFeedbackModalVisible(true);
                    }
                  }}
                >
                  <Icon name="comment" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.giveFeedbackButtonText}>Give Feedback</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{
                    padding: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: savedPins.some(p => p.id === selectedPin?.id) ? '#dc3545' : '#fff',
                    borderWidth: 1,
                    borderColor: savedPins.some(p => p.id === selectedPin?.id) ? '#dc3545' : '#333',
                    borderRadius: 8,
                    marginLeft: 8,
                  }}
                  onPress={() => {
                    if (selectedPin) {
                      savePin();
                    }
                  }}
                >
                  <Icon name={savedPins.some(p => p.id === selectedPin?.id) ? "heart" : "heart-o"} size={20} color={savedPins.some(p => p.id === selectedPin?.id) ? "#fff" : "#333"} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.roomsTitle}>Rooms:</Text>
              {selectedPin?.floors?.find(f => f.level === selectedFloor)?.rooms?.map((room) => {
                // Convert room to pin-like object for saving
                const roomAsPin = {
                  id: room.name || room.id,
                  title: room.name,
                  description: `${selectedPin?.description || selectedPin?.title || 'Building'} - ${room.description || ''}`,
                  image: room.image || selectedPin?.image || require('./assets/USTP.jpg'),
                  x: selectedPin?.x || 0,
                  y: selectedPin?.y || 0,
                };
                const isRoomSaved = savedPins.some(p => p.id === (room.name || room.id));
                return (
                  <View key={room.name || room.id} style={styles.roomCard}>
                    <Image
                      source={getOptimizedImage(room.image || require('./assets/USTP.jpg'))}
                      style={styles.roomCardImage}
                      resizeMode="cover"
                    />
                    <View style={styles.roomCardContent}>
                      <Text style={styles.roomNumber}>{room.name}</Text>
                      <Text style={styles.roomDescription}>{room.description}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={async (e) => {
                        e.stopPropagation();
                        
                        // Check if user is logged in
                        if (!isLoggedIn || !authToken) {
                          Alert.alert(
                            'Login Required',
                            'You must be logged in to save rooms. Please login to continue.',
                            [
                              {
                                text: 'Cancel',
                                style: 'cancel',
                              },
                              {
                                text: 'Login',
                                onPress: () => {
                                  setBuildingDetailsVisible(false); // Close building details modal
                                  setAuthModalVisible(true);
                                  setAuthTab('login');
                                },
                              },
                            ]
                          );
                          return;
                        }
                        
                        try {
                          if (isRoomSaved) {
                            // Remove room from saved pins
                            const roomId = room.name || room.id;
                            const updatedSavedPins = savedPins.filter(p => p.id !== roomId);
                            setSavedPins(updatedSavedPins);
                            await removeSavedPin(roomId);
                            
                            // Sync with database if logged in
                            if (isLoggedIn && authToken) {
                              try {
                                await updateUserActivity(authToken, {
                                  savedPins: updatedSavedPins,
                                });
                                const updatedUser = await getCurrentUser(authToken);
                                setCurrentUser(updatedUser);
                              } catch (error) {
                                console.error('Error syncing saved room removal to database:', error);
                              }
                            }
                            Alert.alert('Success', 'Room removed from saved pins');
                          } else {
                            // Save room
                            const updatedSavedPins = [...savedPins, roomAsPin];
                            setSavedPins(updatedSavedPins);
                            await addSavedPin(roomAsPin);
                            
                            // Sync with database if logged in
                            if (isLoggedIn && authToken) {
                              try {
                                await updateUserActivity(authToken, {
                                  savedPins: updatedSavedPins,
                                });
                                const updatedUser = await getCurrentUser(authToken);
                                setCurrentUser(updatedUser);
                              } catch (error) {
                                console.error('Error syncing saved room to database:', error);
                              }
                            }
                            Alert.alert('Success', 'Room saved successfully!');
                          }
                        } catch (error) {
                          console.error('Error saving room:', error);
                          Alert.alert('Error', 'Failed to save room. Please try again.');
                        }
                      }}
                      style={{
                        padding: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Icon name={isRoomSaved ? "heart" : "heart-o"} size={20} color={isRoomSaved ? "#dc3545" : "#999"} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}
      </Modal>

      {/* User Auth Modal - Login and Registration Tabs */}
      <Modal
        visible={authModalRendered}
        transparent={true}
        animationType="none"
        onRequestClose={toggleAuthModal}
      >
        {authModalRendered && (
          <>
            <Animated.View 
              style={[
                StyleSheet.absoluteFill,
                styles.settingsModalBackdrop,
                {
                  opacity: authModalSlideAnim.interpolate({
                    inputRange: [0, height / 2, height],
                    outputRange: [1, 0.5, 0],
                  }),
                }
              ]}
            />
            <Animated.View 
              style={[
                StyleSheet.absoluteFill,
                styles.authModalFullScreen,
                {
                  transform: [{ translateY: authModalSlideAnim }],
                }
              ]}
            >
              <KeyboardAvoidingView 
                style={styles.authModalFullScreen}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
              >
            {/* Header */}
            <View style={[styles.authModalHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
              <View style={{ flex: 1 }}></View>
            </View>

            {/* Tab Buttons */}
            <View style={styles.authTabRow}>
              <TouchableOpacity 
                onPress={() => {
                  setAuthTab('login');
                  setAuthError(null);
                }} 
                style={[styles.authTabButton, authTab === 'login' && styles.authTabActive, { flex: 1 }]}
              >
                <Text style={authTab === 'login' ? styles.authTabActiveText : styles.authTabInactiveText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setAuthTab('register');
                  setAuthError(null);
                }} 
                style={[styles.authTabButton, authTab === 'register' && styles.authTabActive, { flex: 1 }]}
              >
                <Text style={authTab === 'register' ? styles.authTabActiveText : styles.authTabInactiveText}>Register</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.authModalContent}>
              <View style={styles.authContentWrapper}>
                {/* Logo - Smaller */}
                <View style={styles.authLogoContainer}>
                  <Image 
                    source={require('./assets/logo-no-bg.png')} 
                    style={styles.authLogoImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Login Tab */}
                {authTab === 'login' && (
                  <View style={styles.authFormContainer}>
                  <View style={styles.authInputContainer}>
                    <Text style={styles.authInputLabel}>Username</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="Enter username"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.authInputContainer}>
                    <Text style={styles.authInputLabel}>Password</Text>
                    <View style={styles.authPasswordContainer}>
                      <TextInput
                        style={[styles.authInput, { flex: 1, paddingRight: 40, width: '100%' }]}
                        placeholder="Enter password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        placeholderTextColor="#999"
                      />
                      <TouchableOpacity
                        style={[styles.authPasswordToggle, { position: 'absolute', right: 8 }]}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Icon name={showPassword ? "eye" : "eye-slash"} size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.authButton, authLoading && { opacity: 0.6 }]}
                    onPress={async () => {
                      try {
                        // Clear previous errors
                        setAuthError(null);
                        setAuthLoading(true);

                        // Validate username
                        const usernameError = validateUsername(username);
                        if (usernameError) {
                          setAuthError(usernameError);
                          setAuthLoading(false);
                          return;
                        }
                        
                        // Validate password
                        const passwordError = validatePassword(password);
                        if (passwordError) {
                          setAuthError(passwordError);
                          setAuthLoading(false);
                          return;
                        }
                        
                        // Call login API
                        const result = await login(username, password);
                        
                        // Store token and user data
                        setAuthToken(result.token);
                        setCurrentUser(result.user);
                        setIsLoggedIn(true);
                        
                        // Save to AsyncStorage for persistence
                        try {
                          await AsyncStorage.setItem('authToken', result.token);
                          await AsyncStorage.setItem('currentUser', JSON.stringify(result.user));
                          // Clear logout flag if it exists
                          await AsyncStorage.removeItem('wasLoggedOut');
                        } catch (storageError) {
                          console.error('Error saving to AsyncStorage:', storageError);
                        }
                        
                        // Update user profile state
                        setUserProfile({
                          username: result.user.username,
                          email: result.user.email || '',
                          profilePicture: result.user.profilePicture || null,
                        });
                        
                        // Update saved pins and feedback history
                        // Enrich saved pins with full pin data including images
                        if (result.user.activity) {
                          const savedPinsFromDB = result.user.activity.savedPins || [];
                          if (pins && pins.length > 0) {
                            const enrichedSavedPins = savedPinsFromDB.map(savedPin => {
                              const fullPin = pins.find(p => p.id === savedPin.id);
                              return fullPin ? fullPin : savedPin;
                            });
                            setSavedPins(enrichedSavedPins);
                          } else {
                            setSavedPins(savedPinsFromDB);
                          }
                          setFeedbackHistory(result.user.activity.feedbackHistory || []);
                        }
                        
                        // Update settings
                        if (result.user.settings) {
                          setAlertPreferences({
                            facilityUpdates: result.user.settings.alerts?.facilityUpdates !== false,
                            securityAlerts: result.user.settings.alerts?.securityAlerts !== false,
                          });
                        }
                        
                        // Close modal and reset form
                        setAuthModalVisible(false);
                        setUsername('');
                        setPassword('');
                        setAuthLoading(false);
                        
                        // Show User Profile modal after successful login
                        setTimeout(() => {
                          setUserProfileVisible(true);
                        }, 300);
                        
                        Alert.alert('Success', 'Login successful!');
                      } catch (error) {
                        console.error('Login error:', error);
                        setAuthError(error.message || 'Login failed. Please try again.');
                        setAuthLoading(false);
                      }
                    }}
                    disabled={authLoading}
                  >
                    <Text style={styles.authButtonText}>
                      {authLoading ? 'Logging in...' : 'Login'}
                    </Text>
                  </TouchableOpacity>
                  
                  {authError && (
                    <Text style={{ color: '#dc3545', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                      {authError}
                    </Text>
                  )}

                  <View style={styles.authLinksContainer}>
                    <TouchableOpacity onPress={() => {
                      setAuthTab('forgot');
                      setAuthError(null);
                      setRegEmail('');
                    }}>
                      <Text style={styles.authLink}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>
                )}

                {/* Register Tab */}
                {authTab === 'register' && (
                  <View style={styles.authFormContainer}>
                  <View style={styles.authInputContainer}>
                    <Text style={styles.authInputLabel}>Username</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="Enter username"
                      value={regUsername}
                      onChangeText={setRegUsername}
                      autoCapitalize="none"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.authInputContainer}>
                    <Text style={styles.authInputLabel}>Email</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="Enter email address"
                      value={regEmail}
                      onChangeText={setRegEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.authInputContainer}>
                    <Text style={styles.authInputLabel}>Password</Text>
                    <View style={styles.authPasswordContainer}>
                      <TextInput
                        style={[styles.authInput, { flex: 1, paddingRight: 40, width: '100%' }]}
                        placeholder="Enter password"
                        value={regPassword}
                        onChangeText={setRegPassword}
                        secureTextEntry={!showRegPassword}
                        autoCapitalize="none"
                        placeholderTextColor="#999"
                      />
                      <TouchableOpacity
                        style={[styles.authPasswordToggle, { position: 'absolute', right: 8 }]}
                        onPress={() => setShowRegPassword(!showRegPassword)}
                      >
                        <Icon name={showRegPassword ? "eye" : "eye-slash"} size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.authInputContainer}>
                    <Text style={styles.authInputLabel}>Confirm Password</Text>
                    <View style={styles.authPasswordContainer}>
                      <TextInput
                        style={[styles.authInput, { flex: 1, paddingRight: 40, width: '100%' }]}
                        placeholder="Confirm password"
                        value={regConfirmPassword}
                        onChangeText={setRegConfirmPassword}
                        secureTextEntry={!showRegConfirmPassword}
                        autoCapitalize="none"
                        placeholderTextColor="#999"
                      />
                      <TouchableOpacity
                        style={[styles.authPasswordToggle, { position: 'absolute', right: 8 }]}
                        onPress={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      >
                        <Icon name={showRegConfirmPassword ? "eye" : "eye-slash"} size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.authButton, authLoading && { opacity: 0.6 }]}
                    onPress={async () => {
                      try {
                        // Clear previous errors
                        setAuthError(null);
                        setAuthLoading(true);

                        // Check if all fields are filled
                        if (!regUsername || !regEmail || !regPassword || !regConfirmPassword) {
                          setAuthError('Please fill in all fields');
                          setAuthLoading(false);
                          return;
                        }
                        
                        // Validate username
                        const usernameError = validateUsername(regUsername);
                        if (usernameError) {
                          setAuthError(usernameError);
                          setAuthLoading(false);
                          return;
                        }
                        
                        // Validate email
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(regEmail)) {
                          setAuthError('Please enter a valid email address');
                          setAuthLoading(false);
                          return;
                        }
                        
                        // Validate password
                        const passwordError = validatePassword(regPassword);
                        if (passwordError) {
                          setAuthError(passwordError);
                          setAuthLoading(false);
                          return;
                        }
                        
                        // Check if passwords match
                        if (regPassword !== regConfirmPassword) {
                          setAuthError('Passwords do not match');
                          setAuthLoading(false);
                          return;
                        }
                        
                        // Call register API
                        const result = await register(regUsername, regEmail, regPassword);
                        
                        // Reset form first
                        setRegUsername('');
                        setRegEmail('');
                        setRegPassword('');
                        setRegConfirmPassword('');
                        setAuthLoading(false);
                        
                        // Show success popup first (do NOT automatically login)
                        Alert.alert(
                          'Success',
                          'Registration successful! Welcome to Campus Trails! Please login to continue.',
                          [
                            {
                              text: 'OK',
                              style: 'default',
                              onPress: () => {
                                // After user closes success popup, switch to login tab
                                setAuthTab('login');
                                // Clear any errors
                                setAuthError(null);
                              }
                            }
                          ],
                          { cancelable: false }
                        );
                        
                        // Note: We don't automatically login or store tokens after registration
                        // User must login manually after successful registration
                      } catch (error) {
                        console.error('Registration error:', error);
                        setAuthError(error.message || 'Registration failed. Please try again.');
                        setAuthLoading(false);
                      }
                    }}
                    disabled={authLoading}
                  >
                    <Text style={styles.authButtonText}>
                      {authLoading ? 'Registering...' : 'Register'}
                    </Text>
                  </TouchableOpacity>
                  
                  {authError && (
                    <Text style={{ color: '#dc3545', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                      {authError}
                    </Text>
                  )}
                  </View>
                )}

                {/* Forgot Password Tab */}
                {authTab === 'forgot' && (
                  <View style={styles.authFormContainer}>
                    <View style={styles.authInputContainer}>
                      <Text style={styles.authInputLabel}>Email or Username</Text>
                      <TextInput
                        style={styles.authInput}
                        placeholder="Enter your email or username"
                        value={regEmail} // Reusing regEmail for forgot password email/username
                        onChangeText={setRegEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor="#999"
                      />
                    </View>

                    <TouchableOpacity 
                      style={[styles.authButton, authLoading && { opacity: 0.6 }]}
                      onPress={async () => {
                        try {
                          // Clear previous errors
                          setAuthError(null);
                          setAuthLoading(true);

                          // Validate email or username
                          if (!regEmail || regEmail.trim() === '') {
                            setAuthError('Please enter your email or username');
                            setAuthLoading(false);
                            return;
                          }

                          // Call forgot password API
                          const response = await forgotPassword(regEmail.trim(), false); // false = use reset link, true = use OTP
                          
                          setAuthLoading(false);
                          
                          // Prepare alert message
                          let alertMessage = response.message || 'If an account exists with this email, a password reset link has been sent.';
                          
                          // In development mode, include reset URL in the alert if provided
                          if (__DEV__ && response.resetUrl) {
                            console.log('📧 Password Reset URL:', response.resetUrl);
                            alertMessage += `\n\n🔗 Reset URL (Development):\n${response.resetUrl}`;
                          }
                          
                          // Show success message
                          Alert.alert(
                            'Password Reset',
                            alertMessage,
                            [
                              {
                                text: 'OK',
                                onPress: () => {
                                  // Return to login tab
                                  setAuthTab('login');
                                  setRegEmail('');
                                }
                              }
                            ],
                            { cancelable: false }
                          );
                        } catch (error) {
                          console.error('Forgot password error:', error);
                          setAuthError(error.message || 'Failed to process request. Please try again.');
                          setAuthLoading(false);
                        }
                      }}
                      disabled={authLoading}
                    >
                      <Text style={styles.authButtonText}>
                        {authLoading ? 'Processing...' : 'Reset Password'}
                      </Text>
                    </TouchableOpacity>
                    
                    {authError && (
                      <Text style={{ color: '#dc3545', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                        {authError}
                      </Text>
                    )}

                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                      <Text style={{ color: '#666', fontSize: 12, textAlign: 'center' }}>
                        Remember your password?{' '}
                        <Text 
                          style={{ color: '#28a745', textDecorationLine: 'underline' }}
                          onPress={() => setAuthTab('login')}
                        >
                          Login here
                        </Text>
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
              </KeyboardAvoidingView>
            </Animated.View>
          </>
        )}
      </Modal>

      {/* Main Search Modal */}
      {searchRendered && (
        <Animated.View 
          style={[
            styles.searchContainer,
            {
              opacity: searchAnim,
              transform: [
                {
                  translateY: searchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            }
          ]}
        >
          <View style={styles.modalHeaderWhite}>
            <Text style={[styles.modalTitleWhite, { marginBottom: 0, flex: 1, textAlign: 'center' }]}>Search</Text>
          </View>
          <View style={styles.lineDark}></View>
          <View style={{ backgroundColor: '#f5f5f5', padding: 10 }}>
          <TextInput
            placeholder="Search for..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          <FlatList
              data={searchResults}
              keyExtractor={(item, index) => item.type === 'room' ? `room-${item.id}-${index}` : item.id.toString()}
            renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => {
                    if (item.type === 'room') {
                      // Find Building 9 pin
                      const building9Pin = pins.find(p => p.id === 9);
                      if (building9Pin) {
                        setSelectedPin(building9Pin);
                        setClickedPin(building9Pin.id);
                        setHighlightedPinOnMap(null);
                        // Close search modal
                        setSearchVisible(false);
                        // Close other modals
                        setCampusVisible(false);
                        setFilterModalVisible(false);
                        setShowPathfindingPanel(false);
                        setSettingsVisible(false);
                        setPinsModalVisible(false);
                        // Open Building Details Modal with correct floor
                        setCameFromPinDetails(false);
                        // Find the floor level from the room's floorLevel or floor property
                        const floorLevel = typeof item.floorLevel === 'number' 
                          ? item.floorLevel 
                          : typeof item.floor === 'number' 
                            ? item.floor 
                            : building9Pin.floors?.[0]?.level || 0;
                        setSelectedFloor(floorLevel);
                        setBuildingDetailsVisible(true);
                      }
                    } else {
                      handlePinPress(item);
                    }
                  }} 
                  style={styles.searchItemContainer}
                >
                <Text style={styles.searchItem}>
                    <Text style={styles.searchDescription}>
                      {item.type === 'room' ? `${item.name} - ${item.description}${item.floor ? ` (${item.floor})` : ''}` : item.description}
                    </Text>
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
        </Animated.View>
      )}

      {/* View All Pins Modal - Bottom Slide-in Panel */}
      <Modal
        visible={pinsModalRendered}
        transparent={true}
        animationType="none"
        onRequestClose={togglePinsModal}
      >
        {pinsModalRendered && (
          <>
            <Animated.View 
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: '#f5f5f5',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  overflow: 'hidden',
                  transform: [{ translateY: pinsModalSlideAnim }],
                  opacity: pinsModalSlideAnim.interpolate({
                    inputRange: [0, 150, 300],
                    outputRange: [1, 0.5, 0],
                  }),
                }
              ]}
            >
          {/* Header */}
          <View style={styles.pinsModalHeader}>
            <Text style={[styles.pinsModalCampusTitle, { textAlign: 'center' }]}>USTP-CDO</Text>
          </View>
          
          {/* Categorized Facility List */}
          <ScrollView style={styles.facilityList} contentContainerStyle={styles.facilityListContent}>
            {categorizedPins.map((category, categoryIndex) => (
              <View key={category.title} style={{ marginBottom: 20 }}>
                <View style={styles.categoryHeaderContainer}>
                  <Text style={styles.categoryHeaderText}>{category.title}</Text>
                  <View style={styles.categoryHeaderUnderline}></View>
          </View>
                {category.pins.map((pin) => {
                  const isPinSaved = savedPins.some(p => p.id === pin.id);
                  return (
                    <TouchableOpacity 
                      key={pin.id.toString()} 
                      onPress={() => {
                        if (activeSelector) {
                          // Handle pathfinding location selection
                          if (activeSelector === 'A') {
                            setPointA(pin);
                          } else if (activeSelector === 'B') {
                            setPointB(pin);
                          }
                          setPinsModalVisible(false);
                          setActiveSelector(null);
                        } else {
                          // Handle normal pin press
                          handlePinPress(pin);
                        }
                      }} 
                      style={styles.facilityButton}
                    >
                      {(() => {
                        const imageSource = getOptimizedImage(pin.image);
                        if (typeof imageSource === 'number' || (imageSource && typeof imageSource === 'object' && !imageSource.uri)) {
                          return <Image source={imageSource} style={styles.facilityButtonImage} resizeMode="cover" />;
                        } else {
                          return <ExpoImage source={imageSource} style={styles.facilityButtonImage} contentFit="cover" cachePolicy="disk" />;
                        }
                      })()}
                      <View style={[styles.facilityButtonContent, { flex: 1 }]}>
                        <Text style={styles.facilityName} numberOfLines={2} ellipsizeMode="tail">{pin.description}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          
                          // Check if user is logged in
                          if (!isLoggedIn || !authToken) {
                            Alert.alert(
                              'Login Required',
                              'You must be logged in to save pins. Please login to continue.',
                              [
                                {
                                  text: 'Cancel',
                                  style: 'cancel',
                                },
                                {
                                  text: 'Login',
                                  onPress: () => {
                                    setPinsModalVisible(false); // Close View All Pins modal
                                    setAuthModalVisible(true);
                                    setAuthTab('login');
                                  },
                                },
                              ]
                            );
                            return;
                          }
                          
                          if (isPinSaved) {
                            removeSavedPin(pin.id);
                            setSavedPins(savedPins.filter(p => p.id !== pin.id));
                            if (isLoggedIn && authToken) {
                              const updatedSavedPins = savedPins.filter(p => p.id !== pin.id);
                              updateUserActivity(authToken, { savedPins: updatedSavedPins }).catch(err => console.error('Error updating saved pins:', err));
                            }
                          } else {
                            const pinToSave = { ...pin, image: pin.image || null };
                            const updatedSavedPins = [...savedPins, pinToSave];
                            setSavedPins(updatedSavedPins);
                            addSavedPin(pinToSave);
                            if (isLoggedIn && authToken) {
                              updateUserActivity(authToken, { savedPins: updatedSavedPins }).catch(err => console.error('Error updating saved pins:', err));
                            }
                          }
                        }}
                        style={{
                          padding: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        <Icon name={isPinSaved ? "heart" : "heart-o"} size={20} color={isPinSaved ? "#dc3545" : "#999"} />
                  </TouchableOpacity>
              </TouchableOpacity>
                  );
                })}
            </View>
            ))}
          </ScrollView>
            </Animated.View>
          </>
        )}
      </Modal>

        {/* Pin Selector Modal - Bottom Slide-in Panel (for pathfinding) */}
        <Modal
          visible={pinSelectorModalRendered}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            setPinSelectorModalVisible(false);
            setActiveSelector(null); // Clear active selector when closing
          }}
        >
          {pinSelectorModalRendered && (
          <>
            <Animated.View 
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: '#f5f5f5',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  overflow: 'hidden',
                  transform: [{ translateY: pinSelectorModalSlideAnim }],
                  opacity: pinSelectorModalSlideAnim.interpolate({
                    inputRange: [0, 150, 300],
                    outputRange: [1, 0.5, 0],
                  }),
                }
              ]}
            >
          {/* Header */}
          <View style={styles.pinsModalHeader}>
            <Text style={[styles.pinsModalCampusTitle, { textAlign: 'center' }]}>
              {activeSelector === 'A' ? 'Select Start Point' : 'Select Destination'}
            </Text>
          </View>
          
          {/* Categorized Facility List */}
          <ScrollView style={styles.facilityList} contentContainerStyle={styles.facilityListContent}>
            {categorizedPins.map((category, categoryIndex) => (
              <View key={category.title} style={{ marginBottom: 20 }}>
                <View style={styles.categoryHeaderContainer}>
                  <Text style={styles.categoryHeaderText}>{category.title}</Text>
                  <View style={styles.categoryHeaderUnderline}></View>
          </View>
                {category.pins.map((pin) => {
                  return (
                    <TouchableOpacity 
                      key={pin.id.toString()} 
                      onPress={() => {
                        if (activeSelector === 'A') {
                          setPointA(pin);
                        } else if (activeSelector === 'B') {
                          setPointB(pin);
                        }
                        setPinSelectorModalVisible(false);
                        setActiveSelector(null);
                      }} 
                      style={styles.facilityButton}
                    >
                      {(() => {
                        const imageSource = getOptimizedImage(pin.image);
                        if (typeof imageSource === 'number' || (imageSource && typeof imageSource === 'object' && !imageSource.uri)) {
                          return <Image source={imageSource} style={styles.facilityButtonImage} resizeMode="cover" />;
                        } else {
                          return <ExpoImage source={imageSource} style={styles.facilityButtonImage} contentFit="cover" cachePolicy="disk" />;
                        }
                      })()}
                      <View style={[styles.facilityButtonContent, { flex: 1 }]}>
                        <Text style={styles.facilityName} numberOfLines={2} ellipsizeMode="tail">{pin.description}</Text>
                      </View>
                </TouchableOpacity>
                  );
                })}
            </View>
            ))}
          </ScrollView>
            </Animated.View>
          </>
        )}
      </Modal>

      {/* Fullscreen Image Viewer Modal */}
      <Modal
        visible={isFullscreenImageVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImageVisible(false)}
      >
        <View style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 1001, padding: 10 }}
            onPress={() => setFullscreenImageVisible(false)}
          >
            <Icon name="times" size={30} color="#fff" />
            </TouchableOpacity>
          {fullscreenImageSource && (
            <ImageZoom
              cropWidth={width}
              cropHeight={height}
              imageWidth={width}
              imageHeight={height * 0.8}
              minScale={1}
              maxScale={5}
              enableCenterFocus={false}
            >
              {(() => {
                if (typeof fullscreenImageSource === 'number' || (fullscreenImageSource && typeof fullscreenImageSource === 'object' && !fullscreenImageSource.uri)) {
                  // Local asset - use React Native Image
                  return <Image source={fullscreenImageSource} style={{ width: width, height: height * 0.8 }} resizeMode="contain" />;
                } else {
                  // Remote URL - use ExpoImage for caching
                  return <ExpoImage source={fullscreenImageSource} style={{ width: width, height: height * 0.8 }} contentFit="contain" cachePolicy="disk" />;
                }
              })()}
            </ImageZoom>
          )}
        </View>
      </Modal>

      {/* Alert Modal */}
      <Modal visible={showAlertModal} transparent={true} animationType="fade">
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContainer}>
            <View style={styles.modalHeaderWhite}>
              <Text style={[styles.modalTitleWhite, { marginBottom: 0, flex: 1, textAlign: 'center' }]}>Alert</Text>
            </View>
            <View style={styles.lineDark}></View>
            <View style={{ backgroundColor: '#f5f5f5', padding: 15 }}>
              <Text style={[styles.alertModalMessage, { color: '#333' }]}>{alertMessage}</Text>
            </View>
            <View style={{ backgroundColor: '#f5f5f5', paddingHorizontal: 15, paddingBottom: 15 }}>
            <TouchableOpacity 
              style={styles.alertModalButton}
              onPress={() => setShowAlertModal(false)}
            >
              <Text style={styles.alertModalButtonText}>OK</Text>
            </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Campus Change Modal */}
      {campusRendered && (
        <Animated.View 
          style={[
            styles.campusContainer,
            {
              opacity: campusAnim,
              transform: [
                {
                  translateY: campusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            }
          ]}
        >
          <View style={styles.modalHeaderWhite}>
            <Text style={[styles.modalTitleWhite, { marginBottom: 0, flex: 1, textAlign: 'center' }]}>Select Campus</Text>
          </View>
          <View style={styles.lineDark}></View>
          <View style={{ backgroundColor: '#f5f5f5' }}>
          <FlatList
            data={campuses}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleCampusChange(item)} style={styles.searchItemContainer}>
                <Text style={styles.searchItem}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
        </Animated.View>
      )}
    </View>
  );
};


export default App;
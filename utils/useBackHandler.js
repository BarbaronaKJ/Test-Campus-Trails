import { useEffect } from 'react';
import { BackHandler, Alert } from 'react-native';

/**
 * Custom hook to handle Android back button behavior
 * Closes modals in priority order, shows exit confirmation when no modals are open
 */
export const useBackHandler = ({
  isBuildingDetailsVisible,
  cameFromPinDetails,
  isModalVisible,
  isFilterModalVisible,
  isSettingsVisible,
  isPinsModalVisible,
  isPinSelectorModalVisible,
  showPathfindingPanel,
  isSearchVisible,
  isCampusVisible,
  isAuthModalVisible,
  isUserProfileVisible,
  isFeedbackModalVisible,
  isBuildingSelectionModalVisible,
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
  setIsBuildingSelectionModalVisible,
  setSelectedBuildingsForFeedback,
  setBuildingSearchQuery,
}) => {
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Check if any modal/component is open and close it
      if (isBuildingDetailsVisible) {
        setBuildingDetailsVisible(false);
        if (cameFromPinDetails) {
          setCameFromPinDetails(false);
          setModalVisible(true);
        }
        return true;
      }
      
      // Pin Detail Modal
      if (isModalVisible) {
        setModalVisible(false);
        return true;
      }
      
      // Filter Modal
      if (isFilterModalVisible) {
        setFilterModalVisible(false);
        return true;
      }
      
      // Settings Modal
      if (isSettingsVisible) {
        setSettingsVisible(false);
        return true;
      }
      
      // Pins Modal
      if (isPinsModalVisible) {
        setPinsModalVisible(false);
        return true;
      }
      
      // Pin Selector Modal
      if (isPinSelectorModalVisible) {
        setPinSelectorModalVisible(false);
        setActiveSelector(null);
        return true;
      }
      
      // Pathfinding Panel
      if (showPathfindingPanel) {
        setShowPathfindingPanel(false);
        setPathfindingMode(false);
        setPath([]);
        setPointA(null);
        setPointB(null);
        return true;
      }
      
      // Search Modal
      if (isSearchVisible) {
        setSearchVisible(false);
        return true;
      }
      
      // Campus Modal
      if (isCampusVisible) {
        setCampusVisible(false);
        return true;
      }
      
      // Auth Modal
      if (isAuthModalVisible) {
        setAuthModalVisible(false);
        return true;
      }
      
      // User Profile Modal
      if (isUserProfileVisible) {
        setUserProfileVisible(false);
        return true;
      }
      
      // Feedback Modal
      if (isFeedbackModalVisible) {
        setFeedbackModalVisible(false);
        return true;
      }
      
      // Building Selection Modal
      if (isBuildingSelectionModalVisible) {
        setIsBuildingSelectionModalVisible(false);
        setSelectedBuildingsForFeedback([]);
        setBuildingSearchQuery('');
        return true;
      }
      
      // No modals open - show exit confirmation
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit Campus Trails?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Exit',
            onPress: () => BackHandler.exitApp(),
            style: 'destructive',
          },
        ],
        { cancelable: false }
      );
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [
    isBuildingDetailsVisible,
    cameFromPinDetails,
    isModalVisible,
    isFilterModalVisible,
    isSettingsVisible,
    isPinsModalVisible,
    isPinSelectorModalVisible,
    showPathfindingPanel,
    isSearchVisible,
    isCampusVisible,
    isAuthModalVisible,
    isUserProfileVisible,
    isFeedbackModalVisible,
  ]);
};

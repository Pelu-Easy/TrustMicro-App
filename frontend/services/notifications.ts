import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
// --- FIX: Import Constants explicitly ---
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync() {
  let token;

  try {
    // 1. Check if it's a physical device
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    // 2. Handle Permissions
    // SAFETY: Wrapped in try/catch to prevent startup crashes if service is unreachable
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // 3. Get Project ID safely from app.json
    // --- FIX: Use Constants.expoConfig.extra correctly ---
    const projectId = 
      Constants.expoConfig?.extra?.eas?.projectId || 
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('Project ID not found. Ensure EAS is configured. Notifications will be disabled.');
      return null;
    }

    // 4. Get the actual token
    try {
      // Added a timeout-safe check for the network request
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;
      console.log("Generated Push Token:", token);
    } catch (tokenError: any) {
      // SILENT FAIL: If it's a network error, we log it as a warning so the app doesn't crash
      if (tokenError.message.includes('Network request failed')) {
        console.warn("Push Token Fetching: Network unreachable. Notifications will try again next session.");
      } else {
        console.error("Error fetching expo push token specifically:", tokenError);
      }
      return null;
    }

    // 5. Android Specific Channel Configuration
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Channel',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#003366',
      });
    }

  } catch (globalError) {
    // This catch ensures the app keeps running even if the entire notification module fails
    console.error("Global Notification Utility Error:", globalError);
    return null;
  }

  return token;
}
import Constants from 'expo-constants'; // Added missing import
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync() {
  let token;

  // 1. Check if it's a physical device
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  // 2. Handle Permissions
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
  // We use the slug/path instead of hardcoding the long ID here
  const projectId = 
    Constants?.expoConfig?.extra?.eas?.projectId ?? 
    Constants?.easConfig?.projectId;

  if (!projectId) {
    console.error('Project ID not found in app.json. Ensure you ran npx eas-cli project:init');
    return null;
  }

  // 4. Get the actual token
  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    })).data;
    console.log("Generated Push Token:", token);
  } catch (error) {
    console.error("Error fetching push token:", error);
  }

  // 5. Android Specific Channel Configuration
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default Channel',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#003366',
    });
  }

  return token;
}
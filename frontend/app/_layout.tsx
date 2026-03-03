import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notifications';
import useUserData from '../store/userSignUp';

export default function RootLayout() {
  const { token, _hasHydrated, isSupervisor } = useUserData(); // Added isSupervisor
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  
  const [isReady, setIsReady] = useState(false);

  // 1. Notification Logic
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) console.log("🚀 FINAL PUSH TOKEN:", pushToken);
      } catch (error) {
        console.error("Notification Error:", error);
      }
    };
    setupNotifications();
  }, []);

  // 2. Auth & Navigation Logic
  useEffect(() => {
    // Wait until Store is hydrated AND Navigation is mounted
    if (!_hasHydrated || !navigationState?.key) return;

    const isLoggedIn = !!token && token.length > 10;
    const inAuthGroup = segments[0] === 'login' || 
                        segments[0] === 'sign_up' || 
                        segments[0] === 'forgot_password';

    if (!isLoggedIn && !inAuthGroup) {
      console.log("🔒 No token found, moving to Login");
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      console.log("🔓 Token found, moving to App");
      // Updated for MicroTrust Bank supervisor logic
      if (isSupervisor) {
        router.replace('/'); // Manager Dashboard
      } else {
        router.replace('/(tabs)'); // Officer Tabs
      }
    }

    // FIX: Always set ready if we aren't performing a redirect
    setIsReady(true);
  }, [_hasHydrated, token, segments, navigationState?.key, isSupervisor]);

  // Loading Screen
  if (!_hasHydrated || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="sign_up" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot_password" options={{ title: 'Reset Password' }} />
      <Stack.Screen name="profilesumary" options={{ title: 'Profile Summary' }} />
      <Stack.Screen name="loanDetails" options={{ title: 'Loan Details' }} />
    </Stack>
  );
}
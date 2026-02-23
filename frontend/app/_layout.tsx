import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import useUserData from '../store/userSignUp';
// 1. Import your notification service
import { registerForPushNotificationsAsync } from '../services/notifications';

export default function RootLayout() {
  const { token, _hasHydrated } = useUserData();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // Ensure the store is loaded AND the router has initialized its internal state
  const isReady = _hasHydrated && !!navigationState?.key;

  // --- NEW: Notification Registration Logic ---
  useEffect(() => {
    // We run this as soon as the component mounts to catch the token early
    const setupNotifications = async () => {
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          console.log("🚀 FINAL PUSH TOKEN:", pushToken);
        }
      } catch (error) {
        console.error("Failed to register notifications:", error);
      }
    };

    setupNotifications();
  }, []); 
  // --------------------------------------------

  useEffect(() => {
    // Exit if the app isn't fully ready to handle navigation
    if (!isReady) return;

    const isLoggedIn = !!token;
    const inAuthGroup = segments[0] === 'login' || 
                        segments[0] === 'sign_up' || 
                        segments[0] === 'forgot_password';

    const timeout = setTimeout(() => {
      if (!isLoggedIn && !inAuthGroup) {
        // Not logged in -> Go to Login
        router.replace('/login');
      } else if (isLoggedIn && inAuthGroup) {
        // Logged in but on Auth screen -> Go to App
        router.replace('/(tabs)');
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [token, isReady, segments]);

  // Loading screen while hydration or navigation is pending
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade', 
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="sign_up" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot_password" options={{ title: 'Reset Password' }} />
      <Stack.Screen name="profilesumary" options={{ title: 'Profile Summary' }} />
      <Stack.Screen name="loanDetails" options={{ title: 'Loan Details' }} />
    </Stack>
  );
}
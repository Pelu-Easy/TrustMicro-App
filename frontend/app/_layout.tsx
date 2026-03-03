import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notifications';
import useUserData from '../store/userSignUp';

export default function RootLayout() {
  const { token, _hasHydrated, isSupervisor } = useUserData();
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
    
    // Check if we are currently in an authentication screen
    const inAuthGroup = segments.some(segment => 
      ['login', 'sign_up', 'forgot_password'].includes(segment)
    );

    if (!isLoggedIn) {
      // If not logged in and not already on an auth screen, redirect to login
      if (!inAuthGroup) {
        console.log("🔒 No token found, moving to Login");
        router.replace('/login');
      }
    } else {
      // If logged in and still sitting on an auth screen, move into the app
      if (inAuthGroup) {
        console.log("🔓 Token found, moving to App. Supervisor status:", isSupervisor);
        
        if (isSupervisor) {
          router.replace('/(tabs)/managerDashboard'); 
        } else {
          router.replace('/(tabs)');
        }
      }
    }

    setIsReady(true);
  }, [_hasHydrated, token, segments, navigationState?.key, isSupervisor]);

  // Loading Screen
  if (!_hasHydrated || !isReady || !navigationState?.key) {
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
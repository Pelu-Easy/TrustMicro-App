import { Stack, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notifications';
import useUserData from '../store/userSignUp';

export default function RootLayout() {
  const { token, _hasHydrated, isSupervisor } = useUserData();
  
  // Professional fix: cast as string[] to stop the "red underline" on .length or [0]
  const segments = useSegments() as string[]; 
  const pathname = usePathname();
  
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync().catch(err => console.log("Notification Error:", err));
  }, []);

  useEffect(() => {
    // 1. Wait for hydration and for the Root Navigation to be fully mounted
    if (!_hasHydrated || !navigationState?.key) return;

    const isLoggedIn = !!token && token.length > 10;
    
    // Check current location logic
    const inAuthGroup = segments.some(s => ['login', 'sign_up', 'forgot_password'].includes(s));
    
    // Using pathname is cleaner for checking the absolute root "/"
    const isAtRoot = pathname === '/' || segments.length === 0; 

    // 2. Routing Logic
    if (!isLoggedIn) {
      if (!inAuthGroup) {
        // Use a small delay or setImmediate to ensure the layout is painted
        router.replace('/login');
      }
    } else {
      // If logged in but on auth screens or app entry, redirect to correct dashboard
      if (inAuthGroup || isAtRoot) {
        if (isSupervisor) {
          router.replace('/(tabs)/managerDashboard');
        } else {
          router.replace('/(tabs)');
        }
      }
    }

    setIsReady(true);
  }, [_hasHydrated, token, segments, pathname, navigationState?.key, isSupervisor]);

  // Loading Screen: Prevent "Attempted to navigate before mounting"
  if (!_hasHydrated || !navigationState?.key || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#003366" />
        <Text style={{ marginTop: 10, color: '#003366', fontWeight: '500' }}>Initializing TrustMicro...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="sign_up" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot_password" options={{ title: 'Reset Password' }} />
      <Stack.Screen name="profilesumary" options={{ title: 'Profile Summary' }} />
      <Stack.Screen name="loanDetails" options={{ title: 'Loan Details' }} />
    </Stack>
  );
}
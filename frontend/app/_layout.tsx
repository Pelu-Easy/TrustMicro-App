import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notifications';
import useUserData from '../store/userSignUp';

export default function RootLayout() {
  const { token, _hasHydrated, isSupervisor } = useUserData();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync().catch(err => console.log("Notification Error:", err));
  }, []);

  useEffect(() => {
    // 1. Wait for hydration and navigation mounting
    if (!_hasHydrated || !navigationState?.key) return;

    const isLoggedIn = !!token && token.length > 10;
    
    // Use .some and .includes to avoid the length === 0 type error
    const inAuthGroup = segments.some(s => ['login', 'sign_up', 'forgot_password'].includes(s));
    const isAtRoot = segments.length < 1; 
    const isInsideTabs = segments[0] === '(tabs)';

    // 2. Routing Logic
    if (!isLoggedIn) {
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else {
      // If we are on a login screen OR at the app entry point, redirect to the correct dashboard
      if (inAuthGroup || isAtRoot || isInsideTabs) {
        if (isSupervisor) {
          // Direct Caleb/Managers to the manager dashboard
          router.replace('/(tabs)/managerDashboard');
        } else {
          // Direct Officers to the main tabs index
          router.replace('/(tabs)');
        }
      }
    }

    setIsReady(true);
  }, [_hasHydrated, token, segments, navigationState?.key, isSupervisor]);

  // Loading Screen
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
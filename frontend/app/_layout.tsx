// app/_layout.tsx - COMPLETE UPDATED COPY
import Constants from 'expo-constants';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notifications';
import useUserData from '../store/userSignUp';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { token, _hasHydrated, role } = useUserData();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  // 1. Silent Notification Initializer
  useEffect(() => {
    const isExpoGo = Constants.appOwnership === 'expo';
    if (!isExpoGo) {
      registerForPushNotificationsAsync().catch(() => {});
    }
  }, []);

  // 2. Navigation State Guard with Stability Fix
  useEffect(() => {
    // Only proceed if the navigation state is fully defined and hydrated
    const isNavigationMounted = !!navigationState?.key;
    if (!_hasHydrated || !isNavigationMounted) return;

    const performNavigation = async () => {
      const isLoggedIn = !!token && token.length > 10;
      const inAuthGroup = segments[0] === 'login' || segments[0] === 'sign_up' || segments[0] === 'forgot_password';

      // Stability: Use requestAnimationFrame to ensure the navigator is mounted before replacing routes
      requestAnimationFrame(() => {
        try {
          if (!isLoggedIn && !inAuthGroup) {
            router.replace('/login');
          } else if (isLoggedIn && inAuthGroup) {
            // Automatically push to home if they are logged in but on an auth screen
            router.replace('/(tabs)');
          }
        } catch (e) {
          console.warn("Navigation redirect deferred:", e);
        } finally {
          setIsReady(true);
          // Wait for the UI to paint before hiding splash
          setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 200);
        }
      });
    };

    performNavigation();
  }, [_hasHydrated, navigationState?.key, token]); 

  // 3. Prevent Rendering anything until navigationState is valid
  if (!navigationState?.key || !isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003366" />
        <Text style={styles.loadingText}>Securing Connection...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="sign_up" />
      <Stack.Screen name="forgot_password" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, color: '#003366', fontWeight: '600' }
});
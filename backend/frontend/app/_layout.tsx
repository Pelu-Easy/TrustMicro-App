// app/_layout.tsx - COMPLETE UPDATED COPY FOR SALESTRACKER
import Constants from 'expo-constants';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notifications';
import useUserData from '../store/userSignUp';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { token, _hasHydrated } = useUserData();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  // 1. Notification Setup (Skips in Expo Go to prevent crashes)
  // useEffect(() => {
  //   const isExpoGo = Constants.appOwnership === 'expo';
  //   if (!isExpoGo) {
  //     registerForPushNotificationsAsync().catch(() => {});
  //   }
  // }, []);

  // 2. Navigation Guard Logic
  useEffect(() => {
    const isNavigationMounted = !!navigationState?.key;
    
    // Wait for Zustand to load data and Navigation to be ready
    if (!_hasHydrated || !isNavigationMounted) return;

    const performNavigation = async () => {
      const isLoggedIn = !!token && token.length > 10;
      
      // salesTracker Auth Group: List every file in your app/ folder 
      // that should be accessible BEFORE logging in.
      const authRoutes = ['login', 'sign_up', 'register', 'forgot_password'];
      const currentSegment = segments[0] || '';
      const inAuthGroup = authRoutes.includes(currentSegment);

      // Use requestAnimationFrame for smoother transition on installed apps
      requestAnimationFrame(() => {
        try {
          if (!isLoggedIn && !inAuthGroup) {
            // If not logged in and not on an auth page, go to login
            router.replace('/login');
          } else if (isLoggedIn && inAuthGroup) {
            // If logged in but trying to see login page, go to dashboard
            router.replace('/(tabs)');
          }
          setIsReady(true);
        } catch (e) {
          console.error("Route error:", e);
        }
      });
    };

    performNavigation();
  }, [_hasHydrated, navigationState?.key, token, segments]);

  // 3. Hide Splash Screen only when app logic is settled
  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  // Loading UI while connecting
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Connecting to salesTracker Server...</Text>
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
  loadingContainer: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 15, 
    color: '#007AFF', 
    fontWeight: '700',
    fontSize: 16 
  }
});
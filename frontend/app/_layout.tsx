import { Stack, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notifications';
import useUserData from '../store/userSignUp';

let notificationInitialized = false;

export default function RootLayout() {
  const { 
    token, _hasHydrated, role,
    isSupervisor, isCreditOfficer, isHeadOfCredit, isCCO, isMD, isHeadOfControl 
  } = useUserData();
  
  const segments = useSegments() as string[];
  const pathname = usePathname();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  
  const [isReady, setIsReady] = useState(false);
  const navigationAttempted = useRef(false);

  useEffect(() => {
    if (!notificationInitialized) {
      notificationInitialized = true;
      registerForPushNotificationsAsync().catch(err => console.log("Notification Error:", err));
    }
  }, []);

  useEffect(() => {
    const isNavigationMounted = !!navigationState?.key;
    if (!_hasHydrated || !isNavigationMounted) return;

    // Reset readiness if token disappears to force the loading screen during redirect
    if (!token && isReady && !segments.includes('login')) {
      setIsReady(false);
    }

    const performNavigation = async () => {
      const isLoggedIn = !!token && token.length > 10;
      const inAuthGroup = segments.some(s => ['login', 'sign_up', 'forgot_password'].includes(s));
      
      const userRole = (role || '').toLowerCase();
      const actsAsManagement = 
        isSupervisor || 
        isCreditOfficer || 
        isHeadOfCredit || 
        isCCO || 
        isMD || 
        isHeadOfControl ||
        ['manager', 'supervisor', 'admin', 'cco', 'md', 'head of credit', 'head of control'].includes(userRole);

      console.log(`[Auth Check] LoggedIn: ${isLoggedIn}, Management: ${actsAsManagement}, Role: ${userRole}, Path: ${pathname}`);

      try {
        if (!isLoggedIn) {
          if (!inAuthGroup) {
            navigationAttempted.current = false;
            router.replace('/login');
          }
        } else {
          // Navigation logic for logged in users
          if (actsAsManagement) {
            if (!pathname.includes('managerDashboard')) {
               router.replace('/(tabs)/managerDashboard'); 
            }
          } else {
            if (segments[0] !== '(tabs)' || pathname.includes('managerDashboard')) {
               router.replace('/(tabs)');
            }
          }
          navigationAttempted.current = true;
        }
      } catch (e) {
        console.error("Navigation Redirect Failed", e);
      } finally {
        // Wait a tiny bit for the router to settle before showing the UI
        setTimeout(async () => {
          setIsReady(true);
          await SplashScreen.hideAsync().catch(() => {});
        }, 100);
      }
    };

    const timeout = setTimeout(performNavigation, 250); 
    return () => clearTimeout(timeout);
  }, [_hasHydrated, navigationState?.key, token, role, isSupervisor, isCreditOfficer, isHeadOfCredit, isCCO, isMD, isHeadOfControl]);

  // CRITICAL FIX: The "Stale" guard
  // We hide the Stack if:
  // 1. App isn't hydrated
  // 2. Navigation root isn't mounted
  // 3. User is logged out but the router is still pointing to a protected page (like /profile)
  const isLoggedIn = !!token && token.length > 10;
  const inAuthGroup = segments.some(s => ['login', 'sign_up', 'forgot_password'].includes(s));
  const isTransitioningLogout = !isLoggedIn && !inAuthGroup;

  if (!isReady || !navigationState?.key || isTransitioningLogout) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003366" />
        <Text style={styles.loadingText}>MicroTrust Bank Securing Session...</Text>
      </View>
    );
  }

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade', 
        freezeOnBlur: true, 
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="loanDetails" options={{ headerShown: false }} />
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
    marginTop: 10,
    color: '#003366',
    fontWeight: '600'
  }
});
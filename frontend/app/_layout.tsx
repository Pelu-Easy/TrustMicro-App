// app/_layout.tsx - COMPLETE UPDATED COPY
import { Stack, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
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

  // Initialize Notifications
  useEffect(() => {
    if (!notificationInitialized) {
      notificationInitialized = true;
      registerForPushNotificationsAsync().catch(err => console.log("Notification Error:", err));
    }
  }, []);

  // NAVIGATION LOGIC

  useEffect(() => {
    const isNavigationMounted = !!navigationState?.key;
    if (!_hasHydrated || !isNavigationMounted) return;

    const performNavigation = async () => {
      const isLoggedIn = !!token && token.length > 10;
      const inAuthGroup = segments.some(s => ['login', 'sign_up', 'forgot_password'].includes(s));
      
      const userRole = (role || '').toLowerCase();
      const actsAsManagement = 
        isSupervisor || isCreditOfficer || isHeadOfCredit || isCCO || isMD || isHeadOfControl ||
        ['manager', 'supervisor', 'admin', 'cco', 'md', 'head of credit', 'head of control'].includes(userRole);

      try {
        if (!isLoggedIn) {
          if (!inAuthGroup) {
            router.replace('/login');
          }
        } else {
          // --- FIXED LOGIC HERE ---
          // If they are already in the tabs, STOP forcing a redirect. 
          // This allows them to switch between Home, Insights, and Profile.
          const alreadyInTabs = segments[0] === '(tabs)';

          if (actsAsManagement) {
            // Only redirect to manager dashboard if they are coming from OUTSIDE the tabs (like Login)
            if (!alreadyInTabs) {
              router.replace('/(tabs)/managerDashboard'); 
            }
          } else {
            // For Sales Staff
            if (!alreadyInTabs) {
              router.replace('/(tabs)');
            }
          }
        }
      } catch (e) {
        console.warn("Navigation Redirect Deferred:", e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    const timeout = setTimeout(performNavigation, 300); 
    return () => clearTimeout(timeout);
  }, [_hasHydrated, navigationState?.key, token, role]);

  // STABILITY GUARD: Force state re-evaluation on logout
  const isLoggingOut = !token && !segments.includes('login');
  
  if (!isReady || !navigationState?.key || isLoggingOut) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003366" />
        <Text style={styles.loadingText}>MicroTrust Bank Securing Session...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      {/* The order of these screens matters. 
        When 'token' is null, the (tabs) group should ideally not be accessible.
      */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="login" 
        options={{ 
          presentation: 'fullScreenModal', 
          animation: 'slide_from_bottom',
          gestureEnabled: false // Prevent swiping back to the app while logged out
        }} 
      />
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
    fontWeight: '600',
    fontSize: 14
  }
});
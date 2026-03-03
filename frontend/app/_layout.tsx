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
    isSupervisor, isCreditOfficer, isHeadOfCredit, isCCO, isMD 
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
    if (!_hasHydrated || !isNavigationMounted || navigationAttempted.current) return;

    const performNavigation = async () => {
      const isLoggedIn = !!token && token.length > 10;
      const inAuthGroup = segments.some(s => ['login', 'sign_up', 'forgot_password'].includes(s));
      
      // Comprehensive check for ANY management role
      const userRole = (role || '').toLowerCase();
      const actsAsManagement = 
        isSupervisor || 
        isCreditOfficer || 
        isHeadOfCredit || 
        isCCO || 
        isMD || 
        ['manager', 'supervisor', 'admin', 'cco', 'md', 'head of credit'].includes(userRole);

      console.log(`[Auth Check] LoggedIn: ${isLoggedIn}, Management: ${actsAsManagement}, Role: ${userRole}, Path: ${pathname}`);

      try {
        if (!isLoggedIn) {
          if (!inAuthGroup) {
            router.replace('/login');
          }
        } else {
          // --- REDIRECT LOGIC WITH LOOP PREVENTION ---
          
          if (actsAsManagement) {
            // If already on manager dashboard, do nothing to prevent loops
            if (pathname.includes('managerDashboard')) {
               console.log("✅ Already on Management Dashboard");
            } else {
               console.log("🚀 Navigating to Manager Dashboard");
               router.replace('/(tabs)/managerDashboard'); 
            }
          } else {
            // If already on sales tabs, do nothing
            if (segments[0] === '(tabs)' && !pathname.includes('managerDashboard')) {
               console.log("✅ Already on Sales Officer Tabs");
            } else {
               console.log("🚀 Navigating to Sales Officer Tabs");
               router.replace('/(tabs)');
            }
          }
        }
      } catch (e) {
        console.error("Navigation Redirect Failed", e);
      } finally {
        navigationAttempted.current = true;
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    const timeout = setTimeout(performNavigation, 250); // Slightly longer delay for store stability
    return () => clearTimeout(timeout);
  }, [_hasHydrated, navigationState?.key, token, role, isSupervisor, isCreditOfficer, isHeadOfCredit, isCCO, isMD]);

  if (!isReady || !navigationState?.key) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003366" />
        <Text style={styles.loadingText}>MicroTrust Bank Securing Session...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
      {/* Ensure other screens like loanDetails are accessible */}
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
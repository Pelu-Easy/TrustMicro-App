import { Stack, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { registerForPushNotificationsAsync } from '../services/notifications';
import useUserData from '../store/userSignUp';

// Keep the splash screen visible until we've decided where to go
SplashScreen.preventAutoHideAsync();

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
    const isNavigationMounted = !!navigationState?.key;
    if (!_hasHydrated || !isNavigationMounted) return;

    const isLoggedIn = !!token && token.length > 10;
    const inAuthGroup = segments.some(s => ['login', 'sign_up', 'forgot_password'].includes(s));
    const isAtRoot = pathname === '/' || segments.length === 0; 

    // 2. Use a micro-task delay to ensure the Stack is actually in the view hierarchy
    const timeout = setTimeout(() => {
      if (!isLoggedIn) {
        if (!inAuthGroup) {
          router.replace('/login');
        }
      } else {
        if (inAuthGroup || isAtRoot) {
          if (isSupervisor) {
            router.replace('/(tabs)/managerDashboard');
          } else {
            router.replace('/(tabs)');
          }
        }
      }

      // 3. Mark the app as ready and dismiss splash screen
      setIsReady(true);
      SplashScreen.hideAsync();
    }, 0);

    return () => clearTimeout(timeout);
  }, [_hasHydrated, token, segments, pathname, navigationState?.key, isSupervisor]);

  // Gate: While not ready, return null so the native Splash Screen stays visible.
  // This prevents the "Attempted to navigate before mounting" error.
  if (!isReady || !navigationState?.key) {
    return null;
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
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import useUserData from '@/store/userSignUp';

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  const { isLoggedIn, isSupervisor, role, token } = useUserData();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // 🛡️ Guard 1: Navigation state must exist
    if (!navigationState?.key) return;

    const firstSegment = segments[0] as string | undefined;
    const inTabsGroup = firstSegment === '(tabs)';
    const isAuthPage = firstSegment === 'login' || firstSegment === 'sign_up';
    const isRootIndex = !firstSegment || firstSegment === 'index' || firstSegment === '';

    // 🛡️ Guard 2: The "Mac-Task" Delay
    // Wrapping the navigation logic in a timeout ensures the layout 
    // is fully mounted before 'replace' is called.
    const timeout = setTimeout(() => {
      
      // 1. If not logged in, force Login
      if (!isLoggedIn || !token) {
        if (!isAuthPage) {
          router.replace('/login');
        }
        return;
      }

      // 2. If logged in and hitting an Auth/Root page, send to correct dashboard
      if (isLoggedIn && (isAuthPage || isRootIndex)) {
        const userIsManager = 
          isSupervisor === true || 
          ['manager', 'supervisor', 'admin'].includes(role?.toLowerCase() || '');

        if (userIsManager) {
          router.replace('/'); 
        } else {
          router.replace('/(tabs)');
        }
      }
    }, 1); // Tiny delay to allow mounting

    return () => clearTimeout(timeout);
  }, [isLoggedIn, token, segments, navigationState?.key]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen 
          name="login" 
          options={{ animation: 'fade', gestureEnabled: false }} 
        />
        <Stack.Screen 
          name="sign_up" 
          options={{ animation: 'slide_from_right' }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false, gestureEnabled: false }} 
        />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
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
  
  // 🛡️ This is the key fix for the "Attempted to navigate" error
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // 1. If navigation isn't ready yet, wait.
    if (!navigationState?.key) return;

    const firstSegment = segments[0] as string | undefined;
    const inTabsGroup = firstSegment === '(tabs)';
    const isAuthPage = firstSegment === 'login' || firstSegment === 'sign_up';
    const isRootIndex = !firstSegment || firstSegment === 'index' || firstSegment === '';

    // 2. Auth Guard: No token/not logged in? Force Login.
    if (!isLoggedIn || !token) {
      if (!isAuthPage) {
        console.log("🛡️ No session found. Redirecting to Login.");
        router.replace('/login');
      }
      return;
    }

    // 3. Redirection Logic for logged-in users
    if (isLoggedIn && (isAuthPage || isRootIndex)) {
      const userIsManager = 
        isSupervisor === true || 
        ['manager', 'supervisor', 'admin'].includes(role?.toLowerCase() || '');

      if (userIsManager) {
        console.log("🚀 Manager detected. Redirecting to Admin Panel.");
        router.replace('/'); 
      } else {
        console.log("🚀 Loan Officer detected. Redirecting to Tabs.");
        router.replace('/(tabs)');
      }
    }
  }, [isLoggedIn, token, segments, navigationState?.key]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* We keep index as the primary route for the Manager/Admin dashboard */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        <Stack.Screen 
          name="login" 
          options={{ 
            animation: 'fade', 
            gestureEnabled: false 
          }} 
        />
        
        <Stack.Screen 
          name="sign_up" 
          options={{ 
            animation: 'slide_from_right' 
          }} 
        />
        
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false, 
            gestureEnabled: false 
          }} 
        />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
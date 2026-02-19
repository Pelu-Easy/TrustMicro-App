import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

// Import your user store
import useUserData from '@/store/userSignUp';
// Import your color scheme hook
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  // Ensure that reloading on `/login` keeps a back button to index if needed
  initialRouteName: 'login',
};

export default function RootLayout() {
  const { isLoggedIn, isSupervisor, role } = useUserData();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // 🛡️ NAVIGATION GUARD
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // 🚧 CRITICAL: If the navigation state is not ready, do nothing!
    // This prevents the "Attempted to navigate before mounting" error.
    if (!navigationState?.key) return;

    // 🔍 TypeScript Fix: Cast segments[0] to satisfy the compiler
    const firstSegment = segments[0] as string | undefined;

    const inTabsGroup = firstSegment === '(tabs)';
    const isAuthPage = firstSegment === 'login' || firstSegment === 'sign_up';
    
    // Check if user is at the root ("/") or the index file
    const isRootIndex = !firstSegment || firstSegment === 'index' || firstSegment === '';

    // 1. PROTECTION LOGIC: If not logged in and trying to access the app
    if (!isLoggedIn && (inTabsGroup || isRootIndex)) {
      router.replace('/login');
    } 
    
    // 2. ROLE-BASED REDIRECT: If already logged in and hitting Auth pages or Root
    else if (isLoggedIn && (isAuthPage || isRootIndex)) {
      // Determine role: Managers/Admins go to Admin Panel, others go to Dashboard
      const userIsManager = 
        isSupervisor === true || 
        ['manager', 'supervisor', 'admin', 'super admin'].includes(role?.toLowerCase() || '');

      if (userIsManager) {
        router.replace('/'); 
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isLoggedIn, segments, isSupervisor, role, navigationState?.key]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
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
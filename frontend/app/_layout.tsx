import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
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

  useEffect(() => {
    // 🔍 TypeScript Fix: Cast segments[0] to satisfy the compiler
    const firstSegment = segments[0] as string | undefined;

    const inTabsGroup = firstSegment === '(tabs)';
    const isAuthPage = firstSegment === 'login' || firstSegment === 'sign_up';
    
    // Check if user is at the root ("/") or the index file
    const isRootIndex = !firstSegment || firstSegment === 'index' || firstSegment === '';

    // 1. PROTECTION LOGIC: If not logged in and trying to access the app
    if (!isLoggedIn && (inTabsGroup || isRootIndex)) {
      // Use replace so they can't go "back" to a blank screen
      router.replace('/login');
    } 
    
    // 2. ROLE-BASED REDIRECT: If already logged in and hitting Auth pages or Root
    else if (isLoggedIn && (isAuthPage || isRootIndex)) {
      // Determine role: Managers/Admins go to Admin Panel, others go to Dashboard
      const userIsManager = isSupervisor || role === 'Manager' || role === 'Admin';

      if (userIsManager) {
        // Managers go to the main index (Admin Panel)
        router.replace('/'); 
      } else {
        // Sales Officers go straight to their dashboard tabs
        // Using replace wipes the history so they can't "back" into the Admin Panel
        router.replace('/(tabs)');
      }
    }
  }, [isLoggedIn, segments, isSupervisor, role]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* The order of screens here defines the stack defaults */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        {/* gestureEnabled: false prevents swiping back to these screens */}
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
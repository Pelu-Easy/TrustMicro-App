// 1. Add this import at the top
//import { useColorScheme } from 'react-native'; 
// Use the alias - this points to the root/hooks folder
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

// Import your user store
import useUserData from '../store/userSignUp'; 
// Import your color scheme hook
import { useColorScheme } from '../hooks/use-color-scheme';

export const unstable_settings = {
  // Ensure that reloading on `/login` keeps a back button to index if needed
  initialRouteName: 'login',
};

export default function RootLayout() {
  const { isLoggedIn } = useUserData();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Determine which "group" the user is currently in
    const inTabsGroup = segments[0] === '(tabs)';
    const isAuthPage = segments[0] === 'login' || segments[0] === 'sign_up';

    // 1. PROTECTION LOGIC: Not logged in? Go to Login.
    if (!isLoggedIn && inTabsGroup) {
      router.replace('/login');
    } 
    // 2. REDIRECT LOGIC: Already logged in? Skip Login/SignUp.
    else if (isLoggedIn && isAuthPage) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* The order of screens here defines the stack defaults */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="sign_up" options={{ animation: 'slide_from_right' }} />
        {/* <Stack.Screen name="(tabs)/loanForm" options={{ presentation: 'modal' }} /> */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

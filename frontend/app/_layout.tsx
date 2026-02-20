import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import useUserData from '../store/userSignUp';

export default function RootLayout() {
  const { token, _hasHydrated } = useUserData();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // The app is only truly "Ready" when store is hydrated AND navigation tree is built
  const isReady = _hasHydrated && navigationState?.key;

  useEffect(() => {
    // 1. Safety Check: Do nothing until the app is fully ready
    if (!isReady) return;

    // 2. Determine auth status and current location
    const isLoggedIn = !!token;
    
    // Check if user is currently in the auth screens (login, signup, etc.)
    const inAuthGroup = segments[0] === 'login' || 
                       segments[0] === 'sign_up' || 
                       segments[0] === 'forgot_password';

    // 3. Secure Redirection Logic
    if (!isLoggedIn && !inAuthGroup) {
      // Not logged in -> Force them to Login
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      // Already logged in -> Redirect away from Login screens to Dashboard
      router.replace('/(tabs)');
    }
  }, [token, isReady, segments]);

  // 4. Important: Show loading screen until EVERYTHING is ready
  // This prevents the "Attempted to navigate before mounting" error
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade', 
      }}
    >
      {/* Main App Routes */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Auth Routes */}
      <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="sign_up" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot_password" options={{ title: 'Reset Password' }} />
      
      {/* Individual Detail Routes */}
      <Stack.Screen name="profilesumary" options={{ title: 'Profile Summary' }} />
      <Stack.Screen name="loanDetails" options={{ title: 'Loan Details' }} />
    </Stack>
  );
}
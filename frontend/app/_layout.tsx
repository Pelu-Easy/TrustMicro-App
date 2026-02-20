import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import useUserData from '../store/userSignUp';

export default function RootLayout() {
  const { token, _hasHydrated } = useUserData();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // Ensure the store is loaded AND the router has initialized its internal state
  const isReady = _hasHydrated && !!navigationState?.key;

  useEffect(() => {
    // 1. Exit if the app isn't fully ready to handle navigation
    if (!isReady) return;

    const isLoggedIn = !!token;
    const inAuthGroup = segments[0] === 'login' || 
                       segments[0] === 'sign_up' || 
                       segments[0] === 'forgot_password';

    // 2. The Correction: Wrap navigation in a zero-delay timeout.
    // This forces the router to wait until the current render cycle completes 
    // and the Stack is officially "mounted" in the UI tree.
    const timeout = setTimeout(() => {
      if (!isLoggedIn && !inAuthGroup) {
        // Not logged in -> Go to Login
        router.replace('/login');
      } else if (isLoggedIn && inAuthGroup) {
        // Logged in but on Auth screen -> Go to App
        router.replace('/(tabs)');
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [token, isReady, segments]);

  // 3. Keep showing the loading screen while hydration or navigation is pending.
  // We return a View here, NOT the Stack, to prevent partial renders.
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
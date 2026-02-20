import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import useUserData from '../store/userSignUp';

export default function RootLayout() {
  const { token, _hasHydrated } = useUserData();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // 1. Wait for the store to load from AsyncStorage (Hydration)
    if (!_hasHydrated) return;

    // 2. Wait for the navigation tree to be ready (Prevents the "Root Layout" error)
    if (!navigationState?.key) return;

    // 3. Determine auth status and current location
    const isLoggedIn = !!token;
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'sign_up' || segments[0] === 'forgot_password';

    // 4. Redirection Logic
    if (!isLoggedIn && !inAuthGroup) {
      // If not logged in and not on an auth screen, force login
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      // If logged in but trying to access login/signup, go to dashboard
      router.replace('/(tabs)');
    }
  }, [token, _hasHydrated, navigationState?.key, segments]);

  // 5. Show a loading screen while hydration is in progress
  if (!_hasHydrated) {
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
      {/* The Tabbed App */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Auth Screens */}
      <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="sign_up" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot_password" options={{ title: 'Reset Password' }} />
      
      {/* Profile Summary & Details (Outside Tabs) */}
      <Stack.Screen name="profilesumary" options={{ title: 'Profile Summary' }} />
      <Stack.Screen name="loanDetails" options={{ title: 'Loan Details' }} />
    </Stack>
  );
}
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade', // Smooth transition between Login and Dashboard
      }}
    >
      {/* 1. The Main Tabbed App (Dashboard, Loan Form, etc.) */}
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }} 
      />

      {/* 2. Auth Screens (Outside the tab bar) */}
      <Stack.Screen 
        name="login" 
        options={{ presentation: 'fullScreenModal' }} 
      />
      <Stack.Screen 
        name="sign_up" 
        options={{ title: 'Create Account' }} 
      />
      <Stack.Screen 
        name="forgot_password" 
        options={{ title: 'Reset Password' }} 
      />
    </Stack>
  );
}
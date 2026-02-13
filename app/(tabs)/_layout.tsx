import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import useUserData from '../../store/userSignUp'; // Your Zustand store

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // FIX 1: Pull 'role' out of the store so it is defined in this file
  const { role } = useUserData();

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#003366', 
      tabBarInactiveTintColor: '#94A3B8',
      headerShown: false,
      tabBarStyle: {
        height: 65,
        paddingBottom: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0'
      }
    }}>
      {/* FIX 2: Only ONE "index" screen is allowed. Icons added here. */}
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />
          ),
        }} 
      />

      {/* Access Right: Manager Only Tab */}
      {role === 'Manager' && (
        <Tabs.Screen
          name="managerDashboard"
          options={{
            title: 'Approvals',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "shield-checkmark" : "shield-checkmark-outline"} size={24} color={color} />
            ),
          }}
        />
      )}
      
      <Tabs.Screen
        name="loanForm" 
        options={{
          title: 'New Loan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile" 
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

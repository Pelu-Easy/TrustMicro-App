import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import useUserData from '../../store/userSignUp';

export default function TabLayout() {
  const { isLoggedIn, role, isSupervisor, _hasHydrated } = useUserData();

  // 1. HYDRATION GUARD: Wait for AsyncStorage to finish loading the store
  if (!_hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  // 2. AUTH GUARD: Data is now loaded. If not logged in, redirect to login.
  // Using "as any" to bypass the SDK 54 TypeScript Route warning.
  if (!isLoggedIn) {
    return <Redirect href={"/login" as any} />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#003366',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarStyle: {
          height: 65,
          paddingBottom: 10,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* Access Right: Shows for Manager or Supervisor */}
      <Tabs.Screen
        name="managerDashboard"
        options={{
          title: 'Approvals',
          // If the user doesn't have the right role, we hide the tab by setting href to null
          href: (role?.toLowerCase() === 'manager' || role?.toLowerCase() === 'supervisor' || isSupervisor) 
                ? '/(tabs)/managerDashboard' 
                : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "shield-checkmark" : "shield-checkmark-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="loanForm"
        options={{
          title: 'New Loan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}



// import { Ionicons } from '@expo/vector-icons';
// import { Redirect, Tabs } from 'expo-router';
// import React from 'react';
// import useUserData from '../../store/userSignUp';

// export default function TabLayout() {
//   // FIXED: Added isSupervisor here so it can be used below
//   const { isLoggedIn, role, isSupervisor } = useUserData();

//   // AUTH GUARD: If not logged in, boot to login screen
//   if (!isLoggedIn) {
//     return <Redirect href="/login" />;
//   }

//   return (
//     <Tabs
//       screenOptions={{
//         tabBarActiveTintColor: '#003366',
//         tabBarInactiveTintColor: '#94A3B8',
//         headerShown: false,
//         tabBarStyle: {
//           height: 65,
//           paddingBottom: 10,
//           backgroundColor: '#FFFFFF',
//           borderTopWidth: 1,
//           borderTopColor: '#E2E8F0',
//         },
//       }}
//     >
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: 'Dashboard',
//           tabBarIcon: ({ color, focused }) => (
//             <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
//           ),
//         }}
//       />

//       {/* Access Right: Shows for Manager or Supervisor */}
//       {(role?.toLowerCase() === 'manager' || role?.toLowerCase() === 'supervisor' || isSupervisor) && (
//         <Tabs.Screen
//           name="managerDashboard"
//           options={{
//             title: 'Approvals',
//             tabBarIcon: ({ color, focused }) => (
//               <Ionicons
//                 name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
//                 size={24}
//                 color={color}
//               />
//             ),
//           }}
//         />
//       )}

//       <Tabs.Screen
//         name="loanForm"
//         options={{
//           title: 'New Loan',
//           tabBarIcon: ({ color, focused }) => (
//             <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={24} color={color} />
//           ),
//         }}
//       />

//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: 'Profile',
//           tabBarIcon: ({ color, focused }) => (
//             <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }

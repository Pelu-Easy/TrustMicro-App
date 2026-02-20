import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import useUserData from '../../store/userSignUp';

export default function TabLayout() {
  const { role, isSupervisor } = useUserData();

  // --- SYNCED ROLE LOGIC (Matching index.tsx) ---
  const userRole = role?.toLowerCase() || '';
  const isManagement = 
    isSupervisor === true || 
    ['manager', 'supervisor', 'admin'].includes(userRole);

  // Officers/Sales/Staff get the "New Loan" button
  const canOnboardLoan = !isManagement && 
    ['sales', 'officer', 'staff'].includes(userRole);

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#003366',
      tabBarInactiveTintColor: '#94A3B8',
      headerShown: false, 
    }}>
      
      {/* 1. HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />,
        }}
      />

      {/* 2. MANAGER DASHBOARD (Visible only to Management) */}
      <Tabs.Screen
        name="managerDashboard"
        options={{
          title: 'Approvals',
          tabBarButton: isManagement ? undefined : () => null,
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark-outline" size={24} color={color} />,
        }}
      />

      {/* 3. LOAN FORM (Visible only to Sales/Officers) */}
      <Tabs.Screen
        name="loanForm"
        options={{
          title: 'New Loan',
          tabBarButton: canOnboardLoan ? undefined : () => null, 
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={28} color={color} />,
        }}
      />

      {/* 4. PROFILE */}
      <Tabs.Screen
        name="profilesumary"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />

      {/* HIDE UTILITY ROUTES */}
      <Tabs.Screen name="login" options={{ href: null }} />
      <Tabs.Screen name="sign_up" options={{ href: null }} />
      <Tabs.Screen name="forgot_password" options={{ href: null }} />
      <Tabs.Screen name="loanDetails" options={{ href: null }} />

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

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import useUserData from '../../store/userSignUp';

export default function TabLayout() {
  const { isSupervisor, role } = useUserData();

  // Standardized check for management (Manager and Supervisor)
  const userRole = role?.toLowerCase() || '';
  const isManagement = 
    isSupervisor === true || 
    userRole === 'manager' || 
    userRole === 'supervisor' || 
    userRole === 'admin' ||
    userRole === 'super admin';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#003366',
        headerShown: false,
      }}>
      {/* 1. Dashboard (Home) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />

      {/* 2. Loan Form - HIDDEN FOR MANAGEMENT */}
      <Tabs.Screen
        name="loanForm"
        options={{
          title: 'New Loan',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={24} color={color} />,
          href: isManagement ? null : undefined, // This removes the tab for managers/supervisors
        }}
      />

      {/* 3. Manager Dashboard */}
      <Tabs.Screen
        name="managerDashboard"
        options={{
          title: 'Approvals',
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark" size={24} color={color} />,
        }}
      />

      {/* 4. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

// import { Ionicons } from '@expo/vector-icons';
// import { Tabs } from 'expo-router';
// import useUserData from '../../store/userSignUp';

// export default function TabLayout() {
//   const { role, isSupervisor } = useUserData();

//   // --- SYNCED ROLE LOGIC (Matching index.tsx) ---
//   const userRole = role?.toLowerCase() || '';
//   const isManagement = 
//     isSupervisor === true || 
//     ['manager', 'supervisor', 'admin'].includes(userRole);

//   // Officers/Sales/Staff get the "New Loan" button
//   const canOnboardLoan = !isManagement && 
//     ['sales', 'officer', 'staff'].includes(userRole);

//   return (
//     <Tabs screenOptions={{ 
//       tabBarActiveTintColor: '#003366',
//       tabBarInactiveTintColor: '#94A3B8',
//       headerShown: false, 
//     }}>
      
//       {/* 1. HOME */}
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: 'Home',
//           tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />,
//         }}
//       />

//       {/* 2. MANAGER DASHBOARD (Visible only to Management) */}
//       <Tabs.Screen
//         name="managerDashboard"
//         options={{
//           title: 'Approvals',
//           tabBarButton: isManagement ? undefined : () => null,
//           tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark-outline" size={24} color={color} />,
//         }}
//       />

//       {/* 3. LOAN FORM (Visible only to Sales/Officers) */}
//       <Tabs.Screen
//         name="loanForm"
//         options={{
//           title: 'New Loan',
//           tabBarButton: canOnboardLoan ? undefined : () => null, 
//           tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={28} color={color} />,
//         }}
//       />

//       {/* 4. PROFILE */}
//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: 'Profile',
//           tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
//         }}
//       />

//       {/* HIDE UTILITY ROUTES */}
//       <Tabs.Screen name="login" options={{ href: null }} />
//       <Tabs.Screen name="sign_up" options={{ href: null }} />
//       <Tabs.Screen name="forgot_password" options={{ href: null }} />
//       <Tabs.Screen name="loanDetails" options={{ href: null }} />

//     </Tabs>
//   );
// }

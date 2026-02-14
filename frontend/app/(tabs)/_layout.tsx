import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import useUserData from '../../store/userSignUp';

export default function TabLayout() {
  const { isLoggedIn, role, isSupervisor } = useUserData();
  const [isReady, setIsReady] = useState(false);

  // Check if the store has finished loading from AsyncStorage
  useEffect(() => {
    const checkHydration = async () => {
      // Give the store a moment to initialize
      setIsReady(true);
    };
    checkHydration();
  }, []);

  // Show a loader while the app "remembers" who is logged in
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  // AUTH GUARD: Now we can safely check the state
  if (!isLoggedIn) {
    return <Redirect href="/login" />;
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
          // FIXED: If not a supervisor, we set href to null so the tab disappears 
          // but the component structure stays valid.
          href: (role?.toLowerCase() === 'manager' || role?.toLowerCase() === 'supervisor' || isSupervisor) 
                ? '/(tabs)/managerDashboard' 
                : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "shield-checkmark" : "shield-checkmark-outline"} size={24} color={color} />
          ),
        }}
      />
      {/* {(role?.toLowerCase() === 'manager' || role?.toLowerCase() === 'supervisor' || isSupervisor) && (
        <Tabs.Screen
          name="managerDashboard"
          options={{
            title: 'Approvals',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
      )} */}

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

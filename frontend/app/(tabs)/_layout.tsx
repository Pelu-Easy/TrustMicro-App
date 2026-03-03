import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import useUserData from '../../store/userSignUp';

export default function TabLayout() {
  // --- UPDATED: Pull the fixed boolean flags from our store ---
  const { 
    isSupervisor, 
    isHeadOfCredit, 
    isCCO, 
    isMD, 
    isFinance,
    role 
  } = useUserData();

  const userRole = role?.toLowerCase() || '';

  // --- REFINED: Comprehensive Management Check ---
  // This now correctly identifies Caleb as management because isHeadOfCredit will be true
  const isManagement = 
    isSupervisor || 
    isHeadOfCredit || 
    isCCO || 
    isMD || 
    isFinance ||
    userRole === 'manager' || 
    userRole === 'admin' ||
    userRole === 'super admin' ||
    userRole === 'cfo';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#003366',
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      
      {/* Hide 'New Loan' for management/supervisors */}
      <Tabs.Screen
        name="loanForm"
        options={{
          title: 'New Loan',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={24} color={color} />,
          // Correctly hides for Caleb (Head of Credit)
          href: isManagement ? null : undefined, 
        }}
      />

      <Tabs.Screen
        name="managerDashboard"
        options={{
          title: 'Approvals',
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark" size={24} color={color} />,
          // Correctly shows for Caleb (Head of Credit)
          href: !isManagement ? null : undefined, 
        }}
      />

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
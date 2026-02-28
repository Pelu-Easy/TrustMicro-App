import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import useUserData from '../../store/userSignUp';

export default function TabLayout() {
  const { isSupervisor, role } = useUserData();

  const userRole = role?.toLowerCase() || '';

  // UPDATED: Added 'cfo' to management check to allow access to approvals/finance
  const isManagement = 
    isSupervisor === true || 
    userRole === 'manager' || 
    userRole === 'supervisor' || 
    userRole === 'admin' ||
    userRole === 'super admin' ||
    userRole === 'head of credit' || 
    userRole === 'hoc' ||
    userRole === 'cco' ||
    userRole === 'md' ||
    userRole === 'cfo'; // New role added

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
          // This removes the tab button entirely for management
          href: isManagement ? null : undefined, 
        }}
      />

      <Tabs.Screen
        name="managerDashboard"
        options={{
          title: 'Approvals',
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark" size={24} color={color} />,
          // This removes the tab button for field officers
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
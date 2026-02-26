import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import useUserData from '../../store/userSignUp';

export default function TabLayout() {
  const { isSupervisor, role } = useUserData();

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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="loanForm"
        options={{
          title: 'New Loan',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={24} color={color} />,
          href: isManagement ? null : undefined, 
        }}
      />
      <Tabs.Screen
        name="managerDashboard"
        options={{
          title: 'Approvals',
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark" size={24} color={color} />,
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
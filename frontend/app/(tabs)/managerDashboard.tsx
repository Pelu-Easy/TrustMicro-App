import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications'; // New import for foreground handling
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration // Added for haptic feedback
  ,











  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { registerForPushNotificationsAsync } from '../../services/notifications';
import useUserData from '../../store/userSignUp';

// Configure how the app behaves when a notification arrives while open
// Configure how the app behaves when a notification arrives while open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // Add these two lines to satisfy the newer Expo types:
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

interface LoanItem {
  id: string;
  customerName: string;
  loanType: string;
  loanAmount?: number;
  amount?: string | number;
  createdByEmail: string;
  status: string;
  staffName?: string;
  branchName?: string;
  phone?: string;
  bankName?: string;
  accountNumber?: string;
  ninImageUrl?: string; 
  idImageUrl?: string;   
  passportImageUrl?: string;
  utilityBillUrl?: string;
}

interface StaffItem {
  id: string;
  full_name: string;
  email: string;
  phone_no?: string;
  role: string;
  branch?: string;
  unit?: string;
  is_active: boolean;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const { token, funame, role, isSupervisor } = useUserData();

  const canManage = isSupervisor === true || 
                    role === 'Super Admin' || 
                    role === 'Manager' || 
                    role === 'Admin' || 
                    role === 'Supervisor';

  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingLoans, setPendingLoans] = useState<LoanItem[]>([]);
  const [teamList, setTeamList] = useState<StaffItem[]>([]);
  const [activeTab, setActiveTab] = useState<'loans' | 'team'>('loans');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token || !canManage) return;
    
    try {
      const loanRes = await api.get('/manager/all-loans');
      const teamRes = await api.get('/manager/my-team');
      const unreadRes = await api.get('/notifications/unread-count');
      
      setPendingLoans(loanRes.data.filter((l: LoanItem) => l.status === 'Pending'));
      setTeamList(teamRes.data);
      setUnreadCount(unreadRes.data.count || 0);
    } catch (error: any) {
      console.error("Fetch Error:", error.message);
      if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again.");
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, canManage]);

  // Handle Foreground Notifications (Sound/Vibration/Refresh)
// Handle Foreground Notifications (Sound/Vibration/Refresh)
  useEffect(() => {
    if (!canManage) return;

    const setupNotifications = async () => {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
            try {
                await api.post('/user/update-push-token', { pushToken: pushToken });
            } catch (err) {
                console.error("Failed to update push token on server:", err);
            }
        }
    };
    setupNotifications();

    // FIXED: Corrected the vibration call and typed the notification parameter
    const subscription = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
        // Trigger Vibration pattern: [Wait, Vibrate, Wait, Vibrate]
        Vibration.vibrate([0, 500, 100, 500]);
        // Refresh the list automatically
        fetchData();
    });

    return () => subscription.remove();
  }, [canManage, fetchData]);

  useEffect(() => {
    if (!canManage) {
      router.replace('/(tabs)'); 
    } else {
      fetchData();
    }
  }, [canManage, fetchData]);

  const handleDecision = async (loanId: string, status: 'Approved' | 'Rejected') => {
    Alert.alert("Confirm", `Set loan to ${status}?`, [
      { text: "Cancel" },
      { text: "Yes", onPress: async () => {
          try {
            await api.patch(`/manager/update-status/${loanId}`, { status });
            fetchData();
          } catch (e) { Alert.alert("Error", "Update failed"); }
      }}
    ]);
  };

  const handleStaffToggle = async (item: StaffItem) => {
    const action = item.is_active ? 'Deactivate' : 'Reactivate';
    Alert.alert(`Confirm ${action}`, `Are you sure you want to ${action.toLowerCase()} ${item.full_name}?`, [
        { text: "Cancel" },
        { text: "Yes", onPress: async () => {
            try {
                if (item.is_active) {
                    await api.patch(`/manager/deactivate-staff/${item.id}`, { isActive: false });
                } else {
                    await api.post(`/manager/reactivate-staff`, { staffEmail: item.email });
                }
                Alert.alert("Success", `Staff ${action}d successfully`);
                fetchData();
            } catch (e: any) { 
                Alert.alert("Error", e.response?.data?.error || "Action failed"); 
            }
        }}
    ]);
  };

  if (!canManage) return null;

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#003366" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#003366" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.header}>Admin Panel</Text>
          <Text style={styles.subHeader}>{funame} • {role}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => fetchData()} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#003366" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/notifications')} 
            style={styles.notifBtn}
          >
            <Ionicons name="notifications-outline" size={26} color="#003366" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Pending Tasks</Text>
          <Text style={[styles.statValue, { color: '#C62828' }]}>{pendingLoans.length}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Team Size</Text>
          <Text style={styles.statValue}>{teamList.length}</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'loans' && styles.activeTab]} 
          onPress={() => setActiveTab('loans')}
        >
          <View style={styles.tabItemRow}>
            <Text style={[styles.tabText, activeTab === 'loans' && styles.activeTabText]}>Loans</Text>
            {pendingLoans.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingLoans.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'team' && styles.activeTab]} 
          onPress={() => setActiveTab('team')}
        >
          <Text style={[styles.tabText, activeTab === 'team' && styles.activeTabText]}>My Team</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'loans' ? pendingLoans : teamList}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
        renderItem={({ item }: { item: LoanItem | StaffItem }) => {
          if ('customerName' in item) {
            return (
              <View style={styles.card}>
                <TouchableOpacity 
                  style={{ flex: 1 }}
                  onPress={() => router.push({
                    pathname: "/loanDetails" as any,
                    params: { 
                      id: item.id, 
                      customerName: item.customerName,
                      amount: item.amount || item.loanAmount,
                      loanType: item.loanType,
                      staffName: item.staffName || 'Field Officer',
                      phone: item.phone || '',
                      bankName: item.bankName || '',
                      accountNumber: item.accountNumber || '',
                      ninImageUrl: item.ninImageUrl || '', 
                      idImageUrl: item.idImageUrl || '',
                      passportImageUrl: item.passportImageUrl || '',
                      utilityBillUrl: item.utilityBillUrl || ''
                    }
                  })}
                >
                  <Text style={styles.name}>{item.customerName}</Text>
                  <Text style={styles.details}>
                      {typeof item.amount === 'string' ? item.amount : `₦${Number(item.amount || item.loanAmount || 0).toLocaleString()}`} • {item.loanType}
                  </Text>
                  <View style={styles.staffTag}>
                    <Ionicons name="person-outline" size={12} color="#64748B" />
                    <Text style={styles.staffNameText}>
                      Officer: {item.staffName || 'System'} {item.branchName ? `(${item.branchName})` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleDecision(item.id, 'Approved')}>
                    <Ionicons name="checkmark-circle" size={40} color="#2E7D32" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDecision(item.id, 'Rejected')}>
                    <Ionicons name="close-circle" size={40} color="#C62828" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.full_name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.officer}>{item.unit || item.role} • {item.branch || 'Main'}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]} />
                  <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Deactivated'}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                {item.phone_no && (
                  <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${item.phone_no}`)}>
                    <Ionicons name="call" size={18} color="#003366" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleStaffToggle(item)}>
                   <Ionicons 
                    name={item.is_active ? "remove-circle-outline" : "play-circle-outline"} 
                    size={26} 
                    color={item.is_active ? '#E67E22' : '#27AE60'} 
                   />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, marginBottom: 15 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { marginRight: 15 },
  refreshBtn: { padding: 8 },
  notifBtn: { position: 'relative', padding: 5 },
  notifBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8FAFC',
  },
  notifBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#003366' },
  subHeader: { fontSize: 13, color: '#64748B' },
  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, padding: 15, borderRadius: 16, marginBottom: 20, elevation: 1 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', height: '100%' },
  statLabel: { fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: '600' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#003366', marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, marginHorizontal: 20, marginBottom: 20, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabItemRow: { flexDirection: 'row', alignItems: 'center' },
  activeTab: { backgroundColor: '#fff' },
  tabText: { color: '#64748B', fontWeight: '600' },
  activeTabText: { color: '#003366' },
  badge: { backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginLeft: 6, paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, elevation: 1 },
  avatar: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#4338CA', fontWeight: 'bold', fontSize: 18 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  details: { color: '#003366', fontSize: 14, marginTop: 2, fontWeight: '500' },
  staffTag: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  staffNameText: { fontSize: 11, color: '#64748B', fontStyle: 'italic' },
  officer: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  callBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' }
});
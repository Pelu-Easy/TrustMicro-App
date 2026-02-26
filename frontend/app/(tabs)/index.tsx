import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- STORES ---
import { useLoanStore } from '../../store/loanStore';
import { useStaffStore } from '../../store/staffStore';
import useUserData from '../../store/userSignUp';

const { width } = Dimensions.get('window');

// ✅ Stable notification handler configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // ✅ Added to fix TS error
    shouldShowList: true,   // ✅ Added to fix TS error
  }),
});

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.prototype.props.name;
  color: string;
}

export default function Dashboard() {
  const router = useRouter();

  // STORES
  const loans = useLoanStore((state) => state.loans);
  const fetchLoans = useLoanStore((state) => state.fetchLoans); 
  const { disbursementTarget } = useStaffStore();
  const { funame, token, email, branch, isSupervisor, role, setToken, logout } = useUserData(); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); 

  // --- ROLE LOGIC ---
  const userRole = role?.toLowerCase() || '';
  
  const isManagement = 
    isSupervisor === true || 
    userRole === 'manager' || 
    userRole === 'supervisor' || 
    userRole === 'admin' ||
    userRole === 'super admin';
  
  const canOnboardLoan = !isManagement && (userRole === 'sales' || userRole === 'officer' || userRole === 'staff');

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: () => {
            setToken(null);
            if(logout) logout(); 
            router.replace('/login');
          } 
        }
      ]
    );
  };

  // Improved Fetch Logic
  const fetchAllLoans = useCallback(async () => {
    if (!token || !email) return;
    try {
      await fetchLoans(email, token);
    } catch (error: any) {
      console.log("Dashboard sync failed.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, email, fetchLoans]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch (e) {
      console.log("Failed to fetch unread count");
    }
  }, [token]);

  // ✅ Notification Listeners Effect
  useEffect(() => {
    const foregroundSubscription = Notifications.addNotificationReceivedListener(() => {
      fetchUnreadCount();
      fetchAllLoans();
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/notifications');
    });

    async function requestPermissions() {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    }
    requestPermissions();

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [fetchUnreadCount, fetchAllLoans]);

  useFocusEffect(
    useCallback(() => {
      if (token && token.length > 10 && email) {
        fetchAllLoans();
        fetchUnreadCount(); 
      }
    }, [token, email, fetchAllLoans, fetchUnreadCount])
  );

  useEffect(() => {
    if (!token || !email) {
      const timeout = setTimeout(() => setIsLoading(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [token, email]);

  const totalDisbursed = loans
    .filter(l => l.status === 'Disbursed')
    .reduce((sum, l) => sum + Number(l.loanAmount || 0), 0);

  const disbursementProgress = Math.min(totalDisbursed / (disbursementTarget || 1000000), 1);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllLoans();
    fetchUnreadCount(); 
  };

  const [activeTab, setActiveTab] = useState<'loans' | 'team'>('loans');
  const [team, setTeam] = useState<any[]>([]);

  const fetchTeam = async () => {
    try {
      const response = await api.get('/manager/my-team');
      setTeam(response.data);
    } catch (error) {
      console.error("Error fetching team:", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'team') fetchTeam();
  }, [activeTab]);

  const StatCard = ({ title, value, icon, color }: StatCardProps) => (
    <View style={styles.statCard}>
      <View style={[styles.iconCircleStat, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#003366" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeLabel}>Welcome back,</Text>
            <Text style={styles.userName}>{funame || 'Staff Officer'}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{role || 'Staff'} • {branch || 'Branch'}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <TouchableOpacity 
              style={styles.notiButton} 
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications-outline" size={28} color="#003366" />
              {unreadCount > 0 && (
                <View style={styles.badgeCircle}>
                  <Text style={styles.badgeNumber}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileIcon} onPress={() => router.push('/(tabs)/profile')}>
                <Ionicons name="person-circle-outline" size={45} color="#003366" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={{ marginBottom: 10 }}>
          <View style={styles.actionGrid}>
            {canOnboardLoan && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/loanForm')}>
                <View style={styles.actionIconBg}><Ionicons name="add-circle" size={24} color="#fff" /></View>
                <Text style={styles.actionBtnText}>New Loan</Text>
              </TouchableOpacity>
            )}
            
            {isManagement && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]} 
                onPress={() => router.push('/(tabs)/managerDashboard')}
              >
                <View style={styles.actionIconBg}><Ionicons name="shield-checkmark" size={24} color="#fff" /></View>
                <Text style={styles.actionBtnText}>Approvals</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#64748B' }]}>
              <View style={styles.actionIconBg}><Ionicons name="bar-chart" size={24} color="#fff" /></View>
              <Text style={styles.actionBtnText}>Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={handleLogout}>
              <View style={styles.actionIconBg}><Ionicons name="log-out" size={24} color="#fff" /></View>
              <Text style={styles.actionBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isManagement && (
          <>
            <Text style={styles.sectionTitle}>Target Tracking</Text>
            <View style={styles.targetCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="trending-up" size={20} color="#003366" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Monthly Disbursement Goal</Text>
              </View>
              <Text style={styles.amountText}>₦{totalDisbursed.toLocaleString()}</Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${disbursementProgress * 100}%` }]} />
              </View>
              <Text style={styles.targetGoal}>Goal: ₦{(disbursementTarget / 1000000).toFixed(1)}M</Text>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>{isManagement ? "Portfolio Overview" : "My Statistics"}</Text>
        <View style={styles.statsRow}>
            <StatCard title="Total Loans" value={loans.length.toString()} icon="document-text-outline" color="#003366" />
            <StatCard title="Disbursed" value={loans.filter(l => l.status === 'Disbursed').length.toString()} icon="cash-outline" color="#10B981" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Applications</Text>
          <TouchableOpacity onPress={onRefresh}><Text style={styles.seeAll}>Refresh</Text></TouchableOpacity>
        </View>

        {loans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No loan records found.</Text>
          </View>
        ) : (
          loans.slice(0, 10).map((loan, index) => (
            <TouchableOpacity 
              key={`${loan.id}-${index}`} 
              style={styles.loanItem}
              onPress={() => {
                if (loan.status === 'Draft' && canOnboardLoan) {
                  router.push({
                    pathname: '/(tabs)/loanForm',
                    params: { draftId: loan.id }
                  });
                } else if (loan.status === 'Rejected') {
                  Alert.alert(
                    "Loan Rejected",
                    `REASON: ${loan.rejection_reason || 'Please check your documentation for errors.'}`,
                    [
                      { text: "Dismiss", style: "cancel" },
                      { 
                        text: "Fix & Resubmit", 
                        onPress: () => {
                          router.push({
                            pathname: '/(tabs)/loanForm',
                            params: { draftId: loan.id } 
                          });
                        } 
                      }
                    ]
                  );
                } else {
                  router.push({
                    pathname: '/loanDetails',
                    params: { ...loan }
                  });
                }
              }}
            >
              <View style={styles.loanInfo}>
                <Text style={styles.customerName}>{loan.customerName || "Unnamed Draft"}</Text>
                <Text style={styles.loanDate}>{loan.submittedDate || 'Recently'}</Text>
                
                {loan.status === 'Rejected' && loan.rejection_reason && (
                  <View style={styles.reasonInline}>
                    <Ionicons name="chatbubble-ellipses-outline" size={12} color="#EF4444" />
                    <Text style={styles.reasonInlineText} numberOfLines={1}>
                       Reason: {loan.rejection_reason}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.loanStatusArea}>
                <Text style={styles.loanValue}>₦{Number(loan.loanAmount || 0).toLocaleString()}</Text>
                <View style={[
                    styles.statusBadge, 
                    { 
                      backgroundColor: 
                        loan.status === 'Approved' ? '#DCFCE7' : 
                        loan.status === 'Draft' ? '#FEF9C3' : 
                        loan.status === 'Rejected' ? '#FEE2E2' : '#F1F5F9' 
                    }
                ]}>
                  <Text style={[
                    styles.statusText, 
                    { 
                      color: 
                        loan.status === 'Approved' ? '#166534' : 
                        loan.status === 'Draft' ? '#854D0E' : 
                        loan.status === 'Rejected' ? '#991B1B' : '#475569' 
                    }
                  ]}>
                    {loan.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcomeLabel: { fontSize: 14, color: '#64748B' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#011F3D' },
  badge: { backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 5 },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' },
  profileIcon: { padding: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#011F3D', marginTop: 10, marginBottom: 15 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionBtn: { 
      width: (width - 64) / 4, 
      minWidth: 80,
      backgroundColor: '#003366', 
      borderRadius: 16, 
      padding: 12, 
      alignItems: 'center', 
      elevation: 4, 
      shadowColor: '#000', 
      shadowOpacity: 0.1, 
      shadowRadius: 4 
    },
  actionIconBg: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 8 },
  targetCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 25, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, color: '#475569', fontWeight: '600' },
  amountText: { fontSize: 28, fontWeight: 'bold', color: '#011F3D', marginBottom: 15 },
  progressContainer: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 10 },
  progressBar: { height: '100%', backgroundColor: '#003366', borderRadius: 4 },
  targetGoal: { fontSize: 12, color: '#94A3B8', textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  iconCircleStat: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  statTitle: { fontSize: 12, color: '#64748B' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: '#003366', fontWeight: '700' },
  loanItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  loanInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  loanDate: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  loanStatusArea: { alignItems: 'flex-end' },
  loanValue: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: '#94A3B8', marginTop: 10 },
  reasonInline: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4, backgroundColor: '#FEF2F2', padding: 4, borderRadius: 4, alignSelf: 'flex-start' },
  reasonInlineText: { fontSize: 11, color: '#EF4444', fontWeight: '500', maxWidth: width * 0.4 },
  notiButton: { padding: 5, position: 'relative', marginRight: 5 },
  badgeCircle: { 
    position: 'absolute', 
    right: 0, 
    top: 0, 
    backgroundColor: '#EF4444', 
    borderRadius: 9, 
    width: 18, 
    height: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#F8FAFC' 
  },
  badgeNumber: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});
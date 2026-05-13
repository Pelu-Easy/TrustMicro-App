import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const isExpoGo = Constants.appOwnership === 'expo';

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap; 
  color: string;
}

export default function Dashboard() {
  const router = useRouter();

  // STORES
  const loans = useLoanStore((state) => state.loans);
  const fetchLoans = useLoanStore((state) => state.fetchLoans); 
  const { disbursementTarget } = useStaffStore();
  
  // USER DATA
  const { 
    funame, token, email, branch, role, setToken, logout,
    isSupervisor, isCreditOfficer, isHeadOfCredit, isCCO, isMD, isFinance, _hasHydrated 
  } = useUserData(); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); 

  // --- REFINED ROLE LOGIC ---
  const userRoleLower = role?.toLowerCase() || '';
  const isMarketing = userRoleLower.includes('marketing');
  const isWorkflowUser = isSupervisor || isCreditOfficer || isHeadOfCredit || isCCO || isMD || isFinance || isMarketing;
  const isManagement = isWorkflowUser || ['admin', 'manager'].includes(userRoleLower);
  
  const canOnboardLoan = !isManagement || ['sales', 'officer', 'staff', 'loan officer'].includes(userRoleLower);

  // Helper to determine if a loan needs this specific user's attention
  const isMyTask = useCallback((loanStatus: string) => {
    const status = loanStatus?.toUpperCase();
    if (isCreditOfficer) return status === 'PENDING_CREDIT';
    if (isHeadOfCredit) return status === 'PENDING_HEAD_CREDIT';
    if (isCCO) return status === 'PENDING_CCO';
    if (isMD) return status === 'PENDING_MD';
    if (isFinance) return status === 'APPROVED_FINANCE';
    
    if (isSupervisor || isMarketing || userRoleLower === 'manager') {
        return status === 'PENDING';
    }
    return false;
  }, [isCreditOfficer, isHeadOfCredit, isCCO, isMD, isFinance, isSupervisor, isMarketing, userRoleLower]);

  // --- TRACKER LOGIC ---
  const getStatusProgress = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'DRAFT': return { label: 'Saved Draft', percent: 10, color: '#94A3B8' };
      case 'PENDING': return { label: 'Supervisor Desk', percent: 25, color: '#EAB308' };
      case 'PENDING_CREDIT': 
      case 'PENDING_HEAD_CREDIT': return { label: 'Credit Dept', percent: 50, color: '#3B82F6' };
      case 'PENDING_CCO':
      case 'PENDING_MD': return { label: 'Management Review', percent: 75, color: '#8B5CF6' };
      case 'APPROVED':
      case 'APPROVED_FINANCE': return { label: 'Final Approval', percent: 90, color: '#10B981' };
      case 'DISBURSED': return { label: 'Fully Disbursed', percent: 100, color: '#059669' };
      case 'REJECTED': return { label: 'Rejected', percent: 100, color: '#EF4444' };
      default: return { label: status, percent: 20, color: '#64748B' };
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => { setToken(null); if(logout) logout(); router.replace('/login'); } }
    ]);
  };

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!_hasHydrated || !token || !email) return;
    if (!silent) setIsLoading(true);
    
    try {
      await Promise.all([
        fetchLoans(email, token),
        api.get('/notifications/unread-count').then(res => setUnreadCount(res.data.count || 0)).catch(() => {})
      ]);
    } catch (error) {
      console.log("Dashboard sync failed.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [_hasHydrated, token, email, fetchLoans]);

  useEffect(() => {
    if (!isExpoGo) {
      try {
        const Notifications = require('expo-notifications');
        
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        const foregroundSubscription = Notifications.addNotificationReceivedListener(() => {
          fetchDashboardData(true);
        });
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
          router.push('/notifications');
        });
        return () => {
          foregroundSubscription.remove();
          responseSubscription.remove();
        };
      } catch (error) {
        console.warn("Notification module failed to load:", error);
      }
    }
  }, [fetchDashboardData, router]);

  useFocusEffect(
    useCallback(() => {
      if (token && token.length > 10 && email && _hasHydrated) {
        fetchDashboardData();
      }
    }, [token, email, _hasHydrated, fetchDashboardData])
  );

  // Helper to check ownership dynamically 
  const isLoanOwner = (loan: any) => {
    return (loan.staffEmail === email || loan.createdBy === email || loan.userEmail === email);
  };

  const processedLoans = useMemo(() => {
    if (!loans) return [];
    return [...loans]
      .filter(l => {
        if (isWorkflowUser && isMyTask(l.status)) return true;
        return isLoanOwner(l);
      })
      .sort((a, b) => new Date(b.submittedDate || 0).getTime() - new Date(a.submittedDate || 0).getTime())
      .slice(0, 15);
  }, [loans, isWorkflowUser, isMyTask, email]);

  const totalDisbursed = useMemo(() => {
    if (!loans) return 0;
    return loans
      .filter(l => l.status?.toUpperCase() === 'DISBURSED' && isLoanOwner(l))
      .reduce((sum, l) => sum + Number(l.loanAmount || 0), 0);
  }, [loans, email]);

  const disbursementProgress = useMemo(() => {
    return Math.min(totalDisbursed / (disbursementTarget || 1000000), 1);
  }, [totalDisbursed, disbursementTarget]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  const StatCard = ({ title, value, icon, color }: StatCardProps) => (
    <View style={styles.statCard}>
      <View style={[styles.iconCircleStat, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  if (!_hasHydrated || isLoading) {
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#003366" />}
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
            <TouchableOpacity style={styles.notiButton} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={28} color="#003366" />
              {unreadCount > 0 && (
                <View style={styles.badgeCircle}>
                  <Text style={styles.badgeNumber}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileIcon} onPress={() => router.push('/profile')}>
                <Ionicons name="person-circle-outline" size={45} color="#003366" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {canOnboardLoan && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/loanForm')}>
              <View style={styles.actionIconBg}><Ionicons name="add-circle" size={24} color="#fff" /></View>
              <Text style={styles.actionBtnText}>New Loan</Text>
            </TouchableOpacity>
          )}
          {isManagement && (
            <>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => router.push('/managerDashboard')}>
                <View style={styles.actionIconBg}><Ionicons name="shield-checkmark" size={24} color="#fff" /></View>
                <Text style={styles.actionBtnText}>Approvals</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => router.push('/CustomerList')}>
                <View style={styles.actionIconBg}><Ionicons name="people" size={24} color="#fff" /></View>
                <Text style={styles.actionBtnText}>Customers</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#64748B' }]}><View style={styles.actionIconBg}><Ionicons name="bar-chart" size={24} color="#fff" /></View><Text style={styles.actionBtnText}>Reports</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={handleLogout}><View style={styles.actionIconBg}><Ionicons name="log-out" size={24} color="#fff" /></View><Text style={styles.actionBtnText}>Logout</Text></TouchableOpacity>
        </View>

        {!isManagement && (
          <View style={styles.targetCard}>
            <View style={styles.cardHeader}><Ionicons name="trending-up" size={20} color="#003366" style={{ marginRight: 8 }} /><Text style={styles.cardTitle}>Monthly Disbursement Goal</Text></View>
            <Text style={styles.amountText}>₦{totalDisbursed.toLocaleString()}</Text>
            <View style={styles.progressContainer}><View style={[styles.progressBar, { width: `${disbursementProgress * 100}%` }]} /></View>
            <Text style={styles.targetGoal}>Goal: ₦{(disbursementTarget / 1000000).toFixed(1)}M</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>{isManagement ? "Portfolio Overview" : "My Statistics"}</Text>
        <View style={styles.statsRow}>
            <StatCard title="Total Loans" value={processedLoans.length.toString()} icon="document-text-outline" color="#003366" />
            <StatCard title="Disbursed" value={loans.filter(l => l.status?.toUpperCase() === 'DISBURSED' && isLoanOwner(l)).length.toString()} icon="cash-outline" color="#10B981" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isWorkflowUser ? "Pending My Review" : "Recent Applications"}</Text>
          <TouchableOpacity onPress={onRefresh}><Text style={styles.seeAll}>Refresh</Text></TouchableOpacity>
        </View>

        {processedLoans.length === 0 ? (
          <View style={styles.emptyState}><Ionicons name="folder-open-outline" size={48} color="#CBD5E1" /><Text style={styles.emptyText}>No loan records found.</Text></View>
        ) : (
          processedLoans.map((loan, index) => {
            const track = getStatusProgress(loan.status);
            return (
              <TouchableOpacity key={`${loan.id}-${index}`} style={styles.loanItem} onPress={() => {
                const s = loan.status?.toUpperCase();
                
                if (s === 'DRAFT') {
                  router.push({ pathname: '/loanForm', params: { draftId: loan.id } });
                } else if (s === 'REJECTED') {
                  Alert.alert("Loan Rejected", `REASON: ${loan.rejection_reason || 'Check docs.'}`, [
                    { text: "Dismiss", style: "cancel" },
                    { text: "Fix & Resubmit", onPress: () => router.push({ pathname: '/loanForm', params: { draftId: loan.id } }) }
                  ]);
                } else {
                  router.push({ pathname: '/loanDetails', params: { id: loan.id } });
                }
              }}>
                <View style={styles.loanInfo}>
                  <Text style={styles.customerName}>{loan.customerName || "Unnamed Draft"}</Text>
                  <Text style={styles.loanDate}>{loan.submittedDate || 'Recently'}</Text>
                  <View style={styles.miniTrackerContainer}>
                    <View style={styles.trackerLabelRow}>
                        <Text style={[styles.trackerLabel, { color: track.color }]}>{track.label}</Text>
                        <Text style={styles.trackerPercent}>{track.percent}%</Text>
                    </View>
                    <View style={styles.miniProgressBarBg}>
                      <View style={[styles.miniProgressBarFill, { width: `${track.percent}%`, backgroundColor: track.color }]} />
                    </View>
                  </View>
                </View>
                <View style={styles.loanStatusArea}>
                  <Text style={styles.loanValue}>₦{Number(loan.loanAmount || 0).toLocaleString()}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </View>
              </TouchableOpacity>
            );
          })
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
  actionBtn: { width: (width - 64) / 4, minWidth: 80, backgroundColor: '#003366', borderRadius: 16, padding: 12, alignItems: 'center', elevation: 4 },
  actionIconBg: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 8 },
  targetCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#F1F5F9' },
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
  loanStatusArea: { alignItems: 'flex-end', justifyContent: 'center' },
  loanValue: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 5 },
  emptyState: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: '#94A3B8', marginTop: 10 },
  notiButton: { padding: 5, position: 'relative', marginRight: 5 },
  badgeCircle: { position: 'absolute', right: 0, top: 0, backgroundColor: '#EF4444', borderRadius: 9, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F8FAFC' },
  badgeNumber: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  miniTrackerContainer: { marginTop: 10, paddingRight: 20 },
  trackerLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  trackerLabel: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  trackerPercent: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },
  miniProgressBarBg: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' },
  miniProgressBarFill: { height: '100%', borderRadius: 2 }
});

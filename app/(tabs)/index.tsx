import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

// --- STORES ---
import { useLoanStore } from '../../store/loanStore';
import { useStaffStore } from '../../store/staffStore';
import useUserData from '../../store/userSignUp';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const router = useRouter();

  // STORES
  const loans = useLoanStore((state) => state.loans);
  const setLoans = useLoanStore((state) => state.setLoans);
  const { disbursementTarget } = useStaffStore();
  const { funame, token, branch, isSupervisor, role } = useUserData();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- LOGIC: FETCH FROM DATABASE ---
  const fetchAllLoans = useCallback(async () => {
    if (!token) {
    console.log("No token found in store, skipping fetch.");
    return;
  }
    
    try {
      // The 'api' utility now handles the base URL and the Auth Token via interceptors
      const response = await api.get('/loans',{
      headers: { 
        // Force the header manually to be 100% sure
        Authorization: `Bearer ${token}` 
      }
    });
      
      if (response.data) {
        setLoans(response.data);
      }
    } catch (error: any) {
      console.log("Dashboard sync stopped or failed.");
      // Error is likely handled by your global interceptor alert
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, setLoans]);

  useEffect(() => {
    fetchAllLoans();
  }, [fetchAllLoans]);

  // --- CALCULATIONS ---
  const totalDisbursed = loans
    .filter(l => l.status === 'Disbursed')
    .reduce((sum, l) => sum + Number(l.loanAmount || 0), 0);

  const disbursementProgress = Math.min(totalDisbursed / (disbursementTarget || 1000000), 1);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllLoans();
  };

  // Helper component for Stat Cards
  const StatCard = ({ title, value, icon, color }: { title: string; value: string; icon: any; color: string }) => (
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  // Normalize check for supervisor access
  const hasManagerAccess = isSupervisor || role?.toLowerCase() === 'manager' || role?.toLowerCase() === 'supervisor';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#003366" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER AREA */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeLabel}>Welcome back,</Text>
            <Text style={styles.userName}>{funame || 'Staff Officer'}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{role || 'Staff'} • {branch || 'Branch'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.profileIcon} onPress={() => router.push('/(tabs)/profile' as any)}>
              <Ionicons name="person-circle-outline" size={45} color="#003366" />
          </TouchableOpacity>
        </View>

        {/* QUICK ACTIONS GRID */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
        {!hasManagerAccess && (
          <TouchableOpacity style={styles.actionBtn} 
              onPress={() => router.push('/(tabs)/loanForm' as any)}
            >
            <View style={styles.actionIconBg}><Ionicons name="add-circle" size={24} color="#fff" /></View>
            <Text style={styles.actionBtnText}>New Loan</Text>
          </TouchableOpacity>
          )}
          
          {hasManagerAccess && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => router.push('/(tabs)/managerDashboard' as any)}>
              <View style={styles.actionIconBg}><Ionicons name="shield-checkmark" size={24} color="#fff" /></View>
              <Text style={styles.actionBtnText}>Approvals</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#64748B' }]}>
            <View style={styles.actionIconBg}><Ionicons name="bar-chart" size={24} color="#fff" /></View>
            <Text style={styles.actionBtnText}>Reports</Text>
          </TouchableOpacity>
        </View>

        {/* PERFORMANCE TRACKER (Progress Bar) */}
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

        {/* STATS SECTION */}
        <Text style={styles.sectionTitle}>{hasManagerAccess ? "Portfolio Overview" : "My Statistics"}</Text>
        <View style={styles.statsRow}>
           <StatCard title="Total Loans" value={loans.length.toString()} icon="document-text-outline" color="#003366" />
           <StatCard title="Disbursed" value={loans.filter(l => l.status === 'Disbursed').length.toString()} icon="cash-outline" color="#10B981" />
        </View>

        {/* RECENT LOANS LIST */}
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
          loans.slice(0, 5).map((loan, index) => (
            <View key={`${loan.id}-${index}`} style={styles.loanItem}>
              <View style={styles.loanInfo}>
                <Text style={styles.customerName}>{loan.customerName}</Text>
                <Text style={styles.loanDate}>{loan.submittedDate}</Text>
              </View>
              <View style={styles.loanStatusArea}>
                <Text style={styles.loanValue}>₦{Number(loan.loanAmount || 0).toLocaleString()}</Text>
                <View style={[styles.statusBadge, { backgroundColor: loan.status === 'Approved' ? '#DCFCE7' : '#F1F5F9' }]}>
                  <Text style={[styles.statusText, { color: loan.status === 'Approved' ? '#166534' : '#475569' }]}>{loan.status}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcomeLabel: { fontSize: 14, color: '#64748B' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#011F3D' },
  badge: { backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 5 },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' },
  profileIcon: { padding: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#011F3D', marginTop: 10, marginBottom: 15 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionBtn: { 
     width: (width - 64) / 3, 
     minWidth: 100,
     backgroundColor: '#003366', 
     borderRadius: 16, 
     padding: 15, 
     alignItems: 'center', 
     elevation: 4, 
     shadowColor: '#000', 
     shadowOpacity: 0.1, 
     shadowRadius: 4 
    },
  actionIconBg: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 8 },
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
  emptyText: { color: '#94A3B8', marginTop: 10 }
});
import { Ionicons } from '@expo/vector-icons';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import useUserData from '../../store/userSignUp';

const BRAND = { 
  primary: "#003366", 
  accent: "#2E7D32", 
  bg: "#F8FAFC", 
  card: "#FFFFFF",
  border: "#E2E8F0",
  textSec: "#64748B"
};

// --- TYPES ---
interface LoanItem {
  id: string;
  customerName: string;
  status: string;
  loanAmount?: string;
  amount?: string;
  staffName?: string;
  branchName?: string;
  branch?: string;
  createdAt?: string;
  assignedCreditStaffId?: string; // Field for routing
}

export default function ManagerDashboard() {
  const { 
    token, funame, branch, role, id: userId,
    isSupervisor, isCreditOfficer, isHeadOfCredit, isHeadOfControl, isCCO, isMD,
    _hasHydrated 
  } = useUserData();
  const router = useRouter();

  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0); 

  // Derived role checks
  const isHeadOfMarketing = role?.toLowerCase().trim() === 'head of marketing';
  const isCreditStaff = role?.toLowerCase().trim() === 'credit staff' || isCreditOfficer;

  // --- SECURITY GATE: ROLE-BASED ACCESS CONTROL (RBAC) ---
  useEffect(() => {
    if (!_hasHydrated) return;
    
    const userRole = role?.toLowerCase().trim() || '';
    const isManagementOrCredit = isSupervisor || isCreditStaff || isHeadOfCredit || isHeadOfControl || 
                         isCCO || isMD || isHeadOfMarketing || 
                         ['manager', 'supervisor', 'admin', 'cco', 'md', 'head of credit', 'credit officer', 'head of control', 'head of marketing', 'credit staff'].includes(userRole);

    if (!isManagementOrCredit) {
      // Redirect regular staff (Sales Officers) to the main tabs
      router.replace('/(tabs)');
    }
  }, [_hasHydrated, role, isSupervisor, isCreditStaff, isHeadOfCredit, isHeadOfControl, isCCO, isMD, isHeadOfMarketing]);

  // --- WORKFLOW: GET APPROPRIATE TITLE ---
  const getDashboardTitle = () => {
    if (isMD) return "Managing Director's Desk";
    if (isCCO) return "CCO Approval Basket";
    if (isHeadOfControl) return "Internal Control Desk";
    if (isHeadOfCredit) return "Credit Management Portal";
    if (isCreditStaff) return "My Credit Queue";
    if (isHeadOfMarketing) return "Marketing Approval Desk";
    if (isSupervisor) return "Branch Supervisor Portal";
    return "Management Dashboard";
  };

  // --- WORKFLOW: GET RELEVANT STATUS FILTER ---
  const getTargetStatus = () => {
    // Priority order for status filtering
    if (isMD) return 'PENDING_MD';
    if (isCCO) return 'PENDING_CCO';
    if (isHeadOfControl) return 'PENDING_CONTROL';
    if (isHeadOfCredit) return 'PENDING_HEAD_CREDIT';
    if (isCreditStaff) return 'PENDING_CREDIT';
    if (isHeadOfMarketing || isSupervisor) return 'PENDING'; 
    
    return 'PENDING';
  };

  const fetchData = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      // Logic: Credit Staff should only access 'all-loans' for their basket. 
      // Only Management/Admin see the 'approved-loans' history flow.
      let endpoint = (selectedIndex === 1 && !isCreditStaff) ? '/manager/approved-loans' : '/manager/all-loans';
      
      const response = await api.get(endpoint);
      const allFetchedLoans = response.data || [];
      
      if (selectedIndex === 0) {
        const targetStatus = getTargetStatus();
        
        const workBasket = allFetchedLoans.filter((loan: LoanItem) => {
          // Normalize status comparison to avoid case-sensitivity issues
          const loanStatus = loan.status?.toUpperCase();
          const filterStatus = targetStatus.toUpperCase();
          const statusMatch = loanStatus === filterStatus;
          
          // --- ROUTING LOGIC ---
          // Show if unassigned OR assigned to this specific user
          let assignmentMatch = true;
          if (isCreditStaff) {
            assignmentMatch = !loan.assignedCreditStaffId || loan.assignedCreditStaffId === userId;
          }

          const isHQManagement = isMD || isCCO || isHeadOfControl || isHeadOfCredit || isHeadOfMarketing; 
          const loanBranch = loan.branchName || loan.branch;
          const branchMatch = isHQManagement ? true : (loanBranch === branch);
          
          return statusMatch && branchMatch && assignmentMatch;
        });
        setLoans(workBasket);
      } else {
        // HISTORY VIEW: Blocked for regular Credit Staff
        if (isCreditStaff) {
          setLoans([]);
        } else {
          const isHQManagement = isMD || isCCO || isHeadOfControl || isHeadOfCredit || isHeadOfMarketing;
          if (isHQManagement) {
              setLoans(allFetchedLoans);
          } else {
              const branchHistory = allFetchedLoans.filter((loan: LoanItem) => (loan.branchName === branch || loan.branch === branch));
              setLoans(branchHistory);
          }
        }
      }
      
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        return; 
      }
      console.error("Dashboard Fetch Error:", error.message);
      setLoans([]); 
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, isSupervisor, isCreditStaff, isHeadOfCredit, isHeadOfControl, isCCO, isMD, isHeadOfMarketing, selectedIndex, branch, userId]);

  useEffect(() => {
    if (token && _hasHydrated) fetchData();
  }, [fetchData, selectedIndex, token, _hasHydrated]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const renderLoanItem = ({ item }: { item: LoanItem }) => (
    <TouchableOpacity 
      style={styles.loanCard}
      activeOpacity={0.7}
      onPress={() => router.push({
        pathname: '/loanDetails',
        params: { ...item }
      })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.customerName} numberOfLines={1}>{item.customerName || "Unnamed Customer"}</Text>
        <View style={[
          styles.statusBadge, 
          (item.status === 'Approved' || item.status === 'Disbursed' || item.status === 'APPROVED_FINANCE') && { backgroundColor: '#D1FAE5' }
        ]}>
          <Text style={[
            styles.statusText, 
            (item.status === 'Approved' || item.status === 'Disbursed' || item.status === 'APPROVED_FINANCE') && { color: BRAND.accent }
          ]}>
            {item.status?.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color={BRAND.textSec} />
          <Text style={styles.infoText}>
            ₦{Number(item.loanAmount || item.amount || 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={BRAND.textSec} />
          <Text style={styles.infoText}>{item.staffName || 'Unknown Officer'}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.branchText}>{item.branchName || item.branch || branch}</Text>
        <View style={styles.actionPrompt}>
          <Text style={styles.actionText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={BRAND.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome, {funame?.split(' ')[0]}</Text>
          <Text style={styles.titleText}>{getDashboardTitle()}</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarText}>{funame?.charAt(0)}</Text>
            </View>
        </TouchableOpacity>
      </View>

      <View style={styles.segmentContainer}>
        <SegmentedControl
          values={['Work Basket', 'History']}
          selectedIndex={selectedIndex}
          onChange={(event) => setSelectedIndex(event.nativeEvent.selectedSegmentIndex)}
          tintColor={BRAND.primary}
          backgroundColor="#E2E8F0"
          fontStyle={{color: '#475569'}}
          activeFontStyle={{color: '#FFFFFF', fontWeight: 'bold'}}
        />
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{selectedIndex === 0 ? "Pending Tasks" : "Total Processed"}</Text>
          <Text style={styles.statValue}>{loans.length}</Text>
        </View>
        <View style={[styles.statItem, { borderLeftWidth: 1, borderColor: BRAND.border }]}>
          <Text style={styles.statLabel}>Priority</Text>
          <Text style={[styles.statValue, { fontSize: 14, color: BRAND.accent }]}>
             {selectedIndex === 0 ? "Action Required" : "Archived"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loaderText}>Syncing records...</Text>
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => (item.id || Math.random().toString())}
          renderItem={renderLoanItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[BRAND.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={80} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Queue Clear</Text>
              <Text style={styles.emptySubtitle}>
                No {selectedIndex === 0 ? 'pending' : 'approved'} applications found for {branch}.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: BRAND.card },
  welcomeText: { fontSize: 14, color: BRAND.textSec },
  titleText: { fontSize: 20, fontWeight: 'bold', color: BRAND.primary },
  avatarMini: { width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  profileBtn: { padding: 5 },
  segmentContainer: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: BRAND.card },
  statsBar: { flexDirection: 'row', backgroundColor: BRAND.card, marginHorizontal: 20, marginTop: 10, borderRadius: 15, padding: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, marginBottom: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: BRAND.primary },
  listContent: { padding: 20, paddingTop: 10, paddingBottom: 40 },
  loanCard: { backgroundColor: BRAND.card, borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: BRAND.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 10 },
  statusBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: BRAND.primary, textTransform: 'uppercase' },
  cardBody: { gap: 6, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: '#475569' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  branchText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  actionPrompt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, color: BRAND.primary, fontWeight: '600' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 10, color: BRAND.textSec, fontWeight: '500' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#475569', marginTop: 15 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react'; // Added useRef
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api from '../../services/api'; // Use our secure instance
// Note: Ensure @react-native-segmented-control/segmented-control is installed
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import useUserData from '../../store/userSignUp';

const BRAND = { primary: "#003366", accent: "#2E7D32", bg: "#F8FAFC", card: "#FFFFFF" };

export default function ManagerDashboard() {
  const { 
    token, funame, branch, 
    isSupervisor, isCreditOfficer, isHeadOfCredit, isCCO, isMD
  } = useUserData();
  const router = useRouter();

  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0); 

  // --- WORKFLOW: GET APPROPRIATE TITLE ---
  const getDashboardTitle = () => {
    if (isMD) return "Managing Director's Desk";
    if (isCCO) return "CCO Approval Basket";
    if (isHeadOfCredit) return "Credit Management Portal";
    if (isCreditOfficer) return "Credit Review Basket";
    if (isSupervisor) return "Branch Supervisor Portal";
    return "Management Dashboard";
  };

  // --- WORKFLOW: GET RELEVANT STATUS FILTER ---
  const getTargetStatus = () => {
    if (isSupervisor) return 'Pending';
    if (isCreditOfficer) return 'PENDING_CREDIT';
    if (isHeadOfCredit) return 'PENDING_HEAD_CREDIT';
    if (isCCO) return 'PENDING_CCO';
    if (isMD) return 'PENDING_MD';
    return 'Pending';
  };

  const fetchData = useCallback(async () => {
    // If no token exists, don't even try to fetch
    if (!token) return;

    setIsLoading(true);
    try {
      let endpoint = selectedIndex === 1 ? '/manager/approved-loans' : '/manager/all-loans';
      
      // Use our centralized 'api' instance
      const response = await api.get(endpoint);
      
      if (selectedIndex === 0) {
        const targetStatus = getTargetStatus();
        const workBasket = response.data.filter((loan: any) => 
          loan.status === targetStatus
        );
        setLoans(workBasket);
      } else {
        setLoans(response.data);
      }
      
    } catch (error: any) {
      // --- SILENTLY HANDLE 401 DURING LOGOUT ---
      if (error.response?.status === 401 || !token) {
        console.log("Request aborted due to logout or expired token.");
        return; // Do not console.error or alert
      }
      console.error("Dashboard Fetch Error:", error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, isSupervisor, isCreditOfficer, isHeadOfCredit, isCCO, isMD, selectedIndex]);

  useEffect(() => {
    // Only fetch if token exists
    if (token) {
      fetchData();
    }
  }, [fetchData, selectedIndex, token]); // Added token dependency

  const onRefresh = () => {
    if (!token) return;
    setIsRefreshing(true);
    fetchData();
  };

  // ... renderLoanItem and return statement remain unchanged ...
// ...
  const renderLoanItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.loanCard}
      onPress={() => router.push({
        pathname: '/loanDetails',
        params: { ...item }
      })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <View style={[styles.statusBadge, item.status === 'Approved' && {backgroundColor: '#D1FAE5'}]}>
          <Text style={[styles.statusText, item.status === 'Approved' && {color: BRAND.accent}]}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color="#64748B" />
          <Text style={styles.infoText}>₦{Number(item.amount).toLocaleString()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#64748B" />
          <Text style={styles.infoText}>{item.staffName || 'Unknown Officer'}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.branchText}>{item.branch || branch}</Text>
        <Ionicons name="chevron-forward" size={18} color={BRAND.primary} />
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

      {/* NEW: SEGMENTED CONTROL FOR TOGGLING VIEWS */}
      <View style={styles.segmentContainer}>
        <SegmentedControl
          values={['Pending', 'Approved Loans']}
          selectedIndex={selectedIndex}
          onChange={(event) => {
            setSelectedIndex(event.nativeEvent.selectedSegmentIndex);
          }}
          tintColor={BRAND.primary}
          backgroundColor="#E2E8F0"
          fontStyle={{color: '#475569'}}
          activeFontStyle={{color: '#FFFFFF', fontWeight: 'bold'}}
        />
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{selectedIndex === 0 ? "Pending Tasks" : "Total Approved"}</Text>
          <Text style={styles.statValue}>{loans.length}</Text>
        </View>
        <View style={[styles.statItem, { borderLeftWidth: 1, borderColor: '#E2E8F0' }]}>
          <Text style={styles.statLabel}>Current Stage</Text>
          <Text style={[styles.statValue, { fontSize: 14, color: BRAND.accent }]}>
             {selectedIndex === 0 ? (isMD ? "Final Level" : "Reviewing") : "Finalized"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loaderText}>Loading {selectedIndex === 0 ? 'Work Basket' : 'Approved Loans'}...</Text>
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLoanItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[BRAND.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={80} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>No {selectedIndex === 0 ? 'pending' : 'approved'} loans require your attention.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 10,
    backgroundColor: BRAND.card
  },
  welcomeText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  titleText: { fontSize: 22, fontWeight: 'bold', color: BRAND.primary },
  avatarMini: { width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold' },
  profileBtn: { padding: 5 },
  // NEW STYLE
  segmentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BRAND.card,
  },
  statsBar: { 
    flexDirection: 'row', 
    backgroundColor: BRAND.card, 
    marginHorizontal: 20, 
    marginTop: 10, 
    borderRadius: 15, 
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    marginBottom: 10
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: BRAND.primary },
  listContent: { padding: 20, paddingTop: 10 },
  loanCard: { 
    backgroundColor: BRAND.card, 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  customerName: { fontSize: 17, fontWeight: 'bold', color: '#1E293B', flex: 1 },
  statusBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold', color: BRAND.primary, textTransform: 'uppercase' },
  cardBody: { gap: 8, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: '#475569' },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9' 
  },
  branchText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 10, color: '#64748B' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#475569', marginTop: 15 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
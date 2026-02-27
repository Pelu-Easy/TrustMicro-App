import { Ionicons } from '@expo/vector-icons';
import axios from 'axios/dist/browser/axios.cjs';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useUserData from '../../store/userSignUp';

const BRAND = { primary: "#003366", accent: "#2E7D32", bg: "#F8FAFC", card: "#FFFFFF" };

export default function ManagerDashboard() {
  const { 
    token, funame, branch, 
    isSupervisor, isCreditOfficer, isHeadOfCredit, isCCO, isMD 
  } = useUserData();
  const router = useRouter();

  const [pendingLoans, setPendingLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    if (isSupervisor) return 'Pending'; // Or PENDING_SUPERVISOR depending on your API
    if (isCreditOfficer) return 'PENDING_CREDIT';
    if (isHeadOfCredit) return 'PENDING_HEAD_CREDIT';
    if (isCCO) return 'PENDING_CCO';
    if (isMD) return 'PENDING_MD';
    return 'Pending';
  };

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get('https://trustmicro-app.onrender.com/api/v1/manager/all-loans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const targetStatus = getTargetStatus();
      
      // Filter loans based on the specific stage this user handles
      const workBasket = response.data.filter((loan: any) => 
        loan.status === targetStatus
      );

      setPendingLoans(workBasket);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, isSupervisor, isCreditOfficer, isHeadOfCredit, isCCO, isMD]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

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
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
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
          <Text style={styles.welcomeText}>Welcome, {funame.split(' ')[0]}</Text>
          <Text style={styles.titleText}>{getDashboardTitle()}</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
           <View style={styles.avatarMini}>
             <Text style={styles.avatarText}>{funame.charAt(0)}</Text>
           </View>
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pending Tasks</Text>
          <Text style={styles.statValue}>{pendingLoans.length}</Text>
        </View>
        <View style={[styles.statItem, { borderLeftWidth: 1, borderColor: '#E2E8F0' }]}>
          <Text style={styles.statLabel}>Current Stage</Text>
          <Text style={[styles.statValue, { fontSize: 14, color: BRAND.accent }]}>
             {isMD ? "Final Level" : "Reviewing"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loaderText}>Loading Work Basket...</Text>
        </View>
      ) : (
        <FlatList
          data={pendingLoans}
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
              <Text style={styles.emptySubtitle}>No pending loans require your attention in the {getDashboardTitle()}.</Text>
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
  statsBar: { 
    flexDirection: 'row', 
    backgroundColor: BRAND.card, 
    marginHorizontal: 20, 
    marginTop: -10, 
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
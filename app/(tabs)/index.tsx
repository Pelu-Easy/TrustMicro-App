import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  ActivityIndicator, TouchableOpacity, Alert, Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// --- STORES ---
import { useLoanStore } from '../../store/loanStore';
import { useStaffStore } from '../../store/staffStore';
import useUserData from '../../store/userSignUp';

const { width } = Dimensions.get('window');
const API_URL = 'http://192.168.100.120';

export default function Dashboard() {
  //const { loans, setLoans } = useLoanStore();
  const loans = useLoanStore((state) => state.loans);
  const setLoans = useLoanStore((state) => state.setLoans);
  const { disbursementTarget, savingsTarget } = useStaffStore();
  const { funame, email, token, branch } = useUserData();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- LOGIC: FETCH FROM DATABASE ---
  const fetchAllLoans = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/loans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Select the setter from the store
      const setLoans = useLoanStore.getState().setLoans;
      setLoans(response.data);
      
    } catch (error: any) {
      console.error("Dashboard Sync Error:", error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
};

  // const fetchAllLoans = async () => {
  //   if (!token) return;
  //   try {
  //     const response = await axios.get(`${API_URL}/loans`, {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });
  //     // Sync database results with your local store
  //     setLoans(response.data, email);
  //   } catch (error: any) {
  //     console.error("Dashboard Sync Error:", error.message);
  //   } finally {
  //     setIsLoading(false);
  //     setRefreshing(false);
  //   }
  // };

  useEffect(() => {
    fetchAllLoans();
  }, [token]);

  // --- CALCULATIONS FOR PROGRESS BARS ---
  const totalDisbursed = loans
    .filter(l => l.status === 'Disbursed')
    .reduce((sum, l) => sum + Number(l.loanAmount || 0), 0);

  const disbursementProgress = Math.min(totalDisbursed / disbursementTarget, 1);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllLoans();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#003366" />}
      >
        {/* HEADER AREA */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>TrustMicro {branch || 'Staff'}</Text>
            <Text style={styles.userName}>{funame || 'Staff Officer'}</Text>
          </View>
          <TouchableOpacity style={styles.iconCircle}>
            <Ionicons name="notifications-outline" size={22} color="#003366" />
          </TouchableOpacity>
        </View>

        {/* TARGET CARDS SECTION */}
        <Text style={styles.sectionTitle}>Performance Trackers</Text>
        
        <View style={styles.targetCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="cash-outline" size={20} color="#0369A1" />
            </View>
            <Text style={styles.cardTitle}>Disbursement Target</Text>
          </View>
          <Text style={styles.amountText}>₦{totalDisbursed.toLocaleString()}</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${disbursementProgress * 100}%` }]} />
          </View>
          <Text style={styles.targetGoal}>Goal: ₦{(disbursementTarget / 1000000).toFixed(1)}M</Text>
        </View>

        {/* RECENT LOANS SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Applications</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.seeAll}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No loan records found for this month.</Text>
          </View>
        ) : (
          loans.map((loan) => (
            <View key={loan.id} style={styles.loanItem}>
              <View style={styles.loanInfo}>
                <Text style={styles.customerName}>{loan.customerName}</Text>
                <Text style={styles.loanDate}>{loan.submittedDate}</Text>
              </View>
              <View style={styles.loanStatusArea}>
                <Text style={styles.loanValue}>{loan.amount}</Text>
                <View style={[
                  styles.badge, 
                  { backgroundColor: loan.status === 'Approved' || loan.status === 'Disbursed' ? '#DCFCE7' : '#FEF2F2' }
                ]}>
                  <Text style={[
                    styles.badgeText,
                    { color: loan.status === 'Approved' || loan.status === 'Disbursed' ? '#166534' : '#991B1B' }
                  ]}>
                    {loan.status}
                  </Text>
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
  welcomeText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#011F3D' },
  iconCircle: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#011F3D', marginBottom: 15 },
  targetCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 25, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBg: { padding: 8, borderRadius: 10, marginRight: 12 },
  cardTitle: { fontSize: 15, color: '#475569', fontWeight: '600' },
  amountText: { fontSize: 26, fontWeight: 'bold', color: '#011F3D', marginBottom: 15 },
  progressContainer: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 10 },
  progressBar: { height: '100%', backgroundColor: '#003366', borderRadius: 4 },
  targetGoal: { fontSize: 12, color: '#94A3B8', textAlign: 'right' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  seeAll: { color: '#003366', fontWeight: '600' },
  loanItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderRadius: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#003366' },
  loanInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  loanDate: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  loanStatusArea: { alignItems: 'flex-end' },
  loanValue: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#94A3B8', marginTop: 10 }
});


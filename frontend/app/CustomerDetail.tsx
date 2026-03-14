import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CustomerDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse the customer object passed via navigation
  const customer = typeof params.customer === 'string' 
    ? JSON.parse(params.customer) 
    : params;

  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customer?.bvn) {
      fetchLoanHistory();
    }
  }, [customer?.bvn]);

  const fetchLoanHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Using relative path to utilize your axios base configuration
      const response = await axios.get(`/api/v1/manager/customer-loans/${customer.bvn}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoans(response.data);
    } catch (error) {
      console.error("History fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderLoanItem = ({ item }: any) => (
    <View style={styles.loanCard}>
      <View style={styles.loanInfo}>
        <Text style={styles.loanType}>{item.loanType || 'Personal'} Loan</Text>
        <Text style={styles.loanAmount}>₦{Number(item.loanAmount || 0).toLocaleString()}</Text>
      </View>
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Disbursed' ? '#E8F5E9' : '#E3F2FD' }]}>
          <Text style={[styles.statusText, { color: item.status === 'Disbursed' ? '#2E7D32' : '#007BFF' }]}>
            {item.status}
          </Text>
        </View>
        <Text style={styles.loanDate}>{item.submittedDate || 'N/A'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Navigation */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#003366" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Customer Profile</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <FlatList
        data={loans}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderLoanItem}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            <View style={styles.profileHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{customer.full_name?.charAt(0)}</Text>
              </View>
              <Text style={styles.customerName}>{customer.full_name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.kycBadge, { backgroundColor: customer.kyc_status === 'VERIFIED' ? '#10B981' : '#F59E0B' }]}>
                  <Text style={styles.kycText}>{customer.kyc_status}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="finger-print" size={20} color="#64748B" />
                <Text style={styles.infoLabel}>BVN:</Text>
                <Text style={styles.infoValue}>{customer.bvn}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#64748B" />
                <Text style={styles.infoLabel}>Joined:</Text>
                <Text style={styles.infoValue}>{new Date(customer.created_at).toLocaleDateString()}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Loan History</Text>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#003366" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="file-tray-outline" size={48} color="#CBD5E1" />
              <Text style={styles.empty}>No loan history found.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10 },
  backButton: { padding: 8 },
  navTitle: { fontSize: 18, fontWeight: 'bold', color: '#003366' },
  scrollContent: { padding: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 25 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#003366', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  customerName: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', textAlign: 'center' },
  badgeRow: { marginTop: 8 },
  kycBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  kycText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  infoSection: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 30, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#64748B', marginLeft: 10, width: 60 },
  infoValue: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#0F172A' },
  loanCard: { 
    backgroundColor: '#FFF', padding: 16, borderRadius: 12, 
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  loanInfo: { flex: 1 },
  loanType: { fontSize: 14, color: '#64748B' },
  loanAmount: { fontSize: 18, color: '#0F172A', fontWeight: 'bold', marginTop: 4 },
  statusContainer: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  loanDate: { fontSize: 11, color: '#94A3B8' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 10, color: '#94A3B8' }
});

export default CustomerDetail;
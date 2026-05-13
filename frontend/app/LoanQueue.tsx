import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl, SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import api from '../services/api';

// Types for our Loan Entry
interface Loan {
  id: string;
  customer_name: string;
  amount: number;
  status: string;
  risk_score: 'LOW' | 'MEDIUM' | 'HIGH';
  assigned_to: string;
  workload_count: number; 
  created_at: string;
}

export default function LoanQueue() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = async () => {
    setError(null);
    if (!refreshing) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Retrieve user info to check role
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;

      // We append a query param ?personal=true if the user is not a supervisor
      // This tells your backend: "Only give me loans I created"
      const isSupervisor = user?.role === 'Manager' || user?.is_supervisor === 1;
      const endpoint = isSupervisor ? '/manager/loan-queue' : '/manager/loan-queue?personal=true';

      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLoans(response.data);
    } catch (err) {
      setError("Failed to sync queue. Check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  // LEAST BUSY LOGIC: Identify the officer with the lightest load
  const leastBusyOfficer = useMemo(() => {
    if (loans.length === 0) return null;
    return loans.reduce((prev, curr) => 
      prev.workload_count < curr.workload_count ? prev : curr
    ).assigned_to;
  }, [loans]);

  const getRiskColor = (score: string) => {
    switch (score) {
      case 'HIGH': return '#EF4444';
      case 'MEDIUM': return '#F59E0B';
      default: return '#10B981';
    }
  };

  const renderLoanItem = ({ item }: { item: Loan }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push({ pathname: '/loan_details', params: { id: item.id } } as any)}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.loanAmount}>₦{item.amount.toLocaleString()}</Text>
        </View>
        <View style={[styles.riskBadge, { borderColor: getRiskColor(item.risk_score) }]}>
          <Text style={[styles.riskText, { color: getRiskColor(item.risk_score) }]}>
            {item.risk_score} RISK
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.infoRow}>
          <Ionicons name="person-circle-outline" size={16} color="#64748B" />
          <Text style={styles.footerText}>Assigned: {item.assigned_to}</Text>
          {item.assigned_to === leastBusyOfficer && (
            <View style={styles.optimalBadge}>
              <Text style={styles.optimalText}>OPTIMAL</Text>
            </View>
          )}
        </View>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Approval Queue</Text>
        <Text style={styles.subtitle}>{loans.length} Applications Pending</Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={48} color="#475569" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchQueue}>
            <Text style={styles.retryText}>Retry Sync</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          renderItem={renderLoanItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchQueue(); }} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>The queue is clear. No pending loans.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, backgroundColor: '#1E293B' },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  list: { padding: 15 },
  card: { 
    backgroundColor: '#1E293B', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#334155' 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  customerName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loanAmount: { color: '#10B981', fontSize: 18, fontWeight: '800', marginTop: 2 },
  riskBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  riskText: { fontSize: 10, fontWeight: '900' },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#334155' 
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { color: '#94A3B8', fontSize: 12 },
  optimalBadge: { backgroundColor: '#10B98120', paddingHorizontal: 6, borderRadius: 4 },
  optimalText: { color: '#10B981', fontSize: 9, fontWeight: 'bold' },
  dateText: { color: '#475569', fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#94A3B8', textAlign: 'center', marginTop: 12, marginBottom: 20 },
  retryBtn: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyText: { color: '#475569', textAlign: 'center', marginTop: 40 }
});
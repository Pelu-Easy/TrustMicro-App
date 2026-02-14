import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import useUserData from '../../store/userSignUp';

const API_URL = 'http://192.168.88.38:5000/api/v1'; 

// Interface to fix VS Code red underlines
interface LoanItem {
  id: string;
  customerName: string;
  loanType: string;
  loanAmount?: number;
  amount?: number;
  createdByEmail: string;
  status: string;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [pendingLoans, setPendingLoans] = useState<LoanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get user details from Zustand store
  const { token, funame, department } = useUserData();

  const fetchAllPending = useCallback(async () => {
    if (!token) {
      Alert.alert("Session Expired", "Please login again.");
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/manager/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingLoans(response.data);
    } catch (error: any) {
      console.error("Manager Fetch Error:", error.response?.data || error.message);
      Alert.alert("Access Denied", "Only Supervisors/Managers can view this page.");
      router.back();
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, router]);

  useEffect(() => {
    fetchAllPending();
  }, [fetchAllPending]);

  const handleDecision = async (loanId: string, status: 'Approved' | 'Rejected') => {
    Alert.alert(
      "Confirm Action",
      `Are you sure you want to ${status.toLowerCase()} this loan?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Proceed", 
          onPress: async () => {
            try {
              await axios.patch(`${API_URL}/manager/approve/${loanId}`, 
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert("Success", `Loan application ${status}`);
              fetchAllPending(); 
            } catch (error: any) {
              Alert.alert("Error", error.response?.data?.error || "Action failed");
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#003366" />
        </TouchableOpacity>
        <View>
          <Text style={styles.header}>Supervisor Portal</Text>
          <Text style={styles.subHeader}>{funame} • {department || 'Management'}</Text>
        </View>
      </View>
      
      <FlatList
        data={pendingLoans}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchAllPending} tintColor="#003366" />
        }
        renderItem={({ item }) => (
          <View style={styles.loanCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.customerName}</Text>
              <Text style={styles.details}>
                {item.loanType} • ₦{Number(item.loanAmount || item.amount || 0).toLocaleString()}
              </Text>
              <Text style={styles.officer}>Officer: {item.createdByEmail}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleDecision(item.id, 'Approved')}>
                <Ionicons name="checkmark-circle" size={44} color="#2E7D32" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDecision(item.id, 'Rejected')}>
                <Ionicons name="close-circle" size={44} color="#C62828" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={80} color="#CBD5E1" />
            <Text style={styles.emptyText}>No pending applications for review.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  backBtn: { marginRight: 15, padding: 5 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#003366' },
  subHeader: { fontSize: 13, color: '#64748B', textTransform: 'capitalize' },
  loanCard: { 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  name: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
  details: { color: '#003366', fontSize: 14, fontWeight: '700', marginTop: 3 },
  officer: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 15, fontSize: 16 }
});
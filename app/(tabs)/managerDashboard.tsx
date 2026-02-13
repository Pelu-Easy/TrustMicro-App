import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import useUserData from '../../store/userSignUp'; // Import the store to get the token

// Replace with your machine's local IP address
const API_URL = 'http://192.168.100.120/api/v1'; 

export default function ManagerDashboard() {
  const [pendingLoans, setPendingLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Get the secure token from the Zustand store
  const { token } = useUserData();

  const fetchAllPending = useCallback(async () => {
    if (!token) return;

    try {
      // 2. Attach JWT to the GET request
      const response = await axios.get(`${API_URL}/manager/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingLoans(response.data);
    } catch (error: any) {
      console.error("Manager Fetch Error:", error.response?.data || error.message);
      Alert.alert("Access Denied", "Could not fetch pending loans. Verify manager permissions.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllPending();
  }, [fetchAllPending]);

  const handleDecision = async (loanId: string, status: 'Approved' | 'Rejected') => {
    try {
      // 3. Attach JWT to the PATCH request for approval
      await axios.patch(`${API_URL}/manager/approve/${loanId}`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert("Success", `Loan application ${status}`);
      fetchAllPending(); // Refresh the list
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Action failed");
    }
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
      <Text style={styles.header}>Pending Approvals</Text>
      
      <FlatList
        data={pendingLoans}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchAllPending} />
        }
        renderItem={({ item }) => (
          <View style={styles.loanCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.customerName}</Text>
              <Text style={styles.details}>{item.loanType} • {item.amount}</Text>
              <Text style={styles.officer}>Officer: {item.createdByEmail}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleDecision(item.id, 'Approved')}>
                <Ionicons name="checkmark-circle" size={38} color="#2E7D32" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDecision(item.id, 'Rejected')}>
                <Ionicons name="close-circle" size={38} color="#C62828" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: '#94A3B8' }}>No loans awaiting review.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#003366' },
  loanCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2 
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  details: { color: '#64748B', fontSize: 13 },
  officer: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10 }
});

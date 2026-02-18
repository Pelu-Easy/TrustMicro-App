import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import axios from 'axios/dist/browser/axios.cjs';
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

const API_URL = 'https://trustmicro-app.onrender.com/api/v1'; 

interface LoanItem {
  id: string;
  customerName: string;
  loanType: string;
  loanAmount?: number;
  amount?: string | number;
  createdByEmail: string;
  status: string;
  staffName?: string;
  branchName?: string;
  ninImageUrl?: string; 
  idImageUrl?: string;  
}

interface StaffItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const { token, funame, role, isSupervisor } = useUserData();

  // Unified permission check
  const canManage = role === 'Super Admin' || isSupervisor === true;

  const [pendingLoans, setPendingLoans] = useState<LoanItem[]>([]);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [activeTab, setActiveTab] = useState<'loans' | 'staff'>('loans');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      if (activeTab === 'loans') {
        const res = await axios.get(`${API_URL}/manager/all-loans`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingLoans(res.data.filter((l: LoanItem) => l.status === 'Pending'));
      } else if (canManage) {
        const res = await axios.get(`${API_URL}/manager/staff-list`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStaffList(res.data);
      }
    } catch (error: any) {
      console.error("Fetch Error:", error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, activeTab, canManage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDecision = async (loanId: string, status: 'Approved' | 'Rejected') => {
    if (!canManage) {
      Alert.alert("Denied", "You do not have permission to approve/reject loans.");
      return;
    }
    Alert.alert("Confirm", `Set loan to ${status}?`, [
      { text: "Cancel" },
      { text: "Yes", onPress: async () => {
          try {
            await axios.patch(`${API_URL}/manager/update-status/${loanId}`, { status }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
          } catch (e) { Alert.alert("Error", "Update failed"); }
      }}
    ]);
  };

  const handleDeactivate = async (staffId: string, currentStatus: boolean) => {
    if (!canManage) return;
    try {
      await axios.patch(`${API_URL}/manager/deactivate-staff/${staffId}`, 
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", `Staff ${!currentStatus ? 'Activated' : 'Deactivated'}`);
      fetchData();
    } catch (e) { Alert.alert("Error", "Action failed"); }
  };

  const handleDelete = async (staffId: string) => {
    if (role !== 'Super Admin') return;
    Alert.alert("HARD DELETE", "This permanently removes the staff account. Proceed?", [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
          try {
            await axios.delete(`${API_URL}/manager/delete-staff/${staffId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
          } catch (e) { Alert.alert("Error", "Delete failed"); }
      }}
    ]);
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#003366" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#003366" />
        </TouchableOpacity>
        <View>
          <Text style={styles.header}>{canManage ? "Admin Panel" : "Loan Review"}</Text>
          <Text style={styles.subHeader}>{funame} • {role}</Text>
        </View>
      </View>

      {/* TABS: Only visible if user has management rights */}
      {canManage && (
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'loans' && styles.activeTab]} 
            onPress={() => setActiveTab('loans')}
          >
            <Text style={[styles.tabText, activeTab === 'loans' && styles.activeTabText]}>Loans</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'staff' && styles.activeTab]} 
            onPress={() => setActiveTab('staff')}
          >
            <Text style={[styles.tabText, activeTab === 'staff' && styles.activeTabText]}>Staff</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={activeTab === 'loans' ? pendingLoans : staffList}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
        renderItem={({ item }: { item: LoanItem | StaffItem }) => {
          
          // --- LOAN ITEM RENDER ---
          if ('customerName' in item) {
            return (
              <View style={styles.card}>
                <TouchableOpacity 
                  style={{ flex: 1 }}
                  onPress={() => router.push({
                    pathname: "/loanDetails" as any,
                    params: { 
                      id: item.id, 
                      customerName: item.customerName,
                      amount: item.amount,
                      loanType: item.loanType,
                      staffName: item.staffName || 'Field Officer',
                      ninImage: item.ninImageUrl || '', 
                      idImage: item.idImageUrl || '' 
                    }
                  })}
                >
                  <Text style={styles.name}>{item.customerName}</Text>
                  <Text style={styles.details}>
                      {typeof item.amount === 'string' ? item.amount : `₦${Number(item.amount || 0).toLocaleString()}`} • {item.loanType}
                  </Text>
                  
                  <View style={styles.staffTag}>
                    <Ionicons name="person-outline" size={12} color="#64748B" />
                    <Text style={styles.staffNameText}>
                      Officer: {item.staffName || 'System'} {item.branchName ? `(${item.branchName})` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>

                {canManage && (
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => handleDecision(item.id, 'Approved')}>
                      <Ionicons name="checkmark-circle" size={40} color="#2E7D32" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDecision(item.id, 'Rejected')}>
                      <Ionicons name="close-circle" size={40} color="#C62828" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }

          // --- STAFF ITEM RENDER (ONLY REACHABLE BY MANAGERS) ---
          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.officer}>{item.role} • {item.email}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleDeactivate(item.id, item.is_active)}>
                  <Text style={{ color: item.is_active ? 'orange' : 'green', fontWeight: 'bold' }}>
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                {role === 'Super Admin' && (
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash" size={24} color="red" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { marginRight: 15 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#003366' },
  subHeader: { fontSize: 13, color: '#64748B' },
  tabBar: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, marginBottom: 20, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#fff' },
  tabText: { color: '#64748B', fontWeight: '600' },
  activeTabText: { color: '#003366' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2 },
  name: { fontSize: 16, fontWeight: 'bold' },
  details: { color: '#003366', fontSize: 14, marginTop: 2 },
  staffTag: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  staffNameText: { fontSize: 11, color: '#64748B', fontStyle: 'italic' },
  officer: { fontSize: 12, color: '#94A3B8' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 15 }
});
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import useUserData from '@/store/userSignUp';

export default function ProfileSummary() {
  const router = useRouter();
  
  // Destructure all fields from the Zustand store
  const { 
    funame, 
    email, 
    phone, 
    branch, 
    department, 
    unit, 
    supervisor, 
    isLoanOfficer, 
    isSupervisor,
    logout 
  } = useUserData();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to sign out of TrustMicro?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: () => {
            logout();
            router.replace('/login' as any);
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{funame?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{funame || 'Staff Member'}</Text>
          <Text style={styles.userRole}>
            {isSupervisor ? 'Team Supervisor' : (isLoanOfficer ? 'Loan Officer' : 'Staff Officer')}
          </Text>
        </View>

        {/* EMPLOYMENT DETAILS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employment Details</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="business" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Branch Location</Text>
              <Text style={styles.value}>{branch || 'Main Headquarters'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="layers" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Department</Text>
              <Text style={[styles.value, { textTransform: 'capitalize' }]}>
                {department || 'Not Assigned'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="people" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Unit / Team</Text>
              <Text style={[styles.value, { textTransform: 'uppercase' }]}>
                {unit || 'Standard'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-circle" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Direct Supervisor</Text>
              <Text style={styles.value}>{supervisor || 'Administrator'}</Text>
            </View>
          </View>
        </View>

        {/* CONTACT INFORMATION SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="call" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Phone / Staff ID</Text>
              <Text style={styles.value}>{phone}</Text>
            </View>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>TrustMicro Mobile v1.0.4</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#003366', 
    paddingTop: 20,
    paddingBottom: 40, 
    alignItems: 'center', 
    borderBottomLeftRadius: 35, 
    borderBottomRightRadius: 35 
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10
  },
  avatar: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#003366' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  userRole: { fontSize: 14, color: '#CBD5E1', marginTop: 4, fontWeight: '500' },
  section: { 
    backgroundColor: '#fff', 
    marginHorizontal: 20, 
    marginTop: 20, 
    borderRadius: 20, 
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#64748B', 
    marginBottom: 20, 
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoText: { marginLeft: 15 },
  label: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  value: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginHorizontal: 20,
    marginVertical: 30, 
    padding: 18, 
    borderRadius: 15, 
    backgroundColor: '#FFF1F1',
    borderWidth: 1, 
    borderColor: '#FEE2E2' 
  },
  logoutText: { marginLeft: 10, color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
  footerText: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, marginBottom: 30 }
});
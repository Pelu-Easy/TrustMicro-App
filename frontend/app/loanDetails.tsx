import { Ionicons } from '@expo/vector-icons';
import axios from 'axios/dist/browser/axios.cjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useUserData from '../store/userSignUp';

const { width, height } = Dimensions.get('window');
const BRAND = { primary: "#003366", success: "#2E7D32", danger: "#C62828", bg: "#F8FAFC" };

export default function LoanDetails() {
  const router = useRouter();
  const { role, isSupervisor, token } = useUserData();
  const { id, customerName, amount, loanType, staffName, ninImage, idImage } = useLocalSearchParams();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // --- ROLE PROTECTION LOGIC ---
  const userRole = (role || '').toLowerCase();
  const actsAsManagement = isSupervisor === true || 
                           ['manager', 'supervisor', 'admin', 'super admin'].includes(userRole);

  const openZoom = (uri: string) => {
    setSelectedImage(uri);
    setModalVisible(true);
  };

  // --- API HANDLER ---
  const handleAction = (decision: 'Approved' | 'Rejected') => {
    Alert.alert(
      "Confirm Decision",
      `Are you sure you want to set this loan to ${decision}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const API_URL = 'https://trustmicro-app.onrender.com/api/v1';
              
              await axios.patch(
                `${API_URL}/manager/update-status/${id}`, 
                { status: decision },
                { headers: { Authorization: `Bearer ${token}` } }
              );

              Alert.alert("Success", `Loan has been ${decision.toLowerCase()}.`, [
                { text: "OK", onPress: () => router.replace('/(tabs)/managerDashboard') }
              ]);
            } catch (error: any) {
              const errorMsg = error.response?.data?.message || "Connection error. Try again.";
              Alert.alert("Update Failed", errorMsg);
            } finally {
              setIsSubmitting(false);
            }
          } 
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loan Review</Text>
        </View>

        <View style={styles.content}>
          {/* Customer Summary Card */}
          <View style={styles.card}>
            <Text style={styles.label}>CUSTOMER NAME</Text>
            <Text style={styles.value}>{customerName}</Text>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View>
                <Text style={styles.label}>LOAN AMOUNT</Text>
                <Text style={styles.amountText}>₦{Number(amount || 0).toLocaleString()}</Text>
              </View>
              <View>
                <Text style={styles.label}>TYPE</Text>
                <Text style={styles.value}>{loanType}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.label}>SUBMITTED BY</Text>
            <Text style={styles.value}>{staffName || "Field Officer"}</Text>
          </View>

          <Text style={styles.sectionTitle}>Verification Documents</Text>
          <Text style={styles.helperText}>Tap image to view full screen</Text>
          
          {/* Documents Section */}
          <View style={styles.docCard}>
            <Text style={styles.docLabel}>National Identity Number (NIN)</Text>
            {ninImage ? (
              <TouchableOpacity onPress={() => openZoom(ninImage as string)}>
                <Image source={{ uri: ninImage as string }} style={styles.docImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <View style={styles.noDoc}><Text style={{color: '#94A3B8'}}>No NIN Image Uploaded</Text></View>
            )}
          </View>

          <View style={styles.docCard}>
            <Text style={styles.docLabel}>Government Issued ID</Text>
            {idImage ? (
              <TouchableOpacity onPress={() => openZoom(idImage as string)}>
                <Image source={{ uri: idImage as string }} style={styles.docImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <View style={styles.noDoc}><Text style={{color: '#94A3B8'}}>No ID Image Uploaded</Text></View>
            )}
          </View>

          {/* Conditional Action Buttons: Only visible to Management */}
          {actsAsManagement ? (
            <View style={styles.actionRow}>
              <TouchableOpacity 
                disabled={isSubmitting}
                style={[styles.actionBtn, { backgroundColor: BRAND.danger, opacity: isSubmitting ? 0.6 : 1 }]}
                onPress={() => handleAction('Rejected')}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                disabled={isSubmitting}
                style={[styles.actionBtn, { backgroundColor: BRAND.success, opacity: isSubmitting ? 0.6 : 1 }]}
                onPress={() => handleAction('Approved')}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Approve Loan</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.readOnlyBadge}>
              <Ionicons name="eye-outline" size={20} color="#64748B" />
              <Text style={styles.readOnlyText}>View Only Mode</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ZOOM MODAL */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeModal} onPress={() => setModalVisible(false)}>
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  header: { backgroundColor: BRAND.primary, padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 25 },
  label: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold', letterSpacing: 1 },
  value: { fontSize: 16, color: '#1E293B', marginTop: 4, fontWeight: '600' },
  amountText: { fontSize: 22, color: BRAND.primary, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  helperText: { fontSize: 12, color: '#64748B', marginBottom: 15 },
  docCard: { backgroundColor: '#fff', padding: 10, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  docLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10, color: '#475569' },
  docImage: { width: '100%', height: 200, borderRadius: 8 },
  noDoc: { width: '100%', height: 100, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  actionRow: { flexDirection: 'row', gap: 15, marginTop: 20 },
  actionBtn: { flex: 1, padding: 18, borderRadius: 12, alignItems: 'center', minHeight: 60, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  readOnlyBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#E2E8F0', 
    padding: 15, 
    borderRadius: 12, 
    marginTop: 20,
    gap: 8
  },
  readOnlyText: { color: '#475569', fontWeight: 'bold', fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeModal: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImage: { width: width, height: height * 0.8 },
});
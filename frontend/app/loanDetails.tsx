import { Ionicons } from '@expo/vector-icons';
import axios from 'axios/dist/browser/axios.cjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import useUserData from '../store/userSignUp';

const { width, height } = Dimensions.get('window');
const BRAND = { primary: "#003366", success: "#2E7D32", danger: "#C62828", bg: "#F8FAFC" };

export default function LoanDetails() {
  const router = useRouter();
  const { role, isSupervisor, token } = useUserData();
  
  const { 
    id, customerName, amount, loanType, staffName, 
    phone, bankName, accountNumber,
    ninImageUrl, idImageUrl, passportImageUrl, utilityBillUrl,
    workIdUrl, statementUrl, signatureUrl 
  } = useLocalSearchParams();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // --- REJECTION REASON STATES ---
  const [isRejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const userRole = (role || '').toLowerCase();
  const actsAsManagement = isSupervisor === true || 
                            ['manager', 'supervisor', 'admin', 'super admin'].includes(userRole);

  const openZoom = (uri: string) => {
    setSelectedImage(uri);
    setModalVisible(true);
  }

  // --- API HANDLER ---
  const handleAction = async (decision: 'Approved' | 'Rejected', reason?: string) => {
    setIsSubmitting(true);
    try {
      const API_URL = 'https://trustmicro-app.onrender.com/api/v1';
      
      await axios.patch(
        `${API_URL}/manager/update-status/${id}`, 
        { 
            status: decision,
            rejection_reason: reason || null 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", `Loan has been ${decision.toLowerCase()}.`, [
        { text: "OK", onPress: () => router.replace('/(tabs)/managerDashboard') }
      ]);
      setRejectModalVisible(false);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Connection error. Try again.";
      Alert.alert("Update Failed", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmApprove = () => {
    Alert.alert(
        "Confirm Approval",
        "Are you sure you want to approve this loan?",
        [
            { text: "Cancel", style: "cancel" },
            { text: "Approve", onPress: () => handleAction('Approved') }
        ]
    );
  };

  const DocumentCard = ({ label, uri, placeholder }: { label: string, uri: any, placeholder: string }) => {
    const cleanUri = typeof uri === 'string' ? decodeURIComponent(uri) : uri;
    return (
      <View style={styles.docCard}>
        <Text style={styles.docLabel}>{label}</Text>
        {cleanUri ? (
          <TouchableOpacity onPress={() => openZoom(cleanUri as string)}>
            <Image source={{ uri: cleanUri as string }} style={styles.docImage} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <View style={styles.noDoc}><Text style={{color: '#94A3B8'}}>{placeholder}</Text></View>
        )}
      </View>
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
            
            <View style={styles.row}>
              <View>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <Text style={styles.value}>{phone || "N/A"}</Text>
              </View>
              <View>
                <Text style={styles.label}>LOAN TYPE</Text>
                <Text style={styles.value}>{loanType}</Text>
              </View>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.row}>
              <View>
                <Text style={styles.label}>LOAN AMOUNT</Text>
                <Text style={styles.amountText}>₦{Number(amount || 0).toLocaleString()}</Text>
              </View>
              <View>
                <Text style={styles.label}>ACCOUNT NUMBER</Text>
                <Text style={styles.value}>{accountNumber || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.row}>
              <View>
                <Text style={styles.label}>BANK NAME</Text>
                <Text style={styles.value}>{bankName || "N/A"}</Text>
              </View>
              <View>
                <Text style={styles.label}>SUBMITTED BY</Text>
                <Text style={styles.value}>{staffName || "Field Officer"}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Verification Documents</Text>
          <Text style={styles.helperText}>Tap image to view full screen</Text>
          
          <DocumentCard label="Passport Photograph" uri={passportImageUrl} placeholder="No Passport Uploaded" />
          <DocumentCard label="National Identity (NIN)" uri={ninImageUrl} placeholder="No NIN Image Uploaded" />
          <DocumentCard label="Government Issued ID" uri={idImageUrl} placeholder="No ID Image Uploaded" />
          <DocumentCard label="Utility Bill" uri={utilityBillUrl} placeholder="No Utility Bill Uploaded" />
          <DocumentCard label="Proof of Employment / Work ID" uri={workIdUrl} placeholder="No Work ID Uploaded" />
          <DocumentCard label="Bank Statement" uri={statementUrl} placeholder="No Bank Statement Uploaded" />
          <DocumentCard label="Customer Signature" uri={signatureUrl} placeholder="No Signature Uploaded" />

          {actsAsManagement ? (
            <View style={styles.actionRow}>
              <TouchableOpacity 
                disabled={isSubmitting}
                style={[styles.actionBtn, { backgroundColor: BRAND.danger, opacity: isSubmitting ? 0.6 : 1 }]}
                onPress={() => setRejectModalVisible(true)}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                disabled={isSubmitting}
                style={[styles.actionBtn, { backgroundColor: BRAND.success, opacity: isSubmitting ? 0.6 : 1 }]}
                onPress={confirmApprove}
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

      {/* REJECTION REASON MODAL */}
      <Modal visible={isRejectModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.rejectModalContent}>
                <Text style={styles.rejectTitle}>Reject Application</Text>
                <Text style={styles.rejectSubtitle}>Please provide a reason for rejecting this loan application.</Text>
                
                <TextInput
                    style={styles.reasonInput}
                    placeholder="E.g. Incomplete documentation, poor credit history..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                />

                <View style={styles.modalActionRow}>
                    <TouchableOpacity 
                        style={styles.cancelBtn} 
                        onPress={() => {
                            setRejectModalVisible(false);
                            setRejectionReason("");
                        }}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        disabled={isSubmitting || rejectionReason.trim().length < 5}
                        style={[styles.confirmRejectBtn, { opacity: (isSubmitting || rejectionReason.trim().length < 5) ? 0.5 : 1 }]}
                        onPress={() => handleAction('Rejected', rejectionReason)}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>Confirm Reject</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* ZOOM MODAL */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeModal} onPress={() => setModalVisible(false)}>
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: decodeURIComponent(selectedImage) }} style={styles.fullImage} resizeMode="contain" />
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

  // --- REJECT MODAL STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  rejectModalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 5 },
  rejectTitle: { fontSize: 20, fontWeight: 'bold', color: BRAND.danger, marginBottom: 10 },
  rejectSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 20, lineHeight: 20 },
  reasonInput: { 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 12, 
    padding: 15, 
    fontSize: 16, 
    color: '#1E293B', 
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 20 
  },
  modalActionRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelBtnText: { color: '#64748B', fontWeight: '600' },
  confirmRejectBtn: { flex: 2, backgroundColor: BRAND.danger, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }
});
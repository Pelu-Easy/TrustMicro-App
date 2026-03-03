import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import useUserData from '../store/userSignUp';

const { width, height } = Dimensions.get('window');
const BRAND = { primary: "#003366", success: "#2E7D32", danger: "#C62828", bg: "#F8FAFC", accent: "#3B82F6" };

export default function LoanDetails() {
  const router = useRouter();
  const { 
    role, isSupervisor, token, 
    isCreditOfficer, isHeadOfCredit, isCCO, isMD 
  } = useUserData();
  
  const { 
    id, customerName, amount, loanType, staffName, 
    phone, bankName, accountNumber, status,
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

  // --- WORKFLOW LOGIC: WHO CAN ACT? ---
  const actsAsManagement = 
    isSupervisor || 
    isCreditOfficer || 
    isHeadOfCredit || 
    isCCO || 
    isMD ||
    ['manager', 'supervisor', 'admin', 'super admin', 'head of credit', 'cco', 'md'].includes(userRole);

  // --- CALCULATE NEXT STAGE IN PIPELINE ---
  const getNextStatus = () => {
    if (isSupervisor) return 'PENDING_CREDIT';
    if (isCreditOfficer) return 'PENDING_HEAD_CREDIT';
    if (isHeadOfCredit) return 'PENDING_CCO';
    if (isCCO) return 'PENDING_MD';
    if (isMD) return 'APPROVED_FINANCE'; // Final Stage
    return 'Approved'; // Default fallback
  };

  const getButtonLabel = () => {
    if (isMD) return "Final Approval";
    if (isCCO) return "Forward to MD";
    if (isHeadOfCredit) return "Forward to CCO";
    if (isCreditOfficer) return "Forward to Head of Credit";
    if (isSupervisor) return "Forward to Credit Dept";
    return "Approve Loan";
  };

  // --- TIMELINE TRACKER LOGIC ---
  const stages = [
    { id: 'Pending', label: 'Branch Supervisor', key: 'Pending' },
    { id: 'PENDING_CREDIT', label: 'Credit Officer', key: 'PENDING_CREDIT' },
    { id: 'PENDING_HEAD_CREDIT', label: 'Head of Credit', key: 'PENDING_HEAD_CREDIT' },
    { id: 'PENDING_CCO', label: 'Chief Compliance Officer', key: 'PENDING_CCO' },
    { id: 'PENDING_MD', label: 'Managing Director', key: 'PENDING_MD' },
    { id: 'Disbursed', label: 'Finance / Disbursement', key: 'APPROVED_FINANCE' }
  ];

  const getStageStatus = (stageId: string, currentStatus: string) => {
    const statusOrder = ['Draft', 'Pending', 'PENDING_CREDIT', 'PENDING_HEAD_CREDIT', 'PENDING_CCO', 'PENDING_MD', 'APPROVED_FINANCE', 'Disbursed'];
    const currentIdx = statusOrder.indexOf(currentStatus as string);
    const stageIdx = statusOrder.indexOf(stageId);

    if (currentStatus === 'Rejected') return 'rejected';
    if (stageIdx < currentIdx) return 'completed';
    if (stageId === currentStatus || (stageId === 'Disbursed' && currentStatus === 'APPROVED_FINANCE')) return 'active';
    return 'upcoming';
  };

  const openZoom = (uri: string) => {
    setSelectedImage(uri);
    setModalVisible(true);
  }

  // --- API HANDLER ---
  const handleAction = async (decision: 'Approved' | 'Rejected', reason?: string) => {
    setIsSubmitting(true);
    try {
      const API_URL = 'https://trustmicro-app.onrender.com/api/v1';
      const targetStatus = decision === 'Rejected' ? 'Rejected' : getNextStatus();
      
      await axios.patch(
        `${API_URL}/manager/update-status/${id}`, 
        { 
            status: targetStatus,
            rejection_reason: reason || null 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", `Loan has been ${decision === 'Rejected' ? 'rejected' : 'forwarded to the next stage'}.`, [
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
        `Are you sure you want to move this loan to the next stage?`,
        [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: () => handleAction('Approved') }
        ]
    );
  };

  const DocumentCard = ({ label, uri, placeholder }: { label: string, uri: any, placeholder: string }) => {
    // Helper to ensure we don't double-decode or crash on null
    const getSafeUri = (input: any) => {
        if (!input || typeof input !== 'string') return null;
        try {
            return input.includes('%') ? decodeURIComponent(input) : input;
        } catch (e) {
            return input;
        }
    };

    const safeUri = getSafeUri(uri);

    return (
      <View style={styles.docCard}>
        <Text style={styles.docLabel}>{label}</Text>
        {safeUri ? (
          <TouchableOpacity onPress={() => openZoom(safeUri)}>
            <Image source={{ uri: safeUri }} style={styles.docImage} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <View style={styles.noDoc}><Text style={{color: '#94A3B8'}}>{placeholder}</Text></View>
        )}
      </View>
    );
  };

  const WorkflowTimeline = () => (
    <View style={styles.timelineCard}>
      <Text style={styles.sectionTitle}>Loan Journey</Text>
      <Text style={styles.helperText}>Live tracking of approval stages</Text>
      <View style={styles.timelineContainer}>
        {stages.map((stage, index) => {
          const state = getStageStatus(stage.id, status as string);
          const isLast = index === stages.length - 1;
          
          return (
            <View key={stage.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[
                  styles.timelineDot, 
                  state === 'completed' && { backgroundColor: BRAND.success },
                  state === 'active' && { backgroundColor: BRAND.accent, borderWidth: 3, borderColor: '#DBEAFE' },
                  state === 'rejected' && { backgroundColor: BRAND.danger }
                ]}>
                  {state === 'completed' && <Ionicons name="checkmark" size={12} color="#fff" />}
                  {state === 'active' && <View style={styles.pulseDot} />}
                </View>
                {!isLast && <View style={[styles.timelineLine, state === 'completed' && { backgroundColor: BRAND.success }]} />}
              </View>
              <View style={styles.timelineRight}>
                <Text style={[
                  styles.stageLabel, 
                  state === 'active' && { color: BRAND.accent, fontWeight: 'bold' },
                  state === 'upcoming' && { color: '#94A3B8' }
                ]}>
                  {stage.label}
                </Text>
                <Text style={styles.stageStatusText}>
                  {state === 'completed' ? 'Approved & Signed' : 
                   state === 'active' ? 'Currently Reviewing' : 
                   state === 'rejected' ? 'Stopped here' : 'Awaiting Review'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

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
          <WorkflowTimeline />

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
                  <Text style={styles.btnText}>{getButtonLabel()}</Text>
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
    alignSelf: 'center',
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#E2E8F0', 
    paddingHorizontal: 20,
    paddingVertical: 12, 
    borderRadius: 12, 
    marginTop: 10,
    gap: 8
  },
  readOnlyText: { color: '#475569', fontWeight: 'bold', fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeModal: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImage: { width: width, height: height * 0.8 },
  timelineCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 20 },
  timelineContainer: { marginTop: 15 },
  timelineItem: { flexDirection: 'row', minHeight: 50 },
  timelineLeft: { alignItems: 'center', width: 30 },
  timelineDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: -2 },
  timelineRight: { flex: 1, paddingLeft: 15, paddingBottom: 20 },
  stageLabel: { fontSize: 14, color: '#1E293B', fontWeight: '600' },
  stageStatusText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND.accent },
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
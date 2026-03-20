import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, Modal,
  RefreshControl,
  ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import api from '../services/api';
import useUserData from '../store/userSignUp';

const { width, height } = Dimensions.get('window');
const BRAND = { primary: "#003366", success: "#2E7D32", danger: "#C62828", bg: "#F8FAFC", accent: "#3B82F6" };

const ROLE_AUTHORITY_MAP: Record<string, { nextStatus: string, label: string, authorizedStatus: string }> = {
  'head of marketing': { authorizedStatus: 'Pending', nextStatus: 'PENDING_CREDIT', label: 'Forward to Credit' },
  'supervisor': { authorizedStatus: 'Pending', nextStatus: 'PENDING_CREDIT', label: 'Forward to Credit' },
  'credit staff': { authorizedStatus: 'PENDING_CREDIT', nextStatus: 'PENDING_HEAD_CREDIT', label: 'Forward to Head of Credit' },
  'credit officer': { authorizedStatus: 'PENDING_CREDIT', nextStatus: 'PENDING_HEAD_CREDIT', label: 'Forward to Head of Credit' },
  'head of credit': { authorizedStatus: 'PENDING_HEAD_CREDIT', nextStatus: 'PENDING_CONTROL', label: 'Forward to Head of Control' },
  'head of control': { authorizedStatus: 'PENDING_CONTROL', nextStatus: 'PENDING_CCO', label: 'Forward to CCO' },
  'cco': { authorizedStatus: 'PENDING_CCO', nextStatus: 'PENDING_MD', label: 'Forward to MD' },
  'md': { authorizedStatus: 'PENDING_MD', nextStatus: 'APPROVED_FINANCE', label: 'Final Approval' },
  'manager': { authorizedStatus: 'Pending', nextStatus: 'PENDING_CREDIT', label: 'Forward to Credit' },
};

export default function LoanDetails() {
  const router = useRouter();
  const { role } = useUserData();
  const { id } = useLocalSearchParams();
  
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loanHistory, setLoanHistory] = useState([]);
  const [riskData, setRiskData] = useState({ score: 0, level: 'Low', activeCount: 0 });

  const normalizedRole = (role || '').toLowerCase().trim();
  const userAuthority = ROLE_AUTHORITY_MAP[normalizedRole];

  // FETCH CORE LOAN DATA AND RISK
  const fetchLoanData = useCallback(async () => {
    setError(null);
    if (!refreshing) setLoading(true);
    try {
      const response = await api.get(`/manager/loan-details/${id}`);
      const data = response.data;
      setLoan(data);

      // Fetch History and Risk based on BVN from the loan record
      if (data.bvn) {
        const histRes = await api.get(`/loans/history/${data.bvn}`);
        if (histRes.data.status === 'success') {
          setLoanHistory(histRes.data.data);
          if (histRes.data.riskAnalysis) {
            setRiskData(histRes.data.riskAnalysis);
          }
        }
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError("Unable to load loan details. Check connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, refreshing]);

  useEffect(() => { if (id) fetchLoanData(); }, [id, fetchLoanData]);

  const isAuthorizedForCurrentStatus = userAuthority?.authorizedStatus === loan?.status;
  const canPerformAction = !!userAuthority && isAuthorizedForCurrentStatus && !['Approved', 'Rejected', 'Disbursed', 'APPROVED_FINANCE'].includes(loan?.status as string);
  const isCreditDept = normalizedRole === 'credit officer' || normalizedRole === 'credit staff';
  const isEligibleForTopUp = (loan?.status === 'Disbursed' || loan?.status === 'APPROVED_FINANCE') && (normalizedRole === 'officer' || normalizedRole === 'credit officer');

  const stages = [
    { id: 'Pending', label: 'Marketing/Supervisor' },
    { id: 'PENDING_CREDIT', label: 'Credit Analysis' },
    { id: 'PENDING_HEAD_CREDIT', label: 'Head of Credit' },
    { id: 'PENDING_CONTROL', label: 'Internal Control' },
    { id: 'PENDING_CCO', label: 'CCO' },
    { id: 'PENDING_MD', label: 'MD Approval' },
    { id: 'APPROVED_FINANCE', label: 'Finance' }
  ];

  const getStageStatus = (stageId: string, currentStatus: string) => {
    const statusOrder = ['Draft', 'Pending', 'PENDING_CREDIT', 'PENDING_HEAD_CREDIT', 'PENDING_CONTROL', 'PENDING_CCO', 'PENDING_MD', 'APPROVED_FINANCE', 'Disbursed'];
    const currentIdx = statusOrder.indexOf(currentStatus as string);
    const stageIdx = statusOrder.indexOf(stageId);
    if (currentStatus === 'Rejected') return 'rejected';
    if (stageIdx < currentIdx) return 'completed';
    if (stageId === currentStatus) return 'active';
    return 'upcoming';
  };

  const handleAction = async (decision: 'Approved' | 'Rejected', reason?: string) => {
    if (!userAuthority && decision !== 'Rejected') return;
    setIsSubmitting(true);
    try {
      const targetStatus = decision === 'Rejected' ? 'Rejected' : userAuthority.nextStatus;
      await api.patch(`/manager/update-status/${id}`, { 
          status: targetStatus,
          rejection_reason: reason || null 
      });

      Alert.alert("Success", `Loan has been ${decision === 'Rejected' ? 'rejected' : 'forwarded'}.`, [
        { text: "OK", onPress: () => router.replace('/(tabs)/managerDashboard') }
      ]);
      setRejectModalVisible(false);
    } catch (error: any) {
      Alert.alert("Update Failed", error.response?.data?.message || "Connection error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTopUpRequest = () => {
    Alert.alert("Confirm Top-Up", `Initiate Top-Up for ${loan?.customerName}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => router.push({ pathname: '/(tabs)/loanForm' as any, params: { bvn: loan?.bvn, id: id } }) }
      ]
    );
  };

  const DocumentCard = ({ label, uri, placeholder }: { label: string, uri: any, placeholder: string }) => {
    const safeUri = uri && typeof uri === 'string' && uri !== 'null' && uri !== '' 
        ? (uri.includes('%') ? decodeURIComponent(uri) : uri) 
        : null;

    return (
      <View style={styles.docCard}>
        <Text style={styles.docLabel}>{label}</Text>
        {safeUri ? (
          <TouchableOpacity onPress={() => { setSelectedImage(safeUri); setModalVisible(true); }}>
            <Image source={{ uri: safeUri }} style={styles.docImage} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <View style={styles.noDoc}><Text style={{color: '#94A3B8'}}>{placeholder}</Text></View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) return (
    <View style={styles.center}><ActivityIndicator size="large" color={BRAND.primary} /></View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={fetchLoanData} style={styles.retryBtn}><Text style={{color: '#fff'}}>Retry</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoanData(); }} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loan Review</Text>
        </View>

        <View style={styles.content}>
          <View style={[styles.riskBadge, { backgroundColor: riskData.level === 'High' ? '#FEE2E2' : riskData.level === 'Medium' ? '#FEF3C7' : '#DCFCE7' }]}>
              <Ionicons name={riskData.level === 'High' ? "warning" : "shield-checkmark"} size={20} color={riskData.level === 'High' ? BRAND.danger : riskData.level === 'Medium' ? '#B45309' : BRAND.success} />
              <Text style={[styles.riskText, { color: riskData.level === 'High' ? BRAND.danger : riskData.level === 'Medium' ? '#B45309' : BRAND.success }]}>
                  Risk Level: {riskData.level} ({riskData.score}/100) — {riskData.activeCount} Active Loans
              </Text>
          </View>

          {!isCreditDept && (
            <View style={styles.timelineCard}>
                <Text style={styles.sectionTitle}>Loan Journey</Text>
                <View style={styles.timelineContainer}>
                {stages.map((stage, index) => {
                    const state = getStageStatus(stage.id, loan?.status as string);
                    return (
                    <View key={stage.id} style={styles.timelineItem}>
                        <View style={styles.timelineLeft}>
                        <View style={[styles.timelineDot, state === 'completed' && { backgroundColor: BRAND.success }, state === 'active' && { backgroundColor: BRAND.accent, borderWidth: 3, borderColor: '#DBEAFE' }]}>
                            {state === 'completed' && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        {index !== stages.length - 1 && <View style={[styles.timelineLine, state === 'completed' && { backgroundColor: BRAND.success }]} />}
                        </View>
                        <View style={styles.timelineRight}>
                        <Text style={[styles.stageLabel, state === 'active' && { color: BRAND.accent, fontWeight: 'bold' }]}>{stage.label}</Text>
                        </View>
                    </View>
                    );
                })}
                </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>CUSTOMER NAME</Text>
            <Text style={styles.value}>{loan?.customerName}</Text>
            <View style={styles.divider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                    <Text style={styles.label}>LOAN AMOUNT</Text>
                    <Text style={styles.amountText}>₦{Number(loan?.amount || 0).toLocaleString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>LOAN TYPE</Text>
                    <Text style={styles.value}>{loan?.loanType}</Text>
                </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.label}>BVN / NIN</Text>
            <Text style={styles.value}>{loan?.bvn} / {loan?.nin || 'N/A'}</Text>
            <View style={styles.divider} />
            <Text style={styles.label}>CURRENT STATUS</Text>
            <Text style={[styles.value, {color: BRAND.accent, fontWeight: 'bold'}]}>{loan?.status?.toString().replace(/_/g, ' ')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Customer Loan History</Text>
            {loanHistory.length > 0 ? (
                loanHistory.map((hist: any) => (
                <View key={hist.id} style={styles.historyItem}>
                    <View>
                    <Text style={styles.historyDate}>{new Date(hist.submittedDate).toLocaleDateString()}</Text>
                    <Text style={styles.historyType}>{hist.loanType} {hist.parentLoanId ? '(Top-Up)' : '(New)'}</Text>
                    <Text style={styles.historyId}>{hist.id}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.historyAmount}>₦{Number(hist.loanAmount).toLocaleString()}</Text>
                    <Text style={[styles.historyStatus, { color: hist.status === 'Rejected' ? BRAND.danger : BRAND.success }]}>{hist.status.replace(/_/g, ' ')}</Text>
                    </View>
                </View>
                ))
            ) : (
                <Text style={{ color: '#94A3B8', fontStyle: 'italic', marginTop: 10 }}>No previous loan history found.</Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Attached Documents</Text>
          <DocumentCard label="Passport Photograph" uri={loan?.passportImageUrl || loan?.passportPhoto} placeholder="No Passport Uploaded" />
          <DocumentCard label="Digital Signature" uri={loan?.signatureUrl || loan?.signature} placeholder="No Signature Uploaded" />
          <DocumentCard label="NIN Slip / Card" uri={loan?.ninImageUrl || loan?.ninHardCopy} placeholder="No NIN Document" />
          <DocumentCard label="Government Issued ID" uri={loan?.idImageUrl || loan?.idCard} placeholder="No ID Document" />
          <DocumentCard label="Work ID Card" uri={loan?.workIdUrl || loan?.workId} placeholder="No Work ID Document" />
          <DocumentCard label="Utility Bill" uri={loan?.utilityBillUrl || loan?.utilityBill} placeholder="No Utility Bill Document" />
          <DocumentCard label="Bank Statement" uri={loan?.statementUrl || loan?.bankStatement} placeholder="No Bank Statement" />

          {canPerformAction ? (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: BRAND.danger }]} onPress={() => setRejectModalVisible(true)}>
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: BRAND.success }]} onPress={() => handleAction('Approved')}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{userAuthority.label}</Text>}
              </TouchableOpacity>
            </View>
          ) : isEligibleForTopUp ? (
            <TouchableOpacity style={styles.topUpBtn} onPress={handleTopUpRequest}>
              <Ionicons name="rocket-outline" size={20} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.btnText}>Apply for Top-Up</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyText}>
                {loan?.status === 'Rejected' ? 'Application Rejected' : 'View Only Mode (Pending Other Dept)'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Rejection Modal */}
      <Modal visible={isRejectModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.rejectModalContent}>
                <Text style={styles.rejectTitle}>Reject Application</Text>
                <TextInput 
                  style={styles.reasonInput} 
                  placeholder="Reason for rejection..." 
                  multiline 
                  value={rejectionReason} 
                  onChangeText={setRejectionReason} 
                />
                {/* Fixed: Changed <div> to <View> */}
                <View style={styles.modalActionRow}>
                    <TouchableOpacity onPress={() => setRejectModalVisible(false)} style={styles.modalCancel}>
                        <Text>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleAction('Rejected', rejectionReason)} style={styles.modalConfirm}>
                        <Text style={{color: BRAND.danger, fontWeight: 'bold'}}>Confirm Reject</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Image Zoom Modal */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.zoomContainer}>
          <TouchableOpacity style={styles.closeZoom} onPress={() => setModalVisible(false)}>
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />}
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
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 25, elevation: 2 },
  label: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold' },
  value: { fontSize: 16, color: '#1E293B', marginTop: 4 },
  amountText: { fontSize: 22, color: BRAND.primary, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1E293B' },
  docCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 20, elevation: 1 },
  docLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10, color: '#475569' },
  docImage: { width: '100%', height: 220, borderRadius: 8 },
  noDoc: { width: '100%', height: 100, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  actionRow: { flexDirection: 'row', gap: 15, marginTop: 20 },
  actionBtn: { flex: 1, padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topUpBtn: { backgroundColor: BRAND.accent, padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20, flexDirection: 'row' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  readOnlyBadge: { backgroundColor: '#E2E8F0', padding: 15, borderRadius: 12, alignItems: 'center' },
  readOnlyText: { color: '#475569', fontWeight: 'bold' },
  timelineCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 20 },
  timelineContainer: { marginTop: 10 },
  timelineItem: { flexDirection: 'row', minHeight: 40 },
  timelineLeft: { alignItems: 'center', width: 30 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#E2E8F0', zIndex: 1, justifyContent: 'center', alignItems: 'center' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0' },
  timelineRight: { flex: 1, paddingLeft: 10 },
  stageLabel: { fontSize: 13, color: '#64748B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  rejectModalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 25 },
  rejectTitle: { fontSize: 18, fontWeight: 'bold', color: BRAND.danger, marginBottom: 10 },
  reasonInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, minHeight: 100, marginBottom: 20, textAlignVertical: 'top' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalCancel: { padding: 10 },
  modalConfirm: { padding: 10 },
  zoomContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeZoom: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImage: { width: width, height: height * 0.8 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historyDate: { fontSize: 11, color: '#64748B' },
  historyType: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  historyId: { fontSize: 10, color: '#94A3B8' },
  historyAmount: { fontSize: 14, fontWeight: 'bold', color: BRAND.primary },
  historyStatus: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  riskText: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  errorText: { color: '#64748B', marginBottom: 20 },
  retryBtn: { backgroundColor: BRAND.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});
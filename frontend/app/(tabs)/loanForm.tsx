import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

// --- INTEGRATION WITH YOUR STORES ---
import api from '../../services/api';
import { Loan, useLoanStore } from '../../store/loanStore';
import useUserData from '../../store/userSignUp';

const BRAND = { 
  primary: "#003366", 
  accent: "#10B981", 
  warning: "#F59E0B", 
  draft: "#757575", 
  bg: "#F8FAFC", 
  border: "#E2E8F0" 
};

interface LoanFormProps {
  initialDraft?: Loan | null; 
  onComplete?: () => void;
}

export default function CompleteLoanForm({ initialDraft, onComplete }: LoanFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanTarget, setScanTarget] = useState<'bvn' | 'nin' | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateValue, setDateValue] = useState(new Date(1995, 0, 1));

  const addLoan = useLoanStore((state) => state.addLoan);
  const allLoans = useLoanStore((state) => state.loans);
  
  // --- STAFF IDENTITY FROM STORE ---
  const { isSupervisor, token, email: currentUserEmail, funame: staffFullName, branch: staffBranch } = useUserData();

  // --- MANAGER PROTECTION LOGIC ---
  useEffect(() => {
    if (isSupervisor) {
      Alert.alert("Access Denied", "Managers/Supervisors cannot create new applications. Please use the Approval Dashboard.");
      router.replace('/(tabs)');
    }
  }, [isSupervisor]);

  const initialFormState = useMemo(() => ({
    customerName: '', bvn: '', nin: '', phone: '', address: '', dob: '',
    loanAmount: '', bankName: '', accountNumber: '',
    employerName: '', jobTitle: '', nokName: '', nokPhone: '',
    idUploaded: false, utilityUploaded: false, statementUploaded: false, selfieUploaded: false
  }), []);

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (initialDraft) {
      setFormData(prev => ({
        ...prev,
        customerName: initialDraft.customerName || '',
        bvn: initialDraft.bvn || '',
        nin: initialDraft.nin || '',
        phone: initialDraft.phone || '',
        address: initialDraft.address || '',
        loanAmount: initialDraft.loanAmount || '',
        bankName: initialDraft.bankName || '',
        accountNumber: initialDraft.accountNumber || '',
        employerName: initialDraft.employerName || '',
        jobTitle: initialDraft.jobTitle || '',
        nokName: initialDraft.nokName || '',
        nokPhone: initialDraft.nokPhone || '',
      }));

      if (initialDraft.loanAmount) setStep(4);
      else if (initialDraft.employerName) setStep(3);
      else if (initialDraft.bvn) setStep(2);
    }
  }, [initialDraft]);

  const updateData = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  const isDuplicate = useMemo(() => {
    if (!formData.bvn) return false;
    return allLoans.some(loan => 
        loan.bvn === formData.bvn && 
        loan.status !== 'Rejected' && 
        loan.status !== 'Draft' &&
        loan.id !== initialDraft?.id
    );
  }, [formData.bvn, allLoans, initialDraft]);

  const createLoanObject = (status: Loan['status']): Loan => {
    return {
      id: `loan_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      createdByEmail: currentUserEmail || 'system',
      
      // --- ACCOUNTABILITY TAGS ---
      staffName: staffFullName || 'Unknown Staff', 
      branchName: staffBranch || 'Main Branch',

      loanType: 'Personal Loan',
      title: 'Loan Application',
      customerName: formData.customerName || 'Unnamed Draft',
      bvn: formData.bvn,
      nin: formData.nin,
      phone: formData.phone || '',
      address: formData.address || '',
      gender: '', 
      dob: formData.dob || '',
      submittedDate: new Date().toLocaleDateString(),
      activeDate: '',
      employerName: formData.employerName || '',
      jobTitle: formData.jobTitle || '',
      monthlyIncome: '',
      loanAmount: formData.loanAmount || '',
      amount: `₦${Number(formData.loanAmount || 0).toLocaleString()}`,
      repaymentCycle: 'Monthly',
      nokName: formData.nokName || '',
      nokPhone: formData.nokPhone || '',
      bankName: formData.bankName || '',
      accountNumber: formData.accountNumber || '',
      status: status,
      idCard: null,
      ninHardCopy: null,
      bvnHardCopy: null,
      employmentLetter: null,
      passportPhoto: null,
      tenure: '12',
      interestRate: '5',
      monthlyRepayment: '', 
      totalRepayment: '',
      repaymentEndDate: ''
    };
  };

  const handleSaveDraft = () => {
    const draftRecord = createLoanObject('Draft');
    addLoan(draftRecord, currentUserEmail); 
    Alert.alert("Draft Updated", "Your progress has been saved.");
    if (onComplete) onComplete(); 
  };

  const handleFinalSubmit = async () => {
    if (!formData.loanAmount || !formData.bvn) {
      Alert.alert("Error", "Loan Amount and BVN are required for submission.");
      return;
    }

    setIsSubmitting(true);
    const newLoanRecord = createLoanObject('Pending');

    try {
        // Post with staffName included in the object
        await api.post('/loans', newLoanRecord, {
            headers: { 
              Authorization: `Bearer ${token}`, 
              'Content-Type': 'application/json'
            }
        });

        addLoan(newLoanRecord, currentUserEmail); 
        setIsSubmitting(false);
        setShowSuccess(true);
        
    } catch (error: any) {
        setIsSubmitting(false);
        const errorMsg = error.response?.data?.error || "Connection to server failed.";
        Alert.alert("Submission Failed", errorMsg);
    }
  };

  const handleStartScan = async (target: 'bvn' | 'nin') => {
    if (!permission?.granted) {
      const request = await requestPermission();
      if (!request.granted) return Alert.alert("Permission Required", "Camera access is needed.");
    }
    setScanTarget(target);
    setIsScanning(true);
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    const cleanData = result.data.replace(/[^0-9]/g, '').substring(0, 11);
    if (scanTarget) {
      updateData(scanTarget, cleanData);
      setIsScanning(false);
      setScanTarget(null); 
    }
  };

  const handleUpload = async (docKey: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!result.canceled) updateData(docKey, true);
    } catch (err) { Alert.alert("Error", "Could not access files."); }
  };

  const handleVerifyIdentity = async () => {
    if (formData.bvn.length < 11) return Alert.alert("Error", "Enter 11-digit BVN");
    setIsVerifying(true);
    try {
      const response = await fetch('https://trustmicro.free.beeceptor.com/verify-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bvn: formData.bvn })
      });
      const result = await response.json();
      if (result.status === "success") {
        updateData('customerName', `${result.data.firstName} ${result.data.lastName}`);
        if(result.data.dob) {
           updateData('dob', result.data.dob);
           setDateValue(new Date(result.data.dob));
        }
        Alert.alert("Success", "Identity Verified");
      }
    } catch (e) { Alert.alert("Error", "Verification failed."); } 
    finally { setIsVerifying(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* SUCCESS MODAL */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
            <View style={styles.successCard}>
                <LottieView 
                  source={{uri: 'https://assets9.lottiefiles.com/packages/lf20_s2lryxtd.json'}} 
                  autoPlay 
                  loop={false} 
                  style={{ width: 120, height: 120 }} 
                />
                <Text style={styles.successTitle}>Application Submitted</Text>
                <Text style={styles.successSubtitle}>Submitted by: {staffFullName}</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => {setShowSuccess(false); if(onComplete) onComplete();}}>
                    <Text style={styles.btnText}>Return to Dashboard</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* SCANNER MODAL */}
      <Modal visible={isScanning}>
        <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={isScanning ? onBarcodeScanned : undefined}>
            <TouchableOpacity onPress={() => setIsScanning(false)} style={styles.closeBtn}><Ionicons name="close" size={35} color="#FFF" /></TouchableOpacity>
            <View style={styles.scannerOverlay}><View style={styles.scanWindow} /></View>
        </CameraView>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={styles.headerRow}>
            <View style={{flex: 1}}>
                <Text style={styles.stepText}>{initialDraft ? 'RESUMING DRAFT' : `STEP ${step} OF 5`}</Text>
                <View style={styles.barBg}><View style={[styles.barFill, {width: `${(step/5)*100}%`}]} /></View>
            </View>
            <TouchableOpacity style={styles.draftBtnHeader} onPress={handleSaveDraft}>
                <Ionicons name="save-outline" size={16} color={BRAND.draft} />
                <Text style={styles.draftBtnText}>Update Draft</Text>
            </TouchableOpacity>
        </View>

        {step === 1 && (
          <View>
            <Text style={styles.title}>KYC Registration</Text>
            <Text style={styles.label}>BVN *</Text>
            <View style={styles.row}>
                <TextInput style={[styles.input, {flex:1}]} value={formData.bvn} onChangeText={v=>updateData('bvn',v)} keyboardType="numeric" maxLength={11} />
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleStartScan('bvn')}><Ionicons name="scan" size={20} color="#FFF" /></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.verifyBtn, {backgroundColor: BRAND.accent}]} onPress={handleVerifyIdentity}>
                {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Verify Identity</Text>}
            </TouchableOpacity>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={[styles.input, {backgroundColor: '#EEE'}]} value={formData.customerName} editable={false} />
            <Text style={styles.label}>NIN *</Text>
            <TextInput style={styles.input} value={formData.nin} onChangeText={v=>updateData('nin',v)} keyboardType="numeric" maxLength={11} />
            <Text style={styles.label}>Date of Birth *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}><Text>{formData.dob || "Select Date"}</Text></TouchableOpacity>
            {showDatePicker && <DateTimePicker value={dateValue} mode="date" onChange={(e, d) => { setShowDatePicker(false); if(d) updateData('dob', d.toISOString().split('T')[0]); }} />}
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput style={styles.input} value={formData.phone} onChangeText={v=>updateData('phone',v)} keyboardType="phone-pad" />
            <Text style={styles.label}>Home Address *</Text>
            <TextInput style={[styles.input, {height: 60}]} multiline value={formData.address} onChangeText={v=>updateData('address',v)} />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}><Text style={styles.btnText}>Next: Employment</Text></TouchableOpacity>
          </View>
        )}

        {/* ... steps 2, 3, 4 remain structurally similar ... */}
        {step === 2 && (
          <View>
            <Text style={styles.title}>Employment & References</Text>
            <Text style={styles.label}>Employer Name</Text>
            <TextInput style={styles.input} value={formData.employerName} onChangeText={v=>updateData('employerName', v)} placeholder="e.g. Lagos State Govt" />
            <Text style={styles.label}>Job Title</Text>
            <TextInput style={styles.input} value={formData.jobTitle} onChangeText={v=>updateData('jobTitle', v)} placeholder="e.g. Teacher" />
            <View style={{height: 20}} />
            <Text style={styles.title}>Next of Kin</Text>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={formData.nokName} onChangeText={v=>updateData('nokName', v)} />
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={formData.nokPhone} onChangeText={v=>updateData('nokPhone', v)} keyboardType="phone-pad" />
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(1)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={()=>setStep(3)}><Text style={styles.btnText}>Next: Financials</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.title}>Financials</Text>
            <Text style={styles.label}>Loan Amount (₦)</Text>
            <TextInput style={styles.input} value={formData.loanAmount} onChangeText={v=>updateData('loanAmount',v)} keyboardType="numeric" />
            <Text style={styles.label}>Bank Name</Text>
            <TextInput style={styles.input} value={formData.bankName} onChangeText={v=>updateData('bankName',v)} />
            <Text style={styles.label}>Account Number</Text>
            <TextInput style={styles.input} value={formData.accountNumber} onChangeText={v=>updateData('accountNumber',v)} keyboardType="numeric" maxLength={10} />
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(2)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={()=>setStep(4)}><Text style={styles.btnText}>Next: Docs</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.title}>Documents</Text>
            {(['idUploaded', 'utilityUploaded', 'statementUploaded', 'selfieUploaded'] as const).map(key => (
              <TouchableOpacity key={key} style={[styles.uploadBox, formData[key] && {borderColor: BRAND.accent}]} onPress={() => handleUpload(key)}>
                <Text style={styles.uploadText}>{key.replace('Uploaded', '').toUpperCase()}</Text>
                <Ionicons name={formData[key] ? "checkmark-circle" : "cloud-upload"} size={24} color={BRAND.primary} />
              </TouchableOpacity>
            ))}
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(3)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(5)}><Text style={styles.btnText}>Review Application</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {step === 5 && (
          <View>
            <Text style={styles.title}>Review & Submit</Text>
            {isDuplicate && (
                <View style={styles.warningBox}>
                    <Ionicons name="warning" size={20} color="#FFF" />
                    <Text style={styles.warningText}>Duplicate Alert: This BVN is already in the system.</Text>
                </View>
            )}
            <View style={styles.reviewCard}>
                <Text style={styles.revLabel}>Customer: <Text style={styles.revVal}>{formData.customerName}</Text></Text>
                <Text style={styles.revLabel}>BVN: <Text style={styles.revVal}>{formData.bvn}</Text></Text>
                <Text style={styles.revLabel}>Amount: <Text style={styles.revVal}>₦{formData.loanAmount}</Text></Text>
                <View style={styles.staffTag}>
                   <Ionicons name="person-circle" size={14} color={BRAND.primary} />
                   <Text style={styles.staffTagText}>Created by: {staffFullName}</Text>
                </View>
            </View>

            <TouchableOpacity disabled={isDuplicate || isSubmitting} style={[styles.primaryBtn, {backgroundColor: isDuplicate ? '#CBD5E1' : BRAND.accent}]} onPress={handleFinalSubmit}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{isDuplicate ? "Cannot Submit Duplicate" : "Push to Dashboard"}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(4)}><Text>Edit Documents</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 15 },
  stepText: { fontSize: 10, fontWeight: 'bold', color: BRAND.primary, marginBottom: 5 },
  barBg: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 },
  barFill: { height: 4, backgroundColor: BRAND.primary, borderRadius: 2 },
  draftBtnHeader: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: BRAND.border, backgroundColor: '#FFF', gap: 5 },
  draftBtnText: { fontSize: 12, color: BRAND.draft, fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: BRAND.primary, marginBottom: 15 },
  label: { fontSize: 12, fontWeight: 'bold', marginTop: 10, color: '#64748b' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: BRAND.border, padding: 12, borderRadius: 10, marginTop: 5 },
  row: { flexDirection: 'row', gap: 10 },
  iconBtn: { backgroundColor: BRAND.primary, width: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  verifyBtn: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  primaryBtn: { backgroundColor: BRAND.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20, flex: 1 },
  secBtn: { backgroundColor: '#E2E8F0', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20, flex: 1 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  uploadBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: BRAND.border, marginBottom: 10 },
  uploadText: { fontWeight: 'bold', color: BRAND.primary },
  reviewCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border },
  revLabel: { fontSize: 13, color: '#64748b', marginBottom: 5 },
  revVal: { color: BRAND.primary, fontWeight: 'bold' },
  staffTag: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  staffTagText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  warningBox: { backgroundColor: BRAND.warning, padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  warningText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, flex: 1 },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,51,102,0.9)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  successCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 20, alignItems: 'center', width: '100%' },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: BRAND.primary, marginVertical: 10 },
  successSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  scannerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanWindow: { width: 250, height: 250, borderWidth: 2, borderColor: BRAND.accent, borderRadius: 20 },
  closeBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10 }
});
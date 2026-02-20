import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

// --- STORES ---
import api from '../../services/api';
import { Loan, useLoanStore } from '../../store/loanStore';
import useUserData from '../../store/userSignUp';

const BRAND = { 
  primary: "#003366", 
  accent: "#10B981", 
  warning: "#F59E0B", 
  danger: "#EF4444",
  draft: "#757575", 
  bg: "#F8FAFC", 
  border: "#E2E8F0" 
};

export default function CompleteLoanForm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [step, setStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanTarget, setScanTarget] = useState<'bvn' | 'nin' | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateValue, setDateValue] = useState(new Date(1995, 0, 1));
  const [currentLoanId, setCurrentLoanId] = useState<string>('');

  const { addLoan, loans: allLoans, setLoans } = useLoanStore();
  const { isSupervisor, token, email: currentUserEmail, funame: staffFullName, branch: staffBranch } = useUserData();

  const [formData, setFormData] = useState({
    customerName: '', bvn: '', nin: '', phone: '', address: '', dob: '',
    loanAmount: '', bankName: '', accountNumber: '',
    employerName: '', jobTitle: '', nokName: '', nokPhone: '',
    idUploaded: false, utilityUploaded: false, statementUploaded: false, selfieUploaded: false
  });

  // --- LOAD DRAFT OR SET NEW ID ---
  useEffect(() => {
    if (params.draftId) {
      const existingLoan = allLoans.find(l => l.id === params.draftId);
      if (existingLoan) {
        setCurrentLoanId(existingLoan.id);
        setFormData({
          customerName: existingLoan.customerName || '',
          bvn: existingLoan.bvn || '',
          nin: existingLoan.nin || '',
          phone: existingLoan.phone || '',
          address: existingLoan.address || '',
          dob: existingLoan.dob || '',
          loanAmount: existingLoan.loanAmount || '',
          bankName: existingLoan.bankName || '',
          accountNumber: existingLoan.accountNumber || '',
          employerName: existingLoan.employerName || '',
          jobTitle: existingLoan.jobTitle || '',
          nokName: existingLoan.nokName || '',
          nokPhone: existingLoan.nokPhone || '',
          idUploaded: !!existingLoan.idCard,
          utilityUploaded: !!existingLoan.ninHardCopy,
          statementUploaded: !!existingLoan.employmentLetter,
          selfieUploaded: !!existingLoan.passportPhoto
        });
      }
    } else {
      setCurrentLoanId(`loan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    }
  }, [params.draftId]);

  const updateData = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  const isDuplicate = useMemo(() => {
    if (!formData.bvn) return false;
    return allLoans.some(loan => 
        loan.bvn === formData.bvn && 
        loan.status !== 'Rejected' && 
        loan.status !== 'Draft' &&
        loan.id !== currentLoanId
    );
  }, [formData.bvn, allLoans, currentLoanId]);

  // --- DELETE DRAFT LOGIC ---
  const handleDeleteDraft = () => {
    Alert.alert(
      "Discard Application",
      "Are you sure you want to delete this draft? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            const updatedLoans = allLoans.filter(l => l.id !== currentLoanId);
            setLoans(updatedLoans);
            // Optional: API call to delete from server if synced
            // api.delete(`/loans/${currentLoanId}`); 
            router.replace('/(tabs)');
          } 
        }
      ]
    );
  };

  const createLoanObject = (status: Loan['status']): Loan => {
    return {
      id: currentLoanId,
      createdByEmail: currentUserEmail || 'system',
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
    router.replace('/(tabs)');
  };

const handleFinalSubmit = async () => {
    if (!formData.loanAmount || !formData.bvn) {
      Alert.alert("Error", "Loan Amount and BVN are required.");
      return;
    }

    setIsSubmitting(true);

    const normalizedEmail = currentUserEmail?.trim().toLowerCase();
    
    // 1. Prepare the data payload to match the backend's expected structure
    // The backend uses Postgres column names, so we map them here
    const payload = {
        customerName: formData.customerName,
        bvn: formData.bvn,
        nin: formData.nin,
        phone: formData.phone,
        loanAmount: formData.loanAmount,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        employerName: formData.employerName,
        status: 'Pending'
    };

    console.log("🚀 Attempting Submission to /api/v1/loans for:", normalizedEmail);

    try {
        // We use '/api/v1/loans' explicitly to ensure it matches the backend route
        const response = await api.post('loans', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // 2. Local store update
        const newLoanRecord = createLoanObject('Pending');
        newLoanRecord.createdByEmail = normalizedEmail; 
        addLoan(newLoanRecord, normalizedEmail); 

        setIsSubmitting(false);
        setShowSuccess(true);
    } catch (error: any) {
        setIsSubmitting(false);
        
        // Log the exact error for debugging
        console.group("🚨 TrustMicro API Error");
        console.log("Status:", error.response?.status);
        console.log("Data:", error.response?.data);
        console.groupEnd();

        const serverError = error.response?.data?.error || "The server rejected the request. Please check your connection.";
        Alert.alert("Submission Failed", serverError);
    }
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
        if(result.data.dob) updateData('dob', result.data.dob);
        Alert.alert("Success", "Identity Verified");
      }
    } catch (e) { Alert.alert("Error", "Verification failed."); } 
    finally { setIsVerifying(false); }
  };

  const handleStartScan = async (target: 'bvn' | 'nin') => {
    if (!permission?.granted) {
      const request = await requestPermission();
      if (!request.granted) return Alert.alert("Permission Required", "Camera access needed.");
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

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={showSuccess} transparent>
        <View style={styles.successOverlay}>
            <View style={styles.successCard}>
                <LottieView source={{uri: 'https://assets9.lottiefiles.com/packages/lf20_s2lryxtd.json'}} autoPlay loop={false} style={{ width: 120, height: 120 }} />
                <Text style={styles.successTitle}>Application Submitted</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => {setShowSuccess(false); router.replace('/(tabs)');}}>
                    <Text style={styles.btnText}>Return to Dashboard</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={isScanning}>
        <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={isScanning ? onBarcodeScanned : undefined}>
            <TouchableOpacity onPress={() => setIsScanning(false)} style={styles.closeBtn}><Ionicons name="close" size={35} color="#FFF" /></TouchableOpacity>
            <View style={styles.scannerOverlay}><View style={styles.scanWindow} /></View>
        </CameraView>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={styles.headerRow}>
            <View style={{flex: 1}}>
                <Text style={styles.stepText}>{params.draftId ? 'RESUMING DRAFT' : `STEP ${step} OF 5`}</Text>
                <View style={styles.barBg}><View style={[styles.barFill, {width: `${(step/5)*100}%`}]} /></View>
            </View>
            
            <View style={{flexDirection: 'row', gap: 8}}>
              {params.draftId && (
                <TouchableOpacity style={[styles.draftBtnHeader, {borderColor: BRAND.danger}]} onPress={handleDeleteDraft}>
                  <Ionicons name="trash-outline" size={16} color={BRAND.danger} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.draftBtnHeader} onPress={handleSaveDraft}>
                  <Ionicons name="save-outline" size={16} color={BRAND.draft} />
                  <Text style={styles.draftBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
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

        {/* --- STEPS 2-4 (Simplified for brevity, matches original flow) --- */}
        {step === 2 && (
          <View>
            <Text style={styles.title}>Employment</Text>
            <TextInput style={styles.input} value={formData.employerName} onChangeText={v=>updateData('employerName', v)} placeholder="Employer" />
            <TextInput style={styles.input} value={formData.jobTitle} onChangeText={v=>updateData('jobTitle', v)} placeholder="Job Title" />
            <Text style={styles.title}>Next of Kin</Text>
            <TextInput style={styles.input} value={formData.nokName} onChangeText={v=>updateData('nokName', v)} placeholder="Name" />
            <TextInput style={styles.input} value={formData.nokPhone} onChangeText={v=>updateData('nokPhone', v)} keyboardType="phone-pad" placeholder="Phone" />
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(1)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={()=>setStep(3)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.title}>Financials</Text>
            <TextInput style={styles.input} value={formData.loanAmount} onChangeText={v=>updateData('loanAmount',v)} keyboardType="numeric" placeholder="Amount" />
            <TextInput style={styles.input} value={formData.bankName} onChangeText={v=>updateData('bankName',v)} placeholder="Bank" />
            <TextInput style={styles.input} value={formData.accountNumber} onChangeText={v=>updateData('accountNumber',v)} keyboardType="numeric" maxLength={10} placeholder="Account" />
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(2)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={()=>setStep(4)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.title}>Documents</Text>
            {(['idUploaded', 'utilityUploaded', 'statementUploaded', 'selfieUploaded'] as const).map(key => (
              <TouchableOpacity key={key} style={[styles.uploadBox, formData[key] && {borderColor: BRAND.accent}]} onPress={() => {updateData(key, true)}}>
                <Text style={styles.uploadText}>{key.replace('Uploaded', '').toUpperCase()}</Text>
                <Ionicons name={formData[key] ? "checkmark-circle" : "cloud-upload"} size={24} color={BRAND.primary} />
              </TouchableOpacity>
            ))}
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(3)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(5)}><Text style={styles.btnText}>Review</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {step === 5 && (
          <View>
            <Text style={styles.title}>Review & Submit</Text>
            {isDuplicate && (
                <View style={styles.warningBox}>
                    <Ionicons name="warning" size={20} color="#FFF" />
                    <Text style={styles.warningText}>Duplicate BVN detected.</Text>
                </View>
            )}
            <View style={styles.reviewCard}>
                <Text style={styles.revLabel}>Customer: <Text style={styles.revVal}>{formData.customerName}</Text></Text>
                <Text style={styles.revLabel}>BVN: <Text style={styles.revVal}>{formData.bvn}</Text></Text>
                <Text style={styles.revLabel}>Amount: <Text style={styles.revVal}>₦{formData.loanAmount}</Text></Text>
            </View>

            <TouchableOpacity disabled={isDuplicate || isSubmitting} style={[styles.primaryBtn, {backgroundColor: isDuplicate ? '#CBD5E1' : BRAND.accent}]} onPress={handleFinalSubmit}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Submit Application</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(4)}><Text>Edit</Text></TouchableOpacity>
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
  draftBtnHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: BRAND.border, backgroundColor: '#FFF', gap: 5 },
  draftBtnText: { fontSize: 12, color: BRAND.draft, fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: BRAND.primary, marginBottom: 15 },
  label: { fontSize: 12, fontWeight: 'bold', marginTop: 10, color: '#64748b' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: BRAND.border, padding: 12, borderRadius: 10, marginTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  iconBtn: { backgroundColor: BRAND.primary, width: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
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
  warningBox: { backgroundColor: BRAND.warning, padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  warningText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, flex: 1 },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,51,102,0.9)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  successCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 20, alignItems: 'center', width: '100%' },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: BRAND.primary, marginVertical: 10 },
  scannerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanWindow: { width: 250, height: 250, borderWidth: 2, borderColor: BRAND.accent, borderRadius: 20 },
  closeBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10 }
});
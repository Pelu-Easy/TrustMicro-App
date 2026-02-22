import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

// --- STORES & UTILS ---
import api from '../../services/api';
import { useLoanStore } from '../../store/loanStore';
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

// --- CONFIGURATION ---
const LOAN_LIMITS: Record<string, number> = {
  'Federal': 1000000,
  'State': 500000,
  'Private': 250000
};

export default function CompleteLoanForm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [step, setStep] = useState(1);
  const [permission, requestPermission] = useCameraPermissions();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLoanId, setCurrentLoanId] = useState<string>('');

  const { addLoan, loans: allLoans } = useLoanStore();
  const { token, email: currentUserEmail, funame: staffFullName, branch: staffBranch } = useUserData();

  const [formData, setFormData] = useState({
    customerName: '', bvn: '', nin: '', phone: '', address: '', dob: '',
    loanAmount: '', bankName: '', accountNumber: '',
    employerName: '', jobTitle: '', nokName: '', nokPhone: '',
    idUploaded: '', utilityUploaded: '', statementUploaded: '', selfieUploaded: '',
    monthlyIncome: '₦50,000.00 - ₦100,000.00',
    loanType: 'Federal',
    repaymentCycle: 'Monthly',
    gender: '',
    tenure: '12 Months'
  });

  const updateData = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  // --- LOGIC: PICK DOCUMENTS ---
  const handlePickDocument = async (fieldKey: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        updateData(fieldKey, result.assets[0].uri);
        Alert.alert("Success", "Document attached.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not pick the document.");
    }
  };

  // --- LOGIC: VALIDATE LOAN AMOUNT ---
  const validateAmount = () => {
    const amount = parseFloat(formData.loanAmount);
    const limit = LOAN_LIMITS[formData.loanType];
    if (isNaN(amount)) return { valid: false, msg: "Please enter a valid amount." };
    if (amount > limit) return { valid: false, msg: `Limit for ${formData.loanType} is ₦${limit.toLocaleString()}.` };
    return { valid: true, msg: "" };
  };

  // --- LOGIC: HANDLE DRAFTS & INITIAL LOAD ---
  useEffect(() => {
    if (params.draftId) {
      const existingLoan = allLoans.find(l => l.id === params.draftId);
      if (existingLoan) {
        setCurrentLoanId(existingLoan.id);
        setFormData({
          ...formData,
          customerName: existingLoan.customerName || '',
          bvn: existingLoan.bvn || '',
          nin: existingLoan.nin || '',
          loanAmount: existingLoan.loanAmount || '',
          loanType: existingLoan.loanType || 'Federal',
          gender: existingLoan.gender || '',
          dob: existingLoan.dob || '',
          idUploaded: existingLoan.idCard || '',
          utilityUploaded: existingLoan.ninHardCopy || '',
          statementUploaded: existingLoan.employmentLetter || '',
          selfieUploaded: existingLoan.passportPhoto || '',
        });
      }
    } else {
      setCurrentLoanId(`loan_${Date.now()}`);
    }
  }, [params.draftId]);

  // --- LOGIC: VERIFY BVN ---
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
        updateData('dob', result.data.dob);
        Alert.alert("Success", "Identity Verified");
      }
    } catch (e) { Alert.alert("Error", "Verification failed."); } 
    finally { setIsVerifying(false); }
  };

  // --- LOGIC: FINAL SUBMISSION TO BACKEND ---
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      customerName: formData.customerName,
      bvn: formData.bvn,
      nin: formData.nin,
      phone: formData.phone || "0000000000",
      loanAmount: formData.loanAmount,
      bankName: formData.bankName || "N/A",
      accountNumber: formData.accountNumber || "0000000000",
      employerName: formData.employerName,
      ninImageUrl: formData.utilityUploaded,
      idImageUrl: formData.idUploaded,
      passportImageUrl: formData.selfieUploaded,
      utilityBillUrl: formData.statementUploaded,
      signatureImageUrl: "",
      monthlyIncome: formData.monthlyIncome,
      loanType: formData.loanType,
      repaymentCycle: formData.repaymentCycle,
      gender: formData.gender
    };

    try {
      const response = await api.post('/api/v1/loans', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 201 || response.status === 200) {
        Alert.alert("Success", "Loan application submitted successfully!", [
          { text: "OK", onPress: () => router.replace('/(tabs)') }
        ]);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Check your internet connection and try again.";
      Alert.alert("Submission Failed", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const Selector = ({ label, options, current, onSelect }: any) => (
    <View style={{ marginBottom: 15 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectorRow}>
        {options.map((opt: string) => (
          <TouchableOpacity 
            key={opt} 
            onPress={() => onSelect(opt)}
            style={[styles.selectorItem, current === opt && styles.selectorActive]}
          >
            <Text style={[styles.selectorText, current === opt && { color: '#FFF' }]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={styles.headerRow}>
            <View style={{flex: 1}}>
                <Text style={styles.stepText}>{`STEP ${step} OF 5`}</Text>
                <View style={styles.barBg}><View style={[styles.barFill, {width: `${(step/5)*100}%`}]} /></View>
            </View>
        </View>

        {step === 1 && (
          <View>
            <Text style={styles.title}>KYC Registration</Text>
            <Text style={styles.label}>BVN *</Text>
            <View style={styles.row}>
                <TextInput style={[styles.input, {flex:1}]} value={formData.bvn} onChangeText={v=>updateData('bvn',v)} keyboardType="numeric" maxLength={11} placeholder="11-digit BVN" />
                <TouchableOpacity style={styles.iconBtn}><Ionicons name="scan" size={20} color="#FFF" /></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.verifyBtn, {backgroundColor: BRAND.accent}]} onPress={handleVerifyIdentity}>
                {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Verify Identity</Text>}
            </TouchableOpacity>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={[styles.input, styles.disabledInput]} value={formData.customerName} editable={false} placeholder="Auto-filled from BVN" />
            <Text style={styles.label}>Date of Birth *</Text>
            <TextInput style={[styles.input, styles.disabledInput]} value={formData.dob} editable={false} placeholder="Auto-filled from BVN" />

            <Selector label="Gender *" options={['Male', 'Female']} current={formData.gender} onSelect={(v: string) => updateData('gender', v)} />
            <Text style={styles.label}>NIN *</Text>
            <TextInput style={styles.input} value={formData.nin} onChangeText={v=>updateData('nin',v)} keyboardType="numeric" maxLength={11} placeholder="11-digit NIN" />
            
            <TouchableOpacity style={styles.primaryBtn} onPress={() => formData.customerName ? setStep(2) : Alert.alert("Required", "Verify BVN first")}>
                <Text style={styles.btnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.title}>Employment</Text>
            <TextInput style={styles.input} value={formData.employerName} onChangeText={v=>updateData('employerName', v)} placeholder="Employer Name" />
            <TextInput style={styles.input} value={formData.jobTitle} onChangeText={v=>updateData('jobTitle', v)} placeholder="Job Title" />
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(1)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={()=>setStep(3)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.title}>Financials</Text>
            <Selector label="Monthly Income Range *" options={['₦50,000.00 - ₦100,000.00', '₦110,000.00 - ₦200,000.00', '₦210,000.00 - ₦350,000.00', '₦360,000.00 and above']} current={formData.monthlyIncome} onSelect={(v: string) => updateData('monthlyIncome', v)} />
            <Selector label="Loan Type *" options={['Federal', 'State', 'Private']} current={formData.loanType} onSelect={(v: string) => updateData('loanType', v)} />
            <Text style={styles.label}>Requested Loan Amount *</Text>
            <TextInput style={[styles.input, !validateAmount().valid && {borderColor: BRAND.danger}]} value={formData.loanAmount} onChangeText={v=>updateData('loanAmount',v)} keyboardType="numeric" placeholder={`Max: ₦${LOAN_LIMITS[formData.loanType].toLocaleString()}`} />
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(2)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => validateAmount().valid ? setStep(4) : Alert.alert("Error", validateAmount().msg)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.title}>Documents</Text>
            {[
              { label: 'ID CARD', key: 'idUploaded' },
              { label: 'UTILITY BILL', key: 'utilityUploaded' },
              { label: 'EMPLOYMENT LETTER', key: 'statementUploaded' },
              { label: 'PASSPORT PHOTO', key: 'selfieUploaded' }
            ].map(doc => (
              <TouchableOpacity key={doc.key} style={[styles.uploadBox, (formData as any)[doc.key] && { borderColor: BRAND.accent }]} onPress={() => handlePickDocument(doc.key)}>
                <Text style={[styles.uploadText, (formData as any)[doc.key] && { color: BRAND.accent }]}>{doc.label} {(formData as any)[doc.key] ? '✅' : ''}</Text>
                <Ionicons name="cloud-upload" size={24} color={(formData as any)[doc.key] ? BRAND.accent : BRAND.primary} />
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
            <View style={styles.reviewCard}>
                <Text style={styles.revLabel}>Customer: <Text style={styles.revVal}>{formData.customerName}</Text></Text>
                <Text style={styles.revLabel}>Loan Type: <Text style={styles.revVal}>{formData.loanType}</Text></Text>
                <Text style={styles.revLabel}>Amount: <Text style={styles.revVal}>₦{Number(formData.loanAmount || 0).toLocaleString()}</Text></Text>
            </View>
            <TouchableOpacity 
              style={[styles.primaryBtn, isSubmitting && { opacity: 0.7 }]} 
              onPress={handleFinalSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Submit Application</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(4)} disabled={isSubmitting}><Text>Edit</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  stepText: { fontSize: 10, fontWeight: 'bold', color: BRAND.primary, marginBottom: 5 },
  barBg: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, flex: 1 },
  barFill: { height: 4, backgroundColor: BRAND.primary, borderRadius: 2 },
  title: { fontSize: 22, fontWeight: 'bold', color: BRAND.primary, marginBottom: 15 },
  label: { fontSize: 12, fontWeight: 'bold', marginTop: 10, color: '#64748b' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: BRAND.border, padding: 12, borderRadius: 10, marginTop: 8 },
  disabledInput: { backgroundColor: '#F1F5F9' },
  row: { flexDirection: 'row', gap: 10 },
  iconBtn: { backgroundColor: BRAND.primary, width: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  verifyBtn: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  primaryBtn: { backgroundColor: BRAND.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20, flex: 1 },
  secBtn: { backgroundColor: '#E2E8F0', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20, flex: 1 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  uploadBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, marginBottom: 12 },
  uploadText: { fontWeight: 'bold', color: BRAND.primary },
  reviewCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, marginBottom: 20 },
  revLabel: { fontSize: 13, color: '#64748b' },
  revVal: { color: BRAND.primary, fontWeight: 'bold' },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  selectorItem: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: BRAND.border, backgroundColor: '#FFF' },
  selectorActive: { backgroundColor: BRAND.primary, borderColor: BRAND.primary },
  selectorText: { fontSize: 12, color: BRAND.primary, fontWeight: '600' }
});
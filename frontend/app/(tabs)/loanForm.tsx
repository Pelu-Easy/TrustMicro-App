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

const LOAN_LIMITS: Record<string, number> = {
  'Federal': 1000000,
  'State': 500000,
  'Private': 250000
};

const ReviewItem = ({ label, value }: { label: string, value: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
    <Text style={styles.revLabel}>{label}:</Text>
    <Text style={styles.revVal}>{value || 'N/A'}</Text>
  </View>
);

const DocStatus = ({ label, exists }: { label: string, exists: boolean }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <Ionicons name={exists ? "checkmark-circle" : "close-circle"} size={14} color={exists ? BRAND.accent : BRAND.danger} />
    <Text style={{ fontSize: 11, color: '#64748b' }}>{label}</Text>
  </View>
);

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
    // --- UPDATED DOCUMENT STATE KEYS ---
    idUploaded: '', 
    utilityUploaded: '', 
    passportUploaded: '', 
    workIdUploaded: '', 
    statementUploaded: '', 
    signatureUploaded: '',
    monthlyIncome: '₦50,000.00 - ₦100,000.00',
    loanType: 'Federal',
    repaymentCycle: 'Monthly',
    gender: '',
    tenure: '12 Months'
  });

  const updateData = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

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

  const validateAmount = () => {
    const amount = parseFloat(formData.loanAmount);
    const limit = LOAN_LIMITS[formData.loanType];
    if (isNaN(amount)) return { valid: false, msg: "Please enter a valid amount." };
    if (amount > limit) return { valid: false, msg: `Limit for ${formData.loanType} is ₦${limit.toLocaleString()}.` };
    return { valid: true, msg: "" };
  };

useEffect(() => {
    if (params.draftId) {
      const existingLoan = allLoans.find(l => l.id === params.draftId);
      if (existingLoan) {
        setCurrentLoanId(existingLoan.id);
        setFormData(prev => ({
          ...prev,
          customerName: existingLoan.customerName || '',
          bvn: existingLoan.bvn || '',
          nin: existingLoan.nin || '',
          phone: existingLoan.phone || '',
          loanAmount: existingLoan.loanAmount || '',
          bankName: existingLoan.bankName || '',
          accountNumber: existingLoan.accountNumber || '',
          loanType: existingLoan.loanType || 'Federal',
          gender: existingLoan.gender || '',
          dob: existingLoan.dob || '',
          idUploaded: existingLoan.idCard || '',
          utilityUploaded: existingLoan.ninHardCopy || '',
          statementUploaded: (existingLoan as any).bankStatement || '',
          passportUploaded: existingLoan.passportPhoto || '',
          workIdUploaded: (existingLoan as any).workIdUrl || '',
          signatureUploaded: (existingLoan as any).signatureUrl || '',
        }));
      }
    } else {
      setCurrentLoanId(`loan_${Date.now()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.draftId]);

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

const handleFinalSubmit = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);

  const payload = {
    customerName: formData.customerName,
    bvn: formData.bvn,
    nin: formData.nin,
    phone: formData.phone,
    loanAmount: formData.loanAmount,
    bankName: formData.bankName,
    accountNumber: formData.accountNumber,
    employerName: formData.employerName,
    jobTitle: formData.jobTitle,
    ninImageUrl: formData.idUploaded, 
    idImageUrl: formData.idUploaded,
    passportImageUrl: formData.passportUploaded,
    utilityBillUrl: formData.utilityUploaded,
    workIdUrl: formData.workIdUploaded,
    statementUrl: formData.statementUploaded,
    signatureUrl: formData.signatureUploaded,
    monthlyIncome: formData.monthlyIncome,
    loanType: formData.loanType,
    repaymentCycle: formData.repaymentCycle,
    gender: formData.gender,
    tenure: formData.tenure,
    staffName: staffFullName || 'System',
    branchName: staffBranch || 'Main'
  };

  try {
    const response = await api.post('/loans', payload);

    if (response.status === 201 || response.status === 200) {
      // We trigger the Alert first. The reset happens when they click "OK".
      Alert.alert("Success", "Loan application submitted successfully!", [
        { 
          text: "OK", 
          onPress: () => {
            // 1. Reset the form data to initial empty strings
            setFormData({
              customerName: '', bvn: '', nin: '', phone: '', address: '', dob: '',
              loanAmount: '', bankName: '', accountNumber: '',
              employerName: '', jobTitle: '', nokName: '', nokPhone: '',
              idUploaded: '', utilityUploaded: '', passportUploaded: '', 
              workIdUploaded: '', statementUploaded: '', signatureUploaded: '',
              monthlyIncome: '₦50,000.00 - ₦100,000.00',
              loanType: 'Federal', repaymentCycle: 'Monthly',
              gender: '', tenure: '12 Months'
            });

            // 2. Reset the step back to the beginning
            setStep(1);

            // 3. Clear the current ID so it doesn't try to reload old data
            setCurrentLoanId(`loan_${Date.now()}`);

            // 4. Finally, navigate away
            router.replace('/(tabs)');
          } 
        }
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
            
            <Text style={styles.label}>Customer Phone Number *</Text>
            <TextInput style={styles.input} value={formData.phone} onChangeText={v=>updateData('phone', v)} keyboardType="phone-pad" placeholder="080XXXXXXXX" />

            <Text style={styles.label}>Date of Birth *</Text>
            <TextInput style={[styles.input, styles.disabledInput]} value={formData.dob} editable={false} placeholder="Auto-filled from BVN" />

            <Selector label="Gender *" options={['Male', 'Female']} current={formData.gender} onSelect={(v: string) => updateData('gender', v)} />
            <Text style={styles.label}>NIN *</Text>
            <TextInput style={styles.input} value={formData.nin} onChangeText={v=>updateData('nin',v)} keyboardType="numeric" maxLength={11} placeholder="11-digit NIN" />
            
            <TouchableOpacity style={styles.primaryBtn} onPress={() => (formData.customerName && formData.phone) ? setStep(2) : Alert.alert("Required", "Please verify BVN and enter Phone Number")}>
                <Text style={styles.btnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.title}>Employment & Bank</Text>
            <Text style={styles.label}>Employer Name</Text>
            <TextInput style={styles.input} value={formData.employerName} onChangeText={v=>updateData('employerName', v)} placeholder="Employer Name" />
            <Text style={styles.label}>Job Title</Text>
            <TextInput style={styles.input} value={formData.jobTitle} onChangeText={v=>updateData('jobTitle', v)} placeholder="Job Title" />
            
            <View style={styles.divider} />
            <Text style={styles.label}>Bank Name *</Text>
            <TextInput style={styles.input} value={formData.bankName} onChangeText={v=>updateData('bankName', v)} placeholder="e.g. GTBank" />
            <Text style={styles.label}>Account Number *</Text>
            <TextInput style={styles.input} value={formData.accountNumber} onChangeText={v=>updateData('accountNumber', v)} keyboardType="numeric" maxLength={10} placeholder="10-digit Account Number" />

            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(1)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={()=> (formData.bankName && formData.accountNumber) ? setStep(3) : Alert.alert("Required", "Please enter Bank details")}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
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
              { label: 'PASSPORT PHOTO', key: 'passportUploaded' },
              { label: 'WORK ID / EMPLOYMENT', key: 'workIdUploaded' },
              { label: 'BANK STATEMENT', key: 'statementUploaded' },
              { label: 'CUSTOMER SIGNATURE', key: 'signatureUploaded' }
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
            <Text style={styles.subtitle}>Confirm details below are correct before submitting.</Text>
            
            <View style={styles.reviewCard}>
                <Text style={styles.reviewSectionHeader}>Identity & Contact</Text>
                <ReviewItem label="Name" value={formData.customerName} />
                <ReviewItem label="Phone" value={formData.phone} />
                <ReviewItem label="BVN" value={`*******${formData.bvn.slice(-4)}`} />
                <ReviewItem label="Gender" value={formData.gender} />
                
                <View style={styles.divider} />

                <Text style={styles.reviewSectionHeader}>Bank Details</Text>
                <ReviewItem label="Bank" value={formData.bankName} />
                <ReviewItem label="Account" value={formData.accountNumber} />

                <View style={styles.divider} />

                <Text style={styles.reviewSectionHeader}>Loan Details</Text>
                <ReviewItem label="Type" value={formData.loanType} />
                <ReviewItem label="Amount" value={`₦${Number(formData.loanAmount || 0).toLocaleString()}`} />
                <ReviewItem label="Tenure" value={formData.tenure} />

                <View style={styles.divider} />

                <Text style={styles.reviewSectionHeader}>Documents</Text>
                <View style={styles.docRow}>
                  <DocStatus label="ID" exists={!!formData.idUploaded} />
                  <DocStatus label="Utility" exists={!!formData.utilityUploaded} />
                  <DocStatus label="Photo" exists={!!formData.passportUploaded} />
                  <DocStatus label="WorkID" exists={!!formData.workIdUploaded} />
                  <DocStatus label="Stmt" exists={!!formData.statementUploaded} />
                  <DocStatus label="Sign" exists={!!formData.signatureUploaded} />
                </View>
            </View>

            <TouchableOpacity 
              style={[styles.primaryBtn, isSubmitting && { opacity: 0.7 }]} 
              onPress={handleFinalSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Confirm & Submit</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(4)} disabled={isSubmitting}><Text>Edit Details</Text></TouchableOpacity>
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
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
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
  reviewSectionHeader: { fontSize: 14, fontWeight: 'bold', color: BRAND.primary, marginBottom: 10 },
  divider: { height: 1, backgroundColor: BRAND.border, marginVertical: 12 },
  revLabel: { fontSize: 13, color: '#64748b' },
  revVal: { color: BRAND.primary, fontWeight: 'bold' },
  docRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 5 },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  selectorItem: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: BRAND.border, backgroundColor: '#FFF' },
  selectorActive: { backgroundColor: BRAND.primary, borderColor: BRAND.primary },
  selectorText: { fontSize: 12, color: BRAND.primary, fontWeight: '600' }
});
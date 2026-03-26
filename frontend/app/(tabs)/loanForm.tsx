import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

const { width } = Dimensions.get('window');

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

// --- SUB-COMPONENTS ---
const ReviewItem = ({ label, value }: { label: string, value: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
    <Text style={styles.revLabel}>{label}:</Text>
    <Text style={styles.revVal}>{value || 'N/A'}</Text>
  </View>
);

export default function CompleteLoanForm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [step, setStep] = useState(1);
  const { loans: allLoans } = useLoanStore();
  
  const { 
    funame: staffFullName, 
    email: staffEmail,
    branch: staffBranch, 
    supervisor: assignedSupervisor, 
    role, 
    isSupervisor, 
    isHeadOfCredit,
    _hasHydrated 
  } = useUserData();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '', bvn: '', nin: '', phone: '', address: '', dob: '',
    loanAmount: '', bankName: '', accountNumber: '',
    employerName: '', jobTitle: '', nokName: '', nokPhone: '',
    supervisorId: '', supervisorName: '',
    idImageUrl: '', 
    utilityBillUrl: '', 
    passportImageUrl: '', 
    workIdUrl: '', 
    statementUrl: '', 
    signatureUrl: '',
    ninImageUrl: '',
    monthlyIncome: '₦50,000.00 - ₦100,000.00',
    loanType: 'Federal',
    repaymentCycle: 'Monthly',
    gender: 'Male',
    tenure: '12 Months'
  });

  useEffect(() => {
    if (!_hasHydrated) return;
    const userRole = role?.toLowerCase() || '';
    const isManagement = isSupervisor || isHeadOfCredit || ['manager', 'admin', 'cco', 'md', 'finance'].includes(userRole);
    if (isManagement) router.replace('/'); 
  }, [_hasHydrated, role, isHeadOfCredit, isSupervisor]);

  useEffect(() => {
    if (_hasHydrated && assignedSupervisor) {
      setFormData(prev => ({ ...prev, supervisorName: assignedSupervisor, supervisorId: assignedSupervisor }));
    }
  }, [_hasHydrated, assignedSupervisor]);

  useEffect(() => {
    if (_hasHydrated && params.bvn) {
      const incomingBvn = Array.isArray(params.bvn) ? params.bvn[0] : params.bvn;
      setFormData(prev => ({ ...prev, bvn: incomingBvn }));
      setTimeout(() => handleVerifyIdentity(), 600);
    }
  }, [_hasHydrated, params.bvn]);

  const updateData = (key: keyof typeof formData, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const handlePickDocument = async (fieldKey: keyof typeof formData) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
      if (!result.canceled) {
        updateData(fieldKey, result.assets[0].uri);
        Alert.alert("Success", "Document attached.");
      }
    } catch (e) { Alert.alert("Error", "Could not pick document."); }
  };

  // --- VALIDATION LOGIC ---
  const validateStep2 = () => {
    if (!formData.bankName) {
      Alert.alert("Invalid Input", "Please select a bank.");
      return false;
    }
    if (formData.accountNumber.length !== 10) {
      Alert.alert("Invalid Account", "Account number must be exactly 10 digits.");
      return false;
    }
    return true;
  };

  const validateAmount = () => {
    const amount = parseFloat(formData.loanAmount);
    const limit = LOAN_LIMITS[formData.loanType] || 0;
    if (isNaN(amount) || amount <= 0) return { valid: false, msg: "Enter a valid amount." };
    if (amount > limit) return { valid: false, msg: `Limit for ${formData.loanType} is ₦${limit.toLocaleString()}.` };
    return { valid: true, msg: "" };
  };

  const handleVerifyIdentity = async () => {
    if (formData.bvn.length < 11) { Alert.alert("Error", "Enter 11-digit BVN"); return; }
    setIsVerifying(true);
    try {
      const res = await api.post('/manager/verify-bvn', { bvn: formData.bvn });
      if (res.data.status === "success" && res.data.data) {
        const customer = res.data.data;
        setFormData(prev => ({
          ...prev,
          customerName: customer.fullName || '',
          dob: customer.dateOfBirth || prev.dob,
          phone: customer.phoneNumber || prev.phone,
          gender: customer.gender || prev.gender
        }));
        Alert.alert("Success", "Identity Verified");
      } else { Alert.alert("Verification Failed", "BVN not found."); }
    } catch (e) { 
        console.error("BVN Verification Error:", e);
        Alert.alert("Error", "Verification service unavailable."); 
    } finally { setIsVerifying(false); }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = { ...formData, staffName: staffFullName, createdByEmail: staffEmail, branchName: staffBranch, status: 'Pending', parentLoanId: params.id || null };
      const response = await api.post('/loans', payload);
      if (response.status === 201 || response.status === 200) {
        Alert.alert("Success", "Loan Application Submitted!", [{ text: "OK", onPress: () => router.replace('/') }]);
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Submission failed.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={styles.headerRow}>
          <View style={{flex: 1}}>
            <Text style={styles.stepText}>{`STEP ${step} OF 5`}</Text>
            <View style={styles.barBg}><View style={[styles.barFill, {width: `${(step/5)*100}%`}]} /></View>
          </View>
        </View>

        {/* STEP 1: KYC */}
        {step === 1 && (
          <View>
            <Text style={styles.title}>KYC Registration</Text>
            <Text style={styles.label}>BVN *</Text>
            <View style={styles.row}>
                <TextInput style={[styles.input, {flex:1}]} value={formData.bvn} onChangeText={v=>updateData('bvn',v)} keyboardType="numeric" maxLength={11} />
                <TouchableOpacity style={[styles.verifyBtn, {backgroundColor: BRAND.accent}]} onPress={handleVerifyIdentity}>
                    {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Verify</Text>}
                </TouchableOpacity>
            </View>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={[styles.input, styles.disabledInput]} value={formData.customerName} editable={false} placeholder="Verified Name" />
            
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={formData.gender} onValueChange={(v) => updateData('gender', v)}>
                <Picker.Item label="Male" value="Male" />
                <Picker.Item label="Female" value="Female" />
              </Picker>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => (formData.customerName) ? setStep(2) : Alert.alert("Missing Info", "Please verify BVN.")}>
                <Text style={styles.btnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: EMPLOYMENT & BANK */}
        {step === 2 && (
          <View>
            <Text style={styles.title}>Employment & Bank</Text>
            <Text style={styles.label}>Employer Name</Text>
            <TextInput style={styles.input} value={formData.employerName} onChangeText={v=>updateData('employerName', v)} />
            
            <Text style={styles.label}>Bank Name *</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={formData.bankName} onValueChange={(v) => updateData('bankName', v)}>
                <Picker.Item label="Select Bank" value="" />
                <Picker.Item label="Access Bank" value="Access Bank" />
                <Picker.Item label="First Bank" value="First Bank" />
                <Picker.Item label="GTBank" value="GTBank" />
                <Picker.Item label="UBA" value="UBA" />
                <Picker.Item label="Zenith Bank" value="Zenith Bank" />
                <Picker.Item label="Opay" value="Opay" />
                <Picker.Item label="Palmpay" value="Palmpay" />
              </Picker>
            </View>
            
            <Text style={styles.label}>Account Number * ({formData.accountNumber.length}/10)</Text>
            <TextInput 
              style={[styles.input, formData.accountNumber.length > 0 && formData.accountNumber.length !== 10 ? {borderColor: BRAND.danger} : {}]} 
              value={formData.accountNumber} 
              onChangeText={v=>updateData('accountNumber', v)} 
              keyboardType="numeric" 
              maxLength={10} 
              placeholder="0123456789"
            />
            
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(1)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.primaryBtn, formData.accountNumber.length !== 10 ? {backgroundColor: BRAND.draft} : {}]} 
                    onPress={()=> validateStep2() && setStep(3)}
                >
                    <Text style={styles.btnText}>Next</Text>
                </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: FINANCIALS */}
        {step === 3 && (
          <View>
            <Text style={styles.title}>Financials</Text>
            <Text style={styles.label}>Loan Type</Text>
            <TextInput style={styles.input} value={formData.loanType} editable={false} />
            
            <Text style={styles.label}>Requested Amount</Text>
            <TextInput style={styles.input} value={formData.loanAmount} onChangeText={v=>updateData('loanAmount', v)} keyboardType="numeric" />
            
            <Text style={styles.label}>Monthly Income Range</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={formData.monthlyIncome} onValueChange={(v) => updateData('monthlyIncome', v)}>
                <Picker.Item label="₦50,000.00 - ₦100,000.00" value="₦50,000.00 - ₦100,000.00" />
                <Picker.Item label="₦100,001.00 - ₦250,000.00" value="₦100,001.00 - ₦250,000.00" />
                <Picker.Item label="₦250,001.00 - ₦500,000.00" value="₦250,001.00 - ₦500,000.00" />
                <Picker.Item label="Over ₦500,000.00" value="Over ₦500,000.00" />
              </Picker>
            </View>

            <Text style={styles.label}>Repayment Cycle</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={formData.repaymentCycle} onValueChange={(v) => updateData('repaymentCycle', v)}>
                <Picker.Item label="Monthly" value="Monthly" />
                <Picker.Item label="Weekly" value="Weekly" />
              </Picker>
            </View>

            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(2)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={()=> validateAmount().valid ? setStep(4) : Alert.alert("Error", validateAmount().msg)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: DOCUMENTS */}
        {step === 4 && (
          <View>
            <Text style={styles.title}>Documents</Text>
            {[
              { label: 'Passport Photo', key: 'passportImageUrl' },
              { label: 'Digital Signature', key: 'signatureUrl' },
              { label: 'Government ID', key: 'idImageUrl' },
              { label: 'Work ID Card', key: 'workIdUrl' },
              { label: 'Utility Bill', key: 'utilityBillUrl' },
              { label: 'Bank Statement', key: 'statementUrl' },
              { label: 'NIN Slip', key: 'ninImageUrl' },
            ].map(item => (
              <TouchableOpacity key={item.key} style={styles.uploadBox} onPress={() => handlePickDocument(item.key as keyof typeof formData)}>
                <Text>{item.label} {formData[item.key as keyof typeof formData] ? '✅' : ''}</Text>
                <Ionicons name="cloud-upload" size={24} color={BRAND.primary} />
              </TouchableOpacity>
            ))}
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(3)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={()=>setStep(5)}><Text style={styles.btnText}>Review</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <View>
            <Text style={styles.title}>Review & Submit</Text>
            <View style={styles.reviewCard}>
                <ReviewItem label="Customer" value={formData.customerName} />
                <ReviewItem label="Amount" value={`₦${parseFloat(formData.loanAmount).toLocaleString()}`} />
                <ReviewItem label="Reporting to" value={formData.supervisorName} />
                <ReviewItem label="Officer Email" value={staffEmail || 'N/A'} />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleFinalSubmit} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Confirm & Submit</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  headerRow: { flexDirection: 'row', marginBottom: 20 },
  stepText: { fontSize: 10, fontWeight: 'bold', color: BRAND.primary },
  barBg: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 },
  barFill: { height: 4, backgroundColor: BRAND.primary, borderRadius: 2 },
  title: { fontSize: 22, fontWeight: 'bold', color: BRAND.primary, marginBottom: 15 },
  label: { fontSize: 12, fontWeight: 'bold', marginTop: 15, color: '#64748b' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: BRAND.border, padding: 12, borderRadius: 10, marginTop: 8 },
  pickerContainer: { backgroundColor: '#FFF', borderWidth: 1, borderColor: BRAND.border, borderRadius: 10, marginTop: 8, overflow: 'hidden' },
  disabledInput: { backgroundColor: '#F1F5F9' },
  row: { flexDirection: 'row', gap: 10 },
  verifyBtn: { padding: 12, borderRadius: 10, justifyContent: 'center', marginTop: 8, minWidth: 80 },
  primaryBtn: { backgroundColor: BRAND.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20, flex: 1 },
  secBtn: { backgroundColor: '#E2E8F0', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20, flex: 1 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  uploadBox: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, marginBottom: 12, backgroundColor: '#FFF' },
  reviewCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border },
  revLabel: { fontSize: 13, color: '#64748b' },
  revVal: { color: BRAND.primary, fontWeight: 'bold' }
});
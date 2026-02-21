import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
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

  // --- DYNAMIC VALIDATION LOGIC ---
  const validateAmount = () => {
    const amount = parseFloat(formData.loanAmount);
    const limit = LOAN_LIMITS[formData.loanType];
    
    if (isNaN(amount)) return { valid: false, msg: "Please enter a valid amount." };
    if (amount > limit) {
      return { 
        valid: false, 
        msg: `The maximum amount for ${formData.loanType} loans is ₦${limit.toLocaleString()}.` 
      };
    }
    return { valid: true, msg: "" };
  };

  useEffect(() => {
    if (params.draftId) {
      const existingLoan = allLoans.find(l => l.id === params.draftId);
      if (existingLoan) {
        setCurrentLoanId(existingLoan.id);
        setFormData({
          ...formData, // Spread defaults
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
          idUploaded: existingLoan.idCard || '',
          utilityUploaded: existingLoan.ninHardCopy || '',
          statementUploaded: existingLoan.employmentLetter || '',
          selfieUploaded: existingLoan.passportPhoto || '',
          monthlyIncome: existingLoan.monthlyIncome || '₦50,000.00 - ₦100,000.00',
          loanType: existingLoan.loanType || 'Federal',
          repaymentCycle: existingLoan.repaymentCycle || 'Monthly',
          gender: existingLoan.gender || '',
          tenure: existingLoan.tenure || '12 Months'
        });
      }
    } else {
      setCurrentLoanId(`loan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    }
  }, [params.draftId]);

  const updateData = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSaveDraft = () => {
    const draftRecord = createLoanObject('Draft');
    addLoan(draftRecord, currentUserEmail || ''); 
    Alert.alert("Draft Saved", "Work saved successfully.");
    router.replace('/(tabs)');
  };

  const createLoanObject = (status: Loan['status']): Loan => ({
    id: currentLoanId,
    createdByEmail: currentUserEmail || 'system',
    staffName: staffFullName || 'Unknown Staff', 
    branchName: staffBranch || 'Main Branch',
    title: 'Loan Application',
    customerName: formData.customerName || 'Unnamed Draft',
    bvn: formData.bvn,
    nin: formData.nin,
    phone: formData.phone || '',
    address: formData.address || '',
    gender: formData.gender, 
    dob: formData.dob || '',
    submittedDate: new Date().toLocaleDateString(),
    activeDate: '',
    employerName: formData.employerName || '',
    jobTitle: formData.jobTitle || '',
    loanAmount: formData.loanAmount || '',
    amount: `₦${Number(formData.loanAmount || 0).toLocaleString()}`,
    nokName: formData.nokName || '',
    nokPhone: formData.nokPhone || '',
    bankName: formData.bankName || '',
    accountNumber: formData.accountNumber || '',
    status: status,
    idCard: formData.idUploaded || null,
    ninHardCopy: formData.utilityUploaded || null,
    bvnHardCopy: null,
    employmentLetter: formData.statementUploaded || null,
    passportPhoto: formData.selfieUploaded || null,
    tenure: formData.tenure,
    interestRate: '5',
    monthlyRepayment: '', 
    loanType: formData.loanType,
    monthlyIncome: formData.monthlyIncome,
    repaymentCycle: formData.repaymentCycle,
    repaymentEndDate: '',
  });

  const handleStep3Next = () => {
    const validation = validateAmount();
    if (!validation.valid) {
      Alert.alert("Limit Exceeded", validation.msg);
      return;
    }
    setStep(4);
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
        updateData('dob', result.data.dob);
        Alert.alert("Success", "Identity Verified");
      }
    } catch (e) { Alert.alert("Error", "Verification failed."); } 
    finally { setIsVerifying(false); }
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
      {/* SUCCESS & SCANNER MODALS REMAIN THE SAME AS PREVIOUS VERSION */}
      
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={styles.headerRow}>
            <View style={{flex: 1}}>
                <Text style={styles.stepText}>{params.draftId ? 'RESUMING DRAFT' : `STEP ${step} OF 5`}</Text>
                <View style={styles.barBg}><View style={[styles.barFill, {width: `${(step/5)*100}%`}]} /></View>
            </View>
            <TouchableOpacity style={styles.draftBtnHeader} onPress={handleSaveDraft}>
                <Ionicons name="save-outline" size={16} color={BRAND.draft} />
                <Text style={styles.draftBtnText}>Save</Text>
            </TouchableOpacity>
        </View>

        {step === 1 && (
          <View>
            <Text style={styles.title}>KYC Registration</Text>
            <Text style={styles.label}>BVN *</Text>
            <View style={styles.row}>
                <TextInput style={[styles.input, {flex:1}]} value={formData.bvn} onChangeText={v=>updateData('bvn',v)} keyboardType="numeric" maxLength={11} />
                <TouchableOpacity style={styles.iconBtn}><Ionicons name="scan" size={20} color="#FFF" /></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.verifyBtn, {backgroundColor: BRAND.accent}]} onPress={handleVerifyIdentity}>
                {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Verify Identity</Text>}
            </TouchableOpacity>
            <Selector label="Gender *" options={['Male', 'Female']} current={formData.gender} onSelect={(v: string) => updateData('gender', v)} />
            <Text style={styles.label}>NIN *</Text>
            <TextInput style={styles.input} value={formData.nin} onChangeText={v=>updateData('nin',v)} keyboardType="numeric" maxLength={11} />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.title}>Employment</Text>
            <TextInput style={styles.input} value={formData.employerName} onChangeText={v=>updateData('employerName', v)} placeholder="Employer" />
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
            <TextInput 
              style={[styles.input, !validateAmount().valid && {borderColor: BRAND.danger}]} 
              value={formData.loanAmount} 
              onChangeText={v=>updateData('loanAmount',v)} 
              keyboardType="numeric" 
              placeholder={`Max for ${formData.loanType}: ₦${LOAN_LIMITS[formData.loanType].toLocaleString()}`} 
            />
            {!validateAmount().valid && <Text style={{color: BRAND.danger, fontSize: 11, marginTop: 4}}>{validateAmount().msg}</Text>}

            <Selector label="Loan Tenure *" options={['3 Months', '6 Months', '12 Months', '15 Months']} current={formData.tenure} onSelect={(v: string) => updateData('tenure', v)} />

            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(2)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleStep3Next}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.title}>Documents</Text>
            {['idUploaded', 'utilityUploaded', 'statementUploaded', 'selfieUploaded'].map(key => (
              <TouchableOpacity key={key} style={styles.uploadBox} onPress={() => {}}>
                <Text style={styles.uploadText}>{key.replace('Uploaded', '').toUpperCase()}</Text>
                <Ionicons name="cloud-upload" size={24} color={BRAND.primary} />
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
                <Text style={styles.revLabel}>Amount: <Text style={styles.revVal}>₦{Number(formData.loanAmount).toLocaleString()}</Text></Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowSuccess(true)}><Text style={styles.btnText}>Submit Application</Text></TouchableOpacity>
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
  barBg: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, flex: 1 },
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
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  selectorItem: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: BRAND.border, backgroundColor: '#FFF' },
  selectorActive: { backgroundColor: BRAND.primary, borderColor: BRAND.primary },
  selectorText: { fontSize: 12, color: BRAND.primary, fontWeight: '600' }
});
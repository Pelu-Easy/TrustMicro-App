import { Ionicons } from '@expo/vector-icons';
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

// --- TYPES ---
interface Supervisor {
  id: string;
  name: string;
}

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
  
  // USER DATA & FLAGS
  const { 
    funame: staffFullName, 
    branch: staffBranch, 
    supervisor: assignedSupervisor, // Added to pull from store
    token, 
    role, 
    isSupervisor, 
    isHeadOfCredit,
    _hasHydrated 
  } = useUserData();

  // STATE
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '', bvn: '', nin: '', phone: '', address: '', dob: '',
    loanAmount: '', bankName: '', accountNumber: '',
    employerName: '', jobTitle: '', nokName: '', nokPhone: '',
    supervisorId: '', supervisorName: '',
    idUploaded: '', utilityUploaded: '', passportUploaded: '', 
    workIdUploaded: '', statementUploaded: '', signatureUploaded: '',
    monthlyIncome: '₦50,000.00 - ₦100,000.00',
    loanType: 'Federal',
    repaymentCycle: 'Monthly',
    gender: '',
    tenure: '12 Months'
  });

  // --- ROLE PROTECTION ---
  useEffect(() => {
    if (!_hasHydrated) return;
    const userRole = role?.toLowerCase() || '';
    
    // Management check
    const isManagement = isSupervisor || isHeadOfCredit || 
      ['manager', 'admin', 'cco', 'md', 'finance'].includes(userRole);

    if (isManagement) {
      router.replace('/'); 
    }
  }, [_hasHydrated, role, isHeadOfCredit, isSupervisor]);

  // --- AUTO-FILL SUPERVISOR ---
  useEffect(() => {
    if (_hasHydrated && assignedSupervisor) {
      setFormData(prev => ({
        ...prev,
        supervisorName: assignedSupervisor,
        supervisorId: assignedSupervisor // Using name as ID per system logic
      }));
    }
  }, [_hasHydrated, assignedSupervisor]);

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

  const validateAmount = () => {
    const amount = parseFloat(formData.loanAmount);
    const limit = LOAN_LIMITS[formData.loanType] || 0;
    if (isNaN(amount) || amount <= 0) return { valid: false, msg: "Enter a valid amount." };
    if (amount > limit) return { valid: false, msg: `Limit for ${formData.loanType} is ₦${limit.toLocaleString()}.` };
    return { valid: true, msg: "" };
  };

  const handleVerifyIdentity = async () => {
    if (formData.bvn.length < 11) return Alert.alert("Error", "Enter 11-digit BVN");
    setIsVerifying(true);
    try {
      // Updated endpoint to match the new deterministic mock in managerRoutes.js
      const res = await api.post('/manager/verify-bvn', { bvn: formData.bvn });
      
      if (res.data.status === "success") {
        // Updated mapping to match backend 'fullName' and 'phoneNumber'
        updateData('customerName', res.data.data.fullName);
        updateData('dob', res.data.data.dateOfBirth);
        updateData('phone', res.data.data.phoneNumber);
      } else {
        Alert.alert("Verification Failed", "BVN not found.");
      }
    } catch (e) { 
      Alert.alert("Error", "Verification service unavailable. Ensure backend is running."); 
    } finally { 
      setIsVerifying(false); 
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const payload = { 
        ...formData, 
        staffName: staffFullName, 
        branchName: staffBranch, 
        status: 'Pending' 
      };

      const response = await api.post('/loans', payload);

      if (response.status === 201 || response.status === 200) {
        Alert.alert("Success", "Loan Application Submitted!", [
          { text: "OK", onPress: () => router.replace('/') }
        ]);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Submission failed. Please check your network.";
      Alert.alert("Error", errorMsg);
    } finally { 
      setIsSubmitting(false); 
    }
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

        {/* STEP 1: KYC & AUTOMATED SUPERVISOR */}
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
            <TextInput style={[styles.input, styles.disabledInput]} value={formData.customerName} editable={false} />
            
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={() => (formData.customerName) ? setStep(2) : Alert.alert("Missing Info", "Please verify BVN before proceeding.")}>
                <Text style={styles.btnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: EMPLOYMENT */}
        {step === 2 && (
          <View>
            <Text style={styles.title}>Employment & Bank</Text>
            <Text style={styles.label}>Employer Name</Text>
            <TextInput style={styles.input} value={formData.employerName} onChangeText={v=>updateData('employerName', v)} />
            <Text style={styles.label}>Account Number *</Text>
            <TextInput style={styles.input} value={formData.accountNumber} onChangeText={v=>updateData('accountNumber', v)} keyboardType="numeric" maxLength={10} />
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(1)}><Text>Back</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={()=> setStep(3)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
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
            {['idUploaded', 'passportUploaded', 'signatureUploaded'].map(key => (
              <TouchableOpacity key={key} style={styles.uploadBox} onPress={() => handlePickDocument(key as keyof typeof formData)}>
                <Text>{key.toUpperCase()} {formData[key as keyof typeof formData] ? '✅' : ''}</Text>
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
                <ReviewItem label="Amount" value={formData.loanAmount} />
                <ReviewItem label="Reporting to" value={formData.supervisorName} />
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



// import { Ionicons } from '@expo/vector-icons';
// import * as DocumentPicker from 'expo-document-picker';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import React, { useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   ScrollView,
//   StyleSheet,
//   Text, TextInput, TouchableOpacity,
//   View
// } from 'react-native';
// import { SafeAreaView } from "react-native-safe-area-context";

// // --- STORES & UTILS ---
// import api from '../../services/api';
// import { useLoanStore } from '../../store/loanStore';
// import useUserData from '../../store/userSignUp';

// const { width } = Dimensions.get('window');

// const BRAND = { 
//   primary: "#003366", 
//   accent: "#10B981", 
//   warning: "#F59E0B", 
//   danger: "#EF4444",
//   draft: "#757575", 
//   bg: "#F8FAFC", 
//   border: "#E2E8F0" 
// };

// const LOAN_LIMITS: Record<string, number> = {
//   'Federal': 1000000,
//   'State': 500000,
//   'Private': 250000
// };

// // --- TYPES ---
// interface Supervisor {
//   id: string;
//   name: string;
// }

// // --- SUB-COMPONENTS ---
// const ReviewItem = ({ label, value }: { label: string, value: string }) => (
//   <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
//     <Text style={styles.revLabel}>{label}:</Text>
//     <Text style={styles.revVal}>{value || 'N/A'}</Text>
//   </View>
// );

// export default function CompleteLoanForm() {
//   const router = useRouter();
//   const params = useLocalSearchParams();
  
//   const [step, setStep] = useState(1);
//   const { loans: allLoans } = useLoanStore();
  
//   // USER DATA & FLAGS
//   const { 
//     funame: staffFullName, 
//     branch: staffBranch, 
//     supervisor: assignedSupervisor, // Added to pull from store
//     token, 
//     role, 
//     isSupervisor, 
//     isHeadOfCredit,
//     _hasHydrated 
//   } = useUserData();

//   // STATE
//   const [isVerifying, setIsVerifying] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const [formData, setFormData] = useState({
//     customerName: '', bvn: '', nin: '', phone: '', address: '', dob: '',
//     loanAmount: '', bankName: '', accountNumber: '',
//     employerName: '', jobTitle: '', nokName: '', nokPhone: '',
//     supervisorId: '', supervisorName: '',
//     idUploaded: '', utilityUploaded: '', passportUploaded: '', 
//     workIdUploaded: '', statementUploaded: '', signatureUploaded: '',
//     monthlyIncome: '₦50,000.00 - ₦100,000.00',
//     loanType: 'Federal',
//     repaymentCycle: 'Monthly',
//     gender: '',
//     tenure: '12 Months'
//   });

//   // --- ROLE PROTECTION ---
//   useEffect(() => {
//     if (!_hasHydrated) return;
//     const userRole = role?.toLowerCase() || '';
    
//     // Management check
//     const isManagement = isSupervisor || isHeadOfCredit || 
//       ['manager', 'admin', 'cco', 'md', 'finance'].includes(userRole);

//     if (isManagement) {
//       router.replace('/'); 
//     }
//   }, [_hasHydrated, role, isHeadOfCredit, isSupervisor]);

//   // --- AUTO-FILL SUPERVISOR ---
//   useEffect(() => {
//     if (_hasHydrated && assignedSupervisor) {
//       setFormData(prev => ({
//         ...prev,
//         supervisorName: assignedSupervisor,
//         supervisorId: assignedSupervisor // Using name as ID per system logic
//       }));
//     }
//   }, [_hasHydrated, assignedSupervisor]);

//   const updateData = (key: keyof typeof formData, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

//   const handlePickDocument = async (fieldKey: keyof typeof formData) => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
//       if (!result.canceled) {
//         updateData(fieldKey, result.assets[0].uri);
//         Alert.alert("Success", "Document attached.");
//       }
//     } catch (e) { Alert.alert("Error", "Could not pick document."); }
//   };

//   const validateAmount = () => {
//     const amount = parseFloat(formData.loanAmount);
//     const limit = LOAN_LIMITS[formData.loanType] || 0;
//     if (isNaN(amount) || amount <= 0) return { valid: false, msg: "Enter a valid amount." };
//     if (amount > limit) return { valid: false, msg: `Limit for ${formData.loanType} is ₦${limit.toLocaleString()}.` };
//     return { valid: true, msg: "" };
//   };

//   const handleVerifyIdentity = async () => {
//     if (formData.bvn.length < 11) return Alert.alert("Error", "Enter 11-digit BVN");
//     setIsVerifying(true);
//     try {
//       const res = await api.post('/verify-identity', { bvn: formData.bvn });
//       if (res.data.status === "success") {
//         updateData('customerName', `${res.data.data.firstName} ${res.data.data.lastName}`);
//         updateData('dob', res.data.data.dob);
//       } else {
//         Alert.alert("Verification Failed", "BVN not found.");
//       }
//     } catch (e) { 
//       Alert.alert("Error", "Verification service unavailable."); 
//     } finally { 
//       setIsVerifying(false); 
//     }
//   };

//   const handleFinalSubmit = async () => {
//     if (isSubmitting) return;
    
//     setIsSubmitting(true);
//     try {
//       const payload = { 
//         ...formData, 
//         staffName: staffFullName, 
//         branchName: staffBranch, 
//         status: 'Pending' 
//       };

//       const response = await api.post('/loans', payload);

//       if (response.status === 201 || response.status === 200) {
//         Alert.alert("Success", "Loan Application Submitted!", [
//           { text: "OK", onPress: () => router.replace('/') }
//         ]);
//       }
//     } catch (error: any) {
//       const errorMsg = error.response?.data?.error || "Submission failed. Please check your network.";
//       Alert.alert("Error", errorMsg);
//     } finally { 
//       setIsSubmitting(false); 
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView contentContainerStyle={{ padding: 24 }}>
//         <View style={styles.headerRow}>
//           <View style={{flex: 1}}>
//             <Text style={styles.stepText}>{`STEP ${step} OF 5`}</Text>
//             <View style={styles.barBg}><View style={[styles.barFill, {width: `${(step/5)*100}%`}]} /></View>
//           </View>
//         </View>

//         {/* STEP 1: KYC & AUTOMATED SUPERVISOR */}
//         {step === 1 && (
//           <View>
//             <Text style={styles.title}>KYC Registration</Text>
            
//             <Text style={styles.label}>BVN *</Text>
//             <View style={styles.row}>
//                 <TextInput style={[styles.input, {flex:1}]} value={formData.bvn} onChangeText={v=>updateData('bvn',v)} keyboardType="numeric" maxLength={11} />
//                 <TouchableOpacity style={[styles.verifyBtn, {backgroundColor: BRAND.accent}]} onPress={handleVerifyIdentity}>
//                     {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Verify</Text>}
//                 </TouchableOpacity>
//             </View>

//             <Text style={styles.label}>Full Name</Text>
//             <TextInput style={[styles.input, styles.disabledInput]} value={formData.customerName} editable={false} />
            
//             <TouchableOpacity 
//               style={styles.primaryBtn} 
//               onPress={() => (formData.customerName) ? setStep(2) : Alert.alert("Missing Info", "Please verify BVN before proceeding.")}>
//                 <Text style={styles.btnText}>Next</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {/* STEP 2: EMPLOYMENT */}
//         {step === 2 && (
//           <View>
//             <Text style={styles.title}>Employment & Bank</Text>
//             <Text style={styles.label}>Employer Name</Text>
//             <TextInput style={styles.input} value={formData.employerName} onChangeText={v=>updateData('employerName', v)} />
//             <Text style={styles.label}>Account Number *</Text>
//             <TextInput style={styles.input} value={formData.accountNumber} onChangeText={v=>updateData('accountNumber', v)} keyboardType="numeric" maxLength={10} />
//             <div style={styles.btnRow}>
//                 <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(1)}><Text>Back</Text></TouchableOpacity>
//                 <TouchableOpacity style={styles.primaryBtn} onPress={()=> setStep(3)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
//             </div>
//           </View>
//         )}

//         {/* STEP 3: FINANCIALS */}
//         {step === 3 && (
//           <View>
//             <Text style={styles.title}>Financials</Text>
//             <Text style={styles.label}>Loan Type</Text>
//             <TextInput style={styles.input} value={formData.loanType} editable={false} />
//             <Text style={styles.label}>Requested Amount</Text>
//             <TextInput style={styles.input} value={formData.loanAmount} onChangeText={v=>updateData('loanAmount', v)} keyboardType="numeric" />
//             <View style={styles.btnRow}>
//                 <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(2)}><Text>Back</Text></TouchableOpacity>
//                 <TouchableOpacity style={styles.primaryBtn} onPress={()=> validateAmount().valid ? setStep(4) : Alert.alert("Error", validateAmount().msg)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
//             </View>
//           </View>
//         )}

//         {/* STEP 4: DOCUMENTS */}
//         {step === 4 && (
//           <View>
//             <Text style={styles.title}>Documents</Text>
//             {['idUploaded', 'passportUploaded', 'signatureUploaded'].map(key => (
//               <TouchableOpacity key={key} style={styles.uploadBox} onPress={() => handlePickDocument(key as keyof typeof formData)}>
//                 <Text>{key.toUpperCase()} {formData[key as keyof typeof formData] ? '✅' : ''}</Text>
//                 <Ionicons name="cloud-upload" size={24} color={BRAND.primary} />
//               </TouchableOpacity>
//             ))}
//             <View style={styles.btnRow}>
//                 <TouchableOpacity style={styles.secBtn} onPress={()=>setStep(3)}><Text>Back</Text></TouchableOpacity>
//                 <TouchableOpacity style={styles.primaryBtn} onPress={()=>setStep(5)}><Text style={styles.btnText}>Review</Text></TouchableOpacity>
//             </View>
//           </View>
//         )}

//         {/* STEP 5: REVIEW */}
//         {step === 5 && (
//           <View>
//             <Text style={styles.title}>Review & Submit</Text>
//             <View style={styles.reviewCard}>
//                 <ReviewItem label="Customer" value={formData.customerName} />
//                 <ReviewItem label="Amount" value={formData.loanAmount} />
//                 <ReviewItem label="Reporting to" value={formData.supervisorName} />
//             </View>
//             <TouchableOpacity style={styles.primaryBtn} onPress={handleFinalSubmit} disabled={isSubmitting}>
//                 {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Confirm & Submit</Text>}
//             </TouchableOpacity>
//           </View>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: BRAND.bg },
//   headerRow: { flexDirection: 'row', marginBottom: 20 },
//   stepText: { fontSize: 10, fontWeight: 'bold', color: BRAND.primary },
//   barBg: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 },
//   barFill: { height: 4, backgroundColor: BRAND.primary, borderRadius: 2 },
//   title: { fontSize: 22, fontWeight: 'bold', color: BRAND.primary, marginBottom: 15 },
//   label: { fontSize: 12, fontWeight: 'bold', marginTop: 15, color: '#64748b' },
//   input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: BRAND.border, padding: 12, borderRadius: 10, marginTop: 8 },
//   disabledInput: { backgroundColor: '#F1F5F9' },
//   row: { flexDirection: 'row', gap: 10 },
//   verifyBtn: { padding: 12, borderRadius: 10, justifyContent: 'center', marginTop: 8, minWidth: 80 },
//   primaryBtn: { backgroundColor: BRAND.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20, flex: 1 },
//   secBtn: { backgroundColor: '#E2E8F0', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20, flex: 1 },
//   btnRow: { flexDirection: 'row', gap: 10 },
//   btnText: { color: '#FFF', fontWeight: 'bold' },
//   uploadBox: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, marginBottom: 12, backgroundColor: '#FFF' },
//   reviewCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border },
//   revLabel: { fontSize: 13, color: '#64748b' },
//   revVal: { color: BRAND.primary, fontWeight: 'bold' }
// });
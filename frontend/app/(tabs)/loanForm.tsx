import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

// State Management
import api from '../../services/api'; // Ensure this import path is correct
import { useLoanStore } from '../../store/loanStore';

// Internal Components
import {
  BankInfo,
  Declaration,
  DocumentUploads,
  EmploymentInfo,
  NextOfKinInfo,
  PersonalInfo,
  ResidentialInfo
} from './FormComponents';

const BRAND = { 
  primary: "#0056D2", 
  bg: "#F8FAFC", 
  border: "#E2E8F0", 
  card: "#FFFFFF", 
  text: "#1E293B",
  muted: "#64748B"
};
const STAGES = ["Personal Info", "Residential Info", "Employment Info", "Next of Kin", "Bank Info", "Uploads", "Social", "Exposure", "Declaration"];

export default function CompleteLoanForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Connect to the Global Store
  const { updateLoan, loans, deleteLoan } = useLoanStore();
  
  const currentDraft = loans.find(l => l.status === 'Draft') || {} as any;

  const handleNext = () => {
    if (currentStep === 8) {
      handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!currentDraft.hasAcceptedTerms) {
      Alert.alert("Required", "Please accept the terms to proceed.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Prepare final object with correct status and map DB column names
      // We explicitly map 'stateOfOrigin' to 'state_of_origin' to fix the 500 error
      const submissionData = {
        ...currentDraft,
        state_of_origin: currentDraft.stateOfOrigin, // Map to DB column name
        status: 'Pending', 
        submittedDate: new Date().toISOString()
      };

      // 2. Call the actual API
      const response = await api.post('/loans', submissionData);

      if (response.status === 200 || response.status === 201) {
        // 3. Remove local draft only after successful server save
        deleteLoan(currentDraft.id);
        
        setIsSubmitting(false);
        Alert.alert("Success", "Loan Application Submitted!", [
          { text: "OK", onPress: () => router.replace('/') }
        ]);
      }
    } catch (error: any) {
      setIsSubmitting(false);
      console.error("Submission Error:", error.response?.data || error.message);
      
      // Extract specific DB error for better debugging in the Alert
      const dbError = error.response?.data?.error || "";
      
      Alert.alert(
        "Submission Failed", 
        dbError.includes("column") 
          ? `Server Configuration Error: ${dbError}`
          : "We saved your progress locally. Please check your connection and try submitting again."
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.progressHeader}>
          <Text style={styles.stepTitle}>{STAGES[currentStep]}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${((currentStep + 1) / 9) * 100}%` }]} />
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
        >
          {currentStep === 0 && <PersonalInfo />}
          {currentStep === 1 && <ResidentialInfo />}
          {currentStep === 2 && <EmploymentInfo />}
          {currentStep === 3 && <NextOfKinInfo />}
          {currentStep === 4 && <BankInfo />}
          {currentStep === 5 && <DocumentUploads />}
          
          {(currentStep === 6 || currentStep === 7) && (
            <View style={styles.infoCard}>
              <Text style={{ color: BRAND.text }}>Additional Information for {STAGES[currentStep]}</Text>
              <Text style={{ color: BRAND.muted, marginTop: 10 }}>Processing section...</Text>
            </View>
          )}

          {currentStep === 8 && <Declaration />}

          <View style={styles.btnRow}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(prev => prev - 1)}>
                <Text style={styles.secBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>{currentStep === 8 ? "Submit" : "Next"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  progressHeader: { padding: 20, backgroundColor: BRAND.card, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  stepTitle: { fontSize: 18, fontWeight: '700', color: BRAND.primary },
  progressBarBg: { height: 6, backgroundColor: BRAND.border, borderRadius: 3, marginTop: 12 },
  progressBarFill: { height: 6, backgroundColor: BRAND.primary, borderRadius: 3 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 40 },
  primaryBtn: { backgroundColor: BRAND.primary, padding: 18, borderRadius: 12, flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold' },
  secBtn: { backgroundColor: '#E2E8F0', padding: 18, borderRadius: 12, flex: 1, alignItems: 'center', justifyContent: 'center' },
  secBtnText: { color: '#475569', fontWeight: 'bold' },
  infoCard: { padding: 20, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: BRAND.border }
});



// import * as DocumentPicker from 'expo-document-picker';
// import * as ImageManipulator from 'expo-image-manipulator';
// import { useRouter } from 'expo-router';
// import React, { useCallback, useState } from 'react';
// import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { SafeAreaView } from "react-native-safe-area-context";

// // Internal Components
// import api from '../../services/api';
// import {
//   BankInfo,
//   Declaration,
//   DocumentUploads,
//   EmploymentInfo,
//   NextOfKinInfo,
//   PersonalInfo,
//   ResidentialInfo
// } from './FormComponents';

// const BRAND = { 
//   primary: "#0056D2", 
//   bg: "#F8FAFC", 
//   border: "#E2E8F0", 
//   card: "#FFFFFF", 
//   text: "#1E293B",
//   muted: "#64748B"
// };
// const STAGES = ["Personal Info", "Residential Info", "Employment Info", "Next of Kin", "Bank Info", "Uploads", "Social", "Exposure", "Declaration"];

// export default function CompleteLoanForm() {
//   const router = useRouter();
//   const [currentStep, setCurrentStep] = useState(0);
//   const [uploadingField, setUploadingField] = useState<string | null>(null);
//   const [isVerifying, setIsVerifying] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
  
//   const [formData, setFormData] = useState({
//     // STAGE 1
//     clientSector: '', bvn: '', title: '', firstName: '', middleName: '', lastName: '',
//     nin: '', gender: '', dob: '', mothersMaidenName: '', clientTypeKYC: '',
//     phone: '', alternatePhone: '', emailAddress: '', accountOfficer: '',
//     nationality: 'Nigerian', stateOfOrigin: '', lga: '', homeAddress: '',
//     // STAGE 2
//     permanentState: '', residentialLGA: '', fullAddress: '',
//     buildingDescription: '', nearestLandmark: '', residentialStatus: '', dateMovedIn: '',
//     // STAGE 3
//     employerBranchName: 'NSCDC', employerState: '', employerLGA: '', employerAddress: '',
//     staffId: '', jobRole: 'OPERATIONS', employmentType: '', monthlyIncome: '',
//     // STAGE 4
//     nok1FirstName: '', nok1Relationship: 'Child', nok1Phone: '', nok1Email: '', nok1Address: '',
//     // STAGE 5
//     bankName: '', accountNumber: '', accountName: '', loanAmount: '', loanType: 'Personal',
//     // STAGE 6
//     idImageUrl: null as any, utilityBillUrl: null as any, passportImageUrl: null as any, 
//     workIdUrl: null as any, signatureUrl: null as any, ninImageUrl: null as any,
//     // STAGE 7 & 8
//     socialHandle: '', referralId: '', isPoliticallyExposed: false,
//     // STAGE 9
//     hasAcceptedTerms: false
//   });

//   // Optimized update function to prevent state lag
//   const updateData = useCallback((key: string, value: any) => {
//     setFormData(prev => ({ ...prev, [key]: value }));
//   }, []);

//   const pickDocument = async (key: string) => {
//     setUploadingField(key);
//     try {
//       const result = await DocumentPicker.getDocumentAsync({ 
//         type: "image/*",
//         copyToCacheDirectory: true 
//       });
      
//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         const file = result.assets[0];
        
//         // Use a try-catch specifically for image processing
//         try {
//           const manip = await ImageManipulator.manipulateAsync(
//             file.uri, 
//             [{ resize: { width: 800 } }], 
//             { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG } // Lowered compression to 0.5 for stability
//           );
//           updateData(key, { name: file.name, uri: manip.uri });
//         } catch (manipError) {
//           console.warn("Image optimization failed, using original", manipError);
//           updateData(key, { name: file.name, uri: file.uri });
//         }
//       }
//     } catch (err) {
//       Alert.alert("Upload Error", "Could not process the selected file. Please try a different image.");
//     } finally {
//       setUploadingField(null);
//     }
//   };

//   const handleVerify = async () => {
//     if (formData.bvn.length < 11) return Alert.alert("Error", "Enter valid BVN");
//     setIsVerifying(true);
//     try {
//       const res = await api.post('/manager/verify-bvn', { bvn: formData.bvn });
//       if (res.data.status === "success") {
//         const c = res.data.data;
//         setFormData(prev => ({
//           ...prev,
//           firstName: c.firstName || '',
//           lastName: c.lastName || '',
//           dob: c.dob || ''
//         }));
//         Alert.alert("Success", "Identity Verified");
//       }
//     } catch (e) { 
//       Alert.alert("Error", "Verification failed. Please check your network."); 
//     } finally { 
//       setIsVerifying(false); 
//     }
//   };

//   const handleSubmit = async () => {
//     if (!formData.hasAcceptedTerms) {
//       Alert.alert("Required", "Please accept the terms to proceed.");
//       return;
//     }
//     setIsSubmitting(true);
    
//     try {
//       // Logic for final submission
//       // Simulated timeout for bank API response
//       setTimeout(() => {
//         setIsSubmitting(false);
//         Alert.alert("Success", "Loan Application Submitted!");
//         router.replace('/');
//       }, 2000);
//     } catch (error) {
//       setIsSubmitting(false);
//       Alert.alert("Submission Error", "Something went wrong. Please try again.");
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView 
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={{ flex: 1 }}
//       >
//         <View style={styles.progressHeader}>
//           <Text style={styles.stepTitle}>{STAGES[currentStep]}</Text>
//           <View style={styles.progressBarBg}>
//             <View style={[styles.progressBarFill, { width: `${((currentStep + 1) / 9) * 100}%` }]} />
//           </View>
//         </View>

//         <ScrollView 
//           contentContainerStyle={{ padding: 20 }}
//           keyboardShouldPersistTaps="handled"
//         >
//           {currentStep === 0 && <PersonalInfo data={formData} update={updateData} onVerify={handleVerify} isVerifying={isVerifying} />}
//           {currentStep === 1 && <ResidentialInfo data={formData} update={updateData} />}
//           {currentStep === 2 && <EmploymentInfo data={formData} update={updateData} />}
//           {currentStep === 3 && <NextOfKinInfo data={formData} update={updateData} />}
//           {currentStep === 4 && <BankInfo data={formData} update={updateData} />}
//           {currentStep === 5 && <DocumentUploads data={formData} onPick={pickDocument} uploadingField={uploadingField} />}
          
//           {(currentStep === 6 || currentStep === 7) && (
//             <View style={{ padding: 20, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: BRAND.border }}>
//               <Text style={{ color: BRAND.text }}>Additional Information for {STAGES[currentStep]}</Text>
//               <Text style={{ color: BRAND.muted, marginTop: 10 }}>This section is being processed by the system.</Text>
//             </View>
//           )}

//           {currentStep === 8 && <Declaration data={formData} update={updateData} />}

//           <View style={styles.btnRow}>
//             {currentStep > 0 && (
//               <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(currentStep - 1)}>
//                 <Text style={styles.secBtnText}>Back</Text>
//               </TouchableOpacity>
//             )}
            
//             <TouchableOpacity 
//               style={styles.primaryBtn} 
//               onPress={() => currentStep === 8 ? handleSubmit() : setCurrentStep(currentStep + 1)}
//             >
//               {isSubmitting ? (
//                 <ActivityIndicator color="#FFF" />
//               ) : (
//                 <Text style={styles.primaryBtnText}>{currentStep === 8 ? "Submit" : "Next"}</Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: BRAND.bg },
//   progressHeader: { padding: 20, backgroundColor: BRAND.card, borderBottomWidth: 1, borderBottomColor: BRAND.border },
//   stepTitle: { fontSize: 18, fontWeight: '700', color: BRAND.primary },
//   progressBarBg: { height: 6, backgroundColor: BRAND.border, borderRadius: 3, marginTop: 12 },
//   progressBarFill: { height: 6, backgroundColor: BRAND.primary, borderRadius: 3 },
//   btnRow: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 40 },
//   primaryBtn: { backgroundColor: BRAND.primary, padding: 18, borderRadius: 12, flex: 1, alignItems: 'center', justifyContent: 'center' },
//   primaryBtnText: { color: '#FFF', fontWeight: 'bold' },
//   secBtn: { backgroundColor: '#E2E8F0', padding: 18, borderRadius: 12, flex: 1, alignItems: 'center', justifyContent: 'center' },
//   secBtnText: { color: '#475569', fontWeight: 'bold' }
// });
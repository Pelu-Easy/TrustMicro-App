import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { useLoanStore } from '../../store/loanStore';
import useUserData from '../../store/userSignUp';

// Import our new modular components
import { Declaration } from '../../components/loan-form/DeclarationSection';
import { BRAND } from '../../components/loan-form/FormShared';
import { PersonalInfo, ResidentialInfo } from '../../components/loan-form/IdentitySection';
import { NextOfKinInfo } from '../../components/loan-form/NextOfKinSection';
import { DocumentUploads } from '../../components/loan-form/UploadSection';
import { BankInfo, EmploymentInfo } from '../../components/loan-form/WorkFinancialSection';

export default function LoanForm() {
  const router = useRouter();
  const { loans, updateLoan, addLoan } = useLoanStore();
  const { email } = useUserData();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false); // Controls the stylized modal popup visibility
  const creationAttempted = useRef(false);

  // Use type casting (as string) to bypass the TypeScript overlap error 
  // while ensuring we find the local draft.
  const draft = (loans || []).find(l => (l.status as string) === 'Draft');

  useEffect(() => {
    // If no draft exists and we haven't tried yet, create one.
    if (!creationAttempted.current && email && !draft) {
      creationAttempted.current = true;
      const newId = Date.now().toString();
      
      addLoan({
        id: newId,
        status: 'Draft' as any, // Cast to any to satisfy the store's strict status type
        customerName: "New Applicant",
        createdByEmail: email,
      } as any, email);
    }
  }, [draft, email, addLoan]);

  // Performs structural data validation checks before launching confirm menu
  const handleSubmit = () => {
    if (!draft) {
      Alert.alert("Error", "No active draft found to submit.");
      return;
    }

    // Basic Validation - FIXED: Included explicit check for loanType string presence
    if (!draft.bvn || !draft.nin || !draft.bankName || !draft.loanAmount || !draft.loanType) {
      Alert.alert("Missing Information", "Please ensure BVN, NIN, Loan Type, Bank details, and Loan Amount are filled.");
      return;
    }

    if (!draft.hasAcceptedTerms) {
      Alert.alert("Declaration", "The applicant must accept the declaration terms.");
      return;
    }

    // Fire custom menu open statement rather than basic gray Alert window
    setConfirmVisible(true);
  };

  // Triggers the data payload sync transmission directly to backend 
  const executeFinalSubmission = async () => {
    if (!draft) return; // Type guard: Narrows 'draft' down to 'Loan' completely for TypeScript

    setConfirmVisible(false);
    setIsSubmitting(true);
    try {
      // Clean the frontend draft payload by stripping out supervisor_name 
      // to resolve the database column relation mismatch error cleanly.
      const { supervisor_name, ...databaseReadyDraft } = draft as any;

      // Standardized status to uppercase 'PENDING' to align perfectly with backend logic
      await updateLoan(draft.id, { 
        ...databaseReadyDraft, 
        status: 'PENDING' as any,
        createdByEmail: email
      });

      Alert.alert(
        "Success", 
        "Loan submitted successfully to Credit Unit.",
        [{ text: "OK", onPress: () => router.replace('/(tabs)') }]
      );
      
    } catch (error) {
      console.error("Submission Error:", error);
      Alert.alert("Error", "Could not submit loan. It remains in your Drafts.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Loan Onboarding</Text>
          <Text style={styles.headerSubtitle}>Sales Staff Entry</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === 'android'}
        >
          <PersonalInfo />
          <ResidentialInfo />
          <EmploymentInfo />
          <NextOfKinInfo />
          <BankInfo />
          <DocumentUploads />
          <Declaration />

          <TouchableOpacity 
            style={[styles.submitBtn, isSubmitting && styles.disabledBtn]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Application</Text>
            )}
          </TouchableOpacity>
          
          <View style={{ height: 40 }} /> 
        </ScrollView>
      </KeyboardAvoidingView>

      {/* STYLIZED CONFIRM SUBMISSION BOTTOM-SHEET POPUP MENU */}
      <Modal
        visible={confirmVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setConfirmVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContentCard}>
                <View style={styles.dragIndicator} />
                
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Confirm Submission</Text>
                  <Text style={styles.modalDescription}>
                    Are you sure you want to submit this loan to the Credit Department for processing review? This operation cannot be reversed.
                  </Text>
                </View>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity 
                    style={styles.cancelActionBtn}
                    activeOpacity={0.7}
                    onPress={() => setConfirmVisible(false)}
                  >
                    <Text style={styles.cancelActionBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.confirmActionBtn}
                    activeOpacity={0.8}
                    onPress={executeFinalSubmission}
                  >
                    <Text style={styles.confirmActionBtnText}>Confirm Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BRAND.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: BRAND.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  submitBtn: {
    backgroundColor: BRAND.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    elevation: 4,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  disabledBtn: {
    backgroundColor: BRAND.muted,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // --- ADDED DIALOG MENU COMPONENT LAYER STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  dragIndicator: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelActionBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelActionBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmActionBtn: {
    flex: 1,
    backgroundColor: BRAND.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  confirmActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
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
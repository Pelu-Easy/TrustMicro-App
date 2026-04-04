import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

// --- STORES & UTILS ---
import { NIGERIAN_STATES } from '../../constants/StateData';
import api from '../../services/api';
import useUserData from '../../store/userSignUp';

const { width } = Dimensions.get('window');

const BRAND = { 
  primary: "#0056D2", 
  accent: "#10B981", 
  warning: "#F59E0B", 
  danger: "#EF4444",
  draft: "#94A3B8", 
  bg: "#F8FAFC", 
  border: "#E2E8F0",
  card: "#FFFFFF",
  inputBg: "#F1F5F9"
};

const STAGES = [
  "Personal Info",
  "Residential Information",
  "Employment Info",
  "Next of Kin",
  "Bank Information",
  "Document Upload",
  "Social Media",
  "Referral & Exposure",
  "Declaration"
];

// Ensure this is a DEFAULT export for expo-router
export default function CompleteLoanForm() {
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(0); 
  const { 
    role, 
    isSupervisor, 
    isHeadOfCredit,
    _hasHydrated 
  } = useUserData();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const [formData, setFormData] = useState({
    // --- STAGE 1: PERSONAL INFO ---
    clientSector: '', bvn: '', title: '', firstName: '', middleName: '', lastName: '',
    nin: '', gender: '', dob: '', mothersMaidenName: '', clientTypeKYC: '',
    phone: '', alternatePhone: '', emailAddress: '', accountOfficer: '',
    nationality: 'Nigerian', stateOfOrigin: '', lga: '', homeAddress: '',

    // --- STAGE 2: RESIDENTIAL INFORMATION ---
    permanentState: '', residentialLGA: '', fullAddress: '',
    latitude: '0E-8', longitude: '0E-8', buildingDescription: '',
    nearestLandmark: '', residentialStatus: '', dateMovedIn: '',
    useAsDefault: false,

    // --- STAGE 3: EMPLOYMENT INFO ---
    approvedBusinessLocation: '', employerBranchName: 'NSCDC',
    employerState: '', employerLGA: '', employerAddress: '',
    employerLat: '0E-8', employerLong: '0E-8',
    staffId: '', jobRole: 'OPERATIONS', employmentType: '',
    dateOfEmployment: '', salaryRange: '', salaryPaymentDay: '',
    tokenNumber: '', monthlyIncome: '', annualIncome: '',

    // --- STAGE 4: NEXT OF KIN ---
    nok1Relationship: 'Child', nok1FirstName: '', nok1MiddleName: '', nok1LastName: '',
    nok1Dob: '', nok1State: '', nok1Lga: '', nok1Address: '', nok1Lat: '', nok1Long: '',
    nok1Phone: '', nok1Email: '',
    nok2Relationship: 'Child', nok2FirstName: '', nok2MiddleName: '', nok2LastName: '',
    nok2Dob: '', nok2State: '', nok2Lga: '', nok2Address: '', nok2Lat: '', nok2Long: '',
    nok2Phone: '', nok2Email: '',

    // --- STAGE 5: BANK INFORMATION ---
    bankName: '', accountNumber: '', accountName: '', loanAmount: '', loanType: 'Personal',

    // --- STAGE 6: DOCUMENT UPLOAD ---
    idImageUrl: null as any, 
    utilityBillUrl: null as any, 
    passportImageUrl: null as any, 
    workIdUrl: null as any, 
    signatureUrl: null as any, 
    ninImageUrl: null as any,
    selectedDocType: 'National ID',

    // --- STAGE 7: SOCIAL MEDIA ---
    socialPlatform: 'Facebook', socialHandle: '', socialLinks: [] as {platform: string, handle: string}[],

    // --- STAGE 8: REFERRAL & POLITICAL EXPOSURE ---
    referralId: '', isPoliticallyExposed: false, exposureOptions: 'None', affiliationDescription: '',

    // --- STAGE 9: DECLARATION ---
    hasAcceptedTerms: false
  });

  useEffect(() => {
    if (!_hasHydrated) return;
    const userRole = role?.toLowerCase() || '';
    const isManagement = isSupervisor || isHeadOfCredit || ['manager', 'admin', 'cco', 'md', 'finance'].includes(userRole);
    if (isManagement) {
      router.replace('/'); 
    }
  }, [_hasHydrated, role]);

  const updateData = (key: keyof typeof formData, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  const compressImage = async (uri: string) => {
    try {
      const extension = uri.split('.').pop()?.toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png'].includes(extension || '');

      if (!isImage) return uri;

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Smaller width for better performance
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      return uri;
    }
  };

  const pickDocument = async (key: keyof typeof formData) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*" }); 
      if (!result.canceled) {
        setIsCompressing(true);
        const originalFile = result.assets[0];
        const compressedUri = await compressImage(originalFile.uri);
        
        updateData(key, {
          ...originalFile,
          uri: compressedUri,
        });
        setIsCompressing(false);
      }
    } catch (err) {
      setIsCompressing(false);
      Alert.alert("Error", "Failed to process document");
    }
  };

  const handleVerifyIdentity = async () => {
    if (formData.bvn.length < 11) { 
      Alert.alert("Error", "Enter 11-digit BVN"); 
      return; 
    }
    setIsVerifying(true);
    try {
      const res = await api.post('/manager/verify-bvn', { bvn: formData.bvn });
      if (res.data.status === "success" && res.data.data) {
        const c = res.data.data;
        setFormData(prev => ({
          ...prev,
          firstName: c.firstName || c.first_name || '', 
          lastName: c.lastName || c.last_name || '',
          middleName: c.middleName || c.middle_name || '', 
          dob: c.dateOfBirth || c.dob || '',
          phone: c.phoneNumber || c.phone || '', 
          nin: c.nin || '', 
          gender: c.gender || '' 
        }));
        Alert.alert("Success", "Identity Verified");
      } else {
        Alert.alert("Verification Failed", res.data.message || "Invalid BVN details.");
      }
    } catch (e: any) { 
      Alert.alert("Network Error", "Connection failed. Please try again."); 
    } finally { 
      setIsVerifying(false); 
    }
  };

  const handleSubmit = async () => {
    if (!formData.hasAcceptedTerms) {
        Alert.alert("Declaration Required", "Please accept the terms to proceed.");
        return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
        setIsSubmitting(false);
        Alert.alert("Success", "Loan Application Submitted!");
        router.replace('/');
    }, 2000);
  };

  const RenderUploadField = ({ label, apiKey, icon = "cloud-upload" }: { label: string, apiKey: keyof typeof formData, icon?: any }) => (
    <View style={{ marginBottom: 15 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={styles.uploadRow} 
        onPress={() => pickDocument(apiKey)}
        disabled={isCompressing}
      >
        {isCompressing ? <ActivityIndicator size="small" color={BRAND.primary} /> : <Ionicons name={icon} size={22} color={BRAND.primary} />}
        <Text style={styles.uploadText} numberOfLines={1}>
          {formData[apiKey] && typeof formData[apiKey] === 'object' ? (formData[apiKey] as any).name : `Upload ${label}`}
        </Text>
        {formData[apiKey] && <Ionicons name="checkmark-circle" size={20} color={BRAND.accent} />}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressHeader}>
        <Text style={styles.stepTitle}>{STAGES[currentStep]}</Text>
        <Text style={styles.stepCount}>Step {currentStep + 1} of 9</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentStep + 1) / 9) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* STAGE 1 */}
        {currentStep === 0 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Identity Details</Text>
              <Text style={styles.label}>Client Sector</Text>
              <View style={styles.pickerContainer}>
                <Picker style={styles.picker} selectedValue={formData.clientSector} onValueChange={v => updateData('clientSector', v)}>
                  <Picker.Item label="Select Sector" value="" />
                  <Picker.Item label="Federal" value="Federal" />
                  <Picker.Item label="State" value="State" />
                  <Picker.Item label="Private" value="Private" />
                </Picker>
              </View>

              <Text style={styles.label}>Enter Client BVN *</Text>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} value={formData.bvn} onChangeText={v => updateData('bvn', v)} keyboardType="numeric" maxLength={11} />
                <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyIdentity}>
                  {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Verify</Text>}
                </TouchableOpacity>
              </View>

              <View style={styles.grid}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Title</Text>
                  <View style={styles.pickerContainer}>
                    <Picker style={styles.picker} selectedValue={formData.title} onValueChange={v => updateData('title', v)}>
                      <Picker.Item label="Select Title" value="" />
                      <Picker.Item label="Mr" value="Mr" />
                      <Picker.Item label="Mrs" value="Mrs" />
                      <Picker.Item label="Miss" value="Miss" />
                      <Picker.Item label="Dr" value="Dr" />
                    </Picker>
                  </View>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.pickerContainer}>
                    <Picker style={styles.picker} selectedValue={formData.gender} onValueChange={v => updateData('gender', v)}>
                      <Picker.Item label="Select Gender" value="" />
                      <Picker.Item label="Male" value="Male" />
                      <Picker.Item label="Female" value="Female" />
                    </Picker>
                  </View>
                </View>
              </View>
              <Text style={styles.label}>First Name</Text><TextInput style={styles.input} value={formData.firstName} onChangeText={v => updateData('firstName', v)} />
              <Text style={styles.label}>Last Name</Text><TextInput style={styles.input} value={formData.lastName} onChangeText={v => updateData('lastName', v)} />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => {
              if(!formData.title || !formData.gender || !formData.clientSector) {
                Alert.alert("Required", "Complete identity fields first.");
                return;
              }
              setCurrentStep(1);
            }}><Text style={styles.primaryBtnText}>Save & Continue</Text></TouchableOpacity>
          </View>
        )}

        {/* STAGE 2 */}
        {currentStep === 1 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Address Details</Text>
              <View style={styles.grid}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>State</Text>
                  <View style={styles.pickerContainer}>
                    <Picker 
                      style={styles.picker} 
                      selectedValue={formData.permanentState} 
                      onValueChange={v => { updateData('permanentState', v); updateData('residentialLGA', ''); }}
                    >
                      <Picker.Item label="Select State" value="" />
                      {Object.keys(NIGERIAN_STATES).sort().map(s => <Picker.Item key={s} label={s} value={s} />)}
                    </Picker>
                  </View>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>LGA</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      style={styles.picker}
                      selectedValue={formData.residentialLGA}
                      onValueChange={v => updateData('residentialLGA', v)}
                      enabled={formData.permanentState !== ''}
                    >
                      <Picker.Item label="Select LGA" value="" />
                      {formData.permanentState ? NIGERIAN_STATES[formData.permanentState].map(l => <Picker.Item key={l} label={l} value={l} />) : null}
                    </Picker>
                  </View>
                </View>
              </View>
              <Text style={styles.label}>Address</Text><TextInput style={styles.input} value={formData.fullAddress} onChangeText={v => updateData('fullAddress', v)} multiline />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(0)}><Text style={styles.secBtnText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(2)}><Text style={styles.primaryBtnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 3: EMPLOYMENT */}
        {currentStep === 2 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Employment</Text>
              <View style={styles.pickerContainer}>
                <Picker style={styles.picker} selectedValue={formData.employmentType} onValueChange={v => updateData('employmentType', v)}>
                  <Picker.Item label="Select Employment Type" value="" />
                  <Picker.Item label="Full Time" value="Full Time" /><Picker.Item label="Contract" value="Contract" />
                </Picker>
              </View>
              <Text style={styles.label}>Income</Text><TextInput style={styles.input} value={formData.monthlyIncome} keyboardType="numeric" onChangeText={v => updateData('monthlyIncome', v)} />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(1)}><Text style={styles.secBtnText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(3)}><Text style={styles.primaryBtnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 4: NOK */}
        {currentStep === 3 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Next of Kin</Text>
              <TextInput style={styles.input} placeholder="Full Name" value={formData.nok1FirstName} onChangeText={v => updateData('nok1FirstName', v)} />
              <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Phone" value={formData.nok1Phone} keyboardType="phone-pad" onChangeText={v => updateData('nok1Phone', v)} />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(2)}><Text style={styles.secBtnText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(4)}><Text style={styles.primaryBtnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 5: BANK */}
        {currentStep === 4 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Bank Information</Text>
              <TextInput style={styles.input} placeholder="Bank Name" value={formData.bankName} onChangeText={v => updateData('bankName', v)} />
              <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Account Number" value={formData.accountNumber} keyboardType="numeric" maxLength={10} onChangeText={v => updateData('accountNumber', v)} />
              <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Loan Amount" value={formData.loanAmount} keyboardType="numeric" onChangeText={v => updateData('loanAmount', v)} />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(3)}><Text style={styles.secBtnText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(5)}><Text style={styles.primaryBtnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 6: UPLOADS */}
        {currentStep === 5 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Documents</Text>
              <RenderUploadField label="ID Card" apiKey="idImageUrl" />
              <RenderUploadField label="Utility Bill" apiKey="utilityBillUrl" />
              <RenderUploadField label="Work ID" apiKey="workIdUrl" />
              <RenderUploadField label="Signature" apiKey="signatureUrl" />
              <RenderUploadField label="Passport" apiKey="passportImageUrl" />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(4)}><Text style={styles.secBtnText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(6)}><Text style={styles.primaryBtnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 7: SOCIAL */}
        {currentStep === 6 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Social Media</Text>
              <TextInput style={styles.input} placeholder="Handle" value={formData.socialHandle} onChangeText={v => updateData('socialHandle', v)} />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(5)}><Text style={styles.secBtnText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(7)}><Text style={styles.primaryBtnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 8: REFERRAL */}
        {currentStep === 7 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Exposure</Text>
              <Text style={styles.label}>Politically Exposed?</Text>
              <View style={styles.radioRow}>
                  <TouchableOpacity style={styles.radioItem} onPress={() => updateData('isPoliticallyExposed', true)}>
                      <Ionicons name={formData.isPoliticallyExposed ? "radio-button-on" : "radio-button-off"} size={20} color={BRAND.primary} />
                      <Text>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.radioItem} onPress={() => updateData('isPoliticallyExposed', false)}>
                      <Ionicons name={!formData.isPoliticallyExposed ? "radio-button-on" : "radio-button-off"} size={20} color={BRAND.primary} />
                      <Text>No</Text>
                  </TouchableOpacity>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(6)}><Text style={styles.secBtnText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(8)}><Text style={styles.primaryBtnText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 9: FINAL */}
        {currentStep === 8 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Declaration</Text>
              <View style={styles.checkboxRow}>
                <Checkbox style={styles.checkbox} value={formData.hasAcceptedTerms} onValueChange={v => updateData('hasAcceptedTerms', v)} color={formData.hasAcceptedTerms ? BRAND.primary : undefined} />
                <Text>I accept terms</Text>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(7)}><Text style={styles.secBtnText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  progressHeader: { padding: 20, backgroundColor: BRAND.card, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  stepTitle: { fontSize: 18, fontWeight: '700', color: BRAND.primary },
  stepCount: { fontSize: 12, color: BRAND.draft, marginTop: 4 },
  progressBarBg: { height: 6, backgroundColor: BRAND.border, borderRadius: 3, marginTop: 12 },
  progressBarFill: { height: 6, backgroundColor: BRAND.primary, borderRadius: 3 },
  sectionCard: { backgroundColor: BRAND.card, padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: BRAND.border },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: BRAND.inputBg, borderWidth: 1, borderColor: BRAND.border, padding: 12, borderRadius: 8, fontSize: 14, color: '#1E293B' },
  pickerContainer: { backgroundColor: BRAND.inputBg, borderWidth: 1, borderColor: BRAND.border, borderRadius: 8, height: 50, justifyContent: 'center' },
  picker: { width: '100%', height: 50 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: BRAND.card, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1.5, borderColor: BRAND.primary },
  uploadText: { flex: 1, marginLeft: 10, color: '#475569', fontSize: 13 },
  radioRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
  radioItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 15 },
  checkbox: { width: 20, height: 20 },
  verifyBtn: { backgroundColor: BRAND.primary, paddingHorizontal: 20, height: 48, borderRadius: 8, justifyContent: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  primaryBtn: { backgroundColor: BRAND.primary, padding: 18, borderRadius: 12, flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  secBtn: { backgroundColor: '#E2E8F0', padding: 18, borderRadius: 12, flex: 1, alignItems: 'center', justifyContent: 'center' },
  secBtnText: { color: '#475569', fontWeight: 'bold', fontSize: 16 }
});
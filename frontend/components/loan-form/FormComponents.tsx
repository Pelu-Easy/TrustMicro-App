import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NIGERIAN_STATES } from '../../constants/StateData';
import api from '../../services/api';
import { useLoanStore } from '../../store/loanStore';
import useUserData from '../../store/userSignUp';

const BRAND = { primary: "#0056D2", accent: "#10B981", border: "#E2E8F0", inputBg: "#F1F5F9", text: "#1E293B", muted: "#64748B" };

// Helper to format date as DD/MM/YYYY
const formatDate = (dateString: string) => {
  if (!dateString) return "Select Date";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Select Date";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Shared Input Component
const FormInput = ({ label, ...props }: any) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} placeholderTextColor="#94A3B8" {...props} />
  </View>
);

// Shared Date Picker Component
const DateInputField = ({ label, value, onChange }: any) => {
  const [show, setShow] = useState(false);
  
  const getSafeDate = () => {
    const d = value ? new Date(value) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShow(true)}>
        <Text style={{ color: value ? BRAND.text : "#94A3B8" }}>
          {formatDate(value)}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={getSafeDate()}
          mode="date"
          display="spinner"
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') setShow(false); 
            if (event.type === 'set' && selectedDate) {
              onChange(selectedDate.toISOString());
            } else if (event.type === 'dismissed') {
              setShow(false);
            }
          }}
        />
      )}
    </View>
  );
};

// --- STAGE 1: PERSONAL INFO ---
export const PersonalInfo = () => {
  const { loans, updateLoan, addLoan } = useLoanStore();
  const userData = useUserData.getState(); 

  const draft = loans.find(l => l.status === 'Draft');
  const [localBvn, setLocalBvn] = useState(draft?.bvn || "");
  const [isVerifying, setIsVerifying] = useState(false);

  const onVerify = async () => {
    if (!localBvn || localBvn.length < 11) {
      return Alert.alert("Error", "Enter valid bvn number");
    }
    
    setIsVerifying(true);
    try {
      const res = await api.post('/manager/verify-bvn', { bvn: localBvn });
      if (res.data.status === "success") {
        const c = res.data.data;
        
        // Ensure names are strings and not "undefined"
        const fName = c.firstName || '';
        const lName = c.lastName || '';
        const combinedName = `${fName} ${lName}`.trim();

        const updatedData = {
          bvn: localBvn,
          firstName: fName, 
          lastName: lName, 
          customerName: combinedName || "Verified Customer", 
          dob: c.dob || '' 
        };

        if (draft) {
          updateLoan(draft.id, { ...draft, ...updatedData });
        } else {
          const newLoan: any = {
            id: Date.now().toString(),
            status: 'Draft',
            ...updatedData
          };
          // Explicitly pass the user email to avoid "system@" default
          addLoan(newLoan, userData.email);
        }
        Alert.alert("Success", "Identity Verified");
      }
    } catch (e) {
      Alert.alert("Error", "Verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Identity Verification</Text>
      <View style={styles.field}>
        <Text style={styles.label}>BVN</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput 
            style={[styles.input, { flex: 1 }]} 
            value={localBvn} 
            onChangeText={(v) => {
              setLocalBvn(v);
              if (draft) updateLoan(draft.id, { ...draft, bvn: v });
            }} 
            placeholder="11-digit BVN"
            keyboardType="numeric"
            maxLength={11}
          />
          <TouchableOpacity 
            style={styles.verifyBtn} 
            onPress={onVerify} 
            disabled={isVerifying}
          >
            {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.verifyBtnText}>Verify</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <FormInput 
        label="NIN (National Identity Number)" 
        value={draft?.nin || ""} 
        keyboardType="numeric" 
        maxLength={11}
        onChangeText={(v: string) => draft?.id && updateLoan(draft.id, { ...draft, nin: v })} 
      />

      <FormInput label="First Name" value={draft?.firstName || ""} editable={false} />
      <FormInput label="Last Name" value={draft?.lastName || ""} editable={false} />
      
      <Text style={styles.label}>State of Origin</Text>
      <View style={styles.pickerContainer}>
        <Picker 
          selectedValue={draft?.stateOfOrigin || ""} 
          onValueChange={v => draft?.id && updateLoan(draft.id, { ...draft, stateOfOrigin: v })}
        >
          <Picker.Item label="Select State" value="" />
          {Object.keys(NIGERIAN_STATES).map(s => <Picker.Item key={s} label={s} value={s} />)}
        </Picker>
      </View>
    </View>
  );
};

// --- STAGE 2: RESIDENTIAL ---
export const ResidentialInfo = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  const lgas = data.permanentState ? (NIGERIAN_STATES as any)[data.permanentState] : [];

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Residential Address</Text>
      <Text style={styles.label}>State</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={data.permanentState || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, permanentState: v })}>
          <Picker.Item label="Select State" value="" />
          {Object.keys(NIGERIAN_STATES).map(s => <Picker.Item key={s} label={s} value={s} />)}
        </Picker>
      </View>

      <Text style={styles.label}>LGA</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={data.residentialLga || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, residentialLga: v })}>
          <Picker.Item label={data.permanentState ? "Select LGA" : "Select State First"} value="" />
          {lgas.map((l: string) => <Picker.Item key={l} label={l} value={l} />)}
        </Picker>
      </View>

      <FormInput label="Full Address" value={data.fullAddress || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, fullAddress: v })} multiline />
      <FormInput label="Nearest Landmark" value={data.nearestLandmark || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, nearestLandmark: v })} />
      
      <View style={styles.field}>
        <Text style={styles.label}>Residential Status</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={data.residentialStatus || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, residentialStatus: v })}>
            <Picker.Item label="Select Status" value="" />
            <Picker.Item label="Rented" value="Rented" />
            <Picker.Item label="Owned" value="Owned" />
            <Picker.Item label="Family House" value="Family" />
          </Picker>
        </View>
      </View>
      <DateInputField label="Date Moved In" value={data.dateMovedIn} onChange={(v:any) => draft?.id && updateLoan(draft.id, { ...data, dateMovedIn: v })} />
    </View>
  );
};

// --- STAGE 3: EMPLOYMENT ---
export const EmploymentInfo = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  const lgas = data.employerState ? (NIGERIAN_STATES as any)[data.employerState] : [];

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Work Details</Text>
      <FormInput label="Approved Business Location" value={data.approvedBusinessLocation || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, approvedBusinessLocation: v })} />
      <FormInput label="Employer Branch Name" value={data.employerBranchName || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, employerBranchName: v })} />
      
      <Text style={styles.label}>Permanent Residential State (Work)</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={data.employerState || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, employerState: v })}>
          <Picker.Item label="Select State" value="" />
          {Object.keys(NIGERIAN_STATES).map(s => <Picker.Item key={s} label={s} value={s} />)}
        </Picker>
      </View>

      <Text style={styles.label}>LGA</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={data.employerLga || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, employerLga: v })}>
          <Picker.Item label={data.employerState ? "Select LGA" : "Select State First"} value="" />
          {lgas.map((l: string) => <Picker.Item key={l} label={l} value={l} />)}
        </Picker>
      </View>

      <FormInput label="Address" value={data.employerAddress || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, employerAddress: v })} />
      <FormInput label="Staff ID" value={data.staffId || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, staffId: v })} />
      <FormInput label="Job Role" value={data.jobRole || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, jobRole: v })} />

      <View style={styles.field}>
        <Text style={styles.label}>Employment Type</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={data.employmentType || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, employmentType: v })}>
            <Picker.Item label="Select Type" value="" />
            <Picker.Item label="Full-Time" value="Full-Time" />
            <Picker.Item label="Part-Time" value="Part-Time" />
          </Picker>
        </View>
      </View>

      <DateInputField label="Date of Employment" value={data.dateOfEmployment} onChange={(v:any) => draft?.id && updateLoan(draft.id, { ...data, dateOfEmployment: v })} />

      <View style={styles.field}>
        <Text style={styles.label}>Salary Range</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={data.salaryRange || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, salaryRange: v })}>
            <Picker.Item label="Select Range" value="" />
            <Picker.Item label="0 - 100k" value="0-100k" />
            <Picker.Item label="101k - 1m" value="101k-1m" />
            <Picker.Item label="1m - Upward" value="1m-upward" />
          </Picker>
        </View>
      </View>

      <FormInput label="Monthly Income (₦)" value={data.monthIncome || ""} keyboardType="numeric" onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, monthIncome: v })} />
      <FormInput label="Annual Income (₦)" value={data.annualIncome || ""} keyboardType="numeric" onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, annualIncome: v })} />
    </View>
  );
};

// --- STAGE 4: NEXT OF KIN ---
export const NextOfKinInfo = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  const lgas = data.nok1State ? (NIGERIAN_STATES as any)[data.nok1State] : [];

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Next of Kin / Emergency Contact</Text>
      <FormInput label="Full Name" value={data.nextOfKinName || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, nextOfKinName: v })} />
      
      <View style={styles.field}>
        <Text style={styles.label}>Relationship</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={data.nextOfKinRelationship || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, nextOfKinRelationship: v })}>
            <Picker.Item label="Select Relationship" value="" />
            <Picker.Item label="Sibling" value="Sibling" />
            <Picker.Item label="Parent" value="Parent" />
            <Picker.Item label="Spouse" value="Spouse" />
            <Picker.Item label="Child" value="Child" />
            <Picker.Item label="Colleague" value="Colleague" />
            <Picker.Item label="Others" value="Others" />
          </Picker>
        </View>
      </View>

      <DateInputField label="Date of Birth" value={data.nok1Dob} onChange={(v:any) => draft?.id && updateLoan(draft.id, { ...data, nok1Dob: v })} />
      <FormInput label="Phone Number" value={data.nextOfKinPhone || ""} keyboardType="phone-pad" onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, nextOfKinPhone: v })} />
      <FormInput label="Address" value={data.nextOfKinAddress || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, nextOfKinAddress: v })} />

      <Text style={styles.label}>State</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={data.nok1State || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, nok1State: v })}>
          <Picker.Item label="Select State" value="" />
          {Object.keys(NIGERIAN_STATES).map(s => <Picker.Item key={s} label={s} value={s} />)}
        </Picker>
      </View>

      <Text style={styles.label}>LGA</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={data.nok1Lga || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, nok1Lga: v })}>
          <Picker.Item label={data.nok1State ? "Select LGA" : "Select State First"} value="" />
          {lgas.map((l: string) => <Picker.Item key={l} label={l} value={l} />)}
        </Picker>
      </View>
    </View>
  );
};

// --- STAGE 5: BANK ---
export const BankInfo = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Disbursement Bank</Text>
      <FormInput label="Bank Name" value={data.bankName || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, bankName: v })} />
      <FormInput label="Account Number" value={data.accountNumber || ""} keyboardType="numeric" maxLength={10} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, accountNumber: v })} />
      
      <View style={styles.field}>
        <Text style={styles.label}>Account Type</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={data.accountType || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, accountType: v })}>
            <Picker.Item label="Select Type" value="" />
            <Picker.Item label="Savings" value="Savings" />
            <Picker.Item label="Current" value="Current" />
          </Picker>
        </View>
      </View>

      <FormInput label="Loan Amount (₦)" value={data.loanAmount || ""} keyboardType="numeric" onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, loanAmount: v })} />
    </View>
  );
};

// --- STAGE 6: UPLOADS ---
export const DocumentUploads = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const onPick = async (key: string) => {
    if (!draft?.id) return;
    setUploadingField(key);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const manip = await ImageManipulator.manipulateAsync(
          file.uri, 
          [{ resize: { width: 800 } }], 
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );
        updateLoan(draft.id, { ...data, [key]: manip.uri });
      }
    } catch (err) {
      Alert.alert("Upload Error", "Failed to process image.");
    } finally {
      setUploadingField(null);
    }
  };

  const fields = [
    { label: "ID Card", key: "idImageUrl" },
    { label: "NIN Slip", key: "ninImageURL" },
    { label: "Bank Statement", key: "statementURL" },
    { label: "Utility Bill", key: "utilityBillUrl" },
    { label: "Signature", key: "signatureUrl" },
    { label: "Passport", key: "passportImageUrl" }
  ];

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Required Documents</Text>
      {fields.map(f => (
        <TouchableOpacity key={f.key} style={styles.uploadRow} onPress={() => onPick(f.key)} disabled={uploadingField !== null}>
          <Ionicons name={data[f.key] ? "checkmark-circle" : "cloud-upload"} size={22} color={data[f.key] ? BRAND.accent : BRAND.primary} />
          <Text style={styles.uploadText}>{data[f.key] ? `${f.label} Ready` : `Upload ${f.label}`}</Text>
          {uploadingField === f.key && <ActivityIndicator size="small" color={BRAND.primary} />}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// --- STAGE 9: DECLARATION ---
export const Declaration = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Declaration</Text>
      <View style={styles.checkboxRow}>
        <Checkbox value={data.hasAcceptedTerms || false} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, hasAcceptedTerms: v })} color={BRAND.primary} />
        <Text style={styles.checkboxLabel}>I confirm that all information provided is true and accurate.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: BRAND.border, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: BRAND.text, marginBottom: 15 },
  field: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '600', color: BRAND.muted, marginBottom: 6 },
  input: { backgroundColor: BRAND.inputBg, borderWidth: 1, borderColor: BRAND.border, padding: 14, borderRadius: 10, color: BRAND.text, minHeight: 50, justifyContent: 'center' },
  pickerContainer: { backgroundColor: BRAND.inputBg, borderWidth: 1, borderColor: BRAND.border, borderRadius: 10, overflow: 'hidden' },
  verifyBtn: { backgroundColor: BRAND.primary, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center' },
  verifyBtnText: { color: '#FFF', fontWeight: 'bold' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 10, borderStyle: 'dashed', borderWidth: 1.5, borderColor: BRAND.primary, marginBottom: 12 },
  uploadText: { flex: 1, marginLeft: 12, color: BRAND.text, fontWeight: '500' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 10 },
  checkboxLabel: { flex: 1, fontSize: 14, color: BRAND.text, lineHeight: 20 }
});
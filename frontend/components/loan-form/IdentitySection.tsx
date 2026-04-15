// components/loan-form/IdentitySection.tsx
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NIGERIAN_STATES } from '../../constants/StateData';
import api from '../../services/api';
import { useLoanStore } from '../../store/loanStore';
import useUserData from '../../store/userSignUp';
import { DateInputField, FormInput, sharedStyles } from './FormShared';

export const PersonalInfo = () => {
  const { loans, updateLoan, addLoan } = useLoanStore();
  const userData = useUserData.getState(); 
  const draft = loans.find(l => l.status === 'Draft');
  const [localBvn, setLocalBvn] = useState(draft?.bvn || "");
  const [isVerifying, setIsVerifying] = useState(false);

  const onVerify = async () => {
    if (!localBvn || localBvn.length < 11) return Alert.alert("Error", "Enter valid bvn number");
    setIsVerifying(true);
    try {
      const res = await api.post('/manager/verify-bvn', { bvn: localBvn });
      if (res.data.status === "success") {
        const c = res.data.data;
        const updatedData = {
          bvn: localBvn,
          firstName: c.firstName || '', 
          lastName: c.lastName || '', 
          customerName: `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Verified Customer", 
          dob: c.dob || '' 
        };
        if (draft) { updateLoan(draft.id, { ...draft, ...updatedData }); } 
        else { addLoan({ id: Date.now().toString(), status: 'Draft', ...updatedData } as any, userData.email); }
        Alert.alert("Success", "Identity Verified");
      }
    } catch (e) { Alert.alert("Error", "Verification failed."); } 
    finally { setIsVerifying(false); }
  };

  return (
    <View style={sharedStyles.sectionCard}>
      <Text style={sharedStyles.sectionTitle}>Identity Verification</Text>
      <View style={sharedStyles.field}>
        <Text style={sharedStyles.label}>BVN</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput 
            style={[sharedStyles.input, { flex: 1 }]} 
            value={localBvn} 
            onChangeText={(v) => { setLocalBvn(v); if (draft) updateLoan(draft.id, { ...draft, bvn: v }); }} 
            placeholder="11-digit BVN" keyboardType="numeric" maxLength={11}
          />
          <TouchableOpacity style={sharedStyles.verifyBtn} onPress={onVerify} disabled={isVerifying}>
            {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={sharedStyles.verifyBtnText}>Verify</Text>}
          </TouchableOpacity>
        </View>
      </View>
      <FormInput label="NIN" value={draft?.nin || ""} keyboardType="numeric" maxLength={11} onChangeText={(v: string) => draft?.id && updateLoan(draft.id, { ...draft, nin: v })} />
      <FormInput label="First Name" value={draft?.firstName || ""} editable={false} />
      <FormInput label="Last Name" value={draft?.lastName || ""} editable={false} />
      <Text style={sharedStyles.label}>State of Origin</Text>
      <View style={sharedStyles.pickerContainer}>
        <Picker selectedValue={draft?.stateOfOrigin || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...draft, stateOfOrigin: v })}>
          <Picker.Item label="Select State" value="" />
          {Object.keys(NIGERIAN_STATES).map(s => <Picker.Item key={s} label={s} value={s} />)}
        </Picker>
      </View>
    </View>
  );
};

export const ResidentialInfo = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  const lgas = data.permanentState ? (NIGERIAN_STATES as any)[data.permanentState] : [];

  return (
    <View style={sharedStyles.sectionCard}>
      <Text style={sharedStyles.sectionTitle}>Residential Address</Text>
      <Text style={sharedStyles.label}>State</Text>
      <View style={sharedStyles.pickerContainer}>
        <Picker selectedValue={data.permanentState || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, permanentState: v })}>
          <Picker.Item label="Select State" value="" />
          {Object.keys(NIGERIAN_STATES).map(s => <Picker.Item key={s} label={s} value={s} />)}
        </Picker>
      </View>
      <Text style={sharedStyles.label}>LGA</Text>
      <View style={sharedStyles.pickerContainer}>
        <Picker selectedValue={data.residentialLga || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, residentialLga: v })}>
          <Picker.Item label={data.permanentState ? "Select LGA" : "Select State First"} value="" />
          {lgas.map((l: string) => <Picker.Item key={l} label={l} value={l} />)}
        </Picker>
      </View>
      <FormInput label="Full Address" value={data.fullAddress || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, fullAddress: v })} multiline />
      <FormInput label="Nearest Landmark" value={data.nearestLandmark || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, nearestLandmark: v })} />
      <DateInputField label="Date Moved In" value={data.dateMovedIn} onChange={(v:any) => draft?.id && updateLoan(draft.id, { ...data, dateMovedIn: v })} />
    </View>
  );
};
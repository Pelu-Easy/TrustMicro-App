import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { Text, View } from 'react-native';
import { NIGERIAN_STATES } from '../../constants/StateData';
import { useLoanStore } from '../../store/loanStore';
import { DateInputField, FormInput, sharedStyles } from './FormShared';

export const NextOfKinInfo = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  const lgas = data.nok1State ? (NIGERIAN_STATES as any)[data.nok1State] : [];

  return (
    <View style={sharedStyles.sectionCard}>
      <Text style={sharedStyles.sectionTitle}>Next of Kin / Emergency Contact</Text>
      
      <FormInput 
        label="Full Name" 
        value={data.nextOfKinName || ""} 
        onChangeText={(v: any) => draft?.id && updateLoan(draft.id, { ...data, nextOfKinName: v })} 
      />
      
      <View style={sharedStyles.field}>
        <Text style={sharedStyles.label}>Relationship</Text>
        <View style={sharedStyles.pickerContainer}>
          <Picker 
            selectedValue={data.nextOfKinRelationship || ""} 
            onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, nextOfKinRelationship: v })}
          >
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

      <DateInputField 
        label="Date of Birth" 
        value={data.nok1Dob} 
        onChange={(v: any) => draft?.id && updateLoan(draft.id, { ...data, nok1Dob: v })} 
      />

      <FormInput 
        label="Phone Number" 
        value={data.nextOfKinPhone || ""} 
        keyboardType="phone-pad" 
        onChangeText={(v: any) => draft?.id && updateLoan(draft.id, { ...data, nextOfKinPhone: v })} 
      />

      <FormInput 
        label="Home Address" 
        value={data.nextOfKinAddress || ""} 
        onChangeText={(v: any) => draft?.id && updateLoan(draft.id, { ...data, nextOfKinAddress: v })} 
      />

      <Text style={sharedStyles.label}>State of Residence</Text>
      <View style={sharedStyles.pickerContainer}>
        <Picker 
          selectedValue={data.nok1State || ""} 
          onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, nok1State: v })}
        >
          <Picker.Item label="Select State" value="" />
          {Object.keys(NIGERIAN_STATES).map(s => <Picker.Item key={s} label={s} value={s} />)}
        </Picker>
      </View>

      <Text style={sharedStyles.label}>LGA</Text>
      <View style={sharedStyles.pickerContainer}>
        <Picker 
          selectedValue={data.nok1Lga || ""} 
          onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, nok1Lga: v })}
        >
          <Picker.Item label={data.nok1State ? "Select LGA" : "Select State First"} value="" />
          {lgas.map((l: string) => <Picker.Item key={l} label={l} value={l} />)}
        </Picker>
      </View>
    </View>
  );
};
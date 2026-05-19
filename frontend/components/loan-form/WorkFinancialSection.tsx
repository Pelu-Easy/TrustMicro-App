// components/loan-form/WorkFinancialSection.tsx
import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { Text, View } from 'react-native';
import { NIGERIAN_STATES } from '../../constants/StateData';
import { useLoanStore } from '../../store/loanStore';
import { DateInputField, FormInput, sharedStyles } from './FormShared';

export const EmploymentInfo = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  const lgas = data.employerState ? (NIGERIAN_STATES as any)[data.employerState] : [];

  return (
    <View style={sharedStyles.sectionCard}>
      <Text style={sharedStyles.sectionTitle}>Work Details</Text>
      <FormInput label="Approved Business Location" value={data.approvedBusinessLocation || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, approvedBusinessLocation: v })} />
      <Text style={sharedStyles.label}>Employer State</Text>
      <View style={sharedStyles.pickerContainer}>
        <Picker selectedValue={data.employerState || ""} onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, employerState: v })}>
          <Picker.Item label="Select State" value="" />
          {Object.keys(NIGERIAN_STATES).map(s => <Picker.Item key={s} label={s} value={s} />)}
        </Picker>
      </View>
      <FormInput label="Monthly Income (₦)" value={data.monthIncome || ""} keyboardType="numeric" onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, monthIncome: v })} />
      <DateInputField label="Date of Employment" value={data.dateOfEmployment} onChange={(v:any) => draft?.id && updateLoan(draft.id, { ...data, dateOfEmployment: v })} />
    </View>
  );
};

export const BankInfo = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  return (
    <View style={sharedStyles.sectionCard}>
      <Text style={sharedStyles.sectionTitle}>Disbursement Bank</Text>
      <FormInput label="Bank Name" value={data.bankName || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, bankName: v })} />
      <FormInput label="Account Number" value={data.accountNumber || ""} keyboardType="numeric" maxLength={10} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, accountNumber: v })} />
      
      {/* ADDED LOAN TYPE PICKER TO FULFILL SERVER VALIDATION REQUIREMENTS */}
      <Text style={sharedStyles.label}>Loan Type</Text>
      <View style={sharedStyles.pickerContainer}>
        <Picker 
          selectedValue={data.loanType || ""} 
          onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, loanType: v })}
        >
          <Picker.Item label="Select Loan Type" value="" />
          <Picker.Item label="SME / Business Loan" value="Business Loan" />
          <Picker.Item label="Micro Loan" value="Micro Loan" />
          <Picker.Item label="Personal Loan" value="Personal Loan" />
          <Picker.Item label="Salary Advance" value="Salary Advance" />
        </Picker>
      </View>

      <FormInput label="Loan Amount (₦)" value={data.loanAmount || ""} keyboardType="numeric" onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, loanAmount: v })} />
    </View>
  );
};
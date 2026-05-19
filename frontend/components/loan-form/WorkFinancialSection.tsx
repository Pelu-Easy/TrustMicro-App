// components/loan-form/WorkFinancialSection.tsx
import React, { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { 
  Text, 
  View, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  TouchableWithoutFeedback,
  Platform 
} from 'react-native';
import { NIGERIAN_STATES } from '../../constants/StateData';
import { useLoanStore } from '../../store/loanStore';
import { DateInputField, FormInput, sharedStyles, BRAND } from './FormShared';

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

  // Local state to control the visibility of our stylized popup menu
  const [menuVisible, setMenuVisible] = useState(false);

  // Available options mapped out clearly
  const loanOptions = [
    { label: "SME / Business Loan", value: "Business Loan" },
    { label: "Micro Loan", value: "Micro Loan" },
    { label: "Personal Loan", value: "Personal Loan" },
    { label: "Salary Advance", value: "Salary Advance" }
  ];

  // Helper to find the readable label text for whatever value is currently selected
  const activeSelection = loanOptions.find(opt => opt.value === data.loanType);

  return (
    <View style={sharedStyles.sectionCard}>
      <Text style={sharedStyles.sectionTitle}>Disbursement Bank</Text>
      <FormInput label="Bank Name" value={data.bankName || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, bankName: v })} />
      <FormInput label="Account Number" value={data.accountNumber || ""} keyboardType="numeric" maxLength={10} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, accountNumber: v })} />
      
      {/* STYLIZED LOAN TYPE MENU PICKER */}
      <Text style={sharedStyles.label}>Loan Type</Text>
      <TouchableOpacity 
        style={[sharedStyles.pickerContainer, localStyles.selectorTrigger]} 
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[localStyles.selectorText, activeSelection && localStyles.selectedTextValue]}>
          {activeSelection ? activeSelection.label : "Select Loan Type"}
        </Text>
        <Text style={localStyles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      {/* POPUP MENU DESIGN COMPONENT */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={localStyles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={localStyles.menuContainer}>
                <View style={localStyles.menuHeader}>
                  <Text style={localStyles.menuTitle}>Choose Loan Category</Text>
                  <Text style={localStyles.menuSubtitle}>Select an approved financial path</Text>
                </View>

                {loanOptions.map((option) => {
                  const isSelected = data.loanType === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[localStyles.optionItem, isSelected && localStyles.optionItemActive]}
                      activeOpacity={0.6}
                      onPress={() => {
                        if (draft?.id) {
                          updateLoan(draft.id, { ...data, loanType: option.value });
                        }
                        setMenuVisible(false);
                      }}
                    >
                      <Text style={[localStyles.optionLabelText, isSelected && localStyles.optionLabelTextActive]}>
                        {option.label}
                      </Text>
                      {isSelected && <Text style={localStyles.checkmarkIcon}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity 
                  style={localStyles.closeMenuBtn} 
                  onPress={() => setMenuVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={localStyles.closeMenuBtnText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <FormInput label="Loan Amount (₦)" value={data.loanAmount || ""} keyboardType="numeric" onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, loanAmount: v })} />
    </View>
  );
};

// Isolated stylesheet styling the interactive bottom sheet menu pop-up cleanly
const localStyles = StyleSheet.create({
  selectorTrigger: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
  },
  selectorText: {
    fontSize: 15,
    color: '#94A3B8', 
    fontWeight: '500',
  },
  selectedTextValue: {
    color: '#1E293B',
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#64748B',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', 
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  menuHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: '#F8FAFC',
  },
  optionItemActive: {
    backgroundColor: '#EEF2F6',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  optionLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  optionLabelTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  checkmarkIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  closeMenuBtn: {
    backgroundColor: '#64748B',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeMenuBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  }
});
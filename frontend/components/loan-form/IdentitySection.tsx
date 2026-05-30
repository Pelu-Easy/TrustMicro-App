// components/loan-form/IdentitySection.tsx
import React, { useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  Modal, 
  FlatList, 
  TouchableWithoutFeedback, 
  StyleSheet, 
  Platform 
} from 'react-native';
import { NIGERIAN_STATES } from '../../constants/StateData';
import api from '../../services/api';
import { useLoanStore } from '../../store/loanStore';
import useUserData from '../../store/userSignUp';
import { DateInputField, FormInput, sharedStyles, BRAND } from './FormShared';

// Reusable local bottom-sheet picker component for cohesive UI theme alignment
interface CleanSelectorModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selectedValue: string;
  placeholder: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const CleanSelectorModal = ({ 
  visible, 
  title, 
  options, 
  selectedValue, 
  placeholder, 
  onSelect, 
  onClose 
}: CleanSelectorModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={customStyles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={customStyles.modalContentCard}>
              <View style={customStyles.dragIndicator} />
              
              <Text style={customStyles.modalTitle}>{title}</Text>
              
              <FlatList
                data={options}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={customStyles.listContainer}
                renderItem={({ item }) => {
                  const isSelected = item === selectedValue;
                  return (
                    <TouchableOpacity
                      style={[customStyles.optionItem, isSelected && customStyles.optionItemSelected]}
                      activeOpacity={0.7}
                      onPress={() => {
                        onSelect(item);
                        onClose();
                      }}
                    >
                      <Text style={[customStyles.optionText, isSelected && customStyles.optionTextSelected]}>
                        {item}
                      </Text>
                      {isSelected && <Text style={customStyles.checkmarkIcon}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
              
              <TouchableOpacity style={customStyles.closeBtn} onPress={onClose}>
                <Text style={customStyles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export const PersonalInfo = () => {
  const { loans, updateLoan, addLoan } = useLoanStore();
  const userData = useUserData.getState(); 
  const draft = loans.find(l => l.status === 'Draft');
  const [localBvn, setLocalBvn] = useState(draft?.bvn || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);

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

  const stateOptions = Object.keys(NIGERIAN_STATES);

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
      <TouchableOpacity 
        style={customStyles.pickerRowTrigger} 
        activeOpacity={0.8}
        onPress={() => setStateModalVisible(true)}
      >
        <Text style={[customStyles.pickerRowValue, !draft?.stateOfOrigin && customStyles.pickerRowPlaceholder]}>
          {draft?.stateOfOrigin || "Select State"}
        </Text>
        <Text style={customStyles.pickerRowArrow}>▼</Text>
      </TouchableOpacity>

      <CleanSelectorModal
        visible={stateModalVisible}
        title="Select State of Origin"
        options={stateOptions}
        selectedValue={draft?.stateOfOrigin || ""}
        placeholder="Select State"
        onSelect={(v) => draft?.id && updateLoan(draft.id, { ...draft, stateOfOrigin: v })}
        onClose={() => setStateModalVisible(false)}
      />
    </View>
  );
};

export const ResidentialInfo = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;
  const lgas = data.permanentState ? (NIGERIAN_STATES as any)[data.permanentState] : [];

  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [lgaModalVisible, setLgaModalVisible] = useState(false);

  const stateOptions = Object.keys(NIGERIAN_STATES);

  return (
    <View style={sharedStyles.sectionCard}>
      <Text style={sharedStyles.sectionTitle}>Residential Address</Text>
      
      <Text style={sharedStyles.label}>State</Text>
      <TouchableOpacity 
        style={customStyles.pickerRowTrigger} 
        activeOpacity={0.8}
        onPress={() => setStateModalVisible(true)}
      >
        <Text style={[customStyles.pickerRowValue, !data.permanentState && customStyles.pickerRowPlaceholder]}>
          {data.permanentState || "Select State"}
        </Text>
        <Text style={customStyles.pickerRowArrow}>▼</Text>
      </TouchableOpacity>

      <Text style={sharedStyles.label}>LGA</Text>
      <TouchableOpacity 
        style={[customStyles.pickerRowTrigger, !data.permanentState && customStyles.pickerRowDisabled]} 
        activeOpacity={data.permanentState ? 0.8 : 1}
        onPress={() => data.permanentState && setLgaModalVisible(true)}
      >
        <Text style={[
          customStyles.pickerRowValue, 
          !data.residentialLga && customStyles.pickerRowPlaceholder,
          !data.permanentState && customStyles.pickerRowDisabledText
        ]}>
          {data.permanentState ? (data.residentialLga || "Select LGA") : "Select State First"}
        </Text>
        <Text style={[customStyles.pickerRowArrow, !data.permanentState && customStyles.pickerRowDisabledText]}>▼</Text>
      </TouchableOpacity>

      <FormInput label="Full Address" value={data.fullAddress || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, fullAddress: v })} multiline />
      <FormInput label="Nearest Landmark" value={data.nearestLandmark || ""} onChangeText={(v:any) => draft?.id && updateLoan(draft.id, { ...data, nearestLandmark: v })} />
      <DateInputField label="Date Moved In" value={data.dateMovedIn} onChange={(v:any) => draft?.id && updateLoan(draft.id, { ...data, dateMovedIn: v })} />

      {/* Residential State Bottom Sheet */}
      <CleanSelectorModal
        visible={stateModalVisible}
        title="Select Residential State"
        options={stateOptions}
        selectedValue={data.permanentState || ""}
        placeholder="Select State"
        onSelect={(v) => draft?.id && updateLoan(draft.id, { ...data, permanentState: v })}
        onClose={() => setStateModalVisible(false)}
      />

      {/* Local Government Area Bottom Sheet */}
      <CleanSelectorModal
        visible={lgaModalVisible}
        title="Select Local Government"
        options={lgas}
        selectedValue={data.residentialLga || ""}
        placeholder="Select LGA"
        onSelect={(v) => draft?.id && updateLoan(draft.id, { ...data, residentialLga: v })}
        onClose={() => setLgaModalVisible(false)}
      />
    </View>
  );
};

const customStyles = StyleSheet.create({
  pickerRowTrigger: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    height: 48,
  },
  pickerRowDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  pickerRowValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  pickerRowPlaceholder: {
    color: '#94A3B8',
  },
  pickerRowDisabledText: {
    color: '#94A3B8',
  },
  pickerRowArrow: {
    fontSize: 11,
    color: '#64748B',
  },
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
    maxHeight: '75%',
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionItemSelected: {
    backgroundColor: '#F8FAFC',
  },
  optionText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  checkmarkIcon: {
    fontSize: 15,
    color: '#0284C7',
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
});
import Checkbox from 'expo-checkbox';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLoanStore } from '../../store/loanStore';
import { BRAND, sharedStyles } from './FormShared';

export const Declaration = () => {
  const { loans, updateLoan } = useLoanStore();
  const draft = loans.find(l => l.status === 'Draft');
  const data = draft || {} as any;

  return (
    <View style={sharedStyles.sectionCard}>
      <Text style={sharedStyles.sectionTitle}>Final Declaration</Text>
      
      <View style={sharedStyles.checkboxRow}>
        <Checkbox 
          value={data.hasAcceptedTerms || false} 
          onValueChange={v => draft?.id && updateLoan(draft.id, { ...data, hasAcceptedTerms: v })} 
          color={BRAND.primary} 
        />
        <Text style={sharedStyles.checkboxLabel}>
          I, the undersigned Sales Officer, confirm that I have verified the original documents of the applicant 
          and that all information provided in this electronic form is true and accurate to the best of my knowledge.
        </Text>
      </View>
      
      <Text style={styles.disclaimer}>
        Note: Fraudulent submissions are subject to internal disciplinary action by MicroTrust Bank.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  disclaimer: {
    fontSize: 11,
    color: '#EF4444',
    fontStyle: 'italic',
    marginTop: 15,
    fontWeight: '500'
  }
});
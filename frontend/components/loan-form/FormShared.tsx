// components/loan-form/FormShared.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export const BRAND = { primary: "#0056D2", accent: "#10B981", border: "#E2E8F0", inputBg: "#F1F5F9", text: "#1E293B", muted: "#64748B" };

export const formatDate = (dateString: string) => {
  if (!dateString) return "Select Date";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Select Date";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const FormInput = ({ label, ...props }: any) => (
  <View style={sharedStyles.field}>
    <Text style={sharedStyles.label}>{label}</Text>
    <TextInput style={sharedStyles.input} placeholderTextColor="#94A3B8" {...props} />
  </View>
);

export const DateInputField = ({ label, value, onChange }: any) => {
  const [show, setShow] = useState(false);
  const getSafeDate = () => {
    const d = value ? new Date(value) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  };

  return (
    <View style={sharedStyles.field}>
      <Text style={sharedStyles.label}>{label}</Text>
      <TouchableOpacity style={sharedStyles.input} onPress={() => setShow(true)}>
        <Text style={{ color: value ? BRAND.text : "#94A3B8" }}>{formatDate(value)}</Text>
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

export const sharedStyles = StyleSheet.create({
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
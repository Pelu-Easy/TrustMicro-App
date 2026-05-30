// components/loan-form/UploadSection.tsx
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useLoanStore } from '../../store/loanStore';
import { BRAND, sharedStyles } from './FormShared';

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
          file.uri, [{ resize: { width: 800 } }], 
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );
        updateLoan(draft.id, { ...data, [key]: manip.uri });
      }
    } catch (err) { Alert.alert("Upload Error", "Failed to process image."); } 
    finally { setUploadingField(null); }
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
    <View style={sharedStyles.sectionCard}>
      <Text style={sharedStyles.sectionTitle}>Required Documents</Text>
      {fields.map(f => (
        <TouchableOpacity key={f.key} style={sharedStyles.uploadRow} onPress={() => onPick(f.key)} disabled={uploadingField !== null}>
          <Ionicons name={data[f.key] ? "checkmark-circle" : "cloud-upload"} size={22} color={data[f.key] ? BRAND.accent : BRAND.primary} />
          <Text style={sharedStyles.uploadText}>{data[f.key] ? `${f.label} Ready` : `Upload ${f.label}`}</Text>
          {uploadingField === f.key && <ActivityIndicator size="small" color={BRAND.primary} />}
        </TouchableOpacity>
      ))}
    </View>
  );
};
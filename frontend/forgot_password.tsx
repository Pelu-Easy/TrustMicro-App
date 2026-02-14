import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useUserData from '/../store/userSignUp';

export default function ForgotPassword() {
  const router = useRouter();
  const savedUser = useUserData((state) => state);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetRequest = () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your staff email address.");
      return;
    }

    setIsLoading(true);

    // Simulate API call to send reset email
    setTimeout(() => {
      setIsLoading(false);
      
      if (email.trim().toLowerCase() === savedUser.email.toLowerCase()) {
        Alert.alert(
          "Reset Email Sent", 
          "A password reset link has been sent to your registered staff email.",
          [{ text: "Back to Login", onPress: () => router.replace('/login') }]
        );
      } else {
        Alert.alert("Not Found", "This email is not registered in our staff directory.");
      }
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#003366" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={40} color="#003366" />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your staff email address and we will send you a link to reset your password.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Staff Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="staff@trustmicro.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={[styles.resetBtn, isLoading && { opacity: 0.7 }]} 
              onPress={handleResetRequest}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 25, flex: 1 },
  backBtn: { marginBottom: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0F4F8', justifyContent: 'center',
    alignItems: 'center', marginBottom: 20
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#003366', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 15,
    height: 55, marginBottom: 25, backgroundColor: '#FAFAFA'
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  resetBtn: {
    backgroundColor: '#003366', height: 55, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center'
  },
  resetText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
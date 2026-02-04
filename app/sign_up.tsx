import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useUserData from "../store/userSignUp"; 
import axios from 'axios';

// FIX: Added port :5000 to the IP address
const API_URL = 'http://192.168.100.120:5000/api/v1';

export default function SignUpScreen() {
  const router = useRouter();
  const updateUserData = useUserData((state: any) => state.updateUserData);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', 
    email: '',
    phone: '',    
    branch: 'Main Headquarters',
    password: '',
    confirmPassword: ''
  });

  const handleSignUp = async () => {
    const { fullName, email, phone, password, confirmPassword, branch } = formData;

    if (!fullName || !email || !password || !phone) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Post to Backend
      const response = await axios.post(`${API_URL}/auth/signup`, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        branch: branch,
        password: password,
        role: 'Officer' 
      });
      
      // 2. Clear local loading
      setIsLoading(false);

      // 3. Success Alert
      Alert.alert("Success", "Staff Account Created Successfully!", [
        { text: "Go to Login", onPress: () => router.replace('/login') }
      ]);

    } catch (error: any) {
      setIsLoading(false);
      
      // LOGGING FOR TROUBLESHOOTING
      if (error.response) {
        // The server responded with a status outside of 2xx
        console.log("Server Error Data:", error.response.data);
        Alert.alert("Registration Failed", error.response.data.error || "Server error.");
      } else if (error.request) {
        // The request was made but no response was received
        console.log("Network Error: No response from server.");
        Alert.alert("Connection Error", "Cannot reach the server. Ensure the backend is running at http://192.168.100.120:5000");
      } else {
        Alert.alert("Error", error.message);
      }
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#003366" />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register as a TrustMicro Staff Officer</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. John Doe" 
              value={formData.fullName}
              onChangeText={(v) => updateField('fullName', v)}
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput 
              style={styles.input} 
              placeholder="staff@trustmicro.com" 
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(v) => updateField('email', v)}
            />

            <Text style={styles.label}>Staff Phone / ID</Text>
            <TextInput 
              style={styles.input} 
              placeholder="08012345678" 
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(v) => updateField('phone', v)}
            />

            <Text style={styles.label}>Assign Branch</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Lagos Island Branch" 
              value={formData.branch}
              onChangeText={(v) => updateField('branch', v)}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput 
              style={styles.input} 
              placeholder="••••••••" 
              secureTextEntry 
              value={formData.password}
              onChangeText={(v) => updateField('password', v)}
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput 
              style={styles.input} 
              placeholder="••••••••" 
              secureTextEntry 
              value={formData.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
            />

            <TouchableOpacity 
              style={[styles.btn, isLoading && { opacity: 0.7 }]} 
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register Account</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 25, flexGrow: 1 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#003366' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { 
    backgroundColor: '#F5F7FA', 
    padding: 15, 
    borderRadius: 10, 
    fontSize: 16, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E4E8'
  },
  btn: { 
    backgroundColor: '#003366', 
    padding: 18, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginTop: 10 
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios'; // FIXED: Added missing import

// Zustand State Imports
import { useLoanStore } from '../store/loanStore';
import useUserData from '../store/userSignUp'; 


// Machine's local IP address
const API_URL = 'http://192.168.100.120:5000/api/v1'; 

export default function LoginScreen() {
  const router = useRouter();
  
  // FIXED: Destructure updateUserData to avoid red underlines
  const { updateUserData } = useUserData();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // FIXED: Added 'async' so 'await' can work
  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Backend Authentication Request
      const response = await axios.post(`${API_URL}/auth/login`, { 
        email: trimmedEmail, 
        password: trimmedPassword 
      });

      const { token, user } = response.data;

      // 2. Save Secure Session to Zustand
      updateUserData({
        token: token,
        isLoggedIn: true,
        role: user.role,
        funame: user.funame,
        email: user.email,
        branch: user.branch
      });

      // 3. Sync name to Loan Store profile
      useLoanStore.setState((state) => ({
        staffProfile: {
          ...state.staffProfile,
          funame: user.funame,
        }
      }));

      setIsLoading(false);
      Alert.alert("Welcome Back", "Login Successful!", [
        { text: "Enter Portal", onPress: () => router.replace('/(tabs)') }
      ]);

    } catch (error: any) {
      setIsLoading(false);
      const errorMsg = error.response?.data?.error || "Connection to server failed.";
      Alert.alert("Access Denied", errorMsg);
    }
  };

  const RequiredLabel = ({ text }: { text: string }) => (
    <Text style={styles.label}>{text} <Text style={styles.asterisk}>*</Text></Text>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="business" size={40} color="#003366" />
            </View>
            <Text style={styles.bankName}>TrustMicro Bank</Text>
            <Text style={styles.tagline}>Staff Portal Access</Text>
          </View>

          <View style={styles.form}>
            <RequiredLabel text="Email Address" />
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <RequiredLabel text="Password" />
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} color="#666" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => router.push('/forgot_password')} 
              style={{ alignSelf: 'flex-end', marginBottom: 20 }}
            >
              <Text style={{ color: '#003366', fontWeight: '600' }}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.signInBtn, isLoading && styles.disabledBtn]} 
              onPress={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signupRow}>
              <Text style={styles.noAccountText}>Dont have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/sign_up')}>
                <Text style={styles.signUpLinkText}>Sign Up here</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 25, flexGrow: 1, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0F4F8', justifyContent: 'center',
    alignItems: 'center', marginBottom: 15
  },
  bankName: { fontSize: 26, fontWeight: 'bold', color: '#003366' },
  tagline: { fontSize: 14, color: '#666', marginTop: 5 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  asterisk: { color: 'red' }, 
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 15,
    height: 55, marginBottom: 15, backgroundColor: '#FAFAFA'
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#000' },
  signInBtn: {
    backgroundColor: '#003366', height: 55, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginTop: 10,
  },
  disabledBtn: { backgroundColor: '#A5B4C4' },
  signInText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  noAccountText: { color: '#666', fontSize: 15 },
  signUpLinkText: { color: '#003366', fontSize: 15, fontWeight: 'bold', textDecorationLine: 'underline' },
});

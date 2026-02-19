import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- UTILITY & STATE IMPORTS ---
import api from '@/services/api';
import { useLoanStore } from '@/store/loanStore';
import useUserData from '@/store/userSignUp';

export default function LoginScreen() {
  const router = useRouter();
  const { updateUserData } = useUserData();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [errors, setErrors] = useState<any>({});

  const validateEmail = (emailStr: string) => /\S+@\S+\.\S+/.test(emailStr);

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    let currentErrors: any = {};

    if (!trimmedEmail) {
      currentErrors.email = "Email address is required";
    } else if (!validateEmail(trimmedEmail)) {
      currentErrors.email = "Please enter a valid email format";
    }

    if (!trimmedPassword) {
      currentErrors.password = "Password is required";
    }

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Backend Authentication Request
      const response = await api.post('/auth/login', { 
        email: trimmedEmail.toLowerCase(), 
        password: trimmedPassword 
      });

      const { token, user } = response.data;

      // Calculate roles immediately for redirection
      const isUserSupervisor = 
          user.is_supervisor === true || 
          ['manager', 'supervisor', 'admin', 'super admin'].includes(user.role?.toLowerCase());

      // 2. Save Secure Session to Zustand
      updateUserData({
        token: token,
        isLoggedIn: true,
        role: user.role,
        funame: user.fullName || user.full_name,
        email: user.email,
        phone: user.phone_no || user.phone,
        branch: user.branch,
        department: user.department,
        unit: user.unit,
        supervisor: user.supervisor_name || user.supervisor,
        isSupervisor: isUserSupervisor,
        isLoanOfficer: 
          user.is_loan_officer === true || 
          user.role?.toLowerCase() === 'officer'
      });

      // 3. Sync to Loan Store
      useLoanStore.setState((state) => ({
        staffProfile: {
          ...state.staffProfile,
          funame: user.fullName || user.full_name,
        }
      }));

      setIsLoading(false);

      // 🛡️ ROLE-BASED REDIRECTION (Directly at Login)
      if (isUserSupervisor) {
        // Managers/Admins land on the Admin Panel (root index)
        router.replace('/');
      } else {
        // Sales Officers land on their specific Tabs
        router.replace('/(tabs)');
      }

    } catch (error: any) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        const errorMsg = error.response?.data?.error || "Invalid credentials or server error.";
        setErrors({ general: errorMsg });
      }, 500);
    }
  };

  const updateEmailField = (val: string) => {
    setEmail(val);
    if (errors.email || errors.general) setErrors({});
  };

  const updatePasswordField = (val: string) => {
    setPassword(val);
    if (errors.password || errors.general) setErrors({});
  };

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
            {errors.general && (
              <View style={styles.generalErrorBox}>
                <Ionicons name="alert-circle" size={18} color="#C53030" />
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            <Text style={styles.label}>Email Address <Text style={styles.asterisk}>*</Text></Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={errors.email ? "#EF4444" : "#666"} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={updateEmailField}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={styles.label}>Password <Text style={styles.asterisk}>*</Text></Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.password ? "#EF4444" : "#666"} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={updatePasswordField}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} color="#666" 
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <TouchableOpacity 
              onPress={() => router.push('/forgot_password' as any)} 
              style={{ alignSelf: 'flex-end', marginBottom: 25 }}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
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
              <Text style={styles.noAccountText}>Don't have an account? </Text>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 25, flexGrow: 1, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0F7FF', justifyContent: 'center',
    alignItems: 'center', marginBottom: 15
  },
  bankName: { fontSize: 28, fontWeight: 'bold', color: '#011F3D' },
  tagline: { fontSize: 16, color: '#64748B', marginTop: 5 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  asterisk: { color: '#EF4444' }, 
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 15,
    height: 55, marginBottom: 5, backgroundColor: '#F8FAFC'
  },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 15, fontWeight: '600' },
  generalErrorBox: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF5F5', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#FEB2B2' 
  },
  generalErrorText: { color: '#C53030', marginLeft: 8, fontWeight: '600', fontSize: 13 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#0F172A' },
  forgotText: { color: '#003366', fontWeight: '600', fontSize: 14 },
  signInBtn: {
    backgroundColor: '#003366', height: 55, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 10,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  disabledBtn: { backgroundColor: '#94A3B8' },
  signInText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  noAccountText: { color: '#64748B', fontSize: 15 },
  signUpLinkText: { color: '#003366', fontSize: 15, fontWeight: 'bold', textDecorationLine: 'underline' },
});
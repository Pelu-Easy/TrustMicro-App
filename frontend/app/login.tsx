// app/login.tsx - COMPLETE UPDATED COPY
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
  const { updateUserData, setToken } = useUserData();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const validateEmail = (emailStr: string) => /\S+@\S+\.\S+/.test(emailStr);

  const handleContactSupport = () => {
    const supportEmail = "admin@trustmicrobank.com";
    const subject = encodeURIComponent("Account Reactivation Request");
    const body = encodeURIComponent(`Hello Admin,\n\nMy account (${email}) has been deactivated due to failed login attempts.\n\nThank you.`);
    Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`);
  };

  const handleSignIn = async () => {
    if (isLockedOut) {
      Alert.alert("Account Locked", "Please contact admin to reactivate your account.");
      return;
    }

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
      const response = await api.post('/auth/login', { 
        email: trimmedEmail.toLowerCase(), 
        password: trimmedPassword 
      });

      const { token, user } = response.data;
      
      setFailedAttempts(0);
      setIsLockedOut(false);

      const userRole = user.role?.toLowerCase() || '';
      const isUserSupervisor = 
          user.is_supervisor === true || 
          user.is_supervisor === 1 ||
          ['manager', 'supervisor', 'admin', 'super admin', 'cco', 'md', 'head of credit', 'head of control'].includes(userRole);

      setToken(token);

      updateUserData({
        isLoggedIn: true,
        role: user.role,
        funame: user.full_name, 
        email: user.email, 
        phone: user.phone_no,
        branch: user.branch,
        unit: user.unit,
        isSupervisor: isUserSupervisor,
        id: user.id, 
        lastLogin: new Date().toISOString(), 
        isLoanOfficer: user.is_loan_officer === true || user.is_loan_officer === 1 || userRole === 'credit officer'
      });

      useLoanStore.setState((state) => ({
        staffProfile: { ...state.staffProfile, funame: user.full_name, email: user.email }
      }));

      // Using replace to prevent going back to login
      if (isUserSupervisor) {
        router.replace('/(tabs)/managerDashboard');
      } else {
        router.replace('/(tabs)');
      }

    } catch (error: any) {
      const status = error.response?.status;
      if (status === 404) {
        setErrors({ general: "Account not found." });
      } else if (status === 403) {
        setIsLockedOut(true);
        setErrors({ general: "Account Deactivated." });
      } else {
        const nextAttemptCount = failedAttempts + 1;
        setFailedAttempts(nextAttemptCount);
        if (nextAttemptCount >= 3) {
          setIsLockedOut(true);
          setErrors({ general: "Account Deactivated." });
        } else {
          setErrors({ general: `Invalid credentials. ${3 - nextAttemptCount} attempts left.` });
        }
      }
    } finally {
      setIsLoading(false);
    }
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
              <View style={[styles.generalErrorBox, isLockedOut && styles.lockoutBox]}>
                <Ionicons name={isLockedOut ? "lock-closed" : "alert-circle"} size={18} color="#C53030" />
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            <Text style={styles.label}>Email Address <Text style={styles.asterisk}>*</Text></Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={(val) => { setEmail(val); setErrors({}); }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading} 
              />
            </View>

            <Text style={styles.label}>Password <Text style={styles.asterisk}>*</Text></Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={(val) => { setPassword(val); setErrors({}); }}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => !isLoading && router.push('/forgot_password')} 
              style={{ alignSelf: 'flex-end', marginBottom: 25 }}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.signInBtn, isLoading && styles.disabledBtn]} 
              onPress={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signInText}>Sign In</Text>}
            </TouchableOpacity>

            <View style={styles.signupRow}>
              <Text style={styles.noAccountText}>Don't have an account? </Text>
              <TouchableOpacity 
                onPress={() => router.push('/sign_up')} 
                disabled={isLoading}
              >
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
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  bankName: { fontSize: 28, fontWeight: 'bold', color: '#011F3D' },
  tagline: { fontSize: 16, color: '#64748B', marginTop: 5 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  asterisk: { color: '#EF4444' }, 
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 5, backgroundColor: '#F8FAFC' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  generalErrorBox: { flexDirection: 'row', backgroundColor: '#FFF5F5', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#FEB2B2' },
  lockoutBox: { borderColor: '#C53030' },
  generalErrorText: { color: '#C53030', marginLeft: 8, fontWeight: '600', fontSize: 13, flex: 1 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#0F172A' },
  forgotText: { color: '#003366', fontWeight: '600', fontSize: 14 },
  signInBtn: { backgroundColor: '#003366', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  disabledBtn: { backgroundColor: '#94A3B8' },
  signInText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  noAccountText: { color: '#64748B', fontSize: 15 },
  signUpLinkText: { color: '#003366', fontSize: 15, fontWeight: 'bold', textDecorationLine: 'underline' },
});
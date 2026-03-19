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
import api from '@/services/api'; // Using centralized api instance
import { useLoanStore } from '@/store/loanStore';
import useUserData from '@/store/userSignUp';

export default function LoginScreen() {
  const router = useRouter();
  const { updateUserData, setToken } = useUserData();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Strike tracking states
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  
  const [errors, setErrors] = useState<any>({});

  const validateEmail = (emailStr: string) => /\S+@\S+\.\S+/.test(emailStr);

  const handleContactSupport = () => {
    const supportEmail = "admin@trustmicrobank.com";
    const subject = encodeURIComponent("Account Reactivation Request");
    const body = encodeURIComponent(`Hello Admin,\n\nMy account (${email}) has been deactivated due to failed login attempts. Please assist with reactivation.\n\nThank you.`);
    Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`);
  };

  const handleSignIn = async () => {
    if (isLockedOut) return;

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
      // POST to /auth/login with credentials
      const response = await api.post('/auth/login', { 
        email: trimmedEmail.toLowerCase(), 
        password: trimmedPassword 
      });

      const { token, user } = response.data;
      
      // Reset local strikes on success
      setFailedAttempts(0);

      // --- AUTHENTICATION & ROLE LOGIC ---
      const userRole = user.role?.toLowerCase() || '';
      
      // Improved check to handle Boolean (Postgres), Numeric (MySQL fallback), and Role Strings
      const isUserSupervisor = 
          user.is_supervisor === true || 
          user.is_supervisor === 1 ||
          ['manager', 'supervisor', 'admin', 'super admin', 'cco', 'md', 'head of credit', 'head of control'].includes(userRole);

      // Save token for the API interceptor/SecureStore
      setToken(token);

      // --- INTEGRATED DATA SYNC ---
      // Update the global user store with fresh data from DB
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

      // Sync the loanStore specifically for loan application context
      useLoanStore.setState((state) => ({
        staffProfile: {
          ...state.staffProfile,
          funame: user.full_name,
        }
      }));

      setIsLoading(false);

      // Navigation based on supervisor logic
      if (isUserSupervisor) {
        router.replace('/');
      } else {
        router.replace('/(tabs)');
      }

    } catch (error: any) {
      setIsLoading(false);
      
      const status = error.response?.status;
      const errorCode = error.response?.data?.code;

      // Handle specific backend error for missing account
      if (status === 404 || errorCode === "USER_NOT_FOUND") {
        setErrors({ general: "Account not found. Please check your email or sign up." });
        return; 
      }

      // Handle backend deactivation (status 403)
      if (status === 403) {
        setIsLockedOut(true);
        setErrors({ general: error.response?.data?.error || "Account Deactivated. Contact Admin." });
        return;
      }

      // Local attempt tracking
      const nextAttemptCount = failedAttempts + 1;
      setFailedAttempts(nextAttemptCount);

      if (nextAttemptCount >= 3) {
        setIsLockedOut(true);
        setErrors({ general: "Account Deactivated: Too many failed attempts." });

        // Sync lockout with backend to deactivate account
        api.post('/auth/deactivate', { 
          email: trimmedEmail.toLowerCase()
        }).catch(err => console.error("Deactivation sync failed", err));
        
        Alert.alert(
          "Security Lockout", 
          "Your account is now deactivated due to multiple failed attempts. Please contact system admin.",
          [{ text: "Understood" }]
        );
      } else {
        const remaining = 3 - nextAttemptCount;
        setErrors({ general: `Invalid password. ${remaining} attempt(s) remaining.` });
      }
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
              <View style={[styles.generalErrorBox, isLockedOut && styles.lockoutBox]}>
                <Ionicons 
                  name={isLockedOut ? "lock-closed" : "alert-circle"} 
                  size={18} 
                  color={isLockedOut ? "#742A2A" : "#C53030"} 
                />
                <Text style={[styles.generalErrorText, isLockedOut && styles.lockoutText]}>
                  {errors.general}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Email Address <Text style={styles.asterisk}>*</Text></Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError, isLockedOut && styles.disabledInput]}>
              <Ionicons name="mail-outline" size={20} color={errors.email ? "#EF4444" : "#666"} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={updateEmailField}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLockedOut}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={styles.label}>Password <Text style={styles.asterisk}>*</Text></Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError, isLockedOut && styles.disabledInput]}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.password ? "#EF4444" : "#666"} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={updatePasswordField}
                secureTextEntry={!showPassword}
                editable={!isLockedOut}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isLockedOut}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} color="#666" 
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <TouchableOpacity 
              onPress={() => !isLockedOut && router.push('/forgot_password' as any)} 
              style={{ alignSelf: 'flex-end', marginBottom: 25 }}
              disabled={isLockedOut}
            >
              <Text style={[styles.forgotText, isLockedOut && { color: '#CBD5E1' }]}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.signInBtn, (isLoading || isLockedOut) && styles.disabledBtn]} 
              onPress={handleSignIn}
              disabled={isLoading || isLockedOut}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInText}>{isLockedOut ? "Account Locked" : "Sign In"}</Text>
              )}
            </TouchableOpacity>

            {isLockedOut && (
              <TouchableOpacity style={styles.supportLink} onPress={handleContactSupport}>
                <Text style={styles.supportLinkText}>Need help? Contact System Admin</Text>
              </TouchableOpacity>
            )}

            <View style={styles.signupRow}>
              <Text style={styles.noAccountText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/sign_up')} disabled={isLockedOut}>
                <Text style={[styles.signUpLinkText, isLockedOut && { color: '#CBD5E1' }]}>Sign Up here</Text>
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
  disabledInput: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
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
  lockoutBox: { backgroundColor: '#FFF5F5', borderColor: '#C53030', padding: 16 },
  generalErrorText: { color: '#C53030', marginLeft: 8, fontWeight: '600', fontSize: 13, flex: 1 },
  lockoutText: { color: '#742A2A', fontSize: 14 },
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
  supportLink: { marginTop: 15, alignItems: 'center' },
  supportLinkText: { color: '#003366', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
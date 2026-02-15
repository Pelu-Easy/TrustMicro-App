import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- INTEGRATION WITH YOUR UTILITY ---
import api from '@/services/api'; // Integrated your new central api utility
import useUserData from "@/store/userSignUp";

export default function SignUpScreen() {
  const router = useRouter();
  const updateUserData = useUserData((state: any) => state.updateUserData);

  const [isLoading, setIsLoading] = useState(false);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    fullName: '', 
    email: '',
    phone: '',    
    branch: 'Main Headquarters',
    password: '',
    confirmPassword: '',
    department: '',
    supervisor: '',
    unit: '',
    isLoanOfficer: false,
    isSupervisor: false,
  });

  // Fetch supervisors using the central api utility
  useEffect(() => {
    const fetchSupervisors = async () => {
      try {
        // No longer using full URL, just the endpoint
        const response = await api.get('/manager/supervisors');
        setSupervisors(response.data); 
      } catch (error) {
        console.log("Could not load supervisors", error);
      }
    };
    fetchSupervisors();
  }, []);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignUp = async () => {
    const { 
      fullName, email, phone, password, confirmPassword, branch,
      department, unit, supervisor, isSupervisor 
    } = formData;

    if (!fullName || !email || !password || !phone || !department) {
      Alert.alert("Error", "Please fill in all required fields, including department.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      // Integrated modification: Using api.post instead of axios.post
      await api.post('/auth/signup', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        branch: branch,
        password: password,
        department,
        unit,
        supervisor,
        is_supervisor: isSupervisor ? 1 : 0,
        role: isSupervisor ? 'Manager' : 'Officer'
      });
      
      setIsLoading(false);

      Alert.alert("Success", "Staff Account Created Successfully!", [
        { text: "Go to Login", onPress: () => router.replace('/login' as any) }
      ]);

    } catch (error: any) {
      setIsLoading(false);
      // Detailed error handling is now partially managed by the Interceptor, 
      // but we keep local logic for specific auth errors.
      if (error.response) {
        Alert.alert("Registration Failed", error.response.data.error || "Server error.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
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

            <Text style={styles.label}>Department</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.department}
                onValueChange={(itemValue) => updateField('department', itemValue)}
              >
                <Picker.Item label="Select Department" value="" />
                <Picker.Item label="Operations" value="operations" />
                <Picker.Item label="Sales/Marketing" value="sales" />
                <Picker.Item label="Risk Management" value="risk" />
              </Picker>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Supervisor</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.supervisor}
                    onValueChange={(v) => updateField('supervisor', v)}
                  >
                    <Picker.Item label="Select..." value="" />
                    {supervisors.map((sup: any) => (
                      <Picker.Item key={sup.email} label={sup.funame} value={sup.funame} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.unit}
                    onValueChange={(v) => updateField('unit', v)}
                  >
                    <Picker.Item label="Select..." value="" />
                    <Picker.Item label="Cashier" value="cashier" />
                    <Picker.Item label="IT" value="it" />
                    <Picker.Item label="Admin" value="admin" />
                    <Picker.Item label="Audit" value="audit" />
                    <Picker.Item label="Account" value="account" />
                    <Picker.Item label="Operation" value="operation" />
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.checkboxContainer}>
              <View style={styles.checkboxRow}>
                <Checkbox
                  value={formData.isLoanOfficer}
                  onValueChange={(v) => updateField('isLoanOfficer', v)}
                  color={formData.isLoanOfficer ? '#003366' : undefined}
                />
                <Text style={styles.checkboxLabel}>Is Loan Officer?</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  value={formData.isSupervisor}
                  onValueChange={(v) => updateField('isSupervisor', v)}
                  color={formData.isSupervisor ? '#003366' : undefined}
                />
                <Text style={styles.checkboxLabel}>Is Supervisor?</Text>
              </View>
            </View>

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
    marginTop: 10,
    marginBottom: 40
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  pickerWrapper: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E4E8',
    marginBottom: 15,
    overflow: 'hidden'
  },
  checkboxContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 10, 
    marginBottom: 30 
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxLabel: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#333' },
});
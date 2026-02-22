import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  
  // Visibility States for Passwords
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', branch: 'Main Headquarters',
    password: '', confirmPassword: '', department: '', supervisor: '',
    unit: '', isLoanOfficer: false, isSupervisor: false,
  });

  const [errors, setErrors] = useState<any>({});

  const departments = ["IT", "Finance", "Marketing", "Risk", "Hr", "Operation", "Credit", "Corporate Services", "Sales"];
  const units = ["Cashier", "Internal Control", "IT Support", "Loans", "Credit Analyst", "Admin Officer", "Customer Experience"];

  const isMarketingOrSales = formData.department === "Marketing" || formData.department === "Sales";

  useEffect(() => {
    const fetchSupervisors = async () => {
      try {
        // Calling the public endpoint established in server.js
        const response = await api.get('/manager/supervisors');
        if (response.data) {
          setSupervisors(response.data);
        }
      } catch (error) { 
        console.log("Supervisor load failed:", error); 
      }
    };
    fetchSupervisors();
  }, []);

  const updateField = (field: string, value: any) => {
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: null }));
    }
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'department' && value !== "Marketing" && value !== "Sales") {
        newData.isLoanOfficer = false;
      }
      return newData;
    });
  };

  const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const handleSignUp = async () => {
    let currentErrors: any = {};
    if (!formData.fullName.trim()) currentErrors.fullName = "Full name is required";
    if (!validateEmail(formData.email)) currentErrors.email = "Enter a valid corporate email";
    if (formData.phone.length !== 11) currentErrors.phone = "Phone must be 11 digits";
    if (!formData.department) currentErrors.department = "Please select a department";
    if (!formData.isSupervisor && !formData.supervisor) currentErrors.supervisor = "Please select a supervisor";
    if (formData.password.length < 6) currentErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) currentErrors.confirmPassword = "Passwords do not match";

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Sending payload to backend. supervisor_name is mapped to the selected supervisor's full name.
      await api.post('/auth/signup', {
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone_no: formData.phone.trim(),
        branch: formData.branch,
        password: formData.password,
        department: formData.department,
        unit: formData.unit,
        supervisor_name: formData.supervisor, 
        role: formData.isSupervisor ? 'Manager' : 'Officer',
        is_loan_officer: formData.isLoanOfficer,
        is_active: true 
      });

      setIsLoading(false);
      Alert.alert("Success", "Account created successfully!", [{ text: "Login", onPress: () => router.replace('/login') }]);
    } catch (error: any) {
      setIsLoading(false);
      const serverError = error.response?.data?.error || "Registration failed. Ensure you are connected to the server.";
      Alert.alert("Failed", serverError);
    }
  };

  const ErrorMsg = ({ name }: { name: string }) => (
    errors[name] ? <Text style={styles.errorText}>{errors[name]}</Text> : null
  );

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
              style={[styles.input, errors.fullName && styles.inputError]} 
              placeholder="John Doe" 
              value={formData.fullName} 
              onChangeText={(v) => updateField('fullName', v)} 
            />
            <ErrorMsg name="fullName" />

            <Text style={styles.label}>Email Address</Text>
            <TextInput 
              style={[styles.input, errors.email && styles.inputError]} 
              placeholder="staff@trustmicro.com" 
              keyboardType="email-address" 
              autoCapitalize="none" 
              value={formData.email} 
              onChangeText={(v) => updateField('email', v)} 
            />
            <ErrorMsg name="email" />

            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Phone</Text>
                    <TextInput 
                      style={[styles.input, errors.phone && styles.inputError]} 
                      placeholder="08012345678" 
                      keyboardType="phone-pad" 
                      maxLength={11} 
                      value={formData.phone} 
                      onChangeText={(v) => updateField('phone', v.replace(/[^0-9]/g, ''))} 
                    />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Branch</Text>
                    <TextInput style={styles.input} placeholder="Branch" value={formData.branch} onChangeText={(v) => updateField('branch', v)} />
                </View>
            </View>
            <ErrorMsg name="phone" />

            <Text style={styles.label}>Department</Text>
            <TouchableOpacity 
              style={[styles.pickerTrigger, errors.department && styles.inputError]} 
              onPress={() => setShowDeptModal(true)}
            >
              <Text style={[styles.triggerText, !formData.department && { color: '#94A3B8' }]}>
                {formData.department || "Select Department"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#003366" />
            </TouchableOpacity>
            <ErrorMsg name="department" />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Supervisor</Text>
                <TouchableOpacity 
                    style={[styles.pickerTrigger, errors.supervisor && styles.inputError]} 
                    onPress={() => setShowSupModal(true)}
                >
                  <Text style={[styles.triggerText, !formData.supervisor && { color: '#94A3B8' }]} numberOfLines={1}>
                    {formData.supervisor || "Select..."}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Unit / Role</Text>
                <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowUnitModal(true)}>
                  <Text style={[styles.triggerText, !formData.unit && { color: '#94A3B8' }]} numberOfLines={1}>
                    {formData.unit || "Select..."}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.checkboxContainer}>
              <View style={[styles.checkboxRow, !isMarketingOrSales && { opacity: 0.4 }]}>
                <Checkbox value={formData.isLoanOfficer} onValueChange={(v) => updateField('isLoanOfficer', v)} color="#003366" disabled={!isMarketingOrSales} />
                <Text style={[styles.checkboxLabel, !isMarketingOrSales && { color: '#94A3B8' }]}>Is Loan Officer?</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Checkbox value={formData.isSupervisor} onValueChange={(v) => updateField('isSupervisor', v)} color="#003366" />
                <Text style={styles.checkboxLabel}>Is Supervisor?</Text>
              </View>
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput 
                style={[styles.input, { flex: 1, paddingRight: 50 }, errors.password && styles.inputError]} 
                placeholder="••••••••" 
                secureTextEntry={!showPassword} 
                value={formData.password} 
                onChangeText={(v) => updateField('password', v)} 
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ErrorMsg name="password" />

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput 
                style={[styles.input, { flex: 1, paddingRight: 50 }, errors.confirmPassword && styles.inputError]} 
                placeholder="••••••••" 
                secureTextEntry={!showConfirmPassword} 
                value={formData.confirmPassword} 
                onChangeText={(v) => updateField('confirmPassword', v)} 
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ErrorMsg name="confirmPassword" />

            <TouchableOpacity style={styles.btn} onPress={handleSignUp} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register Account</Text>}
            </TouchableOpacity>
          </View>

          {/* MODALS */}
          <Modal visible={showDeptModal} transparent animationType="fade">
            <View style={styles.modalOverlay}><View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Department</Text>
                <FlatList data={departments} keyExtractor={(item) => item} renderItem={({ item }) => (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { updateField('department', item); setShowDeptModal(false); }}>
                      <Text style={[styles.modalItemText, formData.department === item && styles.selectedText]}>{item}</Text>
                    </TouchableOpacity>
                )} />
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDeptModal(false)}><Text style={styles.closeBtnText}>Cancel</Text></TouchableOpacity>
            </View></View>
          </Modal>

          <Modal visible={showSupModal} transparent animationType="fade">
            <View style={styles.modalOverlay}><View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Supervisor</Text>
                {supervisors.length === 0 ? (
                  <Text style={{ textAlign: 'center', marginVertical: 20, color: '#64748B' }}>No supervisors available.</Text>
                ) : (
                  <FlatList data={supervisors} keyExtractor={(_, i) => i.toString()} renderItem={({ item }) => (
                      <TouchableOpacity style={styles.modalItem} onPress={() => { updateField('supervisor', item.full_name); setShowSupModal(false); }}>
                      <Text style={[styles.modalItemText, formData.supervisor === item.full_name && styles.selectedText]}>{item.full_name}</Text>
                      </TouchableOpacity>
                  )} />
                )}
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSupModal(false)}><Text style={styles.closeBtnText}>Cancel</Text></TouchableOpacity>
            </View></View>
          </Modal>

          <Modal visible={showUnitModal} transparent animationType="fade">
            <View style={styles.modalOverlay}><View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Unit</Text>
                <FlatList data={units} keyExtractor={(item) => item} renderItem={({ item }) => (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { updateField('unit', item); setShowUnitModal(false); }}>
                      <Text style={[styles.modalItemText, formData.unit === item && styles.selectedText]}>{item}</Text>
                    </TouchableOpacity>
                )} />
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowUnitModal(false)}><Text style={styles.closeBtnText}>Cancel</Text></TouchableOpacity>
            </View></View>
          </Modal>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 25, flexGrow: 1 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#011F3D' },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 30 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 5, borderWidth: 1, borderColor: '#E2E8F0', color: '#0F172A' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 15, fontWeight: '600' },
  passwordContainer: { flexDirection: 'row', position: 'relative' },
  eyeIcon: { position: 'absolute', right: 15, top: 12, padding: 5 },
  pickerTrigger: { backgroundColor: '#F8FAFC', paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, height: 55 },
  triggerText: { fontSize: 15, color: '#0F172A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 20, maxHeight: '60%', elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#011F3D', textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#475569' },
  selectedText: { color: '#003366', fontWeight: 'bold' },
  closeBtn: { marginTop: 15, padding: 10, alignItems: 'center' },
  closeBtnText: { color: '#EF4444', fontWeight: '700' },
  btn: { backgroundColor: '#003366', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  checkboxContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxLabel: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#333' },
});
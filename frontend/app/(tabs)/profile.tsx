import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLoanStore } from '../../store/loanStore';
import { useStaffStore } from '../../store/staffStore';
import useUserData from '../../store/userSignUp';

const BRAND = { 
  primary: "#003366", 
  accent: "#2E7D32", 
  border: "#E2E8F0",
  supervisor: "#10B981", // Green for Supervisor
  officer: "#64748B"      // Grey for Officer
};

export default function Profile() {
  const { disbursementTarget, setDisbursementTarget } = useStaffStore();
  const router = useRouter();
  
  // Destructured correctly from Zustand
  const { branch, updateUserData, funame: fullName, isSupervisor, role } = useUserData();
  
  const loans = useLoanStore((state) => state.loans);
  const staff = useLoanStore((state) => state.staffProfile);

  // --- PERFORMANCE CALCULATIONS ---
  const disbursedLoans = loans.filter(l => l.status === 'Disbursed');
  
  const totalDisbursedAmount = disbursedLoans.reduce((acc, curr) => {
    const num = parseInt(curr.amount.replace(/[^0-9]/g, '')) || 0;
    return acc + num;
  }, 0);

  const progressPercentage = staff.monthlyTarget > 0 ? (totalDisbursedAmount / staff.monthlyTarget) * 100 : 0;
  const recentDisbursements = disbursedLoans.slice(0, 5);

  const downloadPerformanceReport = async () => {
    const htmlContent = `
      <html>
        <body style="font-family: 'Helvetica', sans-serif; padding: 40px; color: #333;">
          <div style="text-align: center; border-bottom: 2px solid #003366; padding-bottom: 20px;">
            <h1 style="color: #003366; margin: 0;">Performance Summary Report</h1>
            <p style="font-size: 14px; color: #666;">TrustMicro Bank - Staff Portal</p>
          </div>
          <div style="margin-top: 30px;">
            <p><strong>Officer Name:</strong> ${fullName}</p>
            <p><strong>Branch:</strong> ${branch}</p>
            <p><strong>Role:</strong> ${isSupervisor ? 'Supervisor' : 'Field Officer'}</p>
            <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <div style="background-color: #F5F7FA; padding: 20px; border-radius: 10px; margin-top: 30px;">
            <h2 style="color: #003366; font-size: 18px;">Monthly Target Progress</h2>
            <table style="width: 100%; margin-top: 10px;">
              <tr>
                <td style="padding: 10px 0;">Disbursement Target:</td>
                <td style="text-align: right;"><strong>₦${staff.monthlyTarget.toLocaleString()}</strong></td>
              </tr>
              <tr>
                <td style="padding: 10px 0;">Actual Disbursed:</td>
                <td style="text-align: right; color: #2E7D32;"><strong>₦${totalDisbursedAmount.toLocaleString()}</strong></td>
              </tr>
              <tr>
                <td style="padding: 10px 0;">Achievement Rate:</td>
                <td style="text-align: right;"><strong>${progressPercentage.toFixed(1)}%</strong></td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert("Error", "Could not generate report.");
    }
  };

  const handleShareReceipt = async (loan: any) => {
    const htmlContent = `
      <html>
        <body style="font-family: Helvetica; padding: 20px;">
          <h2 style="color: #003366;">TrustMicro Receipt</h2>
          <p><strong>Customer:</strong> ${loan.customerName}</p>
          <p><strong>Amount:</strong> ₦${Number(loan.amount.replace(/[^0-9]/g, '')).toLocaleString()}</p>
          <p><strong>Officer:</strong> ${fullName}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert("Error", "Could not generate receipt.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* --- HEADER WITH ROLE BADGE --- */}
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{fullName ? fullName.charAt(0) : 'U'}</Text>
          </View>
          <Text style={styles.staffName}>{fullName || "Staff Member"}</Text>
          
          <View style={[
            styles.badge, 
            isSupervisor ? styles.supervisorBadge : styles.officerBadge
          ]}>
            <Ionicons 
              name={isSupervisor ? "shield-checkmark" : "person"} 
              size={14} 
              color="#fff" 
            />
            <Text style={styles.badgeText}>
              {isSupervisor ? "Supervisor" : "Field Officer"}
            </Text>
          </View>

          <Text style={styles.staffRole}>{branch}</Text>
        </View>

        {/* --- PERFORMANCE TARGET CARD --- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Disbursement Target</Text>
          <View style={{ marginVertical: 10 }}>
            {/* FIXED: Changed <div> to <View> */}
            <View style={styles.targetRow}>
                <Text style={styles.targetValue}>₦{totalDisbursedAmount.toLocaleString()}</Text>
                <Text style={styles.targetGoal}>/ ₦{(staff.monthlyTarget / 1000000).toFixed(1)}M</Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(progressPercentage, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{progressPercentage.toFixed(1)}% of monthly goal reached</Text>
        </View>

        <TouchableOpacity style={styles.downloadBtn} onPress={downloadPerformanceReport}>
          <Ionicons name="cloud-download-outline" size={20} color="#FFF" />
          <Text style={styles.downloadBtnText}>Download Performance Report</Text>
        </TouchableOpacity>

        {/* --- TARGET MANAGEMENT --- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Target Management</Text>
          <View style={styles.adminRow}>
            <Ionicons name="trending-up-outline" size={20} color={BRAND.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 12, color: '#64748b' }}>Set Monthly Target (₦)</Text>
                <TextInput
                  style={styles.targetInput}
                  keyboardType="numeric"
                  defaultValue={disbursementTarget.toString()}
                  onSubmitEditing={(e) => {
                    const newTarget = parseInt(e.nativeEvent.text);
                    if (newTarget > 0) {
                      setDisbursementTarget(newTarget);
                      Alert.alert("Success", "Target updated for this profile.");
                    }
                  }}
                />
            </View>
          </View>
        </View>

        {/* --- BRANCH SETTINGS --- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Operating Branch</Text>
          <View style={styles.pickerContainer}>
            <Ionicons name="business-outline" size={20} color={BRAND.primary} style={styles.pickerIcon} />
            <Picker
                selectedValue={branch}
                style={styles.picker}
                onValueChange={(itemValue) => updateUserData({ branch: itemValue })}
              >
              <Picker.Item label="Lagos - Main Island" value="Lagos - Main Island" />
              <Picker.Item label="Abuja - Garki" value="Abuja - Garki" />
              <Picker.Item label="Port Harcourt" value="Port Harcourt" />
              <Picker.Item label="Ibadan - Ring Road" value="Ibadan - Ring Road" />
            </Picker>
          </View>
        </View>

        {/* --- LOGOUT --- */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => updateUserData({ isLoggedIn: false })}
          >
            <Ionicons name="log-out-outline" size={22} color="#C62828" />
            <Text style={[styles.menuText, { color: '#C62828' }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* --- LOAN HISTORY --- */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionLabel}>Recent Disbursements</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentDisbursements.length > 0 ? (
            recentDisbursements.map((loan) => (
              <View key={loan.id} style={styles.historyCard}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName}>{loan.customerName}</Text>
                  <Text style={styles.historyDate}>{loan.activeDate || 'Recently Disbursed'}</Text>
                </View>
                <div style={styles.historyRight}>
                  <Text style={styles.historyAmount}>₦{Number(loan.amount.replace(/[^0-9]/g, '')).toLocaleString()}</Text>
                  <TouchableOpacity onPress={() => handleShareReceipt(loan)} style={styles.shareIconButton}>
                    <Ionicons name="share-outline" size={18} color={BRAND.primary} />
                  </TouchableOpacity>
                </div>
              </View>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No disbursed loans yet.</Text>
            </View>
          )}
        </View>

        {/* --- DANGER ZONE --- */}
        <View style={[styles.section, { marginTop: 20, borderColor: '#FFCDD2', borderWidth: 1 }]}>
          <Text style={[styles.sectionLabel, { color: '#C62828' }]}>Danger Zone</Text>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => {
              Alert.alert("Clear Data", "Delete everything?", [
                { text: "Cancel" },
                { text: "Delete", style: "destructive", onPress: () => useLoanStore.getState().clearAllData() }
              ]);
            }}
          >
            <Ionicons name="trash-outline" size={22} color="#C62828" />
            <Text style={[styles.menuText, { color: '#C62828' }]}>Reset Application Data</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.versionText}>TrustMicro Portal v2.0.4</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 25 },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  avatarLarge: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#003366', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { color: '#FFF', fontSize: 36, fontWeight: 'bold' },
  staffName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  staffRole: { fontSize: 14, color: '#999', marginTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  supervisorBadge: { backgroundColor: BRAND.supervisor },
  officerBadge: { backgroundColor: BRAND.officer },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginLeft: 5, textTransform: 'uppercase' },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, marginBottom: 25 },
  cardTitle: { fontSize: 13, color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  targetRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 15, marginBottom: 15 },
  targetValue: { fontSize: 26, fontWeight: 'bold', color: '#003366' },
  targetGoal: { fontSize: 16, color: '#AAA', marginLeft: 5 },
  progressBarBg: { height: 10, backgroundColor: '#EEE', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2E7D32' },
  progressText: { fontSize: 12, color: '#888', marginTop: 10 },
  section: { backgroundColor: '#FFF', borderRadius: 15, padding: 10, marginBottom: 20 },
  sectionLabel: { fontSize: 12, color: '#AAA', marginLeft: 10, marginBottom: 5, fontWeight: 'bold' },
  pickerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5 },
  pickerIcon: { marginLeft: 5 },
  picker: { flex: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#444' },
  versionText: { textAlign: 'center', color: '#CCC', fontSize: 12, marginTop: 20 },
  downloadBtn: { backgroundColor: '#003366', flexDirection: 'row', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
  downloadBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  historySection: { marginTop: 20, paddingHorizontal: 5 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  viewAllText: { color: '#003366', fontSize: 14, fontWeight: '600' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 15, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#2E7D32' },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  historyDate: { fontSize: 12, color: '#666', marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: 'bold', color: '#2E7D32', marginRight: 10 },
  historyRight: { flexDirection: 'row', alignItems: 'center' },
  shareIconButton: { padding: 8, backgroundColor: '#E6EBF1', borderRadius: 8 },
  emptyHistory: { alignItems: 'center', padding: 20, backgroundColor: '#F5F5F5', borderRadius: 10 },
  emptyHistoryText: { color: '#999', fontSize: 13 },
  adminRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  targetInput: { fontSize: 16, fontWeight: 'bold', color: '#003366', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 5, flex: 1 },
});
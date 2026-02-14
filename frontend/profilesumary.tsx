import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import useUserData from '../store/userSignUp';

export default function ProfileSummary() {
  const router = useRouter();
  
  // Destructure all fields from the Zustand store
  const { 
    funame, 
    email, 
    phone, 
    branch, 
    department, 
    unit, 
    supervisor, 
    isLoanOfficer, 
    isSupervisor,
    logout 
  } = useUserData();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to sign out of TrustMicro?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: () => {
            logout();
            router.replace('/login');
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{funame?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{funame || 'Staff Member'}</Text>
          <Text style={styles.userRole}>
            {isSupervisor ? 'Team Supervisor' : (isLoanOfficer ? 'Loan Officer' : 'Staff Officer')}
          </Text>
        </View>

        {/* EMPLOYMENT DETAILS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employment Details</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="business" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Branch Location</Text>
              <Text style={styles.value}>{branch || 'Main Headquarters'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="layers" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Department</Text>
              <Text style={[styles.value, { textTransform: 'capitalize' }]}>
                {department || 'Not Assigned'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="people" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Unit / Team</Text>
              <Text style={[styles.value, { textTransform: 'uppercase' }]}>
                {unit || 'Standard'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-circle" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Direct Supervisor</Text>
              <Text style={styles.value}>{supervisor || 'Administrator'}</Text>
            </View>
          </View>
        </View>

        {/* CONTACT INFORMATION SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="call" size={20} color="#003366" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Phone / Staff ID</Text>
              <Text style={styles.value}>{phone}</Text>
            </View>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>TrustMicro Mobile v1.0.4</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#003366', 
    paddingTop: 20,
    paddingBottom: 40, 
    alignItems: 'center', 
    borderBottomLeftRadius: 35, 
    borderBottomRightRadius: 35 
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10
  },
  avatar: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#003366' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  userRole: { fontSize: 14, color: '#CBD5E1', marginTop: 4, fontWeight: '500' },
  section: { 
    backgroundColor: '#fff', 
    marginHorizontal: 20, 
    marginTop: 20, 
    borderRadius: 20, 
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#64748B', 
    marginBottom: 20, 
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoText: { marginLeft: 15 },
  label: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  value: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginHorizontal: 20,
    marginVertical: 30, 
    padding: 18, 
    borderRadius: 15, 
    backgroundColor: '#FFF1F1',
    borderWidth: 1, 
    borderColor: '#FEE2E2' 
  },
  logoutText: { marginLeft: 10, color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
  footerText: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, marginBottom: 30 }
});


// import React, { useState, useEffect } from 'react';
// import { 
//   View, 
//   Text, 
//   StyleSheet, 
//   TouchableOpacity, 
//   ScrollView, 
//   TextInput, 
//   Alert,
//   Platform,
//   ActivityIndicator
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
// import { useRouter } from 'expo-router';
// import axios from 'axios';

// // Import Zustand store
// import useUserData from "../store/userSignUp"; 

// // Machine IP
// const API_URL = 'http://192.168.43.60:5000/api/v1'; 

// export default function ProfileSummary() {
//   const router = useRouter();
  
//   const { funame, phone_no, email, token, setUserData } = useUserData();

//   const [isEditing, setIsEditing] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [editName, setEditName] = useState(funame);
//   const [editPhone, setEditPhone] = useState(phone_no);
//   const [editEmail, setEditEmail] = useState(email);

//   useEffect(() => {
//     setEditName(funame);
//     setEditPhone(phone_no);
//     setEditEmail(email);
//   }, [funame, phone_no, email]);

//   const handleSave = async () => {
//     if (!editName?.trim() || !editPhone?.trim() || !editEmail?.trim()) {
//       Alert.alert("Error", "All fields are required.");
//       return;
//     }

//     setIsLoading(true);
//     try {
//       // 1. Sync update to Node.js Backend
//       await axios.patch(`${API_URL}/users/update-profile`, 
//         { funame: editName, phone_no: editPhone, email: editEmail },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       // 2. Update local Zustand store
//       setUserData(editName, editPhone, editEmail);
//       setIsEditing(false);
//       Alert.alert("Success", "Staff Profile updated successfully.");
//     } catch (error: any) {
//       console.error(error);
//       Alert.alert("Error", "Failed to sync profile with server.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleCancel = () => {
//     setIsEditing(false);
//     setEditName(funame);
//     setEditPhone(phone_no);
//     setEditEmail(email);
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView 
//         contentContainerStyle={styles.scrollContent} 
//         showsVerticalScrollIndicator={false}
//       >
        
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => router.back()}>
//             <Ionicons name="arrow-back" size={24} color="#003366" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Staff Profile</Text>
//           {isLoading ? (
//             <ActivityIndicator size="small" color="#003366" />
//           ) : (
//             <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
//               <Text style={styles.editBtnText}>
//                 {isEditing ? "Save" : "Edit"}
//               </Text>
//             </TouchableOpacity>
//           )}
//         </View>

//         {/* Profile Card */}
//         <View style={styles.profileCard}>
//           <View style={styles.avatarCircle}>
//             <Text style={styles.avatarText}>
//               {funame ? funame.charAt(0).toUpperCase() : 'S'}
//             </Text>
//           </View>
//           <Text style={styles.userName}>{funame || "Staff Member"}</Text>
//           <Text style={styles.userRole}>TrustMicro Bank Network</Text>
//         </View>

//         {/* Info Section */}
//         <View style={styles.infoSection}>
//           <Text style={styles.sectionTitle}>Registration Details</Text>
          
//           <View style={styles.infoRow}>
//             <Ionicons name="person-outline" size={20} color="#003366" />
//             <View style={styles.textColumn}>
//               <Text style={styles.infoLabel}>Full Name</Text>
//               {isEditing ? (
//                 <TextInput 
//                   style={styles.editInput} 
//                   value={editName} 
//                   onChangeText={setEditName}
//                   placeholder="Enter Name"
//                 />
//               ) : (
//                 <Text style={styles.infoValue}>{funame || 'Not Set'}</Text>
//               )}
//             </View>
//           </View>

//           <View style={styles.infoRow}>
//             <Ionicons name="call-outline" size={20} color="#003366" />
//             <View style={styles.textColumn}>
//               <Text style={styles.infoLabel}>Staff ID / Phone</Text>
//               {isEditing ? (
//                 <TextInput 
//                   style={styles.editInput} 
//                   value={editPhone} 
//                   onChangeText={setEditPhone}
//                   keyboardType="phone-pad"
//                   placeholder="Enter Phone"
//                 />
//               ) : (
//                 <Text style={styles.infoValue}>{phone_no || 'Not Set'}</Text>
//               )}
//             </View>
//           </View>

//           <View style={styles.infoRow}>
//             <Ionicons name="mail-outline" size={20} color="#003366" />
//             <View style={styles.textColumn}>
//               <Text style={styles.infoLabel}>Official Email</Text>
//               {isEditing ? (
//                 <TextInput 
//                   style={styles.editInput} 
//                   value={editEmail} 
//                   onChangeText={setEditEmail}
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                   placeholder="Enter Email"
//                 />
//               ) : (
//                 <Text style={styles.infoValue}>{email || 'Not Set'}</Text>
//               )}
//             </View>
//           </View>
//         </View>

//         {/* Dashboard/Cancel Button */}
//         {isEditing ? (
//           <TouchableOpacity 
//             style={[styles.actionBtn, { backgroundColor: '#CBD5E1' }]}
//             onPress={handleCancel}
//           >
//             <Text style={[styles.actionBtnText, { color: '#334155' }]}>Cancel Editing</Text>
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity 
//             style={styles.actionBtn}
//             onPress={() => router.replace('/(tabs)')}
//           >
//             <Text style={styles.actionBtnText}>Back to Dashboard</Text>
//           </TouchableOpacity>
//         )}

//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F8FAFC' },
//   scrollContent: { padding: 25 },
//   header: { 
//     flexDirection: 'row', 
//     justifyContent: 'space-between', 
//     alignItems: 'center', 
//     marginBottom: 30 
//   },
//   headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#003366' },
//   editBtnText: { color: '#003366', fontWeight: 'bold', fontSize: 16 },
//   profileCard: { 
//     backgroundColor: '#fff', 
//     borderRadius: 20, 
//     padding: 30, 
//     alignItems: 'center', 
//     marginBottom: 25,
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   avatarCircle: { 
//     width: 80, 
//     height: 80, 
//     borderRadius: 40, 
//     backgroundColor: '#003366', 
//     justifyContent: 'center', 
//     alignItems: 'center', 
//     marginBottom: 15 
//   },
//   avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
//   userName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
//   userRole: { fontSize: 14, color: '#666', marginTop: 4 },
//   infoSection: { 
//     backgroundColor: '#fff', 
//     borderRadius: 20, 
//     padding: 20,
//     elevation: 1,
//     shadowColor: '#000',
//     shadowOpacity: 0.05,
//   },
//   sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#003366', marginBottom: 20 },
//   infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
//   textColumn: { marginLeft: 15, flex: 1 },
//   infoLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
//   infoValue: { fontSize: 16, color: '#333', fontWeight: '600' },
//   editInput: { 
//     fontSize: 16, 
//     color: '#003366', 
//     fontWeight: '600', 
//     paddingVertical: 5,
//     borderBottomWidth: 1,
//     borderBottomColor: '#003366',
//   },
//   actionBtn: { 
//     backgroundColor: '#003366', 
//     height: 55, 
//     borderRadius: 12, 
//     justifyContent: 'center', 
//     alignItems: 'center', 
//     marginTop: 30 
//   },
//   actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
// });

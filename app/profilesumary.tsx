import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';

// Import Zustand store
import useUserData from "../store/userSignUp"; 

// Machine IP
const API_URL = 'http://192.168.100.120/api/v1'; 

export default function ProfileSummary() {
  const router = useRouter();
  
  const { funame, phone_no, email, token, setUserData } = useUserData();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editName, setEditName] = useState(funame);
  const [editPhone, setEditPhone] = useState(phone_no);
  const [editEmail, setEditEmail] = useState(email);

  useEffect(() => {
    setEditName(funame);
    setEditPhone(phone_no);
    setEditEmail(email);
  }, [funame, phone_no, email]);

  const handleSave = async () => {
    if (!editName?.trim() || !editPhone?.trim() || !editEmail?.trim()) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Sync update to Node.js Backend
      await axios.patch(`${API_URL}/users/update-profile`, 
        { funame: editName, phone_no: editPhone, email: editEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 2. Update local Zustand store
      setUserData(editName, editPhone, editEmail);
      setIsEditing(false);
      Alert.alert("Success", "Staff Profile updated successfully.");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "Failed to sync profile with server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName(funame);
    setEditPhone(phone_no);
    setEditEmail(email);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#003366" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Profile</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#003366" />
          ) : (
            <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
              <Text style={styles.editBtnText}>
                {isEditing ? "Save" : "Edit"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {funame ? funame.charAt(0).toUpperCase() : 'S'}
            </Text>
          </View>
          <Text style={styles.userName}>{funame || "Staff Member"}</Text>
          <Text style={styles.userRole}>TrustMicro Bank Network</Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Registration Details</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#003366" />
            <View style={styles.textColumn}>
              <Text style={styles.infoLabel}>Full Name</Text>
              {isEditing ? (
                <TextInput 
                  style={styles.editInput} 
                  value={editName} 
                  onChangeText={setEditName}
                  placeholder="Enter Name"
                />
              ) : (
                <Text style={styles.infoValue}>{funame || 'Not Set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#003366" />
            <View style={styles.textColumn}>
              <Text style={styles.infoLabel}>Staff ID / Phone</Text>
              {isEditing ? (
                <TextInput 
                  style={styles.editInput} 
                  value={editPhone} 
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholder="Enter Phone"
                />
              ) : (
                <Text style={styles.infoValue}>{phone_no || 'Not Set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#003366" />
            <View style={styles.textColumn}>
              <Text style={styles.infoLabel}>Official Email</Text>
              {isEditing ? (
                <TextInput 
                  style={styles.editInput} 
                  value={editEmail} 
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Enter Email"
                />
              ) : (
                <Text style={styles.infoValue}>{email || 'Not Set'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Dashboard/Cancel Button */}
        {isEditing ? (
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#CBD5E1' }]}
            onPress={handleCancel}
          >
            <Text style={[styles.actionBtnText, { color: '#334155' }]}>Cancel Editing</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.actionBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 25 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 30 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#003366' },
  editBtnText: { color: '#003366', fontWeight: 'bold', fontSize: 16 },
  profileCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 30, 
    alignItems: 'center', 
    marginBottom: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#003366', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  userRole: { fontSize: 14, color: '#666', marginTop: 4 },
  infoSection: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#003366', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  textColumn: { marginLeft: 15, flex: 1 },
  infoLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, color: '#333', fontWeight: '600' },
  editInput: { 
    fontSize: 16, 
    color: '#003366', 
    fontWeight: '600', 
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#003366',
  },
  actionBtn: { 
    backgroundColor: '#003366', 
    height: 55, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 30 
  },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});


// import React, { useState } from 'react';
// import { 
//   View, 
//   Text, 
//   StyleSheet, 
//   TouchableOpacity, 
//   ScrollView, 
//   TextInput, 
//   Alert,
//   Platform 
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
// import { useRouter } from 'expo-router';

// // Import your store
// import useUserData from "./userSignUp"; 

// export default function ProfileSummary() {
//   const router = useRouter();
  
//   // Pull data and the update function from Zustand
//   const { funame, phone_no, email, setUserData } = useUserData();

//   // Local state for editing
//   const [isEditing, setIsEditing] = useState(false);
//   const [editName, setEditName] = useState(funame);
//   const [editPhone, setEditPhone] = useState(phone_no);
//   const [editEmail, setEditEmail] = useState(email);

//   const handleSave = () => {
//     if (!editName.trim() || !editPhone.trim() || !editEmail.trim()) {
//       Alert.alert("Error", "Fields cannot be empty.");
//       return;
//     }

//     // Save back to Zustand (which persists to storage)
//     setUserData(editName, editPhone, editEmail);
//     setIsEditing(false);
//     Alert.alert("Success", "Profile updated successfully!");
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => router.back()}>
//             <Ionicons name="arrow-back" size={24} color="#003366" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Staff Profile</Text>
//           <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
//             <Text style={styles.editBtnText}>{isEditing ? "Save" : "Edit"}</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Profile Card */}
//         <View style={styles.profileCard}>
//           <View style={styles.avatarCircle}>
//             <Text style={styles.avatarText}>
//               {funame ? funame.charAt(0).toUpperCase() : 'S'}
//             </Text>
//           </View>
//           <Text style={styles.userName}>{funame || "Staff Name"}</Text>
//           <Text style={styles.userRole}>TrustMicro Bank Network</Text>
//         </View>

//         {/* Info Section */}
//         <View style={styles.infoSection}>
//           <Text style={styles.sectionTitle}>Registration Details</Text>
          
//           {/* Full Name Field */}
//           <View style={styles.infoRow}>
//             <Ionicons name="person-outline" size={20} color="#003366" />
//             <View style={styles.textColumn}>
//               <Text style={styles.infoLabel}>Full Name</Text>
//               {isEditing ? (
//                 <TextInput 
//                   style={styles.editInput} 
//                   value={editName} 
//                   onChangeText={setEditName}
//                   autoFocus={true}
//                 />
//               ) : (
//                 <Text style={styles.infoValue}>{funame || 'Not Provided'}</Text>
//               )}
//             </View>
//           </View>

//           {/* Phone Field */}
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
//                 />
//               ) : (
//                 <Text style={styles.infoValue}>{phone_no || 'Not Provided'}</Text>
//               )}
//             </View>
//           </View>

//           {/* Email Field */}
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
//                 />
//               ) : (
//                 <Text style={styles.infoValue}>{email || 'Not Provided'}</Text>
//               )}
//             </View>
//           </View>
//         </View>

//         {/* Dashboard/Cancel Button */}
//         {isEditing ? (
//           <TouchableOpacity 
//             style={[styles.actionBtn, { backgroundColor: '#ccc' }]}
//             onPress={() => {
//               setIsEditing(false);
//               setEditName(funame); // Reset to original values
//             }}
//           >
//             <Text style={styles.actionBtnText}>Cancel Editing</Text>
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity 
//             style={styles.actionBtn}
//             onPress={() => router.push('./(tabs)/')}
//           >
//             <Text style={styles.actionBtnText}>Go to Dashboard</Text>
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
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOpacity: 0.05,
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
//   infoSection: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
//   sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#003366', marginBottom: 20 },
//   infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
//   textColumn: { marginLeft: 15, flex: 1 },
//   infoLabel: { fontSize: 12, color: '#999', textTransform: 'uppercase' },
//   infoValue: { fontSize: 16, color: '#333', fontWeight: '600' },
//   editInput: { 
//     fontSize: 16, 
//     color: '#003366', 
//     fontWeight: '600', 
//     paddingVertical: 2,
//     borderBottomWidth: 1,
//     borderBottomColor: '#003366',
//     ...Platform.select({ web: { outlineStyle: 'none' } })
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
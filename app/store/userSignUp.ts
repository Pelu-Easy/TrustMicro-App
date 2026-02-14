import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// 1. Define the Interface (Added 'role' so Layout can check it)
interface UserState {
  funame: string;
  email: string;
  isLoggedIn: boolean;
  phone: string;
  branch: string;
  department: string;
  unit: string;
  supervisor: string;
  role: string | null; // Added this
  token: string | null;
  isLoanOfficer: boolean;
  isSupervisor: boolean;
  
  // Actions
  updateUserData: (data: Partial<UserState>) => void;
  logout: () => void;
}

// 2. Create the store using the Interface
const useUserData = create<UserState>()(
  persist(
    (set) => ({
      // Initial State
      funame: '',
      email: '',
      isLoggedIn: false,
      phone: '',
      branch: '',
      department: '',
      unit: '',
      supervisor: '',
      role: null, // Initial role
      token: null,
      isLoanOfficer: false,
      isSupervisor: false,

      // Function to update user data
      updateUserData: (data) => set((state) => ({
        ...state,
        ...data,
      })),

      // Function to clear data on logout
      logout: () => set({
        funame: '',
        email: '',
        isLoggedIn: false, // Ensure this resets to false
        phone: '',
        branch: '',
        department: '',
        unit: '',
        supervisor: '',
        role: null,
        token: null,
        isLoanOfficer: false,
        isSupervisor: false,
      }),
    }),
    {
      name: 'trust-micro-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useUserData;


// // userSignUp.ts
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { create } from 'zustand';
// import { createJSONStorage, persist } from 'zustand/middleware';

// interface UserData {
//   funame: string;      // Changed to match ProfileSummary
//   phone_no: string;    // Added for ProfileSummary
//   email: string;
//   branch: string;
//   isLoggedIn: boolean;
//   token: string | null; // <--- ADD THIS LINE
//   role: 'Officer' | 'Manager' | 'Admin';
//   updateUserData: (data: Partial<UserData>) => void;
//   // Added this function specifically for your ProfileSummary file
//   setUserData: (name: string, phone: string, email: string) => void;
//   setBranch: (branch: string) => void;
//   clearUser: () => void;
//   isLoanOfficer: boolean;
//   isSupervisor: boolean;
//   supervisorName: string;
//   department: string;
//   unit: string;
// }

// const useUserData = create<UserData>()(
//   persist(
//     (set) => ({
//       funame: '',
//       phone_no: '',
//       email: '',
//       role: 'Officer',
//       branch: 'Main Headquarters',
//       token: null, // <--- ADD THIS LINE
//       isLoggedIn: false,

//       updateUserData: (data) => set((state) => ({ ...state, ...data })),
      
//       setUserData: (name, phone, email) => 
//         set({ funame: name, phone_no: phone, email: email }),

//       setBranch: (newBranch) => set({ branch: newBranch }),
      
//       clearUser: () => set({ 
//         funame: '', 
//         phone_no: '', 
//         email: '', 
//         branch: '', 
//         isLoggedIn: false 
//       }),
//     }),
//     {
//       name: 'user-storage',
//       storage: createJSONStorage(() => AsyncStorage),
//     }
//   )
  
// );

// export default useUserData;

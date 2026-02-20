import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// 1. Define the Interface
interface UserState {
  funame: string;
  email: string;
  isLoggedIn: boolean;
  phone: string;
  branch: string;
  setToken: (token: string | null) => void;
  department: string;
  unit: string;
  supervisor: string;
  role: string | null;
  token: string | null;
  isLoanOfficer: boolean;
  isSupervisor: boolean;
  
  // --- NEW HYDRATION FIELDS ---
  _hasHydrated: boolean; 
  setHasHydrated: (state: boolean) => void;

  // Actions
  updateUserData: (data: Partial<UserState>) => void;
  logout: () => void;
}

// 2. Create the store
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
      role: null,
      token: null,
      setToken: (newToken) => set({ token: newToken }),
      isLoanOfficer: false,
      isSupervisor: false,
      
      // --- INITIAL HYDRATION STATE ---
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      updateUserData: (data) => set((state) => ({
        ...state,
        ...data,
      })),

      logout: () => set({
        funame: '',
        email: '',
        isLoggedIn: false,
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
      // --- THIS TELLS ZUSTAND THE DATA IS LOADED FROM PHONE MEMORY ---
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      },
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

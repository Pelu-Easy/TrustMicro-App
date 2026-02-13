// userSignUp.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  funame: string;      // Changed to match ProfileSummary
  phone_no: string;    // Added for ProfileSummary
  email: string;
  branch: string;
  isLoggedIn: boolean;
  token: string | null; // <--- ADD THIS LINE
  role: 'Officer' | 'Manager' | 'Admin';
  updateUserData: (data: Partial<UserData>) => void;
  // Added this function specifically for your ProfileSummary file
  setUserData: (name: string, phone: string, email: string) => void;
  setBranch: (branch: string) => void;
  clearUser: () => void;
}

const useUserData = create<UserData>()(
  persist(
    (set) => ({
      funame: '',
      phone_no: '',
      email: '',
      role: 'Officer',
      branch: 'Main Headquarters',
      token: null, // <--- ADD THIS LINE
      isLoggedIn: false,

      updateUserData: (data) => set((state) => ({ ...state, ...data })),
      
      setUserData: (name, phone, email) => 
        set({ funame: name, phone_no: phone, email: email }),

      setBranch: (newBranch) => set({ branch: newBranch }),
      
      clearUser: () => set({ 
        funame: '', 
        phone_no: '', 
        email: '', 
        branch: '', 
        isLoggedIn: false 
      }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
  
);

export default useUserData;


// import { create } from 'zustand';
// import { persist, createJSONStorage } from 'zustand/middleware';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// interface UserData {
//   fullName: string;
//   email: string;
//   branch: string;
//   isLoggedIn: boolean;
//   updateUserData: (data: Partial<UserData>) => void;
//   setBranch: (branch: string) => void; // ADDED THIS
//   clearUser: () => void;
// }

// const useUserData = create<UserData>()(
// persist(
//     (set) => ({
//       fullName: '',
//       email: '',
//       branch: 'Lagos - Main Island', // Default branch
//       isLoggedIn: false,

//       updateUserData: (data) => set((state) => ({ ...state, ...data })),
      
//       // New action to update branch specifically
//       setBranch: (newBranch) => set({ branch: newBranch }),
//       clearUser: () => set({ fullName: '', email: '', branch: '', isLoggedIn: false }),
//     }),
//     {
//       name: 'user-storage',
//       storage: createJSONStorage(() => AsyncStorage),
//     }
//   )
// );

// export default useUserData;

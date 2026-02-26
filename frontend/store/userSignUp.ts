import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// 1. Define the Interface
interface UserState {
  funame: string;
  email: string;
  isLoggedIn: boolean; // This is the field we use for authentication status
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
      isLoanOfficer: false,
      isSupervisor: false,
      
      // --- INITIAL HYDRATION STATE ---
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setToken: (newToken) => set({ 
        token: newToken, 
        isLoggedIn: !!newToken // Automatically sets isLoggedIn to true if token exists
      }),

      updateUserData: (data) => set((state) => ({
        ...state,
        ...data,
      })),

      logout: () => {
        set({
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
        });
        // Clear storage entirely to be safe
        AsyncStorage.removeItem('trust-micro-storage');
      },
    }),
    {
      name: 'trust-micro-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      },
    }
  )
);

export default useUserData;

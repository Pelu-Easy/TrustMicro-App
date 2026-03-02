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
  
  // --- WORKFLOW SPECIFIC ROLES ---
  isCreditOfficer: boolean;
  isHeadOfCredit: boolean;
  isCCO: boolean;
  isMD: boolean;
  isFinance: boolean;
  
  // --- NEW HYDRATION FIELDS ---
  _hasHydrated: boolean; 
  setHasHydrated: (state: boolean) => void;

  // Actions
  updateUserData: (data: Partial<UserState>) => void;
  logout: () => void;
  clearUserData: () => void; // Added to match the call in useLoanStore
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

      // --- INITIAL WORKFLOW STATE ---
      isCreditOfficer: false,
      isHeadOfCredit: false,
      isCCO: false,
      isMD: false,
      isFinance: false,
      
      // --- INITIAL HYDRATION STATE ---
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setToken: (newToken) => set({ 
        token: newToken, 
        isLoggedIn: !!newToken 
      }),

      // --- IMPROVED ROLE MAPPING ACTION ---
      updateUserData: (data) => set((state) => {
        // Create the potential new state
        let newState = { ...state, ...data };

        // If the update contains a new role string, recalculate boolean flags
        if (data.role) {
          // Map the backend role string to the frontend boolean flags
          newState.isHeadOfCredit = data.role === 'HEAD_OF_CREDIT';
          newState.isCreditOfficer = data.role === 'CREDIT_OFFICER';
          newState.isCCO = data.role === 'CCO';
          newState.isMD = data.role === 'MD';
          newState.isFinance = data.role === 'FINANCE';
          // Add other role mappings here as needed
        }
        
        return newState;
      }),

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
          isCreditOfficer: false,
          isHeadOfCredit: false,
          isCCO: false,
          isMD: false,
          isFinance: false,
        });
        // Clear storage entirely to be safe
        AsyncStorage.removeItem('trust-micro-storage');
      },

      // Added clearUserData function to point to logout logic
      clearUserData: () => {
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
          isCreditOfficer: false,
          isHeadOfCredit: false,
          isCCO: false,
          isMD: false,
          isFinance: false,
        });
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
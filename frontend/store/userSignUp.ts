import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// 1. Define the Interface
interface UserState {
  id: string | number | null;   // To store Employee ID
  lastLogin: string | null;     // To store timestamp
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
  isHeadOfControl: boolean; // ADDED: New workflow role
  isCCO: boolean;
  isMD: boolean;
  isFinance: boolean;
  
  // --- HYDRATION FIELDS ---
  _hasHydrated: boolean; 
  setHasHydrated: (state: boolean) => void;

  // Actions
  updateUserData: (data: Partial<UserState>) => void;
  logout: () => void;
  clearUserData: () => void; 
}

// --- INITIAL STATE OBJECT ---
const initialState = {
  id: null,
  lastLogin: null,
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
  isHeadOfControl: false, // ADDED
  isCCO: false,
  isMD: false,
  isFinance: false,
  _hasHydrated: false,
};

// 2. Create the store
const useUserData = create<UserState>()(
  persist(
    (set) => ({
      ...initialState,
      
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
          const roleUpper = data.role.toUpperCase().replace(/\s+/g, '_');
          
          // Map the backend role string to the frontend boolean flags
          newState.isHeadOfCredit = roleUpper === 'HEAD_OF_CREDIT';
          newState.isCreditOfficer = roleUpper === 'CREDIT_OFFICER';
          newState.isHeadOfControl = roleUpper === 'HEAD_OF_CONTROL'; // ADDED
          newState.isCCO = roleUpper === 'CCO';
          newState.isMD = roleUpper === 'MD';
          newState.isFinance = roleUpper === 'FINANCE';
          
          // CRITICAL: Ensure isSupervisor is true if they hold ANY management role
          const managementRoles = [
            'HEAD_OF_CREDIT', 
            'CREDIT_OFFICER', 
            'HEAD_OF_CONTROL', // ADDED
            'CCO', 
            'MD', 
            'SUPERVISOR',
            'BRANCH_SUPERVISOR',
            'MANAGER',
            'ADMIN'
          ];
          
          if (managementRoles.includes(roleUpper)) {
            newState.isSupervisor = true;
            newState.isLoanOfficer = false; 
          } else {
            newState.isLoanOfficer = true;
            newState.isSupervisor = false;
          }
        }
        
        return newState;
      }),

      clearUserData: () => {
        // Reset in-memory state but keep hydration flag true to avoid loading loops
        set({ ...initialState, _hasHydrated: true });
        // Use Zustand persist API to clear storage
        useUserData.persist.clearStorage();
      },

      logout: () => {
        // Point to unified clear function
        useUserData.getState().clearUserData();
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
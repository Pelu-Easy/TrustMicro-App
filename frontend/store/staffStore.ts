import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface StaffState {
  disbursementTarget: number;
  savingsTarget: number;
  setDisbursementTarget: (amount: number) => void;
  setSavingsTarget: (amount: number) => void;
  // --- NEW HYDRATION FIELDS ---
  _hasHydrated: boolean; 
  setHasHydrated: (state: boolean) => void;
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      // Default values if nothing is set by admin
      disbursementTarget: 3500000, 
      savingsTarget: 20000000,
      _hasHydrated: false,

      setDisbursementTarget: (amount) => set({ disbursementTarget: amount }),
      setSavingsTarget: (amount) => set({ savingsTarget: amount }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'trustmicro-staff-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // --- UPDATE: Handle Hydration ---
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
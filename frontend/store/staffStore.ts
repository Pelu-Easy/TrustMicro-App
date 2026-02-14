import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StaffState {
  disbursementTarget: number;
  savingsTarget: number;
  setDisbursementTarget: (amount: number) => void;
  setSavingsTarget: (amount: number) => void;
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      // Default values if nothing is set by admin
      disbursementTarget: 3500000, 
      savingsTarget: 20000000,

      setDisbursementTarget: (amount) => set({ disbursementTarget: amount }),
      setSavingsTarget: (amount) => set({ savingsTarget: amount }),
    }),
    {
      name: 'trustmicro-staff-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import axios from 'axios/dist/browser/axios.cjs';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const API_URL = 'https://trustmicro-app.onrender.com/api/v1';

export interface Loan {
  id: string;
  createdByEmail: string;
  // --- ADDED FOR ACCOUNTABILITY ---
  staffName?: string;   
  branchName?: string;  
  // --------------------------------
  loanType: string; 
  title: string;
  customerName: string;
  bvn: string;
  nin: string;
  phone: string;
  address: string;
  gender: string;
  dob: string;
  submittedDate: string;
  activeDate: string;
  employerName: string;
  jobTitle: string;
  monthlyIncome: string;
  loanAmount: string; 
  amount: string;     
  repaymentCycle: string;
  nokName: string;
  nokPhone: string;
  bankName: string;
  accountNumber: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Disbursed' | 'Rejected';
  idCard: string | null;
  ninHardCopy: string | null;
  bvnHardCopy: string | null;
  employmentLetter: string | null;
  passportPhoto: string | null;
  tenure: string;          
  interestRate: string;   
  monthlyRepayment?: string;
  totalRepayment?: string;
  repaymentEndDate?: string;
}

interface LoanState {
  loans: Loan[];
  staffProfile: {
    funame: string;
    monthlyTarget: number;
  };
  setLoans: (newLoans: Loan[]) => void;
  fetchLoans: (email: string, token: string) => Promise<void>;
  addLoan: (loan: Loan, currentUserEmail: string) => Promise<void>;
  updateLoan: (id: string, updatedLoan: Loan) => void;
  setTarget: (amount: number) => void; 
  clearAllData: () => void;
}

export const useLoanStore = create<LoanState>()(
  persist(
    (set, get) => ({
      loans: [],
      staffProfile: {
        funame: "", 
        monthlyTarget: 0, 
      },

      setLoans: (newLoans) => set({ loans: newLoans }),

      fetchLoans: async (email, token) => {
        try {
          const response = await axios.get(`${API_URL}/loans?email=${email}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          set({ loans: response.data });
        } catch (error) {
          console.error("Fetch failed", error);
        }
      },

      addLoan: async (loan, currentUserEmail) => {
        const ownedLoan = { ...loan, createdByEmail: currentUserEmail };
        
        set((state) => {
            const exists = state.loans.some((l) => l.id === loan.id);
            if (exists) {
                return { loans: state.loans.map((l) => (l.id === loan.id ? ownedLoan : l)) };
            }
            return { loans: [ownedLoan, ...state.loans] };
        });

        try {
          // Note: If your backend is strict, ensure it's ready to receive 
          // staffName and branchName in the body.
          await axios.post(`${API_URL}/loans`, ownedLoan);
        } catch (error) {
          console.log("Cloud Sync Pending...");
        }
      },

      updateLoan: (id, updatedLoan) =>
        set((state) => ({
          loans: state.loans.map((loan) =>
            loan.id === id ? updatedLoan : loan
          ),
        })),

      setTarget: (amount: number) =>
        set((state) => ({
          staffProfile: { ...state.staffProfile, monthlyTarget: amount },
        })),

      clearAllData: () => set({ loans: [] }),
    }),
    {
      name: 'trustmicro-loan-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import axios from 'axios/dist/browser/axios.cjs';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import useUserData from './userSignUp'; // Imported to pull branch/name data

const API_URL = 'https://trustmicro-app.onrender.com/api/v1';

export interface Loan {
  id: string;
  createdByEmail: string;
  staffName?: string;   
  branchName?: string;  
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
          const response = await axios.get(`${API_URL}/loans?email=${email.toLowerCase().trim()}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          set({ loans: response.data });
        } catch (error) {
          console.error("Fetch failed", error);
        }
      },

      addLoan: async (loan, currentUserEmail) => {
        const userData = useUserData.getState();
        const sanitizedEmail = currentUserEmail.toLowerCase().trim();

        const ownedLoan: Loan = { 
          ...loan, 
          createdByEmail: sanitizedEmail,
          staffName: userData.funame || 'Field Officer',
          branchName: userData.branch || 'Main Branch'
        };
        
        set((state) => {
            // CHECK: Does this loan ID already exist in our local list?
            const loanIndex = state.loans.findIndex((l) => l.id === loan.id);
            
            if (loanIndex !== -1) {
                // UPDATE: Replace the old version with the new one
                const updatedLoans = [...state.loans];
                updatedLoans[loanIndex] = ownedLoan;
                return { loans: updatedLoans };
            } else {
                // INSERT: It's brand new, add it to the top
                return { loans: [ownedLoan, ...state.loans] };
            }
        });

        // 4. Sync with Backend (using PUT/PATCH for updates if your API supports it)
        try {
          // If your backend handles upserts at /loans, this is fine.
          // Otherwise, you might need a check: if (isUpdate) axios.put else axios.post
          await axios.post(`${API_URL}/loans`, ownedLoan);
          console.log("Loan successfully synced.");
        } catch (error: any) {
          console.log("Cloud Sync Failed:", error.response?.data?.message || error.message);
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
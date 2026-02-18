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
        // 1. Get additional staff info from userSignUp store
        const userData = useUserData.getState();
        
        // 2. Sanitize email to prevent Foreign Key violations (lowercase/trim)
        const sanitizedEmail = currentUserEmail.toLowerCase().trim();

        const ownedLoan: Loan = { 
          ...loan, 
          createdByEmail: sanitizedEmail,
          staffName: userData.funame || 'Field Officer',
          branchName: userData.branch || 'Main Branch'
        };
        
        // 3. Update local state immediately for responsiveness
        set((state) => {
            const exists = state.loans.some((l) => l.id === loan.id);
            if (exists) {
                return { loans: state.loans.map((l) => (l.id === loan.id ? ownedLoan : l)) };
            }
            return { loans: [ownedLoan, ...state.loans] };
        });

        // 4. Sync with Backend
        try {
          await axios.post(`${API_URL}/loans`, ownedLoan);
          console.log("Loan successfully synced to cloud.");
        } catch (error: any) {
          console.log("Cloud Sync Failed:", error.response?.data?.message || error.message);
          // If the error is still a 500 or FK error, it means the user's email 
          // in the app doesn't exist in the database 'users' table.
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
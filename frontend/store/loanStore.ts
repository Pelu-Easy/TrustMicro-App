import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../services/api'; // Use the centralized API instance
import useUserData from './userSignUp';

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
  bankStatement?: string; // This fixes the red underline
  workId?: string;
  signature?: string;
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
        if (!email || !token) {
          console.log("Fetch postponed: Missing email or token");
          return;
        }

        try {
          // Changed to use the 'api' instance
          // baseURL already includes /api/v1, so we just use /loans
          const response = await api.get(`/loans?email=${email.toLowerCase().trim()}`);
          
          const serverLoans = response.data;
          const localDrafts = get().loans.filter(l => l.status === 'Draft');
          const mergedLoans = [...localDrafts];
          
          serverLoans.forEach((sLoan: Loan) => {
            const index = mergedLoans.findIndex(l => l.id === sLoan.id);
            if (index === -1) {
              mergedLoans.push(sLoan);
            } else if (mergedLoans[index].status !== 'Draft') {
              mergedLoans[index] = sLoan;
            }
          });

          set({ loans: mergedLoans });
        } catch (error: any) {
          console.error("Fetch failed:", error.message);
        }
      },

      addLoan: async (loan, currentUserEmail) => {
        const userData = useUserData.getState();
        const sanitizedEmail = currentUserEmail.toLowerCase().trim();
        const token = userData.token;

        const ownedLoan: Loan = { 
          ...loan, 
          createdByEmail: sanitizedEmail,
          staffName: userData.funame || 'Field Officer',
          branchName: userData.branch || 'Main Branch'
        };
        
        // 1. Update Local State (Immediate UI response)
        set((state) => {
            const loanIndex = state.loans.findIndex((l) => l.id === loan.id);
            
            if (loanIndex !== -1) {
                const updatedLoans = [...state.loans];
                updatedLoans[loanIndex] = ownedLoan;
                return { loans: updatedLoans };
            } else {
                return { loans: [ownedLoan, ...state.loans] };
            }
        });

        // 2. Sync with Backend
        if (ownedLoan.status !== 'Draft') {
          if (!token) {
            console.log("Cloud Sync Aborted: No valid token found.");
            return;
          }

          try {
            // Use the 'api' instance. Interceptors handle the Auth Header automatically.
            await api.post('/loans', ownedLoan);
            console.log("Loan successfully synced.");
          } catch (error: any) {
            console.log("Cloud Sync Failed:", error.response?.data?.error || error.message);
          }
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
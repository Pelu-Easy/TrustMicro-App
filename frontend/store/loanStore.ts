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
          
          const serverLoans = response.data;

          // FIX: Preserve local drafts when fetching from server
          // We filter our current local state for 'Draft' status
          const localDrafts = get().loans.filter(l => l.status === 'Draft');
          
          // Merge local drafts with server data, avoiding duplicates
          // We use the server version if a loan exists in both (unlikely for drafts)
          const mergedLoans = [...localDrafts];
          
          serverLoans.forEach((sLoan: Loan) => {
            const index = mergedLoans.findIndex(l => l.id === sLoan.id);
            if (index === -1) {
              mergedLoans.push(sLoan);
            } else if (mergedLoans[index].status !== 'Draft') {
              // Only overwrite if the local version isn't a draft
              mergedLoans[index] = sLoan;
            }
          });

          set({ loans: mergedLoans });
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

        // 2. Sync with Backend (Only for non-drafts or if your API supports draft storage)
        if (ownedLoan.status !== 'Draft') {
          try {
            await axios.post(`${API_URL}/loans`, ownedLoan);
            console.log("Loan successfully synced.");
          } catch (error: any) {
            console.log("Cloud Sync Failed:", error.response?.data?.message || error.message);
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

      // NOTE: Be careful calling this on logout if you want drafts to stay on the device disk
      clearAllData: () => set({ loans: [] }),
    }),
    {
      name: 'trustmicro-loan-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the loans array and target, avoid persisting transient flags if added later
    }
  )
);
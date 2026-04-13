import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../services/api';
import useUserData from './userSignUp';

export interface Loan {
  id: string;
  createdByEmail: string;
  staffName?: string;   
  branchName?: string;  
  loanType: string; 
  title: string;
  customerName: string;
  firstName?: string;   // Add this
  lastName?: string;    // Add this
  middleName?: string;  // Add this while we are at it
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
  status: 'Draft' | 'Pending' | 'Approved' | 'Disbursed' | 'Rejected' | 'PENDING' | 'PENDING_CREDIT' | 'PENDING_HEAD_CREDIT' | 'PENDING_CONTROL' | 'PENDING_CCO' | 'PENDING_MD' | 'APPROVED_FINANCE';
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
  bankStatement?: string; 
  workId?: string;
  signature?: string;
  rejection_reason?: string;
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
  deleteLoan: (id: string) => void;
  setTarget: (amount: number) => void; 
  clearAllData: () => void;
  // --- NEW HYDRATION FIELDS ---
  _hasHydrated: boolean; 
  setHasHydrated: (state: boolean) => void;
}

export const useLoanStore = create<LoanState>()(
  persist(
    (set, get) => ({
      loans: [],
      staffProfile: {
        funame: "", 
        monthlyTarget: 0, 
      },
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setLoans: (newLoans) => set({ loans: newLoans }),

      fetchLoans: async (email, token) => {
        if (!email || !token) return;

        try {
          const response = await api.get(`/loans?email=${email.toLowerCase().trim()}`);
          const serverLoans = response.data;
          
          const localDrafts = get().loans.filter(l => l.status === 'Draft');
          const loanMap = new Map();
          
          localDrafts.forEach(loan => loanMap.set(loan.id, loan));
          
          serverLoans.forEach((sLoan: Loan) => {
            const existing = loanMap.get(sLoan.id);
            if (!existing || existing.status !== 'Draft') {
              loanMap.set(sLoan.id, sLoan);
            }
          });

          const mergedLoans = Array.from(loanMap.values());
          set({ loans: mergedLoans });
          
        } catch (error: any) {
          if (error.response && (error.response.status === 403 || error.response.status === 401)) {
            get().clearAllData();
            useUserData.getState().logout(); 
          }
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

        if (ownedLoan.status !== 'Draft') {
          if (!token) return;

          try {
            await api.post('/loans', ownedLoan);
            console.log("Loan successfully synced.");
          } catch (error: any) {
            if (error.response && error.response.status === 403) {
              get().clearAllData();
              useUserData.getState().logout();
            }
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

      deleteLoan: (id) =>
        set((state) => ({
          loans: state.loans.filter((loan) => loan.id !== id),
        })),

      setTarget: (amount: number) =>
        set((state) => ({
          staffProfile: { ...state.staffProfile, monthlyTarget: amount },
        })),

      clearAllData: () => {
        set({ loans: [] });
        useLoanStore.persist.clearStorage();
      },
    }),
    {
      name: 'trustmicro-loan-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // --- CRITICAL PERSISTENCE OPTIMIZATION ---
      partialize: (state) => ({
        loans: state.loans.map(loan => {
          // If it's a Draft, we only store the URI (path) and meta-data
          // We NEVER store actual large binary/base64 data here.
          return {
            ...loan,
            idCard: typeof loan.idCard === 'string' && loan.idCard.startsWith('http') ? loan.idCard : null,
            signature: typeof loan.signature === 'string' && loan.signature.startsWith('http') ? loan.signature : null,
            passportPhoto: typeof loan.passportPhoto === 'string' && loan.passportPhoto.startsWith('http') ? loan.passportPhoto : null,
            bankStatement: typeof loan.bankStatement === 'string' && loan.bankStatement.startsWith('http') ? loan.bankStatement : null,
            ninHardCopy: typeof loan.ninHardCopy === 'string' && loan.ninHardCopy.startsWith('http') ? loan.ninHardCopy : null,
            bvnHardCopy: typeof loan.bvnHardCopy === 'string' && loan.bvnHardCopy.startsWith('http') ? loan.bvnHardCopy : null,
            employmentLetter: typeof loan.employmentLetter === 'string' && loan.employmentLetter.startsWith('http') ? loan.employmentLetter : null,
            workId: typeof loan.workId === 'string' && loan.workId.startsWith('http') ? loan.workId : null,
          };
        }),
        staffProfile: state.staffProfile,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
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
  firstName?: string;   
  lastName?: string;    
  middleName?: string;  
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

  // --- CAMELCASE FIELDS FOR CONSISTENCY ---
  stateOfOrigin?: string;
  residentialLga?: string;
  fullAddress?: string;
  residentialStatus?: string;
  nearestLandmark?: string;
  dateMovedIn?: string;
  approvedBusinessLocation?: string;
  employerBranchName?: string;
  employerState?: string;
  employerLga?: string;
  employerAddress?: string;
  staffId?: string;
  jobRole?: string;
  employmentType?: string;
  dateOfEmployment?: string;
  salaryRange?: string;
  annualIncome?: string;
  nextOfKinName?: string;
  nextOfKinRelationship?: string;
  nok1Dob?: string;
  nextOfKinPhone?: string;
  nextOfKinAddress?: string;
  nok1State?: string;
  nok1Lga?: string;
  bank_name?: string; // Kept for legacy if needed, but components now use bankName
  account_number?: string;
  accountType?: string;
  idImageUrl?: string;
  utilityBillUrl?: string;
  signatureUrl?: string;
  passportImageUrl?: string;
  hasAcceptedTerms?: boolean;

  // Snake case aliases for safety during transition
  state_of_origin?: string;
  residential_lga?: string;
  full_address?: string;
  residential_status?: string;
  employer_state?: string;
  employer_lga?: string;
  employer_address?: string;
  employment_type?: string;
  salary_range?: string;
  annual_income?: string;
  next_of_kin_name?: string;
  next_of_kin_relationship?: string;
  next_of_kin_phone?: string;
  next_of_kin_address?: string;
  nok1_state?: string;
  nok1_lga?: string;
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
            console.warn("Access issue (403/401). Clearing session...");
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
              console.warn("Cloud Sync Forbidden. Clearing session...");
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
      partialize: (state) => ({
        loans: state.loans.map(loan => {
          // FIX: Allow local file URIs (starting with 'file' or 'content') to persist
          const isValidUri = (uri: any) => 
            typeof uri === 'string' && (uri.startsWith('http') || uri.startsWith('file') || uri.startsWith('content'));

          return {
            ...loan,
            idCard: isValidUri(loan.idCard) ? loan.idCard : null,
            signature: isValidUri(loan.signature) ? loan.signature : null,
            passportPhoto: isValidUri(loan.passportPhoto) ? loan.passportPhoto : null,
            bankStatement: isValidUri(loan.bankStatement) ? loan.bankStatement : null,
            ninHardCopy: isValidUri(loan.ninHardCopy) ? loan.ninHardCopy : null,
            bvnHardCopy: isValidUri(loan.bvnHardCopy) ? loan.bvnHardCopy : null,
            employmentLetter: isValidUri(loan.employmentLetter) ? loan.employmentLetter : null,
            workId: isValidUri(loan.workId) ? loan.workId : null,
            // Also persist the new Image URL fields
            idImageUrl: isValidUri(loan.idImageUrl) ? loan.idImageUrl : null,
            utilityBillUrl: isValidUri(loan.utilityBillUrl) ? loan.utilityBillUrl : null,
            signatureUrl: isValidUri(loan.signatureUrl) ? loan.signatureUrl : null,
            passportImageUrl: isValidUri(loan.passportImageUrl) ? loan.passportImageUrl : null,
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
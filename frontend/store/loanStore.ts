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

  // --- NEW FIELDS ADDED ---
  monthIncome?: string;
  ninImageURL?: string | null;
  statementURL?: string | null;
  assignedCreditStaffId?: string;
  parentLoanId?: string | null;

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
  bank_name?: string; 
  account_number?: string;
  accountType?: string;
  idImageUrl?: string;
  utilityBillUrl?: string;
  signatureUrl?: string;
  passportImageUrl?: string;
  hasAcceptedTerms?: boolean;

  // ADDED THESE TO FIX TYPESCRIPT ERRORS
  ninImageUrl?: string | null;
  statementUrl?: string | null;
  workIdUrl?: string | null;
  supervisor_name?: string;

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
  updateLoan: (id: string, updatedLoan: Loan) => Promise<void>;
  deleteLoan: (id: string) => void;
  setTarget: (amount: number) => void; 
  clearAllData: () => void;
  _hasHydrated: boolean; 
  setHasHydrated: (state: boolean) => void;
  getFilteredLoans: () => Loan[]; 
}

const sanitizeLoanUris = (loan: Loan): Loan => {
  const isValidUri = (uri: any) => 
    typeof uri === 'string' && (uri.startsWith('http') || uri.startsWith('file') || uri.startsWith('content'));

  return {
    ...loan,
    idCard: isValidUri(loan.idCard) ? loan.idCard : null,
    signature: isValidUri(loan.signature) ? loan.signature : undefined,
    passportPhoto: isValidUri(loan.passportPhoto) ? loan.passportPhoto : null,
    bankStatement: isValidUri(loan.bankStatement) ? loan.bankStatement : undefined,
    ninHardCopy: isValidUri(loan.ninHardCopy) ? loan.ninHardCopy : null,
    bvnHardCopy: isValidUri(loan.bvnHardCopy) ? loan.bvnHardCopy : null,
    employmentLetter: isValidUri(loan.employmentLetter) ? loan.employmentLetter : null,
    workId: isValidUri(loan.workId) ? loan.workId : undefined,
    idImageUrl: isValidUri(loan.idImageUrl) ? loan.idImageUrl : undefined,
    utilityBillUrl: isValidUri(loan.utilityBillUrl) ? loan.utilityBillUrl : undefined,
    signatureUrl: isValidUri(loan.signatureUrl) ? loan.signatureUrl : undefined,
    passportImageUrl: isValidUri(loan.passportImageUrl) ? loan.passportImageUrl : undefined,
    ninImageURL: isValidUri(loan.ninImageURL) ? loan.ninImageURL : null,
    statementURL: isValidUri(loan.statementURL) ? loan.statementURL : null,
  };
};

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

      getFilteredLoans: () => {
        const state = get();
        const userData = useUserData.getState() as any;
        const role = userData.role?.toUpperCase();
        const userEmail = userData.email?.toLowerCase().trim();

        if (role === 'MANAGER' || role === 'SUPERVISOR' || role === 'HEAD_MARKETING') {
          return state.loans;
        }

        return state.loans.filter(loan => 
          loan.createdByEmail?.toLowerCase().trim() === userEmail
        );
      },

      fetchLoans: async (email, token) => {
        if (!email || !token) return;

        try {
          const response = await api.get(`/loans?email=${email.toLowerCase().trim()}`);
          const serverLoans = response.data;
          
          const localDrafts = get().loans.filter(l => (l.status as string) === 'Draft');
          const loanMap = new Map();
          
          localDrafts.forEach(loan => loanMap.set(loan.id, loan));
          
          serverLoans.forEach((sLoan: Loan) => {
            const existing = loanMap.get(sLoan.id);
            if (!existing || (existing.status as string) !== 'Draft') {
              loanMap.set(sLoan.id, sLoan);
            }
          });

          const mergedLoans = Array.from(loanMap.values());
          set({ loans: mergedLoans });
          
        } catch (error: any) {
          if (error.response) {
            if (error.response.status === 401) {
              console.warn("Unauthorized (401). Clearing session...");
              get().clearAllData();
              useUserData.getState().logout();
            } else if (error.response.status === 403) {
              console.warn(`Forbidden (403). Backend check required for: ${email}`);
            }
          }
          console.error("Fetch failed:", error.message);
        }
      },

      addLoan: async (loan, currentUserEmail) => {
        const userData = useUserData.getState() as any; 
        
        const activeEmail = (currentUserEmail || userData.email || "").toLowerCase().trim();
        
        const validCustomerName = (loan.customerName && !loan.customerName.includes("undefined"))
          ? loan.customerName 
          : [loan.firstName, loan.middleName, loan.lastName]
              .filter(name => name && name !== "undefined" && name.trim() !== "")
              .join(" ") 
              || "New Customer";

        const activeStaffName = userData.funame || 
                                userData.fullName || 
                                (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : '') || 
                                'Field Officer';

        const ownedLoan: Loan = sanitizeLoanUris({ 
          ...loan, 
          createdByEmail: activeEmail,
          customerName: validCustomerName,
          staffName: activeStaffName,
          branchName: userData.branch || 'Main Branch'
        });
        
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

        if ((ownedLoan.status as string) !== 'Draft') {
          const token = userData.token;
          if (!token) return;

          try {
            const payload = {
              ...ownedLoan,
              status: ownedLoan.status.toUpperCase(), 
              ninImageUrl: ownedLoan.ninImageUrl || ownedLoan.ninImageURL,
              statementUrl: ownedLoan.statementUrl || ownedLoan.statementURL || ownedLoan.bankStatement,
              signatureUrl: ownedLoan.signatureUrl || ownedLoan.signature,
              passportImageUrl: ownedLoan.passportImageUrl || ownedLoan.passportPhoto,
              workIdUrl: ownedLoan.workIdUrl || ownedLoan.workId
            };
            await api.post('/loans', payload);
            console.log("Loan successfully synced with email:", activeEmail);
          } catch (error: any) {
            console.log("Cloud Sync Failed:", error.response?.data?.error || error.message);
          }
        }
      },

      updateLoan: async (id, updatedLoan) => {
        const sanitizedLoan = sanitizeLoanUris(updatedLoan);

        set((state) => ({
          loans: state.loans.map((loan) =>
            loan.id === id ? sanitizedLoan : loan
          ),
        }));

        if ((sanitizedLoan.status as string) !== 'Draft') {
          const userData = useUserData.getState();
          try {
            const normalizedStatus = sanitizedLoan.status.toUpperCase();
            
            const payload = {
              ...sanitizedLoan,
              status: normalizedStatus,
              createdByEmail: sanitizedLoan.createdByEmail || userData.email,
              ninImageUrl: sanitizedLoan.ninImageUrl || sanitizedLoan.ninImageURL,
              statementUrl: sanitizedLoan.statementUrl || sanitizedLoan.statementURL || sanitizedLoan.bankStatement,
              signatureUrl: sanitizedLoan.signatureUrl || sanitizedLoan.signature,
              passportImageUrl: sanitizedLoan.passportImageUrl || sanitizedLoan.passportPhoto,
              workIdUrl: sanitizedLoan.workIdUrl || sanitizedLoan.workId,
              supervisorName: (sanitizedLoan as any).supervisorName || sanitizedLoan.supervisor_name
            };

            console.log(`Attempting cloud sync for loan ${id} with status: ${normalizedStatus}`);
            const response = await api.post('/loans', payload);
            
            if (response.status === 200 || response.status === 201) {
              console.log("Cloud Sync Success: Loan saved to Supabase.");
            }
          } catch (error: any) {
            console.error("Cloud Sync Error:", error.response?.data || error.message);
            throw error;
          }
        }
      },

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
        loans: state.loans,
        staffProfile: state.staffProfile,
      }),
      // Self-healing recovery listener handling bad storage items perfectly
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Storage rehydration failed due to historical file corruption. Resetting local cache...", error);
          AsyncStorage.removeItem('trustmicro-loan-storage').catch(() => {});
          setTimeout(() => {
            useLoanStore.setState({ loans: [], _hasHydrated: true });
          }, 50);
        } else if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
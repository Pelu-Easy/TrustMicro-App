import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import axios from 'axios/dist/browser/axios.cjs';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const API_URL = 'https://trustmicro-app.onrender.com/api/v1'; // FIX: Ensure Port is here

export interface Loan {
  id: string;
  createdByEmail: string;
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
  // FIX: Added setLoans to the interface
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

      // FIX: Added the implementation for setLoans
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



// import { create } from 'zustand';
// import { persist, createJSONStorage } from 'zustand/middleware';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';

// // API Configuration - Replace with your actual server URL
// const API_URL = 'http://192.168.100.120';

// export interface Loan {
//   id: string;
//   createdByEmail: string;
//   loanType: string; 
//   customerName: string;
//   bvn: string;
//   amount: string;     
//   status: 'Draft' | 'Pending' | 'Approved' | 'Disbursed' | 'Rejected';
//   // ... other fields remain as defined in your previous version
// }

// interface LoanState {
//   loans: Loan[];
//   staffProfile: {
//     funame: string;
//     monthlyTarget: number; // No longer hard-coded to a value
//   };
//   fetchLoans: (email: string) => Promise<void>;
//   addLoan: (loan: Loan, currentUserEmail: string) => Promise<void>;
//   setTarget: (amount: number) => void; 
//   clearAllData: () => void;
// }

// export const useLoanStore = create<LoanState>()(
//   persist(
//     (set, get) => ({
//       loans: [],
//       // Initialize with a default, but it will be overwritten by admin input or storage
//       staffProfile: {
//         funame: "", 
//         monthlyTarget: 0, 
//       },

//       // Fetch user-specific loans from server (Isolation: User A cannot see User B)
//       fetchLoans: async (email: string) => {
//         try {
//           const response = await axios.get(`${API_URL}/loans?email=${email}`);
//           set({ loans: response.data });
//         } catch (error) {
//           console.error("Fetch failed, using local cache", error);
//         }
//       },

//       addLoan: async (loan, currentUserEmail) => {
//         const ownedLoan = { ...loan, createdByEmail: currentUserEmail };
//         set((state) => ({ loans: [ownedLoan, ...state.loans] }));

//         try {
//           await axios.post(`${API_URL}/loans`, ownedLoan);
//         } catch (error) {
//           console.log("Cloud Sync Pending...");
//         }
//       },

//       // Admin or User updates the target here
//       setTarget: (amount: number) =>
//         set((state) => ({
//           staffProfile: { ...state.staffProfile, monthlyTarget: amount },
//         })),

//       clearAllData: () => {
//         set({ loans: [] });
//       },
//     }),
//     {
//       name: 'trustmicro-loan-storage',
//       storage: createJSONStorage(() => AsyncStorage),
//     }
//   )
// );




// import { create } from 'zustand';
// import { persist, createJSONStorage } from 'zustand/middleware';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// // 1. DATA INTERFACE
// export interface Loan {
//   id: string;
//   createdByEmail: string; // This is the key for multi-user separation
//   loanType: string; 
//   title: string;
//   customerName: string;
//   bvn: string;
//   nin: string;
//   phone: string;
//   address: string;
//   gender: string;
//   dob: string;
//   submittedDate: string;
//   activeDate: string;
//   employerName: string;
//   jobTitle: string;
//   monthlyIncome: string;
//   loanAmount: string; 
//   amount: string;     
//   repaymentCycle: string;
//   nokName: string;
//   nokPhone: string;
//   bankName: string;
//   accountNumber: string;
//   status: 'Draft' | 'Pending' | 'Approved' | 'Disbursed' | 'Rejected';
//   idCard: string | null;
//   ninHardCopy: string | null;
//   bvnHardCopy: string | null;
//   employmentLetter: string | null;
//   passportPhoto: string | null;
//   tenure: string;          
//   interestRate: string;   
//   monthlyRepayment?: string;
//   totalRepayment?: string;
//   repaymentEndDate?: string;
// }

// // 2. STATE INTERFACE
// interface LoanState {
//   loans: Loan[];
//   staffProfile: {
//     funame: string;
//     monthlyTarget: number;
//   };
//   // Modified addLoan to require the current user's email
//   addLoan: (loan: Loan, currentUserEmail: string) => void;
//   updateLoanStatus: (id: string, newStatus: Loan['status']) => void;
//   deleteLoan: (id: string) => void;
//   updateLoan: (id: string, updatedLoan: Loan) => void;
//   setTarget: (amount: number) => void; 
//   clearAllData: () => void;
// }

// // 3. THE STORE IMPLEMENTATION
// export const useLoanStore = create<LoanState>()(
//   persist(
//     (set) => ({
//       loans: [],
//       staffProfile: {
//         funame: "", 
//         monthlyTarget: 10000000, 
//       },

//       addLoan: (loan, currentUserEmail) => 
//         set((state) => {
//           // Force the loan to be owned by the current logged-in user
//           const ownedLoan = { ...loan, createdByEmail: currentUserEmail };
          
//           const exists = state.loans.some((l) => l.id === loan.id);
//           if (exists) {
//             return {
//               loans: state.loans.map((l) => (l.id === loan.id ? ownedLoan : l)),
//             };
//           }
//           return { loans: [ownedLoan, ...state.loans] };
//         }),

//       updateLoan: (id, updatedLoan) =>
//         set((state) => ({
//           loans: state.loans.map((loan) =>
//             loan.id === id ? updatedLoan : loan
//           ),
//         })),

//       updateLoanStatus: (id, newStatus) =>
//         set((state) => ({
//           loans: state.loans.map((loan) =>
//             loan.id === id ? { ...loan, status: newStatus } : loan
//           ),
//         })),

//       deleteLoan: (id) =>
//         set((state) => ({
//           loans: state.loans.filter((loan) => loan.id !== id),
//         })),

//       setTarget: (amount) =>
//         set((state) => ({
//           staffProfile: { ...state.staffProfile, monthlyTarget: amount },
//         })),

//       clearAllData: () => {
//         set({ loans: [] });
//       },
//     }),
//     {
//       name: 'trustmicro-loan-storage',
//       storage: createJSONStorage(() => AsyncStorage),
//     }
//   )
// );
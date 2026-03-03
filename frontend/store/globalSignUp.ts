import { router } from 'expo-router';
import { create } from 'zustand';

// 1. Define the Interface
interface SignUpState {
  isSignUp: boolean;
  sign_up: () => void;
  signedUp: () => void;
}

// 2. Implementation
const useSignUpStore = create<SignUpState>((set) => ({
  isSignUp: false,
  
  sign_up: () => {
    set({ isSignUp: true });
    
    // FIX: Remove 'as any' to rely on TypeScript route checking.
    // Ensure '/profilesumary' exists in your app directory.
    router.push('/profilesumary');
  },
  
  signedUp: () => set({ isSignUp: false }),
}));

export default useSignUpStore;
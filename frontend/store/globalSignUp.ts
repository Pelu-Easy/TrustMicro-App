//import { router } from 'expo-router';
import { router } from 'expo-router';
import { create } from 'zustand';

// 1. Define the Interface to clear TypeScript "implicit any" errors
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
        
        // FIX: Use absolute path '/' to ensure Expo Router finds the screen 
        // regardless of where this store file is located.
        router.push('/profilesumary' as any);
    },
    
    signedUp: () => set({ isSignUp: false }),
}));

export default useSignUpStore;

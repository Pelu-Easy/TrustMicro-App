// @ts-ignore
import { AxiosStatic } from 'axios';
import axiosImport from 'axios/dist/browser/axios.cjs';
import { Alert } from 'react-native';
import useUserData from '../store/userSignUp';

// Use the imported version as the Axios static instance
const axios = axiosImport as AxiosStatic;

export const API_URL = 'https://trustmicro-app.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_URL,
  // --- UPDATED: Increased timeout for slower connections ---
  timeout: 30000, 
});

// --- 1. REQUEST INTERCEPTOR (Attaches the Token) ---
api.interceptors.request.use(
  async (config: any) => {
    const { token } = useUserData.getState();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- 2. RESPONSE INTERCEPTOR (Handles Errors & Logging) ---
api.interceptors.response.use(
  (response) => response,
  (error: any) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthRequest = originalRequest?.url?.includes('/auth/');

    // Log errors for debugging (except common auth ones)
    if (status !== 401 && status !== 403) {
      console.group('🚨 TrustMicro API Error');
      console.log('URL:', originalRequest?.url);
      console.log('Status:', status);
      console.log('Code:', error.code); // Added code for debugging timeouts
      console.groupEnd();
    }

    // --- HANDLE 401: UNAUTHORIZED (Token Expired/Invalid) ---
    if (status === 401) {
      if (!isAuthRequest) {
        const { logout } = useUserData.getState();
        console.warn("Session expired (401), clearing user data...");
        logout(); 
        
        if (originalRequest?.url !== '/users/me') {
          Alert.alert(
            "Session Expired", 
            "Your security token is invalid or expired. Please login again.",
            [{ text: "OK" }]
          );
        }
      }
      return Promise.reject(error);
    }

    // --- HANDLE 403: FORBIDDEN (Expired Token or No Permission) ---
    if (status === 403) {
      const { logout } = useUserData.getState();
      
      // If the error comes from a general data fetch, it's likely an expired token
      if (!isAuthRequest) {
        console.warn("Forbidden/Expired (403), logging out...");
        logout();
        Alert.alert(
          "Session Expired",
          "Your session has timed out for security. Please login again.",
          [{ text: "OK" }]
        );
      } else {
        // If it happens during an active session on a specific restricted route
        Alert.alert(
          "Permission Denied",
          "You do not have the required role to access this feature.",
          [{ text: "Back" }]
        );
      }
      return Promise.reject(error);
    }

    // --- HANDLE OTHER ERRORS ---
    let errorMessage = "A network error occurred. Please check your internet connection.";
    
    // --- UPDATED: Specific handling for SocketTimeoutException ---
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = "The server is taking too long to respond. Please try again.";
    } else if (error.response) {
      errorMessage = error.response.data?.error || error.response.data?.message || "A server error occurred.";
    }

    // Don't show generic alert for Auth requests as they handle their own UI
    if (!isAuthRequest) {
        Alert.alert("Request Failed", errorMessage);
    }

    return Promise.reject(error);
  }
);

export default api;
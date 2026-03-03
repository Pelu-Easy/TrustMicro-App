import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Alert } from 'react-native';
import useUserData from '../store/userSignUp';

// API Configuration
export const API_URL = 'https://trustmicro-app.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_URL,
  // --- UPDATED: Increased timeout for slower connections ---
  timeout: 30000, 
});

// --- 1. REQUEST INTERCEPTOR (Attaches the Token) ---
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
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
  (error: AxiosError<any>) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    
    // Check if it's an auth request based on URL
    const isAuthRequest = originalRequest?.url?.includes('/auth/');

    // Log errors for debugging (except common auth ones)
    if (status !== 401 && status !== 403) {
      console.group('🚨 TrustMicro API Error');
      console.log('URL:', originalRequest?.url);
      console.log('Status:', status);
      console.log('Code:', error.code); 
      console.groupEnd();
    }

    // --- HANDLE SESSION ISSUES (401/403) ---
    if (status === 401 || status === 403) {
      if (!isAuthRequest) {
        const { logout } = useUserData.getState();
        console.warn(`Session issue (${status}), clearing user data...`);
        logout(); 
        
        if (originalRequest?.url !== '/users/me') {
          Alert.alert(
            "Session Expired", 
            status === 401 
              ? "Your security token is invalid or expired. Please login again."
              : "Your session has timed out for security. Please login again.",
            [{ text: "OK" }]
          );
        }
      } else if (status === 403) {
        // Forbidden during an active auth flow (e.g., login/signup)
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
    
    // --- Specific handling for timeouts ---
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
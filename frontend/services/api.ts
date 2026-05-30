import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Alert } from 'react-native';
import useUserData from '../store/userSignUp';

// API Configuration - Set to local IP for development
// IMPORTANT: Ensure this matches the "Network" IP shown in your terminal when starting the backend
export const API_URL = 'http://192.168.43.173:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  // --- TIMEOUT: Set to 30s to allow for heavy management/audit report generation ---
  timeout: 30000, 
});

// --- 1. REQUEST INTERCEPTOR (Attaches the Token) ---
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Retrieves token from the global store (Zustand)
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
    
    // Check if it's an auth request based on URL (login, signup, etc)
    const isAuthRequest = originalRequest?.url?.includes('/auth/');

    // Log errors for debugging
    if (status !== 401) {
      console.group('🚨 TrustMicro API Error');
      console.log('URL:', originalRequest?.url);
      console.log('Status:', status);
      console.log('Server Message:', error.response?.data?.message || error.response?.data?.error);
      console.groupEnd();
    }

    // --- CRITICAL: If this is a login/signup attempt, bypass interceptor logic ---
    // This ensures the catch block in login.tsx gets the error immediately.
    if (isAuthRequest) {
      // Extract the real server error message if available before rejecting
      if (error.response?.data) {
        error.message = error.response.data.error || error.response.data.message || error.message;
      }
      return Promise.reject(error);
    }

    // --- HANDLE SESSION ISSUES (401/403) for Authenticated Requests ---
    if (status === 401) {
      const { logout } = useUserData.getState();
      console.warn(`Session Expired (401). Clearing session...`);
      
      if (originalRequest?.url !== '/users/me') {
        Alert.alert("Session Expired", "Your security token is invalid or expired. Please login again.", [
          { text: "OK", onPress: () => logout() }
        ]);
      } else {
        logout();
      }
      return Promise.reject(error);
    } 

    if (status === 403) {
      const { role } = useUserData.getState();
      console.warn(`Access Denied (403) for role: ${role}.`);
      Alert.alert(
        "Access Denied", 
        `Your account (${role}) does not have permission to view this specific data.`
      );
      return Promise.reject(error);
    }

    // --- HANDLE OTHER NETWORK ERRORS ---
    let errorMessage = "A network error occurred. Please check your internet connection.";
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = "The server is taking too long to respond. Please try again.";
    } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      errorMessage = `Cannot connect to server. Ensure your backend is running at ${API_URL.replace('/api/v1', '')}`;
    } else if (error.response) {
      errorMessage = error.response.data?.error || error.response.data?.message || "A server error occurred.";
    }

    // Only show global alerts for non-auth requests
    Alert.alert("Request Failed", errorMessage);

    return Promise.reject(error);
  }
);

export default api;


// import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
// import { Alert } from 'react-native';
// import useUserData from '../store/userSignUp';

// // API Configuration - Standardized to the TrustMicro Bank production/staging endpoint
// export const API_URL = 'https://trustmicro-app.onrender.com/api/v1';

// const api = axios.create({
//   baseURL: API_URL,
//   // --- TIMEOUT: Set to 30s to allow for heavy management/audit report generation ---
//   timeout: 30000, 
// });

// // --- 1. REQUEST INTERCEPTOR (Attaches the Token) ---
// api.interceptors.request.use(
//   async (config: InternalAxiosRequestConfig) => {
//     // Retrieves token from the global store (Zustand)
//     const { token } = useUserData.getState();
//     if (token && config.headers) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // --- 2. RESPONSE INTERCEPTOR (Handles Errors & Logging) ---
// api.interceptors.response.use(
//   (response) => response,
//   (error: AxiosError<any>) => {
//     const originalRequest = error.config;
//     const status = error.response?.status;
    
//     // Check if it's an auth request based on URL
//     const isAuthRequest = originalRequest?.url?.includes('/auth/');

//     // Log errors for debugging (except common auth ones)
//     if (status !== 401 && status !== 403) {
//       console.group('🚨 TrustMicro API Error');
//       console.log('URL:', originalRequest?.url);
//       console.log('Status:', status);
//       console.log('Code:', error.code); 
//       console.groupEnd();
//     }

//     // --- HANDLE SESSION ISSUES (401/403) ---
//     // 401: Unauthorized (Token expired/Invalid)
//     // 403: Forbidden (Role permission issue - critical for Head of Control)
//     if (status === 401 || status === 403) {
//       if (!isAuthRequest) {
//         const { logout, role } = useUserData.getState();
//         console.warn(`Access issue (${status}) for role: ${role}. Clearing session...`);
        
//         // Clear global state and redirect logic trigger
//         logout(); 
        
//         if (originalRequest?.url !== '/users/me') {
//           const alertTitle = status === 401 ? "Session Expired" : "Access Revoked";
//           const alertMsg = status === 401 
//             ? "Your security token is invalid or expired. Please login again."
//             : "Your permissions have been updated or your session timed out. Please login again.";

//           Alert.alert(alertTitle, alertMsg, [{ text: "OK" }]);
//         }
//       } else if (status === 403) {
//         // Forbidden during an active login/signup attempt
//         Alert.alert(
//           "Permission Denied",
//           "You do not have the required administrative role to access this feature.",
//           [{ text: "Back" }]
//         );
//       }
//       return Promise.reject(error);
//     }

//     // --- HANDLE OTHER ERRORS ---
//     let errorMessage = "A network error occurred. Please check your internet connection.";
    
//     // --- Specific handling for timeouts and network refusals ---
//     if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
//       errorMessage = "The server is taking too long to respond. This may happen during large data audits. Please try again.";
//     } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
//       errorMessage = "Cannot connect to server. The banking system may be undergoing maintenance. Please try again in 30 seconds.";
//     } else if (error.response) {
//       // Backend-specific error messages
//       errorMessage = error.response.data?.error || error.response.data?.message || "A server error occurred.";
//     }

//     // Don't show generic alert for Auth requests as Login/Signup handle their own UI
//     if (!isAuthRequest) {
//         Alert.alert("Request Failed", errorMessage);
//     }

//     return Promise.reject(error);
//   }
// );

// export default api;
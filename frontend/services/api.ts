// @ts-ignore
import { AxiosStatic } from 'axios';
import axiosImport from 'axios/dist/browser/axios.cjs';
import { Alert } from 'react-native';
import useUserData from '../store/userSignUp';

const axios = axiosImport as AxiosStatic;

// 1. Centralized Production URL
export const API_URL = 'https://trustmicro-app.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Timeout to handle Render "cold starts"
});

// --- REQUEST INTERCEPTOR ---
// Automatically attaches the Bearer token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = useUserData.getState().token; 
    if (token && token.trim() !== "") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- RESPONSE INTERCEPTOR ---
// Handles errors globally, including the 403 Session Expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Log the error for debugging
    console.group('🚨 TrustMicro API Error');
    console.log('URL:', originalRequest?.url);
    console.log('Status:', status);
    console.groupEnd();

    // HANDLE SESSION EXPIRY (401 or 403)
    if (status === 401 || status === 403) {
      console.log(`[AUTH] Unauthorized/Forbidden (${status}). Clearing session...`);
      
      // FIX: Call the existing logout function defined in userSignUp.ts
      // This resets 'isLoggedIn', 'token', and clears AsyncStorage correctly.
      const { logout } = useUserData.getState();
      logout(); 

      // Alert the user
      Alert.alert(
        "Session Expired", 
        "Your security token is invalid or expired. Please login again to continue.",
        [{ text: "OK" }]
      );

      return Promise.reject(error);
    }

    // HANDLE OTHER ERRORS
    let errorMessage = "Network Error: Please check your internet connection.";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "The server is taking too long to respond. (Render might be waking up)";
    } else if (error.response) {
      if (status === 404) {
        errorMessage = "Endpoint not found on server.";
      } else {
        errorMessage = error.response.data.error || "A server error occurred.";
      }
    }

    // Only alert for non-auth errors here
    Alert.alert("Request Failed", errorMessage);

    return Promise.reject(error);
  }
);

export default api;
// @ts-ignore
import { AxiosStatic } from 'axios';
import axiosImport from 'axios/dist/browser/axios.cjs';
import { Alert } from 'react-native';
import useUserData from '../store/userSignUp'; // Ensure this path is correct


const axios = axiosImport as AxiosStatic;
// 1. Centralized Production URL
// Note: Ensure the /api/v1 prefix is handled here if your backend uses it
export const API_URL = 'https://trustmicro-app.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Increased to 15s to give Render time to "wake up"
});

// --- REQUEST INTERCEPTOR ---
// 1. Request Interceptor: Attach the token to every request
api.interceptors.request.use(
  (config) => {
    // Get token from Zustand store
    const token = useUserData.getState().token; 
    
    // Only attach if token exists and isn't an empty string
    if (token && token.trim() !== "") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response Interceptor: Handle the "Session Expired" logic
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server returns 401 (Unauthorized), it means the token is invalid/expired
    if (error.response?.status === 401) {
      // We only alert if there was actually a token we tried to use
      const token = useUserData.getState().token;
      if (token) {
        Alert.alert("Session Expired", "Please log in again to continue.");
        // Optional: useUserData.getState().logout(); 
      }
    }
    return Promise.reject(error);
  }
);

// --- RESPONSE INTERCEPTOR ---
api.interceptors.response.use(
  (response) => response, 
  (error) => {
    const originalRequest = error.config;
    
    console.group('🚨 TrustMicro API Error');
    console.log('URL:', originalRequest?.url);
    console.log('Status:', error.response?.status);
    console.groupEnd();

    let errorMessage = "Network Error: Please check your internet connection.";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "The server is taking too long to respond. (Render might be waking up)";
    } else if (error.response) {
      if (error.response.status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (error.response.status === 404) {
        errorMessage = "Endpoint not found on server.";
      } else {
        errorMessage = error.response.data.error || "A server error occurred.";
      }
    }

    // Show Alert on the mobile screen
    Alert.alert("Connection Issue", errorMessage);

    return Promise.reject(error);
  }
);

export default api;
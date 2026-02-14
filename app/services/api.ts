import axios from 'axios';
import { Alert } from 'react-native';
import useUserData from '../store/userSignUp'; // Import your store

// 1. Centralized IP Address
export const API_URL = 'https://trustmicro-app.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds timeout
});

// --- NEW: REQUEST INTERCEPTOR ---
// This automatically adds the token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = useUserData.getState().token; // Get token from Zustand
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. RESPONSE INTERCEPTOR logic
api.interceptors.response.use(
  (response) => response, // Do nothing if the request is successful
  (error) => {
    const originalRequest = error.config;
    
    // Log the details to your console for debugging
    console.group('🚨 TrustMicro API Error');
    console.log('URL:', originalRequest?.url);
    console.log('Method:', originalRequest?.method?.toUpperCase());
    console.log('Message:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
    console.groupEnd();

    // 3. Show a smart alert to the user/developer
    let errorMessage = "Network Error: Check your IP or Server.";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "Request timed out. Is the server running?";
    } else if (error.response) {
      // Logic for different status codes
      if (error.response.status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
      } else {
        errorMessage = `Server Error (${error.response.status}): ${error.response.data.error || 'Something went wrong'}`;
      }
    }

    Alert.alert("Connection Issue", `${errorMessage}\n\nTarget: ${originalRequest?.url}`);

    return Promise.reject(error);
  }
);

export default api;
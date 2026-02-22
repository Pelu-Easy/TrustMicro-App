// @ts-ignore
import { AxiosStatic } from 'axios';
import axiosImport from 'axios/dist/browser/axios.cjs';
import { Alert } from 'react-native';
import useUserData from '../store/userSignUp';

const axios = axiosImport as AxiosStatic;

// 1. Centralized Production URL
// NOTE: Since /api/v1 is here, don't repeat it in your store calls!
export const API_URL = 'https://trustmicro-app.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, 
});

// --- REQUEST INTERCEPTOR ---
api.interceptors.request.use(
  (config) => {
    const token = useUserData.getState().token; 
    
    if (token && token.trim() !== "") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- RESPONSE INTERCEPTOR (Unified) ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    console.group('🚨 TrustMicro API Error');
    console.log('URL:', originalRequest?.url);
    console.log('Status:', status);
    console.log('Data:', error.response?.data);
    console.groupEnd();

    let errorMessage = "Network Error: Please check your internet connection.";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "The server is taking too long to respond. (Render might be waking up)";
    } else if (error.response) {
      // Handle 401 (Unauthorized) and 403 (Forbidden/Expired)
      if (status === 401 || status === 403) {
        errorMessage = "Your session has expired or is invalid. Please log in again.";
      } else if (status === 404) {
        errorMessage = "Endpoint not found on server.";
      } else {
        errorMessage = error.response.data.error || "A server error occurred.";
      }
    }

    // Only alert if it's not a background sync error to avoid spamming the user
    Alert.alert("Request Failed", errorMessage);

    return Promise.reject(error);
  }
);

export default api;
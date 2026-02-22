// @ts-ignore
import { AxiosStatic } from 'axios';
import axiosImport from 'axios/dist/browser/axios.cjs';
import { Alert } from 'react-native';
import useUserData from '../store/userSignUp';

const axios = axiosImport as AxiosStatic;

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
    
    // Prevent double versioning
    if (config.url?.startsWith('/api/v1')) {
       config.url = config.url.replace('/api/v1', '');
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// --- RESPONSE INTERCEPTOR ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthRequest = originalRequest?.url?.includes('/auth/');

    console.group('🚨 TrustMicro API Error');
    console.log('URL:', originalRequest?.url);
    console.log('Status:', status);
    console.groupEnd();

    // HANDLE SESSION EXPIRY (401 or 403)
    if (status === 401 || status === 403) {
      // Logic: If it's a login attempt, DON'T show the popup. 
      // Let the Login.tsx handle the "Invalid Password" or "Locked Out" message.
      if (!isAuthRequest) {
        const { logout } = useUserData.getState();
        logout(); 

        Alert.alert(
          "Session Expired", 
          "Your security token is invalid or expired. Please login again to continue.",
          [{ text: "OK" }]
        );
      }
      return Promise.reject(error);
    }

    // HANDLE OTHER ERRORS
    let errorMessage = "Network Error: Please check your internet connection.";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "The server is taking too long to respond.";
    } else if (error.response) {
      if (status === 404) {
        // Only alert 404 if it's NOT an auth request (prevents redundant popups)
        if (isAuthRequest) return Promise.reject(error);
        errorMessage = "Endpoint not found on server.";
      } else {
        errorMessage = error.response.data.error || "A server error occurred.";
      }
    }

    // Only alert for non-auth errors here
    if (!isAuthRequest) {
        Alert.alert("Request Failed", errorMessage);
    }

    return Promise.reject(error);
  }
);

export default api;
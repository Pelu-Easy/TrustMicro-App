import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Alert } from 'react-native';
import useUserData from '../store/userSignUp';

// Render.com base URL for TrustMicro
export const API_URL = 'https://trustmicro-app.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
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
    const isAuthRequest = originalRequest?.url?.includes('/auth/');

    // Log errors only if they aren't standard Auth failures
    if (status !== 401 && status !== 403) {
      console.group('🚨 TrustMicro API Error');
      console.log('URL:', originalRequest?.url);
      console.log('Status:', status);
      console.groupEnd();
    }

    // HANDLE SESSION EXPIRY (401 or 403)
    if (status === 401 || status === 403) {
      if (!isAuthRequest) {
        const { logout } = useUserData.getState();
        logout(); 

        // Silence Alert for the background /me check, show for everything else
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

    // HANDLE OTHER ERRORS
    let errorMessage = "Network Error: Please check your internet connection.";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "The server is taking too long to respond.";
    } else if (error.response) {
      if (status === 404) {
        if (isAuthRequest) return Promise.reject(error);
        errorMessage = "Endpoint not found on server.";
      } else if (status === 500) {
        errorMessage = "Server error (500). Please contact Admin.";
      } else {
        // Fallback to server's custom error message
        errorMessage = error.response.data?.error || error.response.data?.message || "A server error occurred.";
      }
    }

    // Only alert for non-auth errors here to avoid double-alerts during login
    if (!isAuthRequest) {
        Alert.alert("Request Failed", errorMessage);
    }

    return Promise.reject(error);
  }
);

export default api;
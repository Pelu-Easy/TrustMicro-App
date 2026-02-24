import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
// @ts-ignore - This forces Axios to use the XHR adapter compatible with React Native
import { Alert } from 'react-native';
import useUserData from '../store/userSignUp';

export const API_URL = 'https://trustmicro-app.onrender.com/api/v1';

// Create instance using the direct library reference to avoid Node.js dependencies
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// --- 1. REQUEST INTERCEPTOR ---
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

// --- 2. RESPONSE INTERCEPTOR ---
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthRequest = originalRequest?.url?.includes('/auth/');

    if (status !== 401 && status !== 403) {
      console.group('🚨 TrustMicro API Error');
      console.log('URL:', originalRequest?.url);
      console.log('Status:', status);
      console.groupEnd();
    }

    if (status === 401 || status === 403) {
      if (!isAuthRequest) {
        const { logout } = useUserData.getState();
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

    let errorMessage = "Network Error: Please check your internet connection.";
    if (error.code === 'ECONNABORTED') {
      errorMessage = "The server is taking too long to respond.";
    } else if (error.response) {
      errorMessage = error.response.data?.error || error.response.data?.message || "A server error occurred.";
    }

    if (!isAuthRequest) {
        Alert.alert("Request Failed", errorMessage);
    }

    return Promise.reject(error);
  }
);

export default api;
import axios from 'axios';
import useUserData from '../store/userSignUp';

// Matching your backend's versioned path
const API_BASE_URL = 'https://your-api-domain.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = useUserData.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Handle expired or invalid sessions
      useUserData.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
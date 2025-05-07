import axios from 'axios';
import {AuthService} from "@genezio/auth";

// Create an axios instance
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
});

// Set up the interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Retrieve the token from localStorage or other secure storage
    const token = AuthService.getInstance().getUserToken();

    if (token && config.headers) {
      // Add the Authorization header with the Bearer token
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;

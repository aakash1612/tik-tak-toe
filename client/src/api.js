// client/src/api.js
import axios from 'axios';
import socket from './socket';

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach the access token
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {               
    const originalRequest = error.config;
    // Check if it's a 401 error and not a refresh token request itself
    if (error.response?.status === 401 && originalRequest.url !== '/api/auth/refresh-token') {
      originalRequest._retry = originalRequest._retry || 0;
      if (originalRequest._retry < 1) { // Retry only once
        originalRequest._retry++;
        
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            console.log('No refresh token available. Redirecting to login.');
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
            return Promise.reject(error);
          }

          console.log('Access token expired for API request. Attempting to refresh...');
          const res = await api.post('/api/auth/refresh-token', { refreshToken });

          const { accessToken, refreshToken: newRefreshToken } = res.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Update Authorization header for the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          console.log('Tokens refreshed, retrying original request.');
          return api(originalRequest); 
        } 

        catch (refreshError) {
          console.error('Failed to refresh token during API intercept. Logging out:', refreshError.response?.data?.message || refreshError.message);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          socket.disconnect(); 
          window.location.href = '/login'; 
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
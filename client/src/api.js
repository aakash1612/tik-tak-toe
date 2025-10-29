// client/src/api.js
import axios from 'axios';
import socket from './socket';

// Create Axios instance with backend base URL from .env
const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token to every request
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh expired tokens automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token found');

        console.log('Access token expired — refreshing...');
        const res = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/auth/refresh-token`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        socket.disconnect();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

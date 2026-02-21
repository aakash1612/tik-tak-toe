// tik-tok-toe/client/src/socket.js

import { io } from 'socket.io-client';
import axios from 'axios';

// 🔐 Backend URL from environment
const SOCKET_URL = process.env.REACT_APP_BACKEND_URL;

if (!SOCKET_URL) {
  throw new Error("REACT_APP_BACKEND_URL is not defined in environment variables");
}

// 🔑 Token helpers
const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');

// Prevent multiple refresh attempts at same time
let isRefreshing = false;

// 🚀 Create socket instance (manual connection)
const socket = io(SOCKET_URL, {
  auth: {
    token: getAccessToken(),
  },
  autoConnect: false,
  withCredentials: true,
});

// ✅ Handle successful authentication from server
socket.on('auth-success', ({ userId, username }) => {
  console.log(`✅ Socket authenticated: ${username} (${userId})`);
  socket.userId = userId;
  socket.username = username;
});

// ❌ Handle authentication errors
socket.on('connect_error', async (err) => {
  console.error('❌ Socket connection error:', err?.message);

  const message = err?.message || '';

  // If access token expired → attempt refresh
  if (
    message.includes('Authentication error') &&
    message.includes('jwt expired') &&
    !isRefreshing
  ) {
    console.log('🔄 Access token expired. Attempting refresh...');
    isRefreshing = true;

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      forceLogout();
      return;
    }

    try {
      const res = await axios.post(
        `${SOCKET_URL}/api/auth/refresh-token`,
        { refreshToken }
      );

      const { accessToken, refreshToken: newRefreshToken } = res.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      socket.auth = { token: accessToken };

      console.log('✅ Token refreshed. Reconnecting socket...');

      if (socket.connected) socket.disconnect();
      socket.connect();
    } catch (refreshErr) {
      console.error(
        '❌ Refresh failed:',
        refreshErr.response?.data?.message || refreshErr.message
      );
      forceLogout();
    } finally {
      isRefreshing = false;
    }
  } else {
    console.log('🚪 Authentication failed. Logging out.');
    forceLogout();
  }
});

// 🔌 Handle disconnections
socket.on('disconnect', (reason) => {
  console.log(`⚠️ Socket disconnected. Reason: ${reason}`);

  // Try reconnect if token still valid
  if (
    reason === 'io server disconnect' ||
    reason === 'transport close' ||
    reason === 'ping timeout'
  ) {
    const token = getAccessToken();

    if (token) {
      console.log('🔁 Attempting reconnection...');
      socket.auth = { token };
      socket.connect();
    } else {
      forceLogout();
    }
  }
});

// 🔒 Centralized logout trigger
function forceLogout() {
  console.log('🚨 Forcing logout...');

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  // Notify entire app
  window.dispatchEvent(new Event('forceLogout'));
}

export default socket;
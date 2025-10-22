// tik-tok-toe/client/src/socket.js - FINAL VERSION

import { io } from 'socket.io-client';
import axios from 'axios'; 

console.log('Socket.js: File started executing. Initializing socket instance.'); 

// Get the backend URL from the environment variable set on Netlify
const SOCKET_URL = process.env.REACT_APP_BACKEND_URL;

const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');


const socket = io(SOCKET_URL, { // Use the production/dev URL
    auth: {
        token: getAccessToken() 
    },
    autoConnect: false, 
    // withCredentials is necessary if your server sets cookies (though you use JWT/auth header)
    withCredentials: true 
});

// Listen for 'auth-success' event from the server
socket.on('auth-success', ({ userId, username }) => {
    console.log(`Socket.js: RECEIVED 'auth-success' event. User: ${username} (${userId})`);
    socket.userId = userId;
    socket.username = username;
    console.log(`Socket.js: Stored userId: ${socket.userId}, Stored username: ${socket.username}`);
});

// Handle authentication errors during socket connection
socket.on('connect_error', async (err) => {
    console.error('Socket.js: Socket connection error:', err.message);

    if (err.message.includes('Authentication error') && err.message.includes('jwt expired')) {
        console.log('Socket.js: Access token expired. Attempting to refresh token...');
        const refreshToken = getRefreshToken();

        if (refreshToken) {
            try {
                // Use the environment variable for the API endpoint
                const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/refresh-token`, {
                    refreshToken
                });

                const { accessToken, refreshToken: newRefreshToken } = res.data;
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                socket.auth.token = accessToken;

                console.log('Socket.js: Token refreshed successfully. Attempting to reconnect...');
                
                // ✅ RELIABILITY TWEAK: Ensure connection is closed before reconnecting
                if (socket.connected) {
                    socket.disconnect();
                }
                socket.connect();
            } catch (refreshErr) {
                console.error('Socket.js: Failed to refresh token:', refreshErr.response?.data?.message || refreshErr.message);
                console.log('Socket.js: Refresh token invalid or expired. Emitting logout event.');
                socket.emit('logout'); 
            }
        } 
        else {
            console.log('Socket.js: No refresh token available. Emitting logout event.');
            socket.emit('logout');
        }
    } else {
        console.log('Socket.js: Other connection error. Emitting logout event.');
        socket.emit('logout');
    }
});

// Listen for disconnects
socket.on('disconnect', (reason) => {
    console.log(`Socket.js: Disconnected. Reason: ${reason}`);
    if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        const newAccessToken = getAccessToken();
        if (newAccessToken) {
            console.log('Socket.js: Attempting to reconnect with fresh access token.');
            socket.auth.token = newAccessToken;
            socket.connect();
        } else {
            console.log('Socket.js: No access token to reconnect with. Emitting logout event.');
            socket.emit('logout'); 
        }
    }
});

console.log(`Socket.js: Socket instance created. autoConnect: false. Token init: ${getAccessToken() ? 'Yes' : 'No'}`);

export default socket;
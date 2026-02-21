import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import './App.css';
import Register from './pages/Register';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import socket from './socket';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      setIsAuthenticated(true);

      // 🔐 Auto reconnect socket on refresh
      socket.auth = { token };
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      setIsAuthenticated(false);
    }

    setIsAuthLoading(false);

    // ✅ Listen for forced logout event (from socket.js)
    const handleForceLogout = () => {
      console.log('🚨 Global logout triggered');

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      setIsAuthenticated(false);

      if (socket.connected) {
        socket.disconnect();
      }

      window.location.href = '/login';
    };

    window.addEventListener('forceLogout', handleForceLogout);

    return () => {
      window.removeEventListener('forceLogout', handleForceLogout);
    };
  }, []);

  const handleAuth = () => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      setIsAuthenticated(true);

      socket.auth = { token };

      if (!socket.connected) {
        socket.connect();
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    setIsAuthenticated(false);

    if (socket.connected) {
      socket.disconnect();
    }
  };

  if (isAuthLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '24px'
      }}>
        Loading authentication status...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register onAuth={handleAuth} />} />
        <Route path="/login" element={<Login onAuth={handleAuth} />} />

        <Route
          path="/lobby"
          element={
            isAuthenticated
              ? <Lobby onLogout={handleLogout} />
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/game/:roomId"
          element={
            isAuthenticated
              ? <GameWrapper />
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? "/lobby" : "/login"} />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function GameWrapper() {
  const { roomId } = useParams();
  console.log('🎮 Rendering Game for room:', roomId);
  return <Game />;
}

export default App;
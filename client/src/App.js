import React, { useState, useEffect } from 'react';
import { BrowserRouter , Routes, Route, Navigate, useParams } from 'react-router-dom';
import './App.css';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgetPassword'; 
import ResetPassword from './pages/ResetPassword';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import socket from './socket';
import VerificationStatus from './pages/VerificationStatus';
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    console.log('App.js: Initializing auth state from localStorage...');
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setIsAuthLoading(false);

    // Listen for socket's explicit logout signal
    const handleSocketLogout = () => {
      console.log('App.js: Socket triggered logout event. Performing centralized logout and navigating.');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setIsAuthenticated(false);
      // CORRECTED: Use window.location.href for direct browser navigation for global logout
      window.location.href = '/login';
    };
    socket.on('logout', handleSocketLogout);

    return () => {
      socket.off('logout', handleSocketLogout);
    };
  }, []);

  const handleAuth = () => {
    console.log('App.js: handleAuth called. Setting isAuthenticated to true.');
    setIsAuthenticated(true);
    // This logic is also present in Lobby.js and handled by socket.js's connect_error listener.
    // Ensure this doesn't cause redundant connection attempts or issues.
    if (localStorage.getItem('accessToken') && !socket.connected) {
        socket.auth.token = localStorage.getItem('accessToken');
        socket.connect();
    }
  };

  const handleLogout = () => {
    console.log('App.js: handleLogout called. Clearing tokens, setting isAuthenticated to false.');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    if (socket.connected) {
        socket.disconnect();
    }
    // The router's <Navigate> component or socket-triggered window.location.href will handle the actual navigation.
  };

  console.log('App.js: isAuthenticated in render (current value):', isAuthenticated); // <-- ADDED LOG

  if (isAuthLoading) {
    console.log('App.js: Auth loading...');
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '24px', color: '#333' }}>
        Loading authentication status...
      </div>
    );
  }

  return (
    <BrowserRouter>
    
      <Routes>
        <Route path="/register" element={<Register onAuth={handleAuth} />} />
        <Route path="/login" element={<Login onAuth={handleAuth} />} />
        <Route path="/lobby" element={isAuthenticated ? <Lobby onLogout={handleLogout} /> : <Navigate to="/login" />} />
        {/* ADDED LOGIC FOR GAME ROUTE TO CHECK WHY IT REMOUNTS */}
        <Route
          path="/game/:roomId"
          element={
            isAuthenticated ? (
              <GameDebugWrapper /> // Use a wrapper to log useParams outside of Game
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/verification-status" element={<VerificationStatus />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/lobby" : "/login"} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
}

// Small helper component to log roomId *before* Game renders, to see if it changes
function GameDebugWrapper() {
  const { roomId } = useParams();
  console.log('App.js: Rendering Game component for room:', roomId); // <-- ADDED LOG
  return <Game />;
}

export default App;
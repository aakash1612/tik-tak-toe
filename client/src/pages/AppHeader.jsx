import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import './AppHeader.css'; // 🔑 Import the new, local CSS file

// --- User Profile Modal Component ---
const UserProfileModal = ({ username, userId, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>
                <h3>Your Profile</h3>
                <div className="profile-details">
                    <img 
                        src={`https://ui-avatars.com/api/?name=${username}&background=00ff66&color=13131b&size=100&bold=true&font-size=0.45`} 
                        alt="User Avatar" 
                        className="profile-avatar"
                    />
                    <p><strong>Username:</strong> {username}</p>
                    <p><strong>User ID:</strong> <span className="user-id-text">{userId}</span></p>
                    <p>
                        Current screen: Lobby/Game
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- AppHeader Component ---
const AppHeader = ({ username, userId }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const navigate = useNavigate();
    
    const handleLogout = () => {
        console.log('AppHeader.js - Logging out. Clearing tokens and disconnecting socket.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (socket.auth) socket.auth.token = null;
        socket.disconnect();
        navigate('/login');
    };
    
    return (
        <header className="app-header">
            <div className="header-content">
                <h1 className="logo">Tic-Tac-Toe Arena</h1>
                <div className="user-controls">
                    <button onClick={handleLogout} className="logout-btn header-btn">Logout</button>
                    
                    <span className="user-greeting">Welcome, <strong>{username || 'Guest'}</strong></span>
                    
                    <button 
                        onClick={() => setIsProfileOpen(true)} 
                        className="profile-btn header-btn"
                    >
                        Profile
                    </button>
                </div>
            </div>
            {isProfileOpen && (
                <UserProfileModal 
                    username={username} 
                    userId={userId} 
                    onClose={() => setIsProfileOpen(false)} 
                />
            )}
        </header>
    );
};

export default AppHeader;
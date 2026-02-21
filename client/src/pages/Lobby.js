// client/src/pages/Lobby.js 

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import AppHeader from './Components/AppHeader';
import './Lobby.css'; // Ensure you have your CSS for .modal-overlay, etc.

const Lobby = () => {
    const navigate = useNavigate();
    
    // States
    const [newGameName, setNewGameName] = useState('');
    const [joinKey, setJoinKey] = useState('');
    const [lobbyMessage, setLobbyMessage] = useState('Create a new private game or join a friend using a key.');
    const [myUserId, setMyUserId] = useState(socket.userId);
    const [myUsername, setMyUsername] = useState(socket.username);

    // State for the modal/waiting screen
    const [roomKeyToShare, setRoomKeyToShare] = useState(null);
    const [isWaitingModalOpen, setIsWaitingModalOpen] = useState(false);

    // --- EFFECT HOOK: Handles Authentication and Socket Events ---
    useEffect(() => {
        const accessToken = localStorage.getItem('accessToken'); 
        
        if (!accessToken) {
            navigate('/login');
            return;
        }

        if (socket.auth.token !== accessToken) {
            socket.auth.token = accessToken;
        }
        if (!socket.connected) {
            socket.connect();
        }

        const handleAuthSuccess = ({ userId, username }) => {
            setMyUserId(userId);
            setMyUsername(username);
        };
        
        // This is the common navigation logic for P2 (joiner) and P1 (creator, triggered later).
        const handleGameNavigation = ({ roomId }) => {
            console.log(`Lobby: Navigating to game ${roomId}.`);
            
            // Clear modal state and navigate
            setIsWaitingModalOpen(false);
            setRoomKeyToShare(null);
            setLobbyMessage('');
            navigate(`/game/${roomId}`);
        };

        const handleJoinError = ({ message }) => {
            console.error('Lobby: Join error:', message);
            setLobbyMessage(`Error joining game: ${message}`);
            // If an error happens while waiting, close the modal
            setIsWaitingModalOpen(false); 
            setRoomKeyToShare(null);
        };

        // --- Core Listeners ---
        socket.on('auth-success', handleAuthSuccess);
        
        // P2 Navigation: When P2 joins, the server sends 'joined-game', then 'game-start'.
        // This listener handles both P2 navigation and P1 navigation (when triggered by handleCreateGame).
        socket.on('joined-game', handleGameNavigation);
        
        // P1 will manually attach a game-start listener inside handleCreateGame. 
        // We DO NOT want a global listener here, as it conflicts with the modal.
        // ❌ socket.on('game-start', handleGameNavigation); // REMOVED GLOBAL LISTENER
        
        socket.on('join-error', handleJoinError);

        // Cleanup function
        return () => {
            socket.off('auth-success', handleAuthSuccess);
            socket.off('joined-game', handleGameNavigation);
            socket.off('game-start'); // Ensure ALL 'game-start' listeners are removed
            socket.off('join-error', handleJoinError);
            socket.off('game-created'); // Cleanup listener for key display
        };
    }, [navigate, myUserId, myUsername]);

    // --- 1. CREATE GAME HANDLER ---
    const handleCreateGame = () => {
        // Ensure myUsername is current before creating the default name
        const gameName = newGameName.trim() || `${myUsername || 'Host'}'s Game`; 
        
        if (!myUserId) { 
            setLobbyMessage('Error: Not authenticated. Please log in again.');
            return;
        }
        setLobbyMessage('Creating game...');
        
        // 1. Set up a temporary listener for 'game-created' (the key event).
        socket.once('game-created', ({ roomId }) => {
            // Display Key and Open Modal
            setRoomKeyToShare(roomId); 
            setIsWaitingModalOpen(true);
            setLobbyMessage(`Room ${roomId} created. Share the key and wait...`);

            // 2. CRUCIAL: Set up the *specific* listener for when the opponent joins (P1 navigation).
            // This is a one-time listener that waits for the opponent to trigger 'game-start'.
            socket.once('game-start', () => {
                console.log(`Creator: Game started for room ${roomId}. Navigating.`);
                // Call the global navigation handler, using the correct captured 'roomId'
                // This will trigger navigation to /game/UFVNF
                navigate(`/game/${roomId}`); 
            });
        });

        // 3. Emit the request
        socket.emit('create-game', { gameName });
    };

    // --- 2. JOIN GAME BY KEY HANDLER ---
    const handleJoinByKey = () => {
        const key = joinKey.trim().toUpperCase();
        if (key.length !== 5) {
            setLobbyMessage('Please enter a valid 5-character room key.');
            return;
        }
        if (!myUserId) {
            setLobbyMessage('Error: Not authenticated. Please log in again.');
            return;
        }
        setLobbyMessage(`Attempting to join room ${key}...`);
        
        // This triggers 'joined-game' on server, which triggers the 'handleGameNavigation' listener in useEffect.
        socket.emit('join-existing-game', { roomId: key });
    };

    // --- RENDER ---
    return (
        <>
            <AppHeader 
                username={myUsername} 
                userId={myUserId} 
            />
            
            {/* ---------------------------------------------------- */}
            {/* 🔑 New Room Key Sharing Modal - Renders OVER the Lobby */}
            {/* ---------------------------------------------------- */}
            {isWaitingModalOpen && roomKeyToShare && (
                <div className="modal-overlay">
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#00ff66' }}>Room Created!</h2>
                        <p style={{ marginTop: '10px' }}>Share this 5-character key with your opponent:</p>
                        
                        <h1 style={{ 
                            fontSize: '3em', 
                            color: '#007bff', 
                            margin: '20px 0',
                            letterSpacing: '5px' 
                        }}>
                            {roomKeyToShare}
                        </h1>
                        
                        <p>Waiting for the second player to join...</p>
                        
                        <button 
                            onClick={() => {
                                setIsWaitingModalOpen(false);
                                setRoomKeyToShare(null);
                                setLobbyMessage('Waiting cancelled. Create or join a new room.');
                                // ⚠️ Ensure the game-start listener is removed upon cancellation
                                socket.off('game-start'); 
                            }}
                            className="logout-btn header-btn"
                            style={{ marginTop: '20px' }}
                        >
                            Cancel & Return to Lobby
                        </button>
                    </div>
                </div>
            )}
            
            {/* --- Main Lobby Content --- */}
           <div className="lobby-page">
  <div className="lobby-card">
    <h2 className="lobby-title">Welcome to the Arena</h2>
    <p className="lobby-subtitle">
      Create a new private game or join a friend!
    </p>

    {lobbyMessage && <p className="status-message">{lobbyMessage}</p>}

    {!isWaitingModalOpen && (
      <div className="lobby-grid">

        {/* Create Game */}
        <div className="lobby-section">
          <h3>Create Game</h3>
          <input
            type="text"
            placeholder="Game name (optional)"
            value={newGameName}
            onChange={(e) => setNewGameName(e.target.value)}
          />
          <button onClick={handleCreateGame} className="primary-btn">
            Create Game
          </button>
        </div>

        {/* Join Game */}
        <div className="lobby-section">
          <h3>Join Game</h3>
          <input
            type="text"
            placeholder="Enter room key"
            maxLength={5}
            value={joinKey}
            onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
          />
          <button
            onClick={handleJoinByKey}
            disabled={joinKey.length !== 5}
            className="secondary-btn"
          >
            Join Game
          </button>
        </div>

      </div>
    )}
  </div>
</div>

        </>
    );
};

export default Lobby;
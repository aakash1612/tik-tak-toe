import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import './Lobby.css';

const Lobby = () => {
  const navigate = useNavigate();
  const [activeGames, setActiveGames] = useState([]);
  const [newGameName, setNewGameName] = useState('');
  const [lobbyMessage, setLobbyMessage] = useState('');
  const [myUserId, setMyUserId] = useState(socket.userId);
  const [myUsername, setMyUsername] = useState(socket.username);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      console.log('Lobby.js: No accessToken found. Redirecting to login.');
      setLobbyMessage('Authentication required. Please log in.');
      navigate('/login');
      return;
    }

    // Ensure socket.auth.token is set to the current accessToken
    if (socket.auth.token !== accessToken) {
      socket.auth.token = accessToken;
    }

    // Connect socket if not already connected
    if (!socket.connected) {
      socket.connect();
      console.log('Lobby.js: Socket attempting to connect.');
    }

    // This listener ensures myUserId/Username are always up-to-date once auth is confirmed
    const handleAuthSuccess = ({ userId, username }) => {
      console.log("Lobby.js: Auth success received, updating myUserId/Username");
      setMyUserId(userId);
      setMyUsername(username);
      if (socket.connected) {
        socket.emit('request-active-games');
        console.log(`Lobby: ${username} (${userId}) requested active games after auth-success.`);
      }
    };

    socket.on('auth-success', handleAuthSuccess);

    if (socket.connected && myUserId) {
      socket.emit('request-active-games');
      console.log(`Lobby: ${myUsername} (${myUserId}) requested active games on mount.`);
    }

    socket.on('active-games-update', (games) => {
      console.log('Lobby: Received active games update:', games);
      setActiveGames(games);
    });

    socket.on('game-created', ({ roomId }) => {
      console.log(`Lobby: Game created with ID: ${roomId}. Navigating to game.`);
      setLobbyMessage('');
      navigate(`/game/${roomId}`);
    });

    socket.on('joined-game', ({ roomId }) => {
      console.log(`Lobby: Joined game with ID: ${roomId}. Navigating to game.`);
      setLobbyMessage('');
      navigate(`/game/${roomId}`);
    });

    socket.on('join-error', ({ message }) => {
      console.error('Lobby: Join error:', message);
      setLobbyMessage(`Error joining game: ${message}`);
    });

    // --- Cleanup function for useEffect ---
    return () => {
      socket.off('auth-success', handleAuthSuccess);
      socket.off('active-games-update');
      socket.off('game-created');
      socket.off('joined-game');
      socket.off('join-error');
    };
  }, [navigate, myUserId, myUsername]);

  const handleLogout = () => {
    console.log('Lobby.js - Logging out. Clearing tokens and disconnecting socket.');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    if (socket.auth) socket.auth.token = null;
    socket.disconnect();
    navigate('/login');
  };

  const handleCreateGame = () => {
    console.log('Lobby.js - Attempting to create game. Current myUserId:', myUserId);
    if (!newGameName.trim()) {
      setLobbyMessage('Please enter a name for your game.');
      return;
    }
    if (!myUserId) {
      setLobbyMessage('Error: Not authenticated. Please log in again.');
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken && !socket.connected) {
        socket.auth.token = accessToken;
        socket.connect();
        setLobbyMessage('Attempting to re-authenticate...');
      } else {
        navigate('/login');
      }
      return;
    }
    setLobbyMessage('Creating game...');
    socket.emit('create-game', { gameName: newGameName.trim() });
  };

  const handleJoinGame = (roomId) => {
    console.log('Lobby.js - Attempting to join game. Current myUserId:', myUserId);
    if (!myUserId) {
      setLobbyMessage('Error: Not authenticated. Please log in again.');
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken && !socket.connected) {
        socket.auth.token = accessToken;
        socket.connect();
        setLobbyMessage('Attempting to re-authenticate...');
      } else {
        navigate('/login');
      }
      return;
    }
    setLobbyMessage(`Attempting to join game ${roomId}...`);
    socket.emit('join-existing-game', { roomId });
  };

  return (
    <div className="container">
      <h2>Welcome to the Lobby</h2>
      <p>Hello, <strong>{myUsername || 'Guest'}</strong>! Create a new game or join an active one!</p>
      {lobbyMessage && <p className="status-message">{lobbyMessage}</p>}

      <h3>Create New Game</h3>
      <input
        type="text"
        placeholder="Enter a game name (e.g., My Awesome Game)"
        value={newGameName}
        onChange={(e) => {
          setNewGameName(e.target.value);
          setLobbyMessage('');
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleCreateGame();
          }
        }}
      />
      <button onClick={handleCreateGame}>Create Game</button>

      <hr style={{ margin: '2rem 0' }} />

      <h3>Active Games ({activeGames.length})</h3>
      {activeGames.length === 0 ? (
        <p>No active games available. Be the first to create one!</p>
      ) : (
        <ul className="game-list">
          {activeGames.map((game) => (
            <li key={game.id} className="game-item">
              <span>
                <strong>{game.name}</strong> (Players: {game.playerCount}/2)
              </span>
              {game.status === 'waiting' && game.playerCount < 2 ? (
                <button onClick={() => handleJoinGame(game.id)}>Join</button>
              ) : (
                <span className="game-status">
                  {game.status === 'in-progress' ? 'In Progress' : 'Full'}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <hr style={{ margin: '2rem 0' }} />

      <button onClick={handleLogout} className="logout-btn">Logout</button>
    </div>
  );
};

export default Lobby;

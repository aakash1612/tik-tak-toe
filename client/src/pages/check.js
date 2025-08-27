
import React, { useState, useEffect, useRef, useCallback } from 'react'; 
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket'; // Import the shared socket instance

function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null); // For auto-scrolling chat

  const [board, setBoard] = useState(Array(9).fill(null));
  const [symbol, setSymbol] = useState(null); // 'X' or 'O' for this client's player
  const [turn, setTurn] = useState(null);     // User ID of whose turn it is
  const [players, setPlayers] = useState([]); // Array of { userId, username, symbol }
  const [gameStatusMessage, setGameStatusMessage] = useState('Connecting to game...');
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameOverWinner, setGameOverWinner] = useState(null); // Stores symbol of winner ('X', 'O') or 'Draw'

  // States for Game Session Scores (player1 = X, player2 = O)
  const [player1Score, setPlayer1Score] = useState(0); // Score for player who is X
  const [player2Score, setPlayer2Score] = useState(0); // Score for player who is O
  const [drawsScore, setDrawsScore] = useState(0);

  // States for Rematch UI
  const [rematchStatus, setRematchStatus] = useState(null); // 'waiting-for-opponent', 'opponent-requested', 'error', 'requesting'
  const [opponentRequestedRematch, setOpponentRequestedRematch] = useState(false); // To show 'Opponent requested rematch!'

  // States for Chat
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');


  // User's own ID and Username from the socket instance (set by server auth)
  // These are initialized from socket directly, and updated by handleAuthSuccess
  const [myUserId, setMyUserId] = useState(socket.userId);
  const [myUsername, setMyUsername] = useState(socket.username);

  // Derive myPlayer and opponentPlayer from the 'players' state
  // These will update automatically when 'players' or 'myUserId' change
  const myPlayer = players.find(p => p.userId === myUserId);
  const opponentPlayer = players.find(p => p.userId !== myUserId);
  // Removed: const opponentUserId = opponentPlayer?.userId; (as it was unused and ESLint warned about it)

  const handleAuthSuccess = useCallback(({ userId, username }) => {
    console.log("Game.js: Auth success received, updating myUserId/Username");
    setMyUserId(userId);
    setMyUsername(username);
  }, []); // No dependencies as it only uses its arguments and setters

  const handleConnect = useCallback(() => {
    console.log(`CLIENT SOCKET CONNECTED. ID: ${socket.id}`);
    // Request latest game state on connect/reconnect
    socket.emit('request-game-state', roomId);
  }, [roomId]); // roomId is a dependency as it's used in socket.emit

  const handlePlayersUpdate = useCallback((serverPlayers) => {
    console.log(`CLIENT RECEIVED 'players-update' in room ${roomId}:`, serverPlayers);
    setPlayers(serverPlayers); // Update the players state
    const currentPlayer = serverPlayers.find(p => p.userId === myUserId); // myUserId is a dependency of this callback
    if (currentPlayer) {
      setSymbol(currentPlayer.symbol);
      setGameStatusMessage(`You are: ${currentPlayer.symbol}. ${serverPlayers.length < 2 ? 'Waiting for opponent...' : ''}`);
    }
    
  }, [roomId, myUserId]); // myUserId is a dependency as it's used to find currentPlayer

  const handleGameStart = useCallback(({ board: initialBoard, turn: initialTurn, players: serverPlayers }) => {
    console.log(`CLIENT RECEIVED 'game-start' in room ${roomId}. Board:`, initialBoard, 'Turn:', initialTurn, 'Players:', serverPlayers);
    setBoard(initialBoard);
    setTurn(initialTurn);
    setPlayers(serverPlayers); // Update players array on game start (might have symbols assigned)
    const currentPlayer = serverPlayers.find(p => p.userId === myUserId);
    if (currentPlayer) {
      setSymbol(currentPlayer.symbol);
      setGameStatusMessage(`You are: ${currentPlayer.username} (${currentPlayer.symbol})`);
    }
    // Reset scores on a new game start (rematch or initial 2nd player join)
    setPlayer1Score(0);
    setPlayer2Score(0);
    setDrawsScore(0);

    setShowGameOverModal(false); 
    setRematchStatus(null);
    setOpponentRequestedRematch(false);
  }, [roomId, myUserId]);

  const handleMoveMade = useCallback(({ board: newBoard }) => {
    console.log(`Move made in room ${roomId}. New board:`, newBoard);
    setBoard(newBoard);
  }, [roomId]); // roomId is a dependency

  const handleTurnUpdate = useCallback(({ turn: newTurnUserId }) => {
    console.log(`Turn in room ${roomId} changed to user ID: ${newTurnUserId}`);
    setTurn(newTurnUserId);
  }, [roomId]); // roomId is a dependency

  const handleGameOver = useCallback(({ winner }) => { // 'winner' is symbol ('X', 'O') or 'Draw'
    console.log('--- HANDLE GAME OVER EVENT ---');
    console.log('Received winner:', winner); 
    console.log('Current myUserId:', myUserId);
    console.log('Current myPlayer symbol:', myPlayer?.symbol); // myPlayer is derived from players and myUserId
    console.log('Current players array:', players); // players state is used here for finding winnerPlayer

    setGameOverWinner(winner); // Store the winner symbol/draw status for modal
    setShowGameOverModal(true); // Crucial: Make sure this is called and stays true
    console.log('showGameOverModal set to:', true);

    // Update local scores
    if (winner === 'Draw') {
      setDrawsScore(prev => prev + 1);
       } 
    else {
      // Find the player who won based on their symbol
      const winnerPlayer = players.find(p => p.symbol === winner); // Corrected: search by symbol
      const winnerSymbol = winnerPlayer?.symbol;

      if (winnerSymbol === 'X') {
          setPlayer1Score(prev => prev + 1);
      } else if (winnerSymbol === 'O') {
          setPlayer2Score(prev => prev + 1);
      }
    }

    // Reset board/turn etc. for the *next* game after modal has displayed
    setBoard(Array(9).fill(null));
    setTurn(null); // Clear turn until a new game starts
    setSymbol(null); // Clear symbol until a new game starts
    setGameStatusMessage('Game over. Please choose an option from the popup.');
    setRematchStatus(null);
    setOpponentRequestedRematch(false);
  }, [myUserId, myPlayer, players]); // Dependencies: myUserId, myPlayer, and players are used within this callback


  const handlePlayerDisconnected = useCallback(({ message }) => {
    console.log('--- HANDLE PLAYER DISCONNECTED EVENT ---');
    console.log(`Opponent disconnected from room ${roomId}: ${message}`);
    setGameStatusMessage(message);
    setBoard(Array(9).fill(null));
    setTurn(null);
    setPlayers([]); // This clears players, correctly indicating the game is over/abandoned.
    setSymbol(null);
    setShowGameOverModal(false); // Hide modal if opponent disconnects
    setRematchStatus(null);
    setOpponentRequestedRematch(false);
  }, [roomId]); // roomId is a dependency

  const handleMoveError = useCallback(({ message }) => {
    console.warn(`Move error in room ${roomId}: ${message}`);
    setGameStatusMessage(`Error: ${message}`);
    // Use the functional update form for symbol in setTimeout to avoid stale closure
    setTimeout(() => setGameStatusMessage((currentSymbol) => currentSymbol ? `You are: ${currentSymbol}` : 'Waiting for opponent...'), 3000);
  }, [roomId]); // Removed 'symbol' from dependencies and used functional update

  const handleRematchStatus = useCallback(({ message, status }) => {
      setRematchStatus({ message, status });
      if (status === 'opponent-requested') {
          setOpponentRequestedRematch(true);
      } else {
          setOpponentRequestedRematch(false);
      }
  }, []); // No dependencies for this simple status update

  const handleReceiveMessage = useCallback((msg) => {
      setMessages(prevMessages => [...prevMessages, msg]);
  }, []); // No dependencies for this functional update


  // The main useEffect for setting up and cleaning up Socket.IO listeners
  useEffect(() => {
    // Initial check for roomId
    if (!roomId) {
      console.error("No roomId found in URL for Game component. Redirecting to lobby.");
      navigate('/lobby');
      return;
    }

    // Listener for auth-success to ensure myUserId/Username are always up-to-date
    socket.on('auth-success', handleAuthSuccess);

    // Emit join-game-channel to tell server this socket is now in this room context
    socket.emit('join-game-channel', roomId);

    // Listener for successful socket connection (useful for reconnections)
    socket.on('connect', handleConnect);


    // --- Socket.IO Event Listeners for Game Logic (using memoized handlers) ---
    socket.on('players-update', handlePlayersUpdate);
    socket.on('game-start', handleGameStart);
    socket.on('move-made', handleMoveMade);
    socket.on('turn-update', handleTurnUpdate);
    socket.on('game-over', handleGameOver);
    socket.on('player-disconnected', handlePlayerDisconnected);
    socket.on('move-error', handleMoveError);
    socket.on('rematch-status', handleRematchStatus);
    socket.on('receive-message', handleReceiveMessage);

    // Initial request for game state when component mounts, if socket is already connected
    // This is crucial for clients who refresh or navigate directly into a game.
    if (socket.connected) {
      socket.emit('request-game-state', roomId);
    }


    // --- Cleanup function for useEffect ---
    return () => {
      console.log(`Game component for room ${roomId} unmounted. Listeners cleaned.`);
      socket.off('auth-success', handleAuthSuccess);
      socket.off('connect', handleConnect);
      socket.off('players-update', handlePlayersUpdate);
      socket.off('game-start', handleGameStart);
      socket.off('move-made', handleMoveMade);
      socket.off('turn-update', handleTurnUpdate);
      socket.off('game-over', handleGameOver);
      socket.off('player-disconnected', handlePlayerDisconnected);
      socket.off('move-error', handleMoveError);
      socket.off('rematch-status', handleRematchStatus);
      socket.off('receive-message', handleReceiveMessage);
    };

  }, [
    roomId,
    navigate,
    handleAuthSuccess,
    handleConnect,
    handlePlayersUpdate,
    handleGameStart,
    handleMoveMade,
    handleTurnUpdate,
    handleGameOver,
    handlePlayerDisconnected,
    handleMoveError,
    handleRematchStatus,
    handleReceiveMessage,
    // handleAnyEvent // Include if socket.onAny is active
  ]);


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);


  const handleClick = (index) => {
    // Prevent clicks if: cell is taken, not my turn, no symbol assigned, or game over modal is showing
    if (board[index] || turn !== myUserId || !symbol || showGameOverModal) {
      let msg = '';
      if (showGameOverModal) msg = 'Game is over!';
      else if (board[index]) msg = 'Cell already taken!';
      else if (turn !== myUserId) msg = 'It\'s not your turn!';
      else if (!symbol) msg = 'Waiting for your symbol assignment (or opponent).';

      console.warn(`Invalid client-side click: ${msg}`);
      setGameStatusMessage(msg);
      // Use the functional update form for symbol in setTimeout to avoid stale closure
      setTimeout(() => setGameStatusMessage((currentSymbol) => currentSymbol ? `You are: ${currentSymbol}` : 'Waiting for opponent...'), 3000);
      return;
    }
    socket.emit('make-move', { roomId, index });
  };


  const handleRematchRequest = () => {
      socket.emit('request-rematch', { roomId });
      setRematchStatus({ message: 'Requesting rematch...', status: 'requesting' });
  };


  const handleSendMessage = (e) => {
      e.preventDefault(); // Prevent page reload
      if (currentMessage.trim() && socket.connected) {
          socket.emit('send-message', { roomId, message: currentMessage.trim() });
          setCurrentMessage(''); // Clear input after sending
      }
  };


  // Derive turn player display info based on 'turn' and 'players' state
  const turnPlayer = players.find(p => p.userId === turn);
  const displayTurnInfo = turnPlayer
    ? `${turnPlayer.username} (${turnPlayer.symbol})`
    : (turn ? 'Looking up user...' : 'Waiting...');

  // Logic for opponent's score display
  // player1Score is for 'X' wins, player2Score is for 'O' wins
  // We need to map these to 'my' score and 'opponent's' score based on my current symbol.
  let displayMyScore = 0;
  let displayOpponentScore = 0;

  if (myPlayer?.symbol === 'X') {
      displayMyScore = player1Score;
      displayOpponentScore = player2Score;
  } else if (myPlayer?.symbol === 'O') {
      displayMyScore = player2Score;
      displayOpponentScore = player1Score;
  }


  return (
    <div className="App">
      {console.log('Current showGameOverModal state (in render):', showGameOverModal)}

      <h1>🎮 Multiplayer Tic-Tac-Toe</h1>
     

      {/* Display user's own symbol and username */}
      <p>You are: <strong>{myUsername || '...'} ({symbol || '...'})</strong></p>

      {/* Display Player Scores relative to 'You' and 'Opponent' */}
      <div className="player-scores">
          <span>{myUsername || 'You'}: <strong>{displayMyScore}</strong></span> |
          <span> {opponentPlayer ? opponentPlayer.username : 'Opponent'}: <strong>{displayOpponentScore}</strong></span> |
          <span> Draws: <strong>{drawsScore}</strong></span>
      </div>

      {players.length === 2 && (
        // Visual Turn Indicator
        <p className={`turn-indicator ${turn === myUserId ? 'my-turn' : 'opponent-turn'}`}>
            Turn: <strong>{displayTurnInfo}</strong>
        </p>
      )}

      <div className="board">
        {board.map((cell, index) => (
          // Apply 'X' or 'O' class for styling
          <div className={`cell ${cell === 'X' ? 'X' : ''} ${cell === 'O' ? 'O' : ''}`} key={index} onClick={() => handleClick(index)}>
            {cell}
          </div>
        ))}
      </div>

      {/* Game Over Modal with Rematch */}
      {showGameOverModal && (
        <div className="game-over-modal-overlay">
          <div className="game-over-modal">
            <h2>Game Over!</h2>
            {gameOverWinner === 'Draw' ? (
              <h3 className="draw-text">It's a Draw!</h3>
            ) : (
              <>
                {/* Dynamically display "You Win!" or "You Lost!" based on your symbol vs. winning symbol */}
                {myPlayer?.symbol === gameOverWinner ? (
                  <h3 className="winner-text">You Win! 🎉</h3>
                ) : (
                  <h3 className="loser-text">You Lost! 😟</h3>
                )}
                <p>
                  Winner: <strong>
                    {players.find(p => p.symbol === gameOverWinner)?.username || 'Unknown'} {/* Find player by winning symbol */}
                    ({players.find(p => p.symbol === gameOverWinner)?.symbol || ''})
                  </strong>
                </p>
              </>
            )}
            <div className="modal-actions">
                {players.length === 2 && ( // Only show rematch if there are two players (and not if opponent disconnected)
                    <button
                        onClick={handleRematchRequest}
                        // Button is disabled if *I* already requested a rematch
                        disabled={rematchStatus?.status === 'requesting'}
                        style={{ marginRight: '10px' }}
                    >
                        {rematchStatus?.status === 'requesting' ? 'Requesting...' :
                         (opponentRequestedRematch ? 'Accept Rematch' : 'Play Again')}
                    </button>
                )}
                <button onClick={() => {
                    setShowGameOverModal(false); // Hide modal
                    navigate('/lobby'); // Navigate back to lobby
                }}>Return to Lobby</button>
            </div>
            {/* Rematch status messages */}
            {rematchStatus && rematchStatus.status !== 'requesting' && rematchStatus.status !== 'opponent-requested' && (
                <p className="rematch-message">{rematchStatus.message}</p>
            )}
            {rematchStatus?.status === 'requesting' && (
                <p className="rematch-message">Waiting for opponent to accept rematch...</p>
            )}
            {opponentRequestedRematch && rematchStatus?.status === 'opponent-requested' && (
                <p className="rematch-message">{rematchStatus.message}</p>
            )}
          </div>
        </div>
      )}

      {/* In-Game Chat UI */}
      <div className="chat-container">
          <div className="messages-display">
              {messages.map((msg, index) => (
                  <div key={index} className={`message-item ${msg.userId === myUserId ? 'my-message' : 'opponent-message'}`}>
                      <strong>{msg.username}:</strong> {msg.message}
                      <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
              ))}
              <div ref={messagesEndRef} /> {/* For auto-scroll */}
          </div>
          <form onSubmit={handleSendMessage} className="message-input-form">
              <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={!socket.connected}
              />
              <button type="submit" disabled={!socket.connected || !currentMessage.trim()}>Send</button>
          </form>
      </div>

    </div>
  );
}

export default Game;
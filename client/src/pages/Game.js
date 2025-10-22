import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import AppHeader from '../pages/AppHeader'; // your header component

function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameStatusMessage, setGameStatusMessage] = useState('Connecting to game...');
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameOverWinner, setGameOverWinner] = useState(null);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [drawsScore, setDrawsScore] = useState(0);
  const [rematchStatus, setRematchStatus] = useState(null);
  const [opponentRequestedRematch, setOpponentRequestedRematch] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [myUserId, setMyUserId] = useState(socket.userId);
  const [myUsername, setMyUsername] = useState(socket.username);
  const [isLoading, setIsLoading] = useState(true);

  // Derived state
  const myPlayer = players.find((p) => p.userId === myUserId);
  const opponentPlayer = players.find((p) => p.userId !== myUserId);

  // Animated scoreboard tracking
  const [prevScores, setPrevScores] = useState({ wins: 0, losses: 0, draws: 0 });
  useEffect(() => {
    if (
      prevScores.wins !== player1Score ||
      prevScores.losses !== player2Score ||
      prevScores.draws !== drawsScore
    ) {
      const animatedEls = document.querySelectorAll('.score-value');
      animatedEls.forEach((el) => {
        el.classList.add('animate');
        setTimeout(() => el.classList.remove('animate'), 400);
      });
      setPrevScores({
        wins: player1Score,
        losses: player2Score,
        draws: drawsScore,
      });
    }
  }, [player1Score, player2Score, drawsScore, prevScores]);

  // Handlers
  const handleAuthSuccess = useCallback(({ userId, username }) => {
    setMyUserId(userId);
    setMyUsername(username);
  }, []);

  const handlePlayersUpdate = useCallback(
    (serverPlayers) => {
      setPlayers(serverPlayers);
      setIsLoading(false);

      const currentPlayer = serverPlayers.find((p) => p.userId === myUserId);
      if (currentPlayer) {
        setGameStatusMessage(
          `You are: ${currentPlayer.symbol}. ${
            serverPlayers.length < 2 ? 'Waiting for opponent...' : ''
          }`
        );
      } else if (serverPlayers.length === 2 && !currentPlayer) {
        setGameStatusMessage('Error: You are not a player in this room. Returning to lobby.');
        setTimeout(() => navigate('/lobby'), 3000);
      }
    },
    [navigate, myUserId]
  );

  const handleGameStart = useCallback(
    ({ board: initialBoard, turn: initialTurn, players: serverPlayers }) => {
      setBoard(initialBoard);
      setTurn(initialTurn);
      setPlayers(serverPlayers);
      setShowGameOverModal(false);
      setRematchStatus(null);
      setOpponentRequestedRematch(false);

      const currentPlayer = serverPlayers.find((p) => p.userId === myUserId);
      if (currentPlayer) {
        setGameStatusMessage(
        `You are: ${currentPlayer.symbol}. ${
         serverPlayers.length < 2 ? 'Waiting for opponent...' : ''
          }`
        );
      }
    },
    [myUserId]
  );

  const handleMoveMade = useCallback(({ board: newBoard }) => setBoard(newBoard), []);
  const handleTurnUpdate = useCallback(({ turn: newTurnUserId }) => setTurn(newTurnUserId), []);

  const handleGameOver = useCallback(
    ({ winner }) => {
      setGameOverWinner(winner);
      setShowGameOverModal(true);

      if (winner === 'Draw') {
        setDrawsScore((prev) => prev + 1);
      } else {
        if (winner === 'X') {
         // Increment the score for the 'X' player
        setPlayer1Score((prev) => prev + 1);
         } else if (winner === 'O') {
          // Increment the score for the 'O' player
         setPlayer2Score((prev) => prev + 1);
          }
      }
      setGameStatusMessage('Game over. Please choose an option from the modal.');
      setRematchStatus(null);
      setOpponentRequestedRematch(false);
    },
    [myPlayer]
  );

  const handlePlayerDisconnected = useCallback(
    ({ message }) => {
      setGameStatusMessage(message + ' Returning to lobby in 5 seconds.');
      setTurn(null);
      setShowGameOverModal(false);
      setRematchStatus(null);
      setOpponentRequestedRematch(false);
      setTimeout(() => navigate('/lobby'), 5000);
    },
    [navigate]
  );

  const handleMoveError = useCallback(
    ({ message }) => {
      setGameStatusMessage(`Error: ${message}`);
      setTimeout(
        () =>
          setGameStatusMessage((s) =>
            s.includes('Error') ? `Your turn, ${myUsername}!` : s
          ),
        3000
      );
    },
    [myUsername]
  );

  const handleRematchStatus = useCallback(({ message, status }) => {
    setRematchStatus({ message, status });
    setOpponentRequestedRematch(status === 'opponent-requested');
  }, []);

  const handleReceiveMessage = useCallback(
    (msg) => setMessages((prevMessages) => [...prevMessages, msg]),
    []
  );

  // Socket setup
  useEffect(() => {
    if (!roomId) {
      navigate('/lobby');
      return;
    }

    if (!socket.connected) {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        navigate('/login');
        return;
      }
      socket.auth.token = accessToken;
      socket.connect();
    }

    socket.on('auth-success', handleAuthSuccess);
    socket.on('players-update', handlePlayersUpdate);
    socket.on('game-start', handleGameStart);
    socket.on('move-made', handleMoveMade);
    socket.on('turn-update', handleTurnUpdate);
    socket.on('game-over', handleGameOver);
    socket.on('player-disconnected', handlePlayerDisconnected);
    socket.on('move-error', handleMoveError);
    socket.on('rematch-status', handleRematchStatus);
    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.off('auth-success', handleAuthSuccess);
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
    handlePlayersUpdate,
    handleGameStart,
    handleMoveMade,
    handleTurnUpdate,
    handleGameOver,
    handlePlayerDisconnected,
    handleMoveError,
    handleRematchStatus,
    handleReceiveMessage,
  ]);

  useEffect(() => {
    if (myUserId && socket.connected && roomId) {
      socket.emit('join-game-channel', roomId);
      socket.emit('request-game-state', roomId);
    }
  }, [myUserId, roomId]);

  // Scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- ACTIONS ---
  const handleClick = (index) => {
    if (showGameOverModal) {
      setGameStatusMessage('Game is over! Use the modal to proceed.');
    } else if (board[index]) {
      setGameStatusMessage('Cell already taken!');
    } else if (turn !== myUserId) {
      setGameStatusMessage("It's not your turn!");
    } else if (players.length < 2) {
      setGameStatusMessage('Waiting for opponent...');
    } else {
      socket.emit('make-move', { roomId, index });
      return;
    }
    setTimeout(() => setGameStatusMessage(''), 2000);
  };

  const handleRematchRequest = () => {
    socket.emit('request-rematch', { roomId });
    setRematchStatus({ message: 'Requesting rematch...', status: 'requesting' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim() && socket.connected) {
      socket.emit('send-message', { roomId, message: currentMessage.trim() });
      setCurrentMessage('');
    }
  };

  // Derived values
  const turnPlayer = players.find((p) => p.userId === turn);
  const myTurn = turn === myUserId;
  const displayTurnInfo = turnPlayer
    ? `${turnPlayer.username} (${turnPlayer.symbol})`
    : 'Waiting...';

  let displayMyScore = 0;
  let displayOpponentScore = 0;
  if (myPlayer?.symbol === 'X') {
    displayMyScore = player1Score;
    displayOpponentScore = player2Score;
  } else if (myPlayer?.symbol === 'O') {
    displayMyScore = player2Score;
    displayOpponentScore = player1Score;
  }

  if (isLoading || !myUserId) {
    return (
      <>
        <AppHeader username={myUsername} userId={myUserId} />
        <div className="loading-screen" style={{ textAlign: 'center', padding: '50px' }}>
          <p>Authenticating and loading game...</p>
        </div>
      </>
    );
  }

  // --- RENDER ---
  return (
    <div className="App">
      <AppHeader username={myUsername} userId={myUserId} />

      <div className="game-container">
        {/* ✅ Turn Indicator */}
        <div className={`turn-indicator ${myTurn ? 'your-turn' : 'opponent-turn'}`}>
          {myTurn ? '🟢 Your Turn' : '🔴 Opponent’s Turn'}
        </div>

        <div className="game-layout">
          <div className="game-left">
           <h1 className="game-title">
               {myUsername} ({myPlayer?.symbol}) vs {opponentPlayer?.username || 'Opponent'} ({opponentPlayer?.symbol})
           </h1>
            <p className="status-message">{gameStatusMessage}</p>

            {/* ✅ Scoreboard */}
            <div className="player-scores">
              <div className="score-item score-win">
                <span className="score-label">🏆 Wins</span>
                <span className="score-value">{displayMyScore}</span>
              </div>

              <div className="score-item score-loss">
                <span className="score-label">❌ Losses</span>
                <span className="score-value">{displayOpponentScore}</span>
              </div>

              <div className="score-item score-draw">
                <span className="score-label">🤝 Draws</span>
                <span className="score-value">{drawsScore}</span>
              </div>
            </div>

            {/* ✅ Game Board */}
            <div className="board">
              {board.map((cell, index) => (
                <div
                  className={`cell ${cell === 'X' ? 'X' : ''} ${cell === 'O' ? 'O' : ''}`}
                  key={index}
                  onClick={() => handleClick(index)}
                >
                  {cell}
                </div>
              ))}
            </div>
          </div>

          {/* ✅ Chat */}
          <div className="game-right">
            <div className="chat-container">
              <h3>In-Game Chat</h3>
              <div className="messages-display">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message-item ${
                      msg.userId === myUserId ? 'my-message' : 'opponent-message'
                    }`}
                  >
                    {msg.message}
                    <span className="timestamp small-timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="message-input-form">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={!socket.connected || players.length < 2}
                />
                <button
                  type="submit"
                  disabled={!socket.connected || !currentMessage.trim() || players.length < 2}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ✅ Game Over Modal */}
        {showGameOverModal && (
          <div className="game-over-modal-overlay">
            <div className="game-over-modal">
              <h2>Game Over!</h2>
              {gameOverWinner === 'Draw' ? (
                <h3 className="draw-text">It's a Draw!</h3>
              ) : (
                <>
                  {myPlayer?.symbol === gameOverWinner ? (
                    <h3 className="winner-text">You Win! 🎉</h3>
                  ) : (
                    <h3 className="loser-text">You Lost! 😟</h3>
                  )}
                  <p>
                    Winner:{' '}
                    <strong>
                      {players.find((p) => p.symbol === gameOverWinner)?.username || 'Unknown'}
                    </strong>
                  </p>
                </>
              )}

              <div className="modal-actions">
                {players.length === 2 && (
                  <button
                    onClick={handleRematchRequest}
                    disabled={rematchStatus?.status === 'requesting'}
                    className="rematch-btn"
                  >
                    {rematchStatus?.status === 'requesting'
                      ? 'Requesting...'
                      : opponentRequestedRematch
                      ? 'Accept Rematch'
                      : 'Play Again'}
                  </button>
                )}
                <button onClick={() => navigate('/lobby')} className="lobby-btn">
                  Return to Lobby
                </button>
              </div>

              {rematchStatus && rematchStatus.status !== 'requesting' && (
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
      </div>
    </div>
  );
}

export default Game;

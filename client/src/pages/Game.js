import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';

function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [board, setBoard] = useState(Array(9).fill(null));
  const [symbol, setSymbol] = useState(null);
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

  const myPlayer = players.find(p => p.userId === myUserId);
  const opponentPlayer = players.find(p => p.userId !== myUserId);

  useEffect(() => {
    const handleAuthSuccess = ({ userId, username }) => {
      setMyUserId(userId);
      setMyUsername(username);
    };

    const handleConnect = () => {
      socket.emit('request-game-state', roomId);
    };

    const handlePlayersUpdate = (serverPlayers) => {
      setPlayers(serverPlayers);
      const currentPlayer = serverPlayers.find(p => p.userId === myUserId);
      if (currentPlayer) {
        setSymbol(currentPlayer.symbol);
        setGameStatusMessage(
          `You are: ${currentPlayer.symbol}. ${serverPlayers.length < 2 ? 'Waiting for opponent...' : ''}`
        );
      }
    };

    const handleGameStart = ({ board: initialBoard, turn: initialTurn, players: serverPlayers }) => {
      setBoard(initialBoard);
      setTurn(initialTurn);
      setPlayers(serverPlayers);
      const currentPlayer = serverPlayers.find(p => p.userId === myUserId);
      if (currentPlayer) {
        setSymbol(currentPlayer.symbol);
        setGameStatusMessage(`You are: ${currentPlayer.username} (${currentPlayer.symbol})`);
      }
      setShowGameOverModal(false);
      setRematchStatus(null);
      setOpponentRequestedRematch(false);
    };

    const handleMoveMade = ({ board: newBoard }) => setBoard(newBoard);
    const handleTurnUpdate = ({ turn: newTurnUserId }) => setTurn(newTurnUserId);

    const handleGameOver = ({ winner }) => {
      setGameOverWinner(winner);
      setShowGameOverModal(true);

      if (winner === 'Draw') {
        setDrawsScore(prev => prev + 1);
      } else if (winner === 'X') {
        setPlayer1Score(prev => prev + 1);
      } else if (winner === 'O') {
        setPlayer2Score(prev => prev + 1);
      }

      setBoard(Array(9).fill(null));
      setTurn(null);
      setSymbol(null);
      setGameStatusMessage('Game over. Please choose an option from the popup.');
      setRematchStatus(null);
      setOpponentRequestedRematch(false);
    };

    const handlePlayerDisconnected = ({ message }) => {
      setGameStatusMessage(message);
      setBoard(Array(9).fill(null));
      setTurn(null);
      setPlayers([]);
      setSymbol(null);
      setShowGameOverModal(false);
      setRematchStatus(null);
      setOpponentRequestedRematch(false);
    };

    const handleMoveError = ({ message }) => {
      setGameStatusMessage(`Error: ${message}`);
      setTimeout(
        () =>
          setGameStatusMessage(
            s => (s ? `You are: ${s}` : 'Waiting for opponent...')
          ),
        3000
      );
    };

    const handleRematchStatus = ({ message, status }) => {
      setRematchStatus({ message, status });
      setOpponentRequestedRematch(status === 'opponent-requested');
    };

    const handleReceiveMessage = (msg) =>
      setMessages(prevMessages => [...prevMessages, msg]);

    if (!roomId) {
      navigate('/lobby');
      return;
    }

    if (socket.connected) socket.emit('request-game-state', roomId);

    socket.on('auth-success', handleAuthSuccess);
    socket.on('connect', handleConnect);
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
  }, [roomId, navigate, myUserId]);

  useEffect(() => {
    if (messagesEndRef.current)
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClick = (index) => {
    if (board[index] || turn !== myUserId || !symbol || showGameOverModal) {
      let msg = '';
      if (showGameOverModal) msg = 'Game is over!';
      else if (board[index]) msg = 'Cell already taken!';
      else if (turn !== myUserId) msg = "It's not your turn!";
      else if (!symbol) msg = 'Waiting for your symbol assignment (or opponent).';
      setGameStatusMessage(msg);
      setTimeout(
        () =>
          setGameStatusMessage(
            s => (s ? `You are: ${s}` : 'Waiting for opponent...')
          ),
        3000
      );
      return;
    }
    socket.emit('make-move', { roomId, index });
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

  const turnPlayer = players.find(p => p.userId === turn);
  const displayTurnInfo = turnPlayer
    ? `${turnPlayer.username} (${turnPlayer.symbol})`
    : turn
    ? 'Looking up user...'
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

  // client/src/pages/Game.js
// ... (all the logic, state, and handlers above) ...

return (
  <div className="App">
    <h1>🎮 Multiplayer Tic-Tac-Toe</h1>

    {/* This is the main Flexbox container for side-by-side content */}
    <div className="game-layout">

      {/* This is the 65% left column for all game-related UI */}
      <div className="game-left">
        <p>
          You are: <strong>{myUsername || '...'} ({symbol || '...'})</strong>
        </p>

        <div className="player-scores">
          <span>{myUsername || 'You'}: <strong>{displayMyScore}</strong></span> |
          <span> {opponentPlayer ? opponentPlayer.username : 'Opponent'}: <strong>{displayOpponentScore}</strong></span> |
          <span> Draws: <strong>{drawsScore}</strong></span>
        </div>

        {players.length === 2 && (
          <p className={`turn-indicator ${turn === myUserId ? 'my-turn' : 'opponent-turn'}`}>
            Turn: <strong>{displayTurnInfo}</strong>
          </p>
        )}

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

      {/* This is the 35% right column for the chatbox */}
      <div className="game-right">
        <div className="chat-container">
          <div className="messages-display">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message-item ${msg.userId === myUserId ? 'my-message' : 'opponent-message'}`}
              >
                <strong>{msg.username}:</strong> {msg.message}
                <span className="timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString()}
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
              disabled={!socket.connected}
            />
            <button type="submit" disabled={!socket.connected || !currentMessage.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>

    </div> {/* End of .game-layout */}

    {/* The Game Over Modal stays outside the main layout container */}
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
                Winner: <strong>
                  {players.find(p => p.symbol === gameOverWinner)?.username || 'Unknown'} (
                  {players.find(p => p.symbol === gameOverWinner)?.symbol || ''}
                )
                </strong>
              </p>
            </>
          )}

          <div className="modal-actions">
            {players.length === 2 && (
              <button
                onClick={handleRematchRequest}
                disabled={rematchStatus?.status === 'requesting'}
                style={{ marginRight: '10px' }}
              >
                {rematchStatus?.status === 'requesting' ? 'Requesting...' : opponentRequestedRematch ? 'Accept Rematch' : 'Play Again'}
              </button>
            )}
            <button
              onClick={() => {
                setShowGameOverModal(false);
                navigate('/lobby');
              }}
            >
              Return to Lobby
            </button>
          </div>

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
  </div>
);

// ... (rest of the file) ...
}

export default Game;

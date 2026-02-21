// tik-tok-toe/server/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const gameManager = require('./utils/gameManager');
const User = require('./models/User');


const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;

app.use(cors({
    origin:  CLIENT_URL ,
    credentials: true
}));

app.use(express.json());
app.use('/api/auth', authRoutes);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
    })
    .catch(err => console.error('❌ MongoDB Error:', err));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Token not provided'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }
        socket.userId = user._id.toString();
        socket.username = user.username;

        gameManager.updatePlayerSocketId(socket.userId, socket.id);

        console.log(`Socket ${socket.id} authenticated for user: ${socket.username} (${socket.userId})`);
        socket.emit('auth-success', { userId: socket.userId, username: socket.username });
        next();
    } catch (err) {
        console.error(`Authentication error for socket ${socket.id}:`, err.message);
        return next(new Error(`Authentication error: ${err.message}`)); // Pass more specific error to client
    }
});


io.on('connection', (socket) => {
    console.log(`✅Connected: ${socket.id} (User: ${socket.username})`);

    // --- Lobby Related Socket Events ---
    socket.on('request-active-games', () => {
        socket.emit('active-games-update', gameManager.getAvailableRooms());
        console.log(`Lobby: ${socket.id} (${socket.username}) requested active games.`);
    });

    socket.on('create-game', ({ gameName }) => {
        const { roomId, room } = gameManager.createRoom(socket.userId, socket.username, socket.id, gameName);
        socket.join(roomId);
        socket.emit('game-created', { roomId });
        // io.emit('active-games-update', gameManager.getAvailableRooms());
        console.log(`Lobby: ${socket.id} (${socket.username}) created room ${roomId}`);
    });

    socket.on('join-existing-game', ({ roomId }) => {
        const result = gameManager.joinRoom(roomId.toUpperCase(), socket.userId, socket.username, socket.id);
        if (result.success) {
            socket.join(roomId);
            socket.emit('joined-game', { roomId });

            const room = gameManager.getRoom(roomId);
            if (room) {
                io.to(roomId).emit('players-update', room.players.map(p => ({
                    userId: p.userId,
                    username: p.username,
                    symbol: room.symbols[p.userId]
                })));
                console.log(`Lobby: ${socket.id} (${socket.username}) joined room ${roomId}. Room has ${room.players.length} players.`);

                if (room.status === 'in-progress') {
                    io.to(roomId).emit('game-start', {
                        board: room.board,
                        turn: room.turn,
                        players: room.players.map(p => ({userId: p.userId, username: p.username, symbol: room.symbols[p.userId]}))
                    });
                    console.log(`Game in room ${roomId} started.`);
                }
            }
            // io.emit('active-games-update', gameManager.getAvailableRooms());
        } else {
            socket.emit('join-error', { message: result.message });
            console.log(`Lobby: ${socket.id} (${socket.username}) failed to join room ${roomId}: ${result.message}`);
        }
    });

    socket.on('join-game-channel', (roomId) => {
        console.log(`CLIENT ${socket.id} (${socket.username}) REQUESTED TO JOIN GAME CHANNEL for room ${roomId}`);
        socket.join(roomId);
        console.log(`SERVER: Socket ${socket.id} (${socket.username}) added to room channel ${roomId}`);
    });

    socket.on('request-game-state', (roomId) => {
        console.log(`CLIENT ${socket.id} (${socket.username}) REQUESTED GAME STATE for room ${roomId}`);
        const room = gameManager.getRoom(roomId);
        if (room) {
            socket.emit('players-update', room.players.map(p => ({
                userId: p.userId,
                username: p.username,
                symbol: room.symbols[p.userId]
            })));

            if (room.status === 'in-progress' || room.status === 'finished' || room.status === 'abandoned') {
                socket.emit('game-start', {
                    board: room.board,
                    turn: room.turn,
                    players: room.players.map(p => ({userId: p.userId, username: p.username, symbol: room.symbols[p.userId]}))
                });
            }
            console.log(`SERVER SENT GAME STATE to ${socket.id} (${socket.username}) for room ${roomId}`);
        } else {
            socket.emit('game-state-error', { message: 'Requested game room not found.' });
            console.log(`SERVER: Room ${roomId} not found for state request by ${socket.id} (${socket.username})`);
        }
    });

    // --- In-Game Play Related Socket Events ---
    socket.on('make-move', ({ roomId, index }) => {
        const result = gameManager.makeMove(roomId, socket.userId, index);

        if (!result.success) {
            socket.emit('move-error', { message: result.message });
            console.log(`Game: ${socket.id} (${socket.username}) failed to make move in ${roomId}: ${result.message}`);
            return;
        }

        io.to(roomId).emit('move-made', { board: result.board });
        console.log(`Game: Move made in room ${roomId} by ${socket.username} at index ${index}.`);

        if (result.isGameOver) {
            io.to(roomId).emit('game-over', { winner: result.winner });
            // io.emit('active-games-update', gameManager.getAvailableRooms()); // Update lobby
            console.log(`Game: Room ${roomId} game over. Winner: ${result.winner}`);
        } else {
            io.to(roomId).emit('turn-update', { turn: result.turn });
            const currentRoom = gameManager.getRoom(roomId);
            if (currentRoom) {
                console.log(`Game: Turn in room ${roomId} switched to ${currentRoom.players.find(p => p.userId === result.turn)?.username}`);
            }
        }
    });

    // ✅ NEW: Rematch Request Handler
    socket.on('request-rematch', ({ roomId }) => {
        console.log(`🎮 Rematch request from ${socket.username} (${socket.userId}) for room ${roomId}`);
        const result = gameManager.requestRematch(roomId, socket.userId);

        if (result.success) {
            if (result.bothRequested) {
                const room = gameManager.getRoom(roomId);
                if (room) {
                    // Emit game-start to both players to reset and begin new game
                    io.to(roomId).emit('game-start', {
                        board: room.board,
                        turn: room.turn,
                        players: room.players.map(p => ({userId: p.userId, username: p.username, symbol: room.symbols[p.userId]}))
                    });
                    console.log(`🎮 Both players in room ${roomId} accepted rematch. New game started.`);
                }
            } else {
                // Notify the requesting player they are waiting
                socket.emit('rematch-status', { message: result.message, status: 'waiting-for-opponent' });
                // Optionally notify opponent that a rematch was requested
                const room = gameManager.getRoom(roomId);
                const opponent = room.players.find(p => p.userId !== socket.userId);
                if (opponent && io.sockets.sockets.get(opponent.socketId)) { // Ensure opponent is connected
                    io.sockets.sockets.get(opponent.socketId).emit('rematch-status', { message: `${socket.username} requested a rematch!`, status: 'opponent-requested' });
                }
            }
        } else {
            socket.emit('rematch-status', { message: result.message, status: 'error' });
            console.log(`🎮 Rematch request failed for ${socket.username}: ${result.message}`);
        }
    });

    // ✅ NEW: Chat Message Handler
    socket.on('send-message', ({ roomId, message }) => {
        console.log(`💬 Message in room ${roomId} from ${socket.username}: ${message}`);
        // Broadcast message to all clients in that room
        io.to(roomId).emit('receive-message', {
            username: socket.username,
            userId: socket.userId, // Optional: send userId for styling based on sender
            message: message,
            timestamp: Date.now()
        });
    });


    socket.on('disconnect', () => {
        console.log(`❌Disconnected: ${socket.id} (User: ${socket.username})`);
        const { roomDeleted, roomId: disconnectedFromRoomId, playerStillInRoom, remainingPlayerUserId, disconnectedUsername } = gameManager.handleDisconnect(socket.id);

        if (roomDeleted || (playerStillInRoom && disconnectedFromRoomId)) {
            // io.emit('active-games-update', gameManager.getAvailableRooms());
            console.log(`Disconnected: Room ${disconnectedFromRoomId} was deleted.`);
        } else if (playerStillInRoom && disconnectedFromRoomId) {
            const currentRoom = gameManager.getRoom(disconnectedFromRoomId);
            const remainingUsername = currentRoom ? currentRoom.players.find(p => p.userId === remainingPlayerUserId)?.username : 'Unknown';

            io.to(disconnectedFromRoomId).emit('player-disconnected', { message: `Opponent (${disconnectedUsername}) disconnected. Game ended.` });
            io.emit('active-games-update', gameManager.getAvailableRooms());
            console.log(`Disconnected: Player ${remainingUsername} left alone in room ${disconnectedFromRoomId}. Game abandoned.`);
        }
    });
});

console.log(`🌐 Environment variables check:`);
console.log(`CLIENT_URL = ${CLIENT_URL}`);
console.log(`SERVER_URL = ${SERVER_URL}`);
console.log(`PORT = ${PORT}`);

// ✅ Render-compatible port binding
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${PORT} (Render-compatible binding)`);
});

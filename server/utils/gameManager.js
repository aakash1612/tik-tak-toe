// tik-tok-toe/server/utils/gameManager.js

const activeRooms = new Map();

let roomIdCounter = 0;
function generateRoomId() {
    roomIdCounter++;
    return `room_${roomIdCounter}`;
}

function checkWinner(board) {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns (CORRECTED: 2,5,8 is the third column)
        [0, 4, 8], [2, 4, 6],           // diagonals
    ];
    for (let [a, b, c] of wins) {
        
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; // Returns 'X' or 'O' (the winning symbol)
        }
    }
    // Check for Draw condition: If no winner AND board is full
    if (!board.includes(null)) {
        return 'Draw'; // Returns the string 'Draw' if it's a draw
    }
    return null; // No winner, board not full yet
}

/**
 * Creates a new game room.
 * @param {string} creatorUserId The user ID of the player creating the room.
 * @param {string} creatorUsername The username of the player creating the room.
 * @param {string} creatorSocketId The socket ID of the player creating the room.
 * @param {string} [gameName='Unnamed Game'] An optional name for the game.
 * @returns {{roomId: string, room: object}} The ID and initial state of the created room.
 */
function createRoom(creatorUserId, creatorUsername, creatorSocketId, gameName = 'Unnamed Game') {
    const roomId = generateRoomId();
    const newRoom = {
        id: roomId,
        name: gameName,
        players: [{ userId: creatorUserId, username: creatorUsername, socketId: creatorSocketId }],
        board: Array(9).fill(null),
        turn: creatorUserId, // Creator starts
        status: 'waiting',
        symbols: {},
        rematchRequests: new Set() // To track rematch requests by userId
    };
    activeRooms.set(roomId, newRoom);
    console.log(`🎮 Room created: ${roomId} by ${creatorUsername} (${creatorUserId}) - Socket: ${creatorSocketId}`);
    return { roomId, room: newRoom };
}

/**
 * Joins an existing game room.
 * @param {string} roomId The ID of the room to join.
 * @param {string} playerUserId The user ID of the player joining.
 * @param {string} playerUsername The username of the player joining.
 * @param {string} playerSocketId The socket ID of the player joining.
 * @returns {{success: boolean, message: string, room?: object}} Result of the join attempt.
 */
function joinRoom(roomId, playerUserId, playerUsername, playerSocketId) {
    const room = activeRooms.get(roomId);

    if (!room) {
        return { success: false, message: 'Room not found.' };
    }

    // Reject if room is full AND the player is NOT already in it (reconnecting)
    if (room.players.length >= 2 && !room.players.some(p => p.userId === playerUserId)) {
        return { success: false, message: 'Room is full.' };
    }

    // Handle reconnection scenario (player already in room, just update socketId)
    if (room.players.some(p => p.userId === playerUserId)) {
        const existingPlayer = room.players.find(p => p.userId === playerUserId);
        existingPlayer.socketId = playerSocketId; // Update their socket ID on reconnection
        console.log(`🎮 Player ${playerUsername} (${playerUserId}) reconnected to room ${roomId}. New socket: ${playerSocketId}`);
        return { success: true, message: 'Rejoined room successfully.', room: room };
    }

    // Add new player (this path is only for a second player joining a 'waiting' room)
    if (room.status !== 'waiting' || room.players.length !== 1) {
    
        return { success: false, message: 'Room is not available for new players.' };
    }
    
    // This is the case where a second, new player joins a 'waiting' room
    room.players.push({ userId: playerUserId, username: playerUsername, socketId: playerSocketId });
    room.status = 'in-progress'; // Game starts!
    room.symbols[room.players[0].userId] = 'X';
    room.symbols[room.players[1].userId] = 'O';
    room.turn = room.players[0].userId; // First player starts
    room.rematchRequests.clear(); // Clear any stale requests
    room.board = Array(9).fill(null); // Ensure board is clean for a fresh game

    console.log(`🎮 Player ${playerUsername} (${playerUserId}) joined room: ${roomId}. Game started! - Socket: ${playerSocketId}`);
    return { success: true, message: 'Joined room successfully.', room: room };
}

/**
 * Makes a move on the game board.
 * @param {string} roomId The ID of the room.
 * @param {string} playerUserId The user ID of the player making the move.
 * @param {number} index The index of the cell to play on.
 * @returns {{success: boolean, message: string, board?: string[], winner?: string, turn?: string, players?: object[], isGameOver: boolean}} Result of the move.
 */
function makeMove(roomId, playerUserId, index) {
    const room = activeRooms.get(roomId);

    if (!room) {
        return { success: false, message: 'Game room not found.' };
    }
    if (room.status !== 'in-progress') {
        return { success: false, message: 'Game is not in progress.' };
    }
    if (playerUserId !== room.turn) {
        return { success: false, message: 'It\'s not your turn.' };
    }
    if (room.board[index] !== null) {
        return { success: false, message: 'Cell already taken.' };
    }
    if (index < 0 || index > 8) {
        return { success: false, message: 'Invalid board index.' };
    }

    const symbol = room.symbols[playerUserId];
    room.board[index] = symbol;

    const winnerResult = checkWinner(room.board); // 'X', 'O', 'Draw', or null
    let message = 'Move made.';
    let isGameOver = false;
    let winner = null;

    if (winnerResult === 'Draw') {
        room.status = 'finished';
        message = 'It\'s a Draw!';
        isGameOver = true;
        winner = 'Draw';
    } else if (winnerResult) { // If winnerResult is 'X' or 'O'
        room.status = 'finished';
        message = `${winnerResult} wins!`;
        isGameOver = true;
        winner = winnerResult;
    } else { // Game is not over, switch turns
        room.turn = room.players.find(p => p.userId !== playerUserId).userId;
    }

    return {
        success: true,
        message,
        board: room.board,
        winner: winner, // Will be 'X', 'O', 'Draw', or null
        turn: room.turn,
        players: room.players.map(p => ({userId: p.userId, username: p.username, symbol: room.symbols[p.userId]})),
        isGameOver: isGameOver // True if win or draw, false otherwise
    };
}

/**
 * Handles a player disconnecting.
 * Finds the room based on the disconnected socketId and updates player status/removes player.
 * @param {string} disconnectedSocketId The ID of the disconnected socket.
 * @returns {{roomDeleted: boolean, roomId?: string, playerStillInRoom: boolean, remainingPlayerUserId?: string, disconnectedUsername?: string}} Result of disconnect handling.
 */
function handleDisconnect(disconnectedSocketId) {
    let roomDeleted = false;
    let deletedRoomId = null;
    let playerStillInRoom = false;
    let remainingPlayerUserId = null;
    let disconnectedUsername = 'Unknown User';

    for (const [roomId, room] of activeRooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.socketId === disconnectedSocketId);

        if (playerIndex !== -1) {
            const disconnectedPlayer = room.players[playerIndex];
            disconnectedUsername = disconnectedPlayer.username;
            console.log(`🎮 Player ${disconnectedUsername} (socket ${disconnectedSocketId}) disconnected from room ${roomId}`);

            room.players.splice(playerIndex, 1);
            room.rematchRequests.delete(disconnectedPlayer.userId); // Clear rematch request if disconnected

            if (room.players.length === 0) {
                activeRooms.delete(roomId);
                console.log(`🎮 Room ${roomId} deleted due to no players left.`);
                roomDeleted = true;
                deletedRoomId = roomId;
            } else if (room.players.length === 1 && room.status === 'in-progress') {
                // If one player remains in an in-progress game, mark room as abandoned
                room.status = 'abandoned';
                remainingPlayerUserId = room.players[0].userId;
                console.log(`🎮 Room ${roomId} set to abandoned. Remaining player: ${room.players[0].username} (${remainingPlayerUserId})`);
                playerStillInRoom = true;
                deletedRoomId = roomId;
            }
            break;
        }
    }
    return { roomDeleted, roomId: deletedRoomId, playerStillInRoom, remainingPlayerUserId, disconnectedUsername };
}

function deleteRoom(roomId) {
    activeRooms.delete(roomId);
    console.log(`🎮 Room ${roomId} explicitly deleted.`);
}

function getAvailableRooms() {
    const available = [];
    for (const [roomId, room] of activeRooms.entries()) {
        // Only show rooms that are waiting and have less than 2 players
        if (room.status === 'waiting' && room.players.length < 2) {
            available.push({
                id: roomId,
                name: room.name,
                playerCount: room.players.length,
                status: room.status
            });
        }
    }
    return available;
}

/**
 * Retrieves a room by its ID.
 * @param {string} roomId The ID of the room.
 * @returns {object | undefined} The room object, or undefined if not found.
 */
function getRoom(roomId) {
    return activeRooms.get(roomId);
}

/**
 * Updates a player's current socketId in any room they are currently in.
 * This is crucial for handling reconnections where a userId's socketId might change.
 * @param {string} userId The stable user ID.
 * @param {string} newSocketId The new socket ID for this user.
 * @returns {boolean} True if the player was found and their socketId updated.
 */
function updatePlayerSocketId(userId, newSocketId) {
    for (const room of activeRooms.values()) {
        const player = room.players.find(p => p.userId === userId);
        if (player) {
            if (player.socketId !== newSocketId) {
                console.log(`🎮 Updating socket ID for user ${player.username} (${userId}) in room ${room.id} from ${player.socketId} to ${newSocketId}`);
                player.socketId = newSocketId;
                return true;
            }
        }
    }
    return false;
}

/**
 * Handles a player's request for a rematch.
 * @param {string} roomId The ID of the room.
 * @param {string} requestingUserId The user ID requesting the rematch.
 * @returns {{success: boolean, message: string, bothRequested: boolean, room?: object}}
 */
function requestRematch(roomId, requestingUserId) {
    const room = activeRooms.get(roomId);

    if (!room) {
        return { success: false, message: 'Room not found for rematch.' };
    }
    if (room.players.length < 2) {
        return { success: false, message: 'Cannot rematch: Not enough players in room.' };
    }
    // Only allow rematch if game is finished or abandoned (not in progress)
    if (room.status === 'in-progress') {
        return { success: false, message: 'Game is still in progress.' };
    }

    room.rematchRequests.add(requestingUserId);
    console.log(`🎮 Rematch request in room ${roomId} by ${requestingUserId}. Current requests: ${[...room.rematchRequests]}`);

    const allPlayersRequested = room.players.every(p => room.rematchRequests.has(p.userId));

    if (allPlayersRequested) {
        resetGame(roomId); // Reset game if both requested
        return { success: true, message: 'Rematch accepted!', bothRequested: true, room: room };
    }

    return { success: true, message: 'Rematch request sent. Waiting for opponent.', bothRequested: false, room: room };
}

/**
 * Resets the game state for a room, keeping players.
 * @param {string} roomId The ID of the room to reset.
 * @returns {object | null} The reset room object, or null if not found.
 */
function resetGame(roomId) {
    const room = activeRooms.get(roomId);
    if (room) {
        room.board = Array(9).fill(null);
        room.status = 'in-progress'; // Reset to in-progress
        // Randomly decide who goes first, or alternate. For now, let's alternate or stick to P1.
        room.turn = room.players[0].userId; // Creator starts
        room.rematchRequests.clear(); // Clear requests after resetting
        console.log(`🎮 Game in room ${roomId} has been reset.`);
        return room;
    }
    return null;
}

module.exports = {
    createRoom,
    joinRoom,
    makeMove,
    handleDisconnect,
    deleteRoom,
    getAvailableRooms,
    getRoom,
    updatePlayerSocketId,
    requestRematch,
    resetGame
};
import { PROBLEMS } from './problems.js';
import { generateTestScript, executeCodeOnWandbox } from './wandbox.js';

function startCountdownAndGame(io, room, activeRooms) {
    room.status = 'countdown';
    if (!room.problem) {
        room.problem = PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
    }

    io.to(room.roomId).emit('game-countdown', {
        message: "Game is starting soon...",
        problem: room.problem,
        language: room.language
    });

    if (room.timer) clearTimeout(room.timer);
    if (room.countdownTimer) clearInterval(room.countdownTimer);

    let count = 3;
    io.to(room.roomId).emit('countdown-tick', { count });
    count--;

    room.countdownTimer = setInterval(() => {
        if (!activeRooms.has(room.roomId) || room.players.length < 2) {
            clearInterval(room.countdownTimer);
            return;
        }

        if (count > 0) {
            io.to(room.roomId).emit('countdown-tick', { count });
            count--;
        } else if (count === 0) {
            io.to(room.roomId).emit('countdown-tick', { count: "GO!" });
            count--;
        } else {
            clearInterval(room.countdownTimer);
            room.status = 'playing';
            const durationMs = 5 * 60 * 1000;
            room.timer = setTimeout(() => {
                const currentRoom = activeRooms.get(room.roomId);
                if (currentRoom && currentRoom.status === 'playing') {
                    currentRoom.status = 'finished';
                    io.to(room.roomId).emit('game-result', {
                        status: 'loser',
                        message: "Time's up! Neither of you solved the problem in time. It's a draw! ⏳"
                    });
                }
            }, durationMs);

            room.startTime = Date.now();
            room.durationMs = durationMs;

            io.to(room.roomId).emit('start-game', {
                message: "Game started! You have 5 minutes.",
                problem: room.problem,
                startTime: room.startTime,
                durationMs: room.durationMs,
                language: room.language
            });
        }
    }, 1000);
}

export function setupSocket(io, activeRooms) {
    io.on('connection', (socket) => {
        console.log("A user connected. Socket id: " + socket.id);

        socket.on('join-room', (payload) => {
            let roomId, action, language;
            if (typeof payload === 'string') {
                roomId = payload;
                action = 'join';
            } else {
                roomId = payload.roomId;
                action = payload.action || 'join';
                language = payload.language || 'cpp';
            }

            if (!activeRooms.has(roomId)) {
                if (action !== 'create') {
                    socket.emit('room-not-found', { message: 'Room not found. Please enter a valid code or create a new room.' });
                    return;
                }
                activeRooms.set(roomId, {
                    roomId: roomId,
                    language: language,
                    players: [],
                    submissions: [],
                    timer: null,
                    playAgainVotes: new Set()
                });
            }
            const room = activeRooms.get(roomId);

            if (room.players.length >= 2) {
                socket.emit('room-full', { message: 'Room is full.' });
                return;
            }

            room.players.push(socket.id);
            socket.join(roomId);

            if (room.disconnectTimeout) {
                clearTimeout(room.disconnectTimeout);
                room.disconnectTimeout = null;
            }

            console.log("Socket : " + socket.id + " joined room: " + roomId);

            // Send room info (language) to the joining player
            socket.emit('room-joined', { language: room.language });

            if (room.status === 'playing') {
                socket.emit('start-game', {
                    message: "You have reconnected to the game!",
                    problem: room.problem,
                    startTime: room.startTime,
                    durationMs: room.durationMs,
                    language: room.language
                });
                socket.broadcast.to(roomId).emit('opponent-reconnected');
            } else if (room.status === 'countdown') {
                socket.broadcast.to(roomId).emit('opponent-reconnected');
                startCountdownAndGame(io, room, activeRooms);
            } else if (room.status === 'finished') {
                socket.emit('game-result', {
                    status: 'loser',
                    message: "The match was already over; you reconnected."
                });
            } else {
                if (room.players.length === 2) {
                    startCountdownAndGame(io, room, activeRooms);
                }
            }
        });

        socket.on('code-update', (data) => {
            socket.broadcast.to(data.roomId).emit('code-update', { code: data.code });
        });

        socket.on('send-reaction', (data) => {
            socket.broadcast.to(data.roomId).emit('receive-reaction', { emoji: data.emoji });
        });

        socket.on('submit-code', async (data) => {
            const room = activeRooms.get(data.roomId);
            if (!room || room.status !== 'playing') return;

            const selectedLanguage = room.language || 'cpp';

            const existingSubIndex = room.submissions.findIndex(s => s.socketId === socket.id);
            if (existingSubIndex !== -1) {
                room.submissions[existingSubIndex] = { socketId: socket.id, code: data.code, timestamp: Date.now() };
            } else {
                room.submissions.push({ socketId: socket.id, code: data.code, timestamp: Date.now() });
            }

            socket.emit('game-result', { status: 'pending', message: 'Code received, evaluating... ⏳' });

            const fullCode = generateTestScript(data.code, room.problem.testCases, selectedLanguage);
            try {
                const result = await executeCodeOnWandbox(fullCode, selectedLanguage);

                if (result.status === "137") {
                    socket.emit('game-result', {
                        status: 'error',
                        message: 'Your code ran too long (Infinite Loop) or exceeded memory limits. Please check it! ⏱️'
                    });
                    return;
                }

                const output = (result.program_output || "").trim();
                const stderr = (result.program_error || "").trim();

                const lines = output.split('\n');
                const testResults = [];
                let passedCount = 0;

                for (const line of lines) {
                    if (line.startsWith('[TEST]')) {
                        const parts = line.split('|');
                        const testNum = parts[0].replace('[TEST]', '').trim();
                        const status = parts[1];
                        if (status === 'PASS') {
                            passedCount++;
                            testResults.push({ testNum, status: 'PASS' });
                        } else {
                            const detail = parts.slice(2).join('|');
                            testResults.push({ testNum, status, detail });
                        }
                    }
                }

                if (room.status !== 'playing') return;

                if (passedCount === room.problem.testCases.length) {
                    room.status = 'finished';
                    if (room.timer) clearTimeout(room.timer);

                    socket.emit('game-result', {
                        status: 'winner',
                        message: "You won! You passed all the tests. 🎉",
                        testResults
                    });

                    socket.broadcast.to(data.roomId).emit('game-result', {
                        status: 'loser',
                        message: "Your opponent won the match by passing all the tests. Unfortunately, you lost! 💔"
                    });
                } else {
                    let failMsg = "Some tests failed. Review them! ❌";
                    if (stderr) failMsg = "Your code threw an exception during execution! ❌";

                    socket.emit('game-result', {
                        status: 'error',
                        message: failMsg,
                        testResults
                    });
                }
            } catch (error) {
                console.error("Evaluation error:", error);
                if (error.message === 'TIMEOUT') {
                    socket.emit('game-result', {
                        status: 'error',
                        message: 'Evaluation timeout! The code execution took too long (infinite loop?). ⏱️'
                    });
                } else {
                    socket.emit('game-result', {
                        status: 'error',
                        message: 'An error occurred during evaluation.'
                    });
                }
            }
        });

        socket.on('play-again', (data) => {
            const room = activeRooms.get(data.roomId);
            if (!room || room.status !== 'finished') return;

            if (!room.playAgainVotes) room.playAgainVotes = new Set();
            room.playAgainVotes.add(socket.id);

            if (room.playAgainVotes.size === 2) {
                room.playAgainVotes.clear();
                room.submissions = [];
                room.problem = null;
                startCountdownAndGame(io, room, activeRooms);
            } else {
                socket.broadcast.to(data.roomId).emit('opponent-wants-rematch');
            }
        });

        socket.on('disconnect', () => {
            console.log("A user disconnected. Socket id: " + socket.id);

            for (const [roomId, room] of activeRooms.entries()) {
                const playerIndex = room.players.indexOf(socket.id);
                if (playerIndex !== -1) {
                    room.players.splice(playerIndex, 1);
                    socket.broadcast.to(roomId).emit('opponent-disconnected', { message: 'Opponent has disconnected' });

                    if (room.players.length === 0) {
                        if (room.timer) clearTimeout(room.timer);
                        if (room.countdownTimer) clearInterval(room.countdownTimer);
                        activeRooms.delete(roomId);
                        console.log("Room " + roomId + " deleted due to no players");
                    } else {
                        room.playAgainVotes.delete(socket.id);

                        // 15 saniye içinde dönmezse maçı kaybeder
                        if (room.status === 'playing' || room.status === 'countdown') {
                            if (room.disconnectTimeout) clearTimeout(room.disconnectTimeout);

                            room.disconnectTimeout = setTimeout(() => {
                                const currentRoom = activeRooms.get(roomId);
                                if (currentRoom && currentRoom.players.length === 1 &&
                                    (currentRoom.status === 'playing' || currentRoom.status === 'countdown')) {

                                    currentRoom.status = 'finished';
                                    io.to(roomId).emit('game-result', {
                                        status: 'winner',
                                        message: "The opponent left the game. You won by default! 🏆"
                                    });
                                }
                            }, 15000);
                        }
                    }
                }
            }
        });
    });
}

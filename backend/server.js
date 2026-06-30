import express from "express";
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import 'dotenv/config';
import { setupSocket } from './socketHandler.js';

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});

const activeRooms = new Map();

app.get('/api/create-room', (req, res) => {
    let randomNum;
    let newRoomId;
    do {
        randomNum = Math.floor(1000 + Math.random() * 9000);
        newRoomId = `code-duel-${randomNum}`;
    } while (activeRooms.has(newRoomId));
    res.json({ roomId: newRoomId });
});

setupSocket(io, activeRooms);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log("Server is running on port: " + PORT);
});
# CodeDuel ⚔️

**CodeDuel** is a real-time multiplayer coding arena where developers can challenge each other to fast-paced coding battles. Write code, pass the hidden test cases, and beat your opponent before time runs out!

## Features

- **Real-time 1v1 Duels:** Compete against friends in real-time using WebSockets.
- **Multi-language Support:** Write your solutions in C++, Python, JavaScript, or C#.
- **Live Code Evaluation:** Code is evaluated securely and instantly via Wandbox integration.
- **Interactive Environment:** React with floating emojis during the duel.
- **Modern UI:** Built with a sleek, dark-themed interface using Next.js.

## Project Structure

This is a monorepo containing both the frontend and backend applications.

### `/frontend`
The frontend is built with **Next.js** and React. It uses **Monaco Editor** for the coding interface and connects to the backend via `socket.io-client`.

### `/backend`
The backend is a **Node.js** server utilizing **Express** and **Socket.io** for real-time communication. It handles room matchmaking, game state management, and code evaluation delegation.

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Salih041/CodeDuel.git
   cd CodeDuel
   ```

2. **Setup the Backend:**
   ```bash
   cd backend
   npm install
   # Create a .env file and set PORT, RAPIDAPI_KEY, and FRONTEND_URL
   npm run dev
   ```

3. **Setup the Frontend:**
   ```bash
   cd ../frontend
   npm install
   # Create a .env.local file with NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   npm run dev
   ```

4. **Play!**
   Open `http://localhost:3000` in your browser.

## Deployment

- **Backend:** Designed to be easily deployed on services like **Render**. Set the `FRONTEND_URL` environment variable for CORS.
- **Frontend:** Designed for zero-config deployment on **Vercel**. Set the `NEXT_PUBLIC_SOCKET_URL` to your deployed backend URL.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

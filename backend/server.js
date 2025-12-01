// backend/server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const leaderboardRoutes = require("./routes/leaderboard");
const initSockets = require("./sockets");

const app = express();

// 1) Connect to MongoDB
connectDB();

// 2) Allowed origins (frontend URLs)
const allowedOrigins = [
  process.env.CLIENT_URL,      // e.g. https://rock-paper-scissors-game-vnno.vercel.app
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

// 3) CORS options (same for HTTP and WebSocket)
const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (like curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

// 4) Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// 5) Routes
app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// Simple health check
app.get("/", (req, res) => {
  res.send("Backend Running");
});

// 6) HTTP + Socket.io server
const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
});

initSockets(io);

// 7) Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log("✅ Allowed origins:", allowedOrigins);
});

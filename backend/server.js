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

connectDB();

// 1) Allowed origins
const CLIENT_URL = process.env.CLIENT_URL; // MUST be: https://rock-paper-scissors-game-vnno.vercel.app
console.log("CLIENT_URL from ENV =>", CLIENT_URL);

const allowedOrigins = [
  CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

console.log("Allowed Origins =>", allowedOrigins);

// 2) CORS middleware
app.use(
  cors({
    origin(origin, callback) {
      // allow tools like Postman / curl (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked origin:", origin, "allowed:", allowedOrigins);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

// 3) Routes
app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.get("/", (req, res) => res.send("Backend Running"));

// 4) HTTP + Socket.io server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.log("❌ Socket CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS (socket)"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

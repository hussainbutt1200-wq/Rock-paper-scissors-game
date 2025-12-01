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

// ----- INIT APP -----
const app = express();

// ----- CONNECT TO DB -----
connectDB();

// ----- CORS SETUP -----
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL, // e.g. https://your-frontend.vercel.app in production
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow REST clients like Postman with no origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.log("❌ CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ----- MIDDLEWARE -----
app.use(express.json());

// ----- ROUTES -----
app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// simple health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend running" });
});

// root route
app.get("/", (req, res) => res.send("Backend Running"));

// ----- HTTP + SOCKET.IO SERVER -----
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// init all socket.io handlers
initSockets(io);

// ----- START SERVER -----
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log("Allowed origins:", allowedOrigins);
});

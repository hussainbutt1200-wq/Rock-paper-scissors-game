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

// Read client URL from env or fall back to local
const CLIENT_URL = process.env.CLIENT_URL;
console.log("CLIENT_URL from ENV =>", CLIENT_URL);

const allowedOrigins = [
  CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173"
].filter(Boolean); // remove undefined or empty values

console.log("Allowed Origins =>", allowedOrigins);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.get("/", (req, res) => res.send("Backend Running"));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initSockets(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

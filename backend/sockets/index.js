// backend/sockets/index.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// socket.id -> { userId, username }
const onlineUsers = new Map();

// simple FIFO queue for matchmaking
// each item: { userId, username, socketId }
const matchmakingQueue = [];

// roomId -> { id, players: [{ userId, username, socketId }], moves: {}, status }
const rooms = new Map();

const ROOM_SIZE = 2; // 2-player rooms

function initSockets(io) {
  // auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id };
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user.id;

    // get username for this user
    let userDoc;
    try {
      userDoc = await User.findById(userId).select("username");
    } catch (e) {
      console.error("Failed to load user for socket:", e.message);
    }
    const username = userDoc?.username || "User";

    onlineUsers.set(socket.id, { userId, username });

    broadcastOnlineCount(io);

    console.log("🔌 Socket connected:", socket.id, "user:", userId, username);

    // -------- GLOBAL CHAT --------
    socket.on("chat:message", (payload) => {
      const text = (payload?.text || "").toString().trim();
      if (!text) return;

      const info = onlineUsers.get(socket.id);
      const msg = {
        userId: info?.userId || userId,
        username: info?.username || username,
        text,
        createdAt: new Date().toISOString(),
      };

      // broadcast to everyone
      io.emit("chat:newMessage", msg);
    });

    // -------- ROOM CHAT (per game room) --------
    socket.on("room:chat", ({ roomId, text }) => {
      const messageText = (text || "").toString().trim();
      if (!roomId || !messageText) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const info = onlineUsers.get(socket.id);
      const msg = {
        roomId,
        userId: info?.userId || socket.user.id,
        username: info?.username || "User",
        text: messageText,
        createdAt: new Date().toISOString(),
      };

      io.to(roomId).emit("room:chat:new", msg);
    });

    // -------- MATCHMAKING QUEUE --------
    socket.on("queue:join", () => {
      const info = onlineUsers.get(socket.id) || { userId, username };

      // already in a room?
      if (findRoomByUser(info.userId)) {
        return;
      }

      // already in queue?
      const alreadyQueued = matchmakingQueue.some(
        (p) => p.userId.toString() === info.userId.toString()
      );
      if (alreadyQueued) return;

      matchmakingQueue.push({
        userId: info.userId,
        username: info.username,
        socketId: socket.id,
      });

      console.log("🎯 User joined queue:", info.username);

      matchPlayers(io);
    });

    // -------- GAME MOVE --------
    socket.on("game:move", async ({ roomId, move }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find(
        (p) => p.socketId === socket.id || p.userId.toString() === userId.toString()
      );
      if (!player) return;

      const normalizedMove = (move || "").toString().toLowerCase();
      if (!["rock", "paper", "scissors"].includes(normalizedMove)) return;

      room.moves[player.userId] = normalizedMove;
      console.log(
        `🎮 Move in room ${roomId}:`,
        player.username,
        "->",
        normalizedMove
      );

      // if everyone has played, decide winner
      if (Object.keys(room.moves).length === room.players.length) {
        await finishRound(io, roomId);
      }
    });

    // -------- DISCONNECT --------
    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id, userId);

      onlineUsers.delete(socket.id);
      broadcastOnlineCount(io);

      // remove from queue
      const idx = matchmakingQueue.findIndex((p) => p.socketId === socket.id);
      if (idx !== -1) {
        matchmakingQueue.splice(idx, 1);
      }

      // remove from rooms
      const room = findRoomByUser(userId);
      if (room) {
        room.players = room.players.filter(
          (p) => p.userId.toString() !== userId.toString()
        );

        if (room.players.length === 0) {
          rooms.delete(room.id);
        } else {
          const publicPlayers = room.players.map((p) => ({
            userId: p.userId,
            username: p.username,
          }));
          io.to(room.id).emit("room:updatePlayers", publicPlayers);
          io.to(room.id).emit("room:ended");
          rooms.delete(room.id);
        }
      }
    });
  });
}

// ---------- Helper functions ----------

function broadcastOnlineCount(io) {
  const uniqueUserIds = new Set(
    Array.from(onlineUsers.values()).map((u) => u.userId.toString())
  );
  io.emit("onlineCount", uniqueUserIds.size);
}

function matchPlayers(io) {
  while (matchmakingQueue.length >= ROOM_SIZE) {
    const players = matchmakingQueue.splice(0, ROOM_SIZE);

    const roomId =
      "room-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8);

    const room = {
      id: roomId,
      players,
      moves: {},
      status: "waiting",
    };

    rooms.set(roomId, room);

    console.log(
      "🏠 Created room",
      roomId,
      "with players:",
      players.map((p) => p.username).join(", ")
    );

    players.forEach((p) => {
      const s = io.sockets.sockets.get(p.socketId);
      if (!s) return;
      s.join(roomId);
      s.emit("room:joined", {
        roomId,
        players: room.players.map((pl) => ({
          userId: pl.userId,
          username: pl.username,
        })),
      });
    });
  }
}

function findRoomByUser(userId) {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.userId.toString() === userId.toString())) {
      return room;
    }
  }
  return null;
}

async function finishRound(io, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const moves = room.moves;

  const beats = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };

  const players = room.players;
  if (players.length < 2) {
    console.warn("Room", roomId, "has", players.length, "players; expected 2");
  }

  const [p1, p2] = players;
  const m1 = moves[p1.userId];
  const m2 = moves[p2.userId];

  let winnerId = null;
  let draw = false;

  if (m1 === m2) {
    draw = true;
  } else if (beats[m1] === m2) {
    winnerId = p1.userId;
  } else if (beats[m2] === m1) {
    winnerId = p2.userId;
  } else {
    draw = true;
  }

  const resultsPerPlayer = [
    {
      userId: p1.userId,
      username: p1.username,
      move: m1,
      result: draw ? "draw" : winnerId === p1.userId ? "win" : "lose",
    },
    {
      userId: p2.userId,
      username: p2.username,
      move: m2,
      result: draw ? "draw" : winnerId === p2.userId ? "win" : "lose",
    },
  ];

  try {
    if (!draw && winnerId) {
      await User.findByIdAndUpdate(winnerId, { $inc: { wins: 1 } });
      const loserId =
        winnerId.toString() === p1.userId.toString() ? p2.userId : p1.userId;
      await User.findByIdAndUpdate(loserId, { $inc: { losses: 1 } });
    }
  } catch (e) {
    console.error("Error updating win/loss:", e.message);
  }

  io.to(roomId).emit("game:result", {
    roomId,
    resultsPerPlayer,
  });

  room.moves = {};
}

module.exports = initSockets;

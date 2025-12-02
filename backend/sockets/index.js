// backend/sockets/index.js
// All Socket.IO logic: online count, matchmaking, global chat, room events.

let onlineCount = 0;
// store socket ids waiting for matchmaking
let matchmakingQueue = [];

function createRoomId(id1, id2) {
  return `room_${id1.slice(0, 4)}_${id2.slice(0, 4)}_${Date.now()}`;
}

module.exports = function initSockets(io) {
  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    // 1) ONLINE COUNT
    onlineCount += 1;
    io.emit("onlineCount", onlineCount);

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", socket.id, "reason:", reason);

      // remove from queue if present
      matchmakingQueue = matchmakingQueue.filter((id) => id !== socket.id);

      onlineCount = Math.max(onlineCount - 1, 0);
      io.emit("onlineCount", onlineCount);
    });

    // 2) GLOBAL LOBBY CHAT
    // Frontend emits: socket.emit("chat:message", { text, username })
    socket.on("chat:message", (payload) => {
      if (!payload) return;
      const text = (payload.text || "").trim();
      if (!text) return;

      const username = payload.username || "User";

      const msg = {
        text,
        username,
        createdAt: new Date().toISOString(),
      };

      // send to everyone (including sender)
      io.emit("chat:newMessage", msg);
    });

    // 3) MATCHMAKING QUEUE
    // Frontend emits: socket.emit("queue:join")
    socket.on("queue:join", () => {
      console.log("🎯 queue:join from", socket.id);

      // avoid duplicates
      if (!matchmakingQueue.includes(socket.id)) {
        matchmakingQueue.push(socket.id);
      }

      // if we have at least 2 players, match them
      if (matchmakingQueue.length >= 2) {
        const p1Id = matchmakingQueue.shift();
        const p2Id = matchmakingQueue.shift();

        const p1 = io.sockets.sockets.get(p1Id);
        const p2 = io.sockets.sockets.get(p2Id);

        if (!p1 || !p2) {
          return;
        }

        const roomId = createRoomId(p1Id, p2Id);

        p1.join(roomId);
        p2.join(roomId);

        const payloadForP1 = {
          roomId,
          opponent: { id: p2.id },
        };
        const payloadForP2 = {
          roomId,
          opponent: { id: p1.id },
        };

        // Frontend listens on "room:joined"
        p1.emit("room:joined", payloadForP1);
        p2.emit("room:joined", payloadForP2);

        console.log("🎮 Matched players into room:", roomId);
      }
    });

    // optional: allow leaving queue if you ever add a button
    socket.on("queue:leave", () => {
      matchmakingQueue = matchmakingQueue.filter((id) => id !== socket.id);
    });

    // 4) SIMPLE ROOM CHAT (if your RoomPage uses it)
    // Frontend emits: socket.emit("room:message", { roomId, text, username })
    socket.on("room:message", (payload) => {
      if (!payload) return;
      const roomId = payload.roomId;
      const text = (payload.text || "").trim();
      if (!roomId || !text) return;

      const username = payload.username || "User";

      io.to(roomId).emit("room:message", {
        roomId,
        text,
        username,
        createdAt: new Date().toISOString(),
      });
    });

    // 5) GAME MOVES (basic relay, if used by RoomPage)
    // Frontend emits: socket.emit("game:move", { roomId, move })
    socket.on("game:move", (payload) => {
      if (!payload) return;
      const roomId = payload.roomId;
      const move = payload.move;
      if (!roomId || !move) return;

      // send move to opponent(s) in the room
      socket.to(roomId).emit("game:move", { move, from: socket.id });
    });
  });
};

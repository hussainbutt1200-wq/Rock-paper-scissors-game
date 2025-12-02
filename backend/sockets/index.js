

module.exports = function initSockets(io) {
  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    // ---- 1) Basic disconnect logging ----
    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", socket.id, "reason:", reason);
    });

    

    socket.on("chat:message", ({ text, username }) => {
  if (!text || !text.trim()) return;

  const safeUsername = username || socket.data?.username || "User";

  const message = {
    username: safeUsername,
    text: text.trim(),
  };

  
  io.emit("chat:newMessage", message);
});

      

    socket.on("join_queue", () => {
      
    });

    socket.on("leave_queue", () => {
      
    });

    socket.on("join_room", (roomId) => {
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      socket.join(roomId);
    });

    socket.on("room_message", ({ roomId, user, text }) => {
      if (!roomId || !text) return;
      io.to(roomId).emit("room_message", {
        user,
        text,
        time: new Date().toISOString(),
      });
    });

    socket.on("game_move", ({ roomId, move }) => {
      if (!roomId) return;
      socket.to(roomId).emit("game_move", { move, from: socket.id });
    });

    // Add any other events you already had below...
  });
};

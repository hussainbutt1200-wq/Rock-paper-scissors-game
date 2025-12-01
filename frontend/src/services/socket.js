// frontend/src/services/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_WS_URL || "http://localhost:5000";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem("token");

    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      auth: { token },      // send JWT token to backend
      withCredentials: true,
    });
  }

  return socket;
};

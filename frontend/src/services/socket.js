// frontend/src/services/socket.js
import { io } from "socket.io-client";
import { connectSocket, getSocket } from "../services/socket.js";


const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem("token");
    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      auth: { token },
    });
  }
  return socket;
};

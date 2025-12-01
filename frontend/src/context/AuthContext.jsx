import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { getSocket } from "../services/socket.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem("user")) || null
  );
  const [socket, setSocket] = useState(null);

  // When user is set and we have a token, connect socket
 useEffect(() => {
  if (user) {
    const s = getSocket();   // ⬅ use getSocket directly
    setSocket(s);
  }
}, [user]);

  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    const { token, user } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    setUser(user);
    const s = connectSocket();
    setSocket(s);
  };

  const register = async (username, email, password) => {
    const res = await api.post("/api/auth/register", {
      username,
      email,
      password,
    });
    const { token, user } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    setUser(user);
    const s = connectSocket();
    setSocket(s);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    const s = getSocket();
    if (s) s.disconnect();
    setSocket(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, socket, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

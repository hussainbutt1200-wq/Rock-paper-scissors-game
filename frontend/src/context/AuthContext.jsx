// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { connectSocket } from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem("user")) || null
  );
  const [socket, setSocket] = useState(null);
  const [authError, setAuthError] = useState("");

  // connect socket when user is set
  useEffect(() => {
    if (user) {
      const s = connectSocket();
      setSocket(s);
    }
  }, [user]);

  const register = async (username, email, password) => {
    setAuthError("");
    try {
      const res = await api.post("/api/auth/register", {
        username,
        email,
        password,
      });

      // backend should return { token, user }
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      setAuthError(msg);
      console.error("Register error:", err.response?.data || err.message);
    }
  };

  const login = async (email, password) => {
    setAuthError("");
    try {
      const res = await api.post("/api/auth/login", { email, password });

      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid credentials";
      setAuthError(msg);
      console.error("Login error:", err.response?.data || err.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, socket, authError, register, login }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

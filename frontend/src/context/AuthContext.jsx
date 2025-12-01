// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { connectSocket } from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Failed to parse stored user:", e);
      return null;
    }
  });

  const [socket, setSocket] = useState(null);
  const navigate = useNavigate();

  // Connect / disconnect socket based on user
  useEffect(() => {
    // If we have a logged-in user and no socket yet → connect
    if (user && !socket) {
      const s = connectSocket();
      setSocket(s);
    }

    // If user logs out while socket exists → disconnect
    if (!user && socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [user, socket]);

  // ---------- AUTH FUNCTIONS ----------

  const register = async (username, email, password) => {
    try {
      const res = await api.post("/api/auth/register", {
        username,
        email,
        password,
      });

      // You can show a success toast in the UI if you want
      // e.g. toast.success("Registered, please log in");
      return res.data;
    } catch (err) {
      console.error("Register error:", err.response?.data || err.message || err);

      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed";

      alert(message);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const { token, user: userData } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));

      setUser(userData); // this will trigger the socket connect effect
      navigate("/lobby");
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message || err);

      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Invalid credentials";

      alert(message);
      throw err;
    }
  };

  const logout = () => {
    // Clear token + user from storage
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (e) {
      console.error("Error clearing auth from storage:", e);
    }

    // Disconnect socket
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    // Clear user state
    setUser(null);

    // Go back to login page
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        socket,
        register,
        login,
        logout,
        setUser, // optional but handy if you ever need to update user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

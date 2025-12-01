// at the top
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { connectSocket } from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem("user")) || null
  );
  const [socket, setSocket] = useState(null);
  const navigate = useNavigate();

  // when user has a token, connect socket
  useEffect(() => {
    if (user && !socket) {
      const s = connectSocket();
      setSocket(s);
    }
  }, [user]);

  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    const { token, user: userData } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    navigate("/lobby");
  };

  const logout = () => {
    // clear storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // disconnect socket
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    // clear user state
    setUser(null);

    // navigate back to login
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, socket, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

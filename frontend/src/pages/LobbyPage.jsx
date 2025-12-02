// frontend/src/pages/LobbyPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { getSocket } from "../services/socket";

const LobbyPage = () => {
  const { user, logout, socket } = useAuth();
  const navigate = useNavigate();

  const [onlineCount, setOnlineCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const s = socket || getSocket();
    if (!s) return;

    // online users count
    s.on("onlineCount", (count) => setOnlineCount(count));

    // global lobby chat
    s.on("chat:newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // when server matches players and joins a room
    s.on("room:joined", (payload) => {
      setSearching(false);
      navigate(`/room/${payload.roomId}`, { state: payload });
    });

    return () => {
      s.off("onlineCount");
      s.off("chat:newMessage");
      s.off("room:joined");
    };
  }, [socket, navigate]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const s = socket || getSocket();
    const text = chatInput.trim();
    if (!s || !text) return;

    s.emit("chat:message", {
      text,
      username: user?.username, // backend still uses DB username but this is fine
    });

    setChatInput("");
  };

  const handleJoinQueue = () => {
    const s = socket || getSocket();
    if (!s) return;
    setSearching(true);
    s.emit("queue:join");
  };

  return (
    <div style={{ padding: 20 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div>
          <h2>Lobby</h2>
          <p>Online players: {onlineCount}</p>
        </div>
        <div>
          <span style={{ marginRight: 10 }}>
            Logged in as: <strong>{user?.username}</strong>
          </span>
          <button onClick={logout} style={{ marginRight: 10 }}>
            Logout
          </button>
          <Link to="/leaderboard">
            <button>Leaderboard</button>
          </Link>
        </div>
      </header>

      <button onClick={handleJoinQueue} disabled={searching}>
        {searching ? "Searching for players..." : "Join Matchmaking Queue"}
      </button>

      <div
        style={{
          marginTop: 20,
          display: "flex",
          gap: 20,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3>Global Chat</h3>
          <div
            style={{
              border: "1px solid #ccc",
              height: 300,
              overflowY: "auto",
              padding: 10,
            }}
          >
            {messages.map((m, i) => (
              <div key={i}>
                <strong>{m.username || "User"}:</strong> {m.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} style={{ marginTop: 10 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type message..."
              style={{ width: "80%" }}
            />
            <button type="submit" style={{ marginLeft: 5 }}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;

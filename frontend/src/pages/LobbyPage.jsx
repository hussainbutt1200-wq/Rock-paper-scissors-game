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

    // how many players online
    s.on("onlineCount", (count) => setOnlineCount(count));

    // global chat messages
    s.on("chat:newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // matchmaking -> go to room
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
    if (!s || !chatInput.trim()) return;

    // 👉 send username along with the text
    s.emit("chat:message", {
      text: chatInput.trim(),
      username: user?.username || "Guest",
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div>
          <h1 className="text-xl font-semibold">Lobby</h1>
          <p className="text-sm text-slate-400">
            Online players:{" "}
            <span className="text-emerald-400 font-semibold">
              {onlineCount}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-300">
            {user && (
              <>
                Signed in as <strong>{user.username}</strong>
              </>
            )}
          </span>
          <Link
            to="/leaderboard"
            className="px-3 py-1.5 rounded-lg border border-emerald-500/50 text-sm text-emerald-300 hover:bg-emerald-500/10"
          >
            Leaderboard
          </Link>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-4 flex flex-col lg:flex-row gap-6">
        {/* Left: matchmaking card */}
        <section className="w-full lg:w-1/3 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Matchmaking</h2>
          <p className="text-sm text-slate-400 mb-4">
            Click the button to join the queue and get matched with another
            player. You’ll be moved into a private game room automatically.
          </p>
          <button
            onClick={handleJoinQueue}
            disabled={searching}
            className={`w-full py-3 rounded-xl font-semibold transition ${
              searching
                ? "bg-slate-700 text-slate-300 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            }`}
          >
            {searching ? "Searching for players…" : "Join Matchmaking Queue"}
          </button>
        </section>

        {/* Right: global chat */}
        <section className="flex-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Global Chat</h2>
            <span className="text-xs text-slate-400">
              Chat with everyone in the lobby.
            </span>
          </div>

          <div className="flex-1 mt-3 mb-3 overflow-y-auto space-y-2 rounded-xl bg-slate-950/60 border border-slate-800 p-3">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500 text-center mt-10">
                No messages yet. Say hi 👋
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="font-semibold text-emerald-300">
                  {m.username || "User"}
                </span>
                <span className="text-slate-500">: </span>
                <span>{m.text}</span>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 mt-auto"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm"
            >
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default LobbyPage;

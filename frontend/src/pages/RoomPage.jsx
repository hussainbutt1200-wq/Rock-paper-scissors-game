import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../services/socket";

const RoomPage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, user } = useAuth();

  const [players, setPlayers] = useState(location.state?.players || []);
  const [status, setStatus] = useState("Choose your move");
  const [selectedMove, setSelectedMove] = useState(null);
  const [results, setResults] = useState(null);

  // in-game chat
  const [roomMessages, setRoomMessages] = useState([]);
  const [roomChatInput, setRoomChatInput] = useState("");

  useEffect(() => {
    const s = socket || getSocket();
    if (!s) return;

    s.on("game:result", (payload) => {
      if (payload.roomId !== roomId) return;
      setResults(payload.resultsPerPlayer);
      setStatus("Round finished");
      setSelectedMove(null);
    });

    s.on("room:updatePlayers", (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    s.on("room:ended", () => {
      setStatus("Room ended (opponent left)");
    });

    // in-room chat listener
    s.on("room:chat:new", (msg) => {
      if (msg.roomId !== roomId) return;
      setRoomMessages((prev) => [...prev, msg]);
    });

    return () => {
      s.off("game:result");
      s.off("room:updatePlayers");
      s.off("room:ended");
      s.off("room:chat:new");
    };
  }, [socket, roomId]);

  const handleMove = (move) => {
    const s = socket || getSocket();
    if (!s || selectedMove) return;

    setSelectedMove(move);
    setStatus("Waiting for other player…");
    s.emit("game:move", { roomId, move });
  };

  const handleBackToLobby = () => {
    navigate("/lobby");
  };

  const handleSendRoomChat = (e) => {
    e.preventDefault();
    const s = socket || getSocket();
    if (!s || !roomChatInput.trim()) return;

    s.emit("room:chat", { roomId, text: roomChatInput });
    setRoomChatInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center">
      {/* top bar */}
      <header className="w-full max-w-5xl flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            Room
          </p>
          <h1 className="text-xl font-semibold">{roomId}</h1>
        </div>
        <button
          onClick={handleBackToLobby}
          className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm"
        >
          ← Back to lobby
        </button>
      </header>

      {/* main content */}
      <main className="w-full max-w-5xl flex-1 px-4 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* players + game */}
        <section className="lg:col-span-2 space-y-4">
          {/* players card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Players</h2>
              <span className="text-xs text-slate-400">
                You are{" "}
                <span className="text-emerald-400 font-semibold">
                  {user?.username}
                </span>
              </span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {players.map((p) => (
                <div
                  key={p.userId}
                  className={`px-3 py-2 rounded-xl border text-sm bg-slate-800/80 ${
                    p.userId === user?.id
                      ? "border-emerald-500 text-emerald-200"
                      : "border-slate-700"
                  }`}
                >
                  {p.username}
                </div>
              ))}
              {players.length === 0 && (
                <p className="text-sm text-slate-500">
                  Waiting for another player to join…
                </p>
              )}
            </div>
          </div>

          {/* game card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-1">
              Rock • Paper • Scissors
            </h2>
            <p className="text-sm text-slate-400 mb-5">{status}</p>

            <div className="flex gap-4 mb-4">
              {["rock", "paper", "scissors"].map((m) => (
                <button
                  key={m}
                  onClick={() => handleMove(m)}
                  disabled={!!selectedMove}
                  className={`px-6 py-3 rounded-2xl text-lg font-semibold capitalize transition border shadow-sm ${
                    selectedMove === m
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "bg-slate-800 border-slate-700 hover:border-emerald-400 hover:bg-slate-800/80"
                  } ${selectedMove && selectedMove !== m ? "opacity-40" : ""}`}
                >
                  {m}
                </button>
              ))}
            </div>

            {selectedMove && (
              <p className="text-sm text-slate-300 mb-2">
                You locked in:{" "}
                <span className="font-semibold text-emerald-400">
                  {selectedMove}
                </span>
              </p>
            )}

            {results && (
              <div className="w-full mt-5">
                <h3 className="text-md font-semibold mb-2">Results</h3>
                <div className="space-y-2">
                  {results.map((r) => (
                    <div
                      key={r.userId}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 border ${
                        r.result === "win"
                          ? "border-emerald-500"
                          : r.result === "lose"
                          ? "border-red-500/70"
                          : "border-slate-700"
                      }`}
                    >
                      <span className="font-medium">{r.username}</span>
                      <span className="text-sm text-slate-300 capitalize">
                        {r.move}
                      </span>
                      <span
                        className={`text-sm font-semibold capitalize ${
                          r.result === "win"
                            ? "text-emerald-400"
                            : r.result === "lose"
                            ? "text-red-400"
                            : "text-slate-300"
                        }`}
                      >
                        {r.result}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* in-game chat */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Room chat</h2>
            <span className="text-xs text-slate-400">
              Only visible to players in this room.
            </span>
          </div>

          <div className="flex-1 rounded-xl bg-slate-950/70 border border-slate-800 p-3 overflow-y-auto space-y-2">
            {roomMessages.length === 0 && (
              <p className="text-sm text-slate-500 text-center mt-6">
                No messages yet. Say hi 👋
              </p>
            )}
            {roomMessages.map((m, idx) => (
              <div key={idx} className="text-sm">
                <span className="font-semibold text-emerald-300">
                  {m.username}
                </span>
                <span className="text-slate-500">: </span>
                <span>{m.text}</span>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSendRoomChat}
            className="flex items-center gap-2 mt-3"
          >
            <input
              value={roomChatInput}
              onChange={(e) => setRoomChatInput(e.target.value)}
              placeholder="Type a message…"
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

export default RoomPage;

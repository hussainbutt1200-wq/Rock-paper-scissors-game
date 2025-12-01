import { useEffect, useState } from "react";
import api from "../services/api";

const LeaderboardPage = () => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await api.get("/api/leaderboard");
      setPlayers(res.data);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">
      <div className="w-full max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">Leaderboard</h1>
        <p className="text-slate-400 mb-4 text-sm">
          Top players by wins. Draws are counted as neither win nor loss.
        </p>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/90 border-b border-slate-800">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-4 py-2 text-right">Wins</th>
                <th className="px-4 py-2 text-right">Losses</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-4 text-center text-slate-500"
                  >
                    No games played yet.
                  </td>
                </tr>
              )}
              {players.map((p, index) => (
                <tr
                  key={p._id || p.username}
                  className="border-b border-slate-800/70 last:border-none hover:bg-slate-800/40"
                >
                  <td className="px-4 py-2">{index + 1}</td>
                  <td className="px-4 py-2 font-medium">{p.username}</td>
                  <td className="px-4 py-2 text-right text-emerald-400">
                    {p.wins}
                  </td>
                  <td className="px-4 py-2 text-right text-red-400">
                    {p.losses}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;

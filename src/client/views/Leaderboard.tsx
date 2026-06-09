import { useEffect, useState } from 'react';
import type { LeaderboardResponse } from '../../shared/api';
import { fetchLeaderboard } from '../lib/api';
import { Button, Card, Spinner } from '../ui';
import type { ClimbApi } from '../hooks/useClimb';

const medal = (rank: number): string =>
  rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;

export const Leaderboard = ({ game }: { game: ClimbApi }) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [tab, setTab] = useState<'today' | 'allTime'>('today');
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchLeaderboard()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const me = game.username;
  const rows = data ? (tab === 'today' ? data.today : data.allTime) : [];
  const yourRank = data
    ? tab === 'today'
      ? data.yourTodayRank
      : data.yourAllTimeRank
    : null;

  const tabClass = (active: boolean): string =>
    `rounded-full px-4 py-2 text-sm font-semibold cursor-pointer ${
      active ? 'bg-orange-500 text-white' : 'bg-white/10 text-white'
    }`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-xl font-bold text-white">
        🏆 r/{game.subreddit}
      </h2>
      <div className="flex justify-center gap-2">
        <button onClick={() => setTab('today')} className={tabClass(tab === 'today')}>
          Today
        </button>
        <button onClick={() => setTab('allTime')} className={tabClass(tab === 'allTime')}>
          All time
        </button>
      </div>

      {error ? (
        <p className="py-6 text-center text-rose-300">Couldn’t load the leaderboard.</p>
      ) : !data ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-slate-300">No scores yet — be the first! 🎉</p>
      ) : (
        <Card className="flex flex-col divide-y divide-white/5 overflow-hidden">
          {rows.map((r) => (
            <div
              key={r.username}
              className={`flex items-center gap-3 px-4 py-3 ${
                r.username === me ? 'bg-orange-500/10' : ''
              }`}
            >
              <span className="w-7 text-center font-black text-slate-400">{medal(r.rank)}</span>
              <span className="flex-1 truncate font-semibold text-white">u/{r.username}</span>
              <span className="font-bold text-orange-400">{r.score}</span>
            </div>
          ))}
        </Card>
      )}

      {yourRank !== null && yourRank > 10 && (
        <p className="text-center text-sm text-slate-300">Your rank: #{yourRank}</p>
      )}

      <Button variant="subtle" onClick={() => game.setScreen('play')}>
        ← Back to climb
      </Button>
    </div>
  );
};

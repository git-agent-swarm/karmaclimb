import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useClimb, type ClimbApi } from './hooks/useClimb';
import { Spinner } from './ui';
import { Play } from './views/Play';
import { Leaderboard } from './views/Leaderboard';
import { HowTo } from './views/HowTo';

const Header = ({ game }: { game: ClimbApi }) => (
  <header className="flex items-center justify-between gap-2 py-3">
    <button
      onClick={() => game.setScreen('play')}
      className="flex items-center gap-1 cursor-pointer"
    >
      <span className="text-xl">🧗</span>
      <span className="font-black tracking-tight text-white">Karma Climb</span>
    </button>
    <div className="flex items-center gap-2 text-xs">
      {game.me && (
        <span className="rounded-full bg-white/10 px-2 py-1 font-bold text-orange-300">
          ⭐ {game.me.points}
        </span>
      )}
      {game.me && game.me.streak > 0 && (
        <span className="rounded-full bg-white/10 px-2 py-1 font-bold text-orange-400">
          🔥 {game.me.streak}
        </span>
      )}
      <button
        onClick={() => game.setScreen('howto')}
        className="rounded-full bg-white/10 px-3 py-1 text-white cursor-pointer hover:bg-white/20"
      >
        ?
      </button>
    </div>
  </header>
);

const Body = ({ game }: { game: ClimbApi }) => {
  if (game.loading) return <Spinner />;
  if (game.error) return <p className="py-10 text-center text-rose-300">{game.error}</p>;
  switch (game.screen) {
    case 'leaderboard':
      return <Leaderboard game={game} />;
    case 'howto':
      return <HowTo game={game} />;
    default:
      return <Play game={game} />;
  }
};

export const App = () => {
  const game = useClimb();
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto w-full max-w-md px-4 pb-12">
        {!game.loading && !game.error && <Header game={game} />}
        <main className="pt-2">
          <Body game={game} />
        </main>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

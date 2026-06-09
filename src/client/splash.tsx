import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';

// Inline feed view — deliberately lightweight (no fetch, no game logic) so it
// renders instantly in the feed. The full game loads on tap.
const Splash = () => (
  <button
    onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
    className="flex min-h-screen w-full cursor-pointer flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-900 to-slate-950 px-6 text-center text-white"
  >
    <span className="text-xs font-bold tracking-[0.3em] text-orange-400">KARMA CLIMB</span>
    <div className="text-6xl">🧗</div>
    <p className="max-w-xs text-lg font-semibold text-white">
      Which post did Reddit upvote more?
    </p>
    <span className="rounded-full bg-orange-500 px-6 py-2 font-bold text-white">Tap to play</span>
    <span className="text-xs text-slate-400">Higher or Lower · daily streak · leaderboard</span>
  </button>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);

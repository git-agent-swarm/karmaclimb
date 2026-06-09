import { useState } from 'react';
import type { DeckItem } from '../../shared/api';
import type { ClimbApi } from '../hooks/useClimb';
import { Button, Card, Pill } from '../ui';

const fmt = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `${n}`;
};

type Flash = 'correct' | 'wrong' | null;

const PostCard = ({
  item,
  score,
  flash = null,
}: {
  item: DeckItem;
  score: number | null;
  flash?: Flash;
}) => {
  const ring =
    flash === 'correct'
      ? 'border-emerald-400 ring-2 ring-emerald-400/60'
      : flash === 'wrong'
        ? 'border-rose-500 ring-2 ring-rose-500/60'
        : 'border-white/10';
  const scoreColor =
    flash === 'correct' ? 'text-emerald-400' : flash === 'wrong' ? 'text-rose-400' : 'text-orange-400';
  return (
    <div className={`relative overflow-hidden rounded-2xl border transition ${ring}`}>
      {item.thumb ? (
        <img src={item.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-orange-700/40 to-slate-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      <div className="relative flex min-h-[120px] flex-col justify-end gap-1 p-3">
        <span className="text-[11px] font-semibold text-orange-300">r/{item.subreddit}</span>
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{item.title}</p>
        <div className="mt-1">
          {score === null ? (
            <span className="text-2xl font-black text-white/55">▲ ?????</span>
          ) : (
            <span className={`animate-[pop_0.4s_ease-out] text-2xl font-black ${scoreColor}`}>
              ▲ {fmt(score)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const ProgressPips = ({ score, max }: { score: number; max: number }) => (
  <div className="flex flex-wrap justify-center gap-1">
    {Array.from({ length: max }).map((_, i) => (
      <span
        key={i}
        className={`h-2.5 w-2.5 rounded-full ${i < score ? 'bg-emerald-500' : 'bg-white/15'}`}
      />
    ))}
  </div>
);

const Result = ({ game }: { game: ClimbApi }) => {
  const active = game.active;
  const [copied, setCopied] = useState(false);
  if (!active) return null;

  const isEndless = game.mode === 'endless';
  const perfect = !isEndless && active.maxScore > 0 && active.score >= active.maxScore;

  const copy = async () => {
    if (!game.share) return;
    try {
      await navigator.clipboard.writeText(game.share);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable — ignore
    }
  };

  return (
    <Card className="flex flex-col items-center gap-3 p-6 text-center">
      <div className="text-5xl">{perfect ? '🏆' : isEndless ? '♾️' : '🧗'}</div>
      <h2 className="text-2xl font-extrabold text-white">
        {perfect ? 'Perfect climb!' : isEndless ? 'Endless run over' : 'Climb complete'}
      </h2>
      <div className="text-4xl font-black text-orange-400">
        {active.score}
        <span className="text-lg text-slate-400">
          {isEndless ? ' in a row' : ` / ${active.maxScore}`}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {isEndless && (
          <Pill className="bg-white/10 text-slate-200">
            Best endless: {Math.max(game.bestEndless, active.score)}
          </Pill>
        )}
        {!isEndless && game.me && game.me.streak > 0 && (
          <Pill className="bg-orange-500/20 text-orange-300">🔥 {game.me.streak} day streak</Pill>
        )}
        {!isEndless && (
          <Pill className="bg-white/10 text-slate-300">{game.playedToday} played today</Pill>
        )}
      </div>

      {!isEndless && game.share && (
        <div className="w-full">
          <pre className="whitespace-pre-wrap break-words rounded-2xl bg-black/30 p-3 text-sm text-slate-200">
            {game.share}
          </pre>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => void copy()}>
            {copied ? 'Copied! ✓' : '📋 Copy result'}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {isEndless ? (
          <Button onClick={() => void game.startEndless()}>▶ Try again</Button>
        ) : (
          <Button onClick={() => void game.startEndless()}>♾️ Endless mode</Button>
        )}
        <Button variant="ghost" onClick={() => game.setScreen('leaderboard')}>
          🏆 Ranks
        </Button>
        {isEndless && (
          <Button variant="subtle" onClick={game.backToDaily}>
            ← Daily
          </Button>
        )}
      </div>
    </Card>
  );
};

export const Play = ({ game }: { game: ClimbApi }) => {
  const active = game.active;

  if (!active || active.deck.length < 2) {
    return (
      <div className="py-12 text-center text-slate-300">
        No climb available here yet — check back soon. 🧗
      </div>
    );
  }

  if (active.finished) return <Result game={game} />;

  const i = active.index;
  const top = active.deck[i];
  const bottom = active.deck[i + 1];
  if (!top || !bottom) return <Result game={game} />;

  const isEndless = game.mode === 'endless';
  const bottomFlash: Flash =
    game.reveal && game.reveal.index === i + 1 ? (game.reveal.correct ? 'correct' : 'wrong') : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-2">
        <Pill className="bg-white/10 text-slate-200">
          {isEndless ? '♾️ Endless' : `🧗 Daily #${game.climbNumber}`}
        </Pill>
        <Pill className="bg-white/10 text-slate-300">Score {active.score}</Pill>
      </div>

      <PostCard item={top} score={active.revealed[i] ?? 0} />

      <p className="-my-1 text-center text-xs text-slate-400">
        Does the next post have{' '}
        <span className="font-bold text-emerald-400">more</span> or{' '}
        <span className="font-bold text-rose-400">fewer</span> upvotes?
      </p>

      <PostCard item={bottom} score={active.revealed[i + 1] ?? null} flash={bottomFlash} />

      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={game.guessing}
          onClick={() => void game.guess('higher')}
          className="flex items-center justify-center gap-1 rounded-2xl bg-emerald-600 py-4 font-bold text-white transition hover:bg-emerald-500 active:scale-95 disabled:opacity-40 cursor-pointer"
        >
          ⬆️ Higher
        </button>
        <button
          disabled={game.guessing}
          onClick={() => void game.guess('lower')}
          className="flex items-center justify-center gap-1 rounded-2xl bg-rose-600 py-4 font-bold text-white transition hover:bg-rose-500 active:scale-95 disabled:opacity-40 cursor-pointer"
        >
          ⬇️ Lower
        </button>
      </div>

      {game.guessError > 0 && !game.guessing && (
        <p className="text-center text-xs text-rose-300">That didn’t go through — tap again.</p>
      )}

      {!isEndless && <ProgressPips score={active.score} max={active.maxScore} />}
    </div>
  );
};

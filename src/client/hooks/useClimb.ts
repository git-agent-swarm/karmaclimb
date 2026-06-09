import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DeckItem,
  Direction,
  InitResponse,
  Screen,
  UserStats,
} from '../../shared/api';
import {
  fetchInit,
  postEndlessGuess,
  postGuess,
  startEndless as apiStartEndless,
} from '../lib/api';

export type Mode = 'daily' | 'endless';

export type GameSlot = {
  deck: DeckItem[];
  revealed: (number | null)[];
  index: number;
  finished: boolean;
  score: number;
  maxScore: number;
};

// Active reveal animation: which deck position just flipped, and whether the
// player's guess about it was right.
export type Reveal = { index: number; correct: boolean };

type State = {
  loading: boolean;
  error: string | null;
  screen: Screen;
  mode: Mode;
  username: string;
  climbNumber: number;
  subreddit: string;
  me: UserStats | null;
  playedToday: number;
  share: string | null;
  bestEndless: number;
  daily: GameSlot;
  endless: GameSlot | null;
  guessing: boolean;
  reveal: Reveal | null;
  guessError: number;
};

const REVEAL_MS = 950;

const EMPTY_SLOT: GameSlot = {
  deck: [],
  revealed: [],
  index: 0,
  finished: false,
  score: 0,
  maxScore: 0,
};

const INITIAL: State = {
  loading: true,
  error: null,
  screen: 'play',
  mode: 'daily',
  username: 'anonymous',
  climbNumber: 0,
  subreddit: '',
  me: null,
  playedToday: 0,
  share: null,
  bestEndless: 0,
  daily: EMPTY_SLOT,
  endless: null,
  guessing: false,
  reveal: null,
  guessError: 0,
};

const setRevealed = (
  arr: (number | null)[],
  index: number,
  score: number
): (number | null)[] => {
  if (index < 0 || index >= arr.length) return arr;
  const next = arr.slice();
  next[index] = score;
  return next;
};

export const useClimb = () => {
  const [s, setS] = useState<State>(INITIAL);
  const ref = useRef(s);
  useEffect(() => {
    ref.current = s;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  useEffect(() => {
    let alive = true;
    fetchInit()
      .then((d: InitResponse) => {
        if (!alive) return;
        setS((p) => ({
          ...p,
          loading: false,
          username: d.username,
          climbNumber: d.climbNumber,
          subreddit: d.subreddit,
          me: d.me,
          playedToday: d.playedToday,
          share: d.share,
          bestEndless: d.bestEndless,
          daily: {
            deck: d.deck,
            revealed: d.revealedScores,
            index: d.run.index,
            finished: d.run.finished,
            score: d.run.score,
            maxScore: d.maxScore,
          },
        }));
      })
      .catch(() => {
        if (alive) {
          setS((p) => ({ ...p, loading: false, error: 'Could not load Karma Climb. Try refreshing.' }));
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const setScreen = useCallback((screen: Screen) => setS((p) => ({ ...p, screen })), []);
  const backToDaily = useCallback(() => setS((p) => ({ ...p, mode: 'daily', screen: 'play' })), []);

  const guess = useCallback(async (direction: Direction) => {
    const cur = ref.current;
    const active = cur.mode === 'daily' ? cur.daily : cur.endless;
    if (cur.guessing || cur.reveal || !active || active.finished || active.deck.length < 2) return;
    const fromIndex = active.index;
    setS((p) => ({ ...p, guessing: true, guessError: 0 }));

    try {
      if (cur.mode === 'daily') {
        const res = await postGuess(fromIndex, direction);
        // Server didn't advance and didn't finish => out-of-sync; just resync.
        if (!res.correct && !res.finished) {
          setS((p) => ({ ...p, guessing: false, daily: { ...p.daily, index: res.run.index } }));
          return;
        }
        // Phase 1: reveal the bottom card (still on the current matchup).
        setS((p) => ({
          ...p,
          daily: { ...p.daily, revealed: setRevealed(p.daily.revealed, res.revealedIndex, res.revealedScore) },
          reveal: { index: res.revealedIndex, correct: res.correct },
        }));
        // Phase 2: commit (advance or finish) after the reveal pause.
        timer.current = setTimeout(() => {
          setS((p) => {
            const justFinished = res.run.finished && !p.daily.finished;
            return {
              ...p,
              guessing: false,
              reveal: null,
              me: res.me,
              share: res.share ?? p.share,
              playedToday: justFinished ? p.playedToday + 1 : p.playedToday,
              daily: {
                ...p.daily,
                index: res.run.index,
                finished: res.run.finished,
                score: res.run.score,
              },
            };
          });
        }, REVEAL_MS);
      } else {
        const res = await postEndlessGuess(fromIndex, direction);
        if (!res.correct && !res.finished) {
          // resync endless to the server's authoritative index (fixes soft-lock)
          setS((p) =>
            p.endless
              ? { ...p, guessing: false, endless: { ...p.endless, index: res.score } }
              : { ...p, guessing: false }
          );
          return;
        }
        setS((p) =>
          p.endless
            ? {
                ...p,
                endless: { ...p.endless, revealed: setRevealed(p.endless.revealed, res.revealedIndex, res.revealedScore) },
                reveal: { index: res.revealedIndex, correct: res.correct },
              }
            : { ...p, guessing: false }
        );
        timer.current = setTimeout(() => {
          setS((p) => {
            if (!p.endless) return { ...p, guessing: false, reveal: null };
            const nextIndex = res.correct ? res.revealedIndex : p.endless.index;
            return {
              ...p,
              guessing: false,
              reveal: null,
              bestEndless: res.bestEndless,
              endless: { ...p.endless, index: nextIndex, finished: res.finished, score: res.score },
            };
          });
        }, REVEAL_MS);
      }
    } catch {
      setS((p) => ({ ...p, guessing: false, reveal: null, guessError: Date.now() }));
    }
  }, []);

  const startEndless = useCallback(async () => {
    if (ref.current.guessing) return;
    if (timer.current) clearTimeout(timer.current);
    setS((p) => ({ ...p, guessing: true }));
    try {
      const res = await apiStartEndless();
      if ('type' in res && res.type === 'endlessStart') {
        const revealed: (number | null)[] = res.deck.map((_, i) =>
          i === 0 ? res.firstScore : null
        );
        setS((p) => ({
          ...p,
          guessing: false,
          mode: 'endless',
          screen: 'play',
          reveal: null,
          guessError: 0,
          endless: {
            deck: res.deck,
            revealed,
            index: 0,
            finished: false,
            score: 0,
            maxScore: Math.max(0, res.deck.length - 1),
          },
        }));
      } else {
        setS((p) => ({ ...p, guessing: false }));
      }
    } catch {
      setS((p) => ({ ...p, guessing: false }));
    }
  }, []);

  const active: GameSlot | null = s.mode === 'daily' ? s.daily : s.endless;

  return { ...s, active, guess, startEndless, backToDaily, setScreen };
};

export type ClimbApi = ReturnType<typeof useClimb>;
export type { DeckItem };

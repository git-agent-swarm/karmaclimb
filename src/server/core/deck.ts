// Pure deck-building logic over already-fetched posts. No Redis, no Devvit —
// the impure Reddit fetch lives in reddit.ts; this module is unit-tested.

import type { DeckItem } from '../../shared/api';

export type FrozenPost = {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  thumb: string | null;
};

export const DECK_SIZE = 12; // up to 11 guesses

export const toDeckItem = (p: FrozenPost): DeckItem => ({
  id: p.id,
  title: p.title,
  subreddit: p.subreddit,
  thumb: p.thumb,
});

export const isValidCandidate = (p: FrozenPost): boolean =>
  p.score > 0 && p.title.trim().length > 0 && p.id.length > 0;

// Keep only valid posts, dedupe by id AND by exact score so that every adjacent
// pair in any ordering has a single unambiguous higher/lower answer.
export const prepareCandidates = (raw: readonly FrozenPost[]): FrozenPost[] => {
  const seenId = new Set<string>();
  const seenScore = new Set<number>();
  const out: FrozenPost[] = [];
  for (const p of raw) {
    if (!isValidCandidate(p)) continue;
    if (seenId.has(p.id) || seenScore.has(p.score)) continue;
    seenId.add(p.id);
    seenScore.add(p.score);
    out.push(p);
  }
  return out;
};

export const shuffle = <T,>(arr: readonly T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const x = a[i];
    const y = a[j];
    if (x !== undefined && y !== undefined) {
      a[i] = y;
      a[j] = x;
    }
  }
  return a;
};

// Build an ordered chain of up to `size` posts (one-time at daily bake; the
// result is cached so every player gets the identical deck for the day).
export const buildChain = (
  raw: readonly FrozenPost[],
  size = DECK_SIZE
): FrozenPost[] => {
  const prepared = prepareCandidates(raw);
  return shuffle(prepared).slice(0, Math.min(size, prepared.length));
};

// Scores visible to the client: real value up to (and including) `uptoIndex`,
// null beyond it so unrevealed answers can't be inspected.
export const revealedScores = (
  deck: readonly FrozenPost[],
  uptoIndex: number
): (number | null)[] => deck.map((p, i) => (i <= uptoIndex ? p.score : null));

// Candidates are score-unique, so toScore is never equal to fromScore; the
// >= / <= still resolves ties gracefully if that ever changes.
export const isGuessCorrect = (
  fromScore: number,
  toScore: number,
  direction: 'higher' | 'lower'
): boolean => (direction === 'higher' ? toScore >= fromScore : toScore <= fromScore);

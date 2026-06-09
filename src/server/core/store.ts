// Redis-backed persistence: cached candidate pool, the date-deterministic daily
// deck (baked once, identical for every player that day), per-user run state,
// the played-today set, and per-user endless sessions.

import { redis } from '@devvit/web/server';
import { keys } from './keys';
import { buildChain, type FrozenPost } from './deck';
import { gatherCandidates } from './reddit';
import type { RunState } from '../../shared/api';

const FOUR_DAYS = 60 * 60 * 24 * 4;
const TWO_DAYS = 60 * 60 * 24 * 2;
const SIX_HOURS = 60 * 60 * 6;
const FIFTEEN_MIN = 60 * 15;

const parseArray = <T,>(raw: string | undefined): T[] | null => {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : null;
  } catch {
    return null;
  }
};

export const getCandidates = async (
  sub: string,
  date: string
): Promise<FrozenPost[]> => {
  // A present key (even an empty array) is a cache hit — this prevents an
  // unusable subreddit from re-running the full Reddit fan-out on every request.
  const raw = await redis.get(keys.candidates(sub, date));
  if (raw !== undefined && raw !== null) {
    return parseArray<FrozenPost>(raw) ?? [];
  }
  const pool = await gatherCandidates(sub);
  await redis.set(keys.candidates(sub, date), JSON.stringify(pool));
  await redis.expire(keys.candidates(sub, date), pool.length > 0 ? TWO_DAYS : FIFTEEN_MIN);
  return pool;
};

export const getOrBakeDeck = async (
  sub: string,
  date: string
): Promise<FrozenPost[]> => {
  const cached = parseArray<FrozenPost>(await redis.get(keys.deck(sub, date)));
  if (cached && cached.length > 1) return cached;
  const candidates = await getCandidates(sub, date);
  const deck = buildChain(candidates);
  if (deck.length > 1) {
    await redis.set(keys.deck(sub, date), JSON.stringify(deck));
    await redis.expire(keys.deck(sub, date), FOUR_DAYS);
  }
  return deck;
};

const DEFAULT_RUN: RunState = { index: 0, finished: false, score: 0 };

export const getRun = async (
  sub: string,
  date: string,
  user: string
): Promise<RunState> => {
  const raw = await redis.get(keys.run(sub, date, user));
  if (!raw) return { ...DEFAULT_RUN };
  try {
    const v = JSON.parse(raw) as RunState;
    return { index: v.index ?? 0, finished: Boolean(v.finished), score: v.score ?? 0 };
  } catch {
    return { ...DEFAULT_RUN };
  }
};

export const saveRun = async (
  sub: string,
  date: string,
  user: string,
  run: RunState
): Promise<void> => {
  await redis.set(keys.run(sub, date, user), JSON.stringify(run));
  await redis.expire(keys.run(sub, date, user), FOUR_DAYS);
};

export const markPlayed = async (
  sub: string,
  date: string,
  user: string
): Promise<void> => {
  await redis.hSet(keys.playedToday(sub, date), { [user.toLowerCase()]: '1' });
  await redis.expire(keys.playedToday(sub, date), FOUR_DAYS);
};

export const playedCount = async (sub: string, date: string): Promise<number> =>
  (await redis.hLen(keys.playedToday(sub, date))) ?? 0;

// ---- endless sessions ------------------------------------------------------

export type EndlessSession = { deck: FrozenPost[]; index: number };

export const saveEndless = async (
  user: string,
  deck: FrozenPost[]
): Promise<void> => {
  await redis.set(keys.endless(user), JSON.stringify({ deck, index: 0 }));
  await redis.expire(keys.endless(user), SIX_HOURS);
};

export const getEndless = async (
  user: string
): Promise<EndlessSession | null> => {
  const raw = await redis.get(keys.endless(user));
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as EndlessSession;
    if (Array.isArray(v.deck)) return { deck: v.deck, index: v.index ?? 0 };
    return null;
  } catch {
    return null;
  }
};

export const setEndlessIndex = async (
  user: string,
  session: EndlessSession,
  index: number
): Promise<void> => {
  await redis.set(keys.endless(user), JSON.stringify({ deck: session.deck, index }));
  await redis.expire(keys.endless(user), SIX_HOURS);
};

export const clearEndless = async (user: string): Promise<void> => {
  await redis.del(keys.endless(user));
};

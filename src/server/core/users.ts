import { redis } from '@devvit/web/server';
import { keys } from './keys';
import type { UserStats } from '../../shared/api';
import { POINTS_PER_CORRECT, nextStreak } from './scoring';

const num = (v: string | undefined): number => (v ? parseInt(v, 10) || 0 : 0);

export const getUser = async (username: string): Promise<UserStats> => {
  const h = await redis.hGetAll(keys.user(username));
  return {
    username,
    points: num(h.points),
    gamesPlayed: num(h.gamesPlayed),
    bestScore: num(h.bestScore),
    streak: num(h.streak),
    bestStreak: num(h.bestStreak),
  };
};

export type FinishUpdate = { me: UserStats; streakDelta: number };

// Apply a finished DAILY run to the user's profile. Called once per day per user
// (gated by the finished-run record in the route), so it is effectively idempotent.
export const applyDailyFinish = async (
  username: string,
  today: string,
  score: number
): Promise<FinishUpdate> => {
  const key = keys.user(username);
  const h = await redis.hGetAll(key);
  const lastDate = h.lastPlayed ? h.lastPlayed : null;
  const cur = num(h.streak);
  const best = num(h.bestStreak);
  const bestScore = num(h.bestScore);
  const s = nextStreak(lastDate, today, cur, best);

  const updates: Record<string, string> = {
    gamesPlayed: String(num(h.gamesPlayed) + 1),
    lastPlayed: today,
    streak: String(s.streak),
    bestStreak: String(s.bestStreak),
  };
  if (score > bestScore) updates.bestScore = String(score);
  await redis.hSet(key, updates);
  if (score > 0) await redis.hIncrBy(key, 'points', score * POINTS_PER_CORRECT);

  const me = await getUser(username);
  return { me, streakDelta: s.isNewDay ? s.streak - cur : 0 };
};

export const getEndlessBest = async (username: string): Promise<number> =>
  num(await redis.hGet(keys.user(username), 'endlessBest'));

export const setEndlessBest = async (
  username: string,
  score: number
): Promise<number> => {
  const cur = await getEndlessBest(username);
  if (score > cur) {
    await redis.hSet(keys.user(username), { endlessBest: String(score) });
    return score;
  }
  return cur;
};

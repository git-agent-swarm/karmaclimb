import { redis } from '@devvit/web/server';
import { keys } from './keys';
import type { LeaderEntry } from '../../shared/api';

const FOUR_DAYS = 60 * 60 * 24 * 4;

// Today's board keeps each user's BEST daily score for the date.
export const recordToday = async (
  sub: string,
  date: string,
  user: string,
  score: number
): Promise<void> => {
  const k = keys.lbToday(sub, date);
  const existing = await redis.zScore(k, user);
  if (existing === undefined || existing === null || score > existing) {
    await redis.zAdd(k, { member: user, score });
  }
  await redis.expire(k, FOUR_DAYS);
};

export const addAllTime = async (
  sub: string,
  user: string,
  points: number
): Promise<void> => {
  if (points !== 0) await redis.zIncrBy(keys.lbAllTime(sub), user, points);
};

const topN = async (key: string, n: number): Promise<LeaderEntry[]> => {
  const rows = await redis.zRange(key, 0, n - 1, { reverse: true, by: 'rank' });
  return rows.map((r, i) => ({ rank: i + 1, username: r.member, score: r.score }));
};

export const topToday = (sub: string, date: string, n: number): Promise<LeaderEntry[]> =>
  topN(keys.lbToday(sub, date), n);

export const topAllTime = (sub: string, n: number): Promise<LeaderEntry[]> =>
  topN(keys.lbAllTime(sub), n);

const rankOf = async (key: string, user: string): Promise<number | null> => {
  const score = await redis.zScore(key, user);
  if (score === undefined || score === null) return null;
  const asc = await redis.zRank(key, user);
  if (asc === undefined || asc === null) return null;
  const card = await redis.zCard(key);
  return card - asc;
};

export const todayRank = (sub: string, date: string, user: string): Promise<number | null> =>
  rankOf(keys.lbToday(sub, date), user);

export const allTimeRank = (sub: string, user: string): Promise<number | null> =>
  rankOf(keys.lbAllTime(sub), user);

import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  EndlessGuessResponse,
  EndlessStartResponse,
  ErrorResponse,
  GuessRequest,
  GuessResponse,
  InitResponse,
  LeaderboardResponse,
  RunState,
} from '../../shared/api';
import { climbNumber, isoDate, POINTS_PER_CORRECT, shareGrid } from '../core/scoring';
import { keys } from '../core/keys';
import { buildChain, isGuessCorrect, revealedScores, toDeckItem } from '../core/deck';
import {
  clearEndless,
  getCandidates,
  getEndless,
  getOrBakeDeck,
  getRun,
  markPlayed,
  playedCount,
  saveEndless,
  saveRun,
  setEndlessIndex,
} from '../core/store';
import {
  applyDailyFinish,
  getEndlessBest,
  getUser,
  setEndlessBest,
} from '../core/users';
import {
  addAllTime,
  allTimeRank,
  recordToday,
  todayRank,
  topAllTime,
  topToday,
} from '../core/leaderboard';

export const api = new Hono();

const fail = (message: string): ErrorResponse => ({ status: 'error', message });

const username = async (): Promise<string> =>
  (await reddit.getCurrentUsername()) ?? 'anonymous';

const validGuessBody = (b: unknown): b is GuessRequest => {
  if (typeof b !== 'object' || b === null) return false;
  const r = b as Record<string, unknown>;
  return (
    typeof r.index === 'number' &&
    (r.direction === 'higher' || r.direction === 'lower')
  );
};

// Persist a finished daily run to profile + leaderboards (real users only).
const finalizeDaily = async (
  sub: string,
  date: string,
  name: string,
  score: number
): Promise<{ me: Awaited<ReturnType<typeof getUser>>; streakDelta: number }> => {
  if (name === 'anonymous') return { me: await getUser(name), streakDelta: 0 };
  // Atomic once-per-day gate: only the first finishing request applies points,
  // streak, gamesPlayed and the cumulative all-time leaderboard. Protects against
  // concurrent finishing /guess requests double-counting.
  const gate = await redis.hIncrBy(keys.finalGate(sub, date, name), 'n', 1);
  if (gate !== 1) return { me: await getUser(name), streakDelta: 0 };
  await redis.expire(keys.finalGate(sub, date, name), 60 * 60 * 24 * 4);

  await markPlayed(sub, date, name);
  const upd = await applyDailyFinish(name, date, score);
  await Promise.all([
    score > 0 ? recordToday(sub, date, name, score) : Promise.resolve(),
    addAllTime(sub, name, score * POINTS_PER_CORRECT),
  ]);
  return upd;
};

api.get('/init', async (c) => {
  const sub = context.subredditName ?? 'unknown';
  const name = await username();
  const today = isoDate(new Date());
  const deck = await getOrBakeDeck(sub, today);
  const [me, run, played, bestEndless] = await Promise.all([
    getUser(name),
    getRun(sub, today, name),
    playedCount(sub, today),
    getEndlessBest(name),
  ]);
  const maxScore = Math.max(0, deck.length - 1);
  const revealUpto = run.finished
    ? Math.min(run.index + 1, Math.max(0, deck.length - 1))
    : run.index;
  return c.json<InitResponse>({
    type: 'init',
    username: name,
    climbNumber: climbNumber(today),
    subreddit: sub,
    deck: deck.map(toDeckItem),
    maxScore,
    revealedScores: revealedScores(deck, revealUpto),
    run,
    me,
    playedToday: played,
    bestEndless,
    share: run.finished
      ? shareGrid(run.score, maxScore, climbNumber(today), sub)
      : null,
  });
});

api.post('/guess', async (c) => {
  const sub = context.subredditName ?? 'unknown';
  const name = await username();
  const today = isoDate(new Date());
  const body = await c.req.json().catch(() => null);
  if (!validGuessBody(body)) return c.json(fail('bad request'), 400);

  const deck = await getOrBakeDeck(sub, today);
  const maxScore = Math.max(0, deck.length - 1);
  const run = await getRun(sub, today, name);

  // Already finished today — just echo the result.
  if (run.finished) {
    const me = await getUser(name);
    const at = Math.min(run.index, Math.max(0, deck.length - 1));
    return c.json<GuessResponse>({
      type: 'guess',
      correct: false,
      revealedIndex: at,
      revealedScore: deck[at]?.score ?? 0,
      run,
      finished: true,
      me,
      streakDelta: 0,
      share: shareGrid(run.score, maxScore, climbNumber(today), sub),
    });
  }

  // Client must be in sync with the server's position (anti-tamper).
  if (body.index !== run.index) {
    const me = await getUser(name);
    const at = Math.min(run.index, Math.max(0, deck.length - 1));
    return c.json<GuessResponse>({
      type: 'guess',
      correct: false,
      revealedIndex: at,
      revealedScore: deck[at]?.score ?? 0,
      run,
      finished: false,
      me,
      streakDelta: 0,
      share: null,
    });
  }

  const from = deck[run.index];
  const to = deck[run.index + 1];
  if (!from || !to) {
    const finRun: RunState = { index: run.index, finished: true, score: run.index };
    await saveRun(sub, today, name, finRun);
    const fin = await finalizeDaily(sub, today, name, finRun.score);
    return c.json<GuessResponse>({
      type: 'guess',
      correct: true,
      revealedIndex: run.index,
      revealedScore: from?.score ?? 0,
      run: finRun,
      finished: true,
      me: fin.me,
      streakDelta: fin.streakDelta,
      share: shareGrid(finRun.score, maxScore, climbNumber(today), sub),
    });
  }

  const correct = isGuessCorrect(from.score, to.score, body.direction);
  let newRun: RunState;
  let finished: boolean;
  if (correct) {
    const newIndex = run.index + 1;
    finished = newIndex >= deck.length - 1;
    newRun = { index: newIndex, finished, score: newIndex };
  } else {
    finished = true;
    newRun = { index: run.index, finished: true, score: run.index };
  }
  await saveRun(sub, today, name, newRun);

  let me = await getUser(name);
  let streakDelta = 0;
  let share: string | null = null;
  if (finished) {
    const fin = await finalizeDaily(sub, today, name, newRun.score);
    me = fin.me;
    streakDelta = fin.streakDelta;
    share = shareGrid(newRun.score, maxScore, climbNumber(today), sub);
  }

  return c.json<GuessResponse>({
    type: 'guess',
    correct,
    revealedIndex: run.index + 1,
    revealedScore: to.score,
    run: newRun,
    finished,
    me,
    streakDelta,
    share,
  });
});

api.post('/endless/start', async (c) => {
  const sub = context.subredditName ?? 'unknown';
  const name = await username();
  const today = isoDate(new Date());
  const candidates = await getCandidates(sub, today);
  const deck = buildChain(candidates, 40);
  const first = deck[0];
  if (deck.length < 2 || !first) {
    return c.json(fail('Not enough posts for endless mode yet'), 200);
  }
  await saveEndless(name, deck);
  return c.json<EndlessStartResponse>({
    type: 'endlessStart',
    deck: deck.map(toDeckItem),
    firstScore: first.score,
  });
});

api.post('/endless/guess', async (c) => {
  const name = await username();
  const body = await c.req.json().catch(() => null);
  if (!validGuessBody(body)) return c.json(fail('bad request'), 400);

  const session = await getEndless(name);
  if (!session) {
    return c.json<EndlessGuessResponse>({
      type: 'endlessGuess',
      correct: false,
      revealedIndex: 0,
      revealedScore: 0,
      score: 0,
      finished: true,
      bestEndless: await getEndlessBest(name),
    });
  }

  if (body.index !== session.index) {
    const at = Math.min(session.index, Math.max(0, session.deck.length - 1));
    return c.json<EndlessGuessResponse>({
      type: 'endlessGuess',
      correct: false,
      revealedIndex: at,
      revealedScore: session.deck[at]?.score ?? 0,
      score: session.index,
      finished: false,
      bestEndless: await getEndlessBest(name),
    });
  }

  const from = session.deck[session.index];
  const to = session.deck[session.index + 1];
  if (!from || !to) {
    const best = await setEndlessBest(name, session.index);
    await clearEndless(name);
    return c.json<EndlessGuessResponse>({
      type: 'endlessGuess',
      correct: true,
      revealedIndex: session.index,
      revealedScore: from?.score ?? 0,
      score: session.index,
      finished: true,
      bestEndless: best,
    });
  }

  const correct = isGuessCorrect(from.score, to.score, body.direction);
  if (!correct) {
    const best = await setEndlessBest(name, session.index);
    await clearEndless(name);
    return c.json<EndlessGuessResponse>({
      type: 'endlessGuess',
      correct: false,
      revealedIndex: session.index + 1,
      revealedScore: to.score,
      score: session.index,
      finished: true,
      bestEndless: best,
    });
  }

  const newIndex = session.index + 1;
  const done = newIndex >= session.deck.length - 1;
  let bestEndless: number;
  if (done) {
    bestEndless = await setEndlessBest(name, newIndex);
    await clearEndless(name);
  } else {
    await setEndlessIndex(name, session, newIndex);
    bestEndless = await getEndlessBest(name);
  }
  return c.json<EndlessGuessResponse>({
    type: 'endlessGuess',
    correct: true,
    revealedIndex: session.index + 1,
    revealedScore: to.score,
    score: newIndex,
    finished: done,
    bestEndless,
  });
});

api.get('/leaderboard', async (c) => {
  const sub = context.subredditName ?? 'unknown';
  const name = await username();
  const today = isoDate(new Date());
  const [todayTop, allTop, tRank, aRank] = await Promise.all([
    topToday(sub, today, 10),
    topAllTime(sub, 10),
    todayRank(sub, today, name),
    allTimeRank(sub, name),
  ]);
  return c.json<LeaderboardResponse>({
    type: 'leaderboard',
    today: todayTop,
    allTime: allTop,
    yourTodayRank: tRank,
    yourAllTimeRank: aRank,
  });
});

// Pure date / streak / scoring / share-grid logic. No Redis, no Devvit — kept
// side-effect free so it can be unit-tested in isolation.

export const POINTS_PER_CORRECT = 10;

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const dayNumber = (iso: string): number =>
  Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);

export const dayDiff = (fromIso: string, toIso: string): number =>
  dayNumber(toIso) - dayNumber(fromIso);

// Stable "puzzle number" for the share card (Wordle-style), counting up from a
// fixed launch epoch.
const CLIMB_EPOCH = '2026-06-01';
export const climbNumber = (today: string): number =>
  Math.max(1, dayDiff(CLIMB_EPOCH, today) + 1);

export type StreakResult = {
  streak: number;
  bestStreak: number;
  isNewDay: boolean;
};

// Advance (or reset) a daily play streak given the last day the user played.
export const nextStreak = (
  lastDate: string | null,
  today: string,
  currentStreak: number,
  bestStreak: number
): StreakResult => {
  if (lastDate === today) {
    return { streak: currentStreak, bestStreak, isNewDay: false };
  }
  const consecutive = lastDate !== null && dayDiff(lastDate, today) === 1;
  const streak = consecutive ? currentStreak + 1 : 1;
  return { streak, bestStreak: Math.max(bestStreak, streak), isNewDay: true };
};

// Spoiler-free Wordle-style result card: greens for correct guesses, one red for
// the miss, a trophy if the climb was completed. This is the recruitment engine.
export const shareGrid = (
  score: number,
  maxScore: number,
  climb: number,
  subreddit: string
): string => {
  const safeScore = Math.max(0, score);
  const completed = maxScore > 0 && safeScore >= maxScore;
  const greens = '🟩'.repeat(safeScore);
  const miss = completed ? '' : '🟥';
  const trophy = completed ? ' 🏆' : '';
  return `Karma Climb · r/${subreddit} · #${climb}\n${greens}${miss}${trophy}\n${safeScore}/${maxScore} 🧗`;
};

// Domain + API types shared between the Devvit server and the React client.
// SECURITY: a deck item's real upvote score is NEVER sent to the client until
// the player has committed a guess — `DeckItem` deliberately omits the score,
// and `revealedScores` only contains values up to the player's current position.

export type DeckItem = {
  id: string;
  title: string;
  subreddit: string;
  thumb: string | null;
};

export type Direction = 'higher' | 'lower';

export type RunState = {
  index: number; // position the player is AT (deck[index] is fully revealed)
  finished: boolean;
  score: number; // number of correct guesses
};

export type UserStats = {
  username: string;
  points: number;
  gamesPlayed: number;
  bestScore: number;
  streak: number;
  bestStreak: number;
};

export type InitResponse = {
  type: 'init';
  username: string;
  climbNumber: number;
  subreddit: string;
  deck: DeckItem[];
  maxScore: number; // deck.length - 1
  revealedScores: (number | null)[]; // length === deck.length; null until revealed
  run: RunState;
  me: UserStats;
  playedToday: number;
  bestEndless: number;
  share: string | null; // present if today's run is already finished
};

export type GuessRequest = {
  index: number; // the position guessing FROM (player has seen deck[index])
  direction: Direction;
};

export type GuessResponse = {
  type: 'guess';
  correct: boolean;
  revealedIndex: number; // deck[index + 1] is now revealed
  revealedScore: number;
  run: RunState;
  finished: boolean;
  me: UserStats;
  streakDelta: number;
  share: string | null; // set when finished
};

export type EndlessStartResponse = {
  type: 'endlessStart';
  deck: DeckItem[];
  firstScore: number;
};

export type EndlessGuessResponse = {
  type: 'endlessGuess';
  correct: boolean;
  revealedIndex: number;
  revealedScore: number;
  score: number;
  finished: boolean;
  bestEndless: number;
};

export type LeaderEntry = {
  rank: number;
  username: string;
  score: number;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  today: LeaderEntry[];
  allTime: LeaderEntry[];
  yourTodayRank: number | null;
  yourAllTimeRank: number | null;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};

export type Screen = 'play' | 'leaderboard' | 'howto';

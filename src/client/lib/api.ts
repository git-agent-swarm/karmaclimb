// Typed fetch wrappers around the /api endpoints.

import type {
  Direction,
  EndlessGuessResponse,
  EndlessStartResponse,
  ErrorResponse,
  GuessResponse,
  InitResponse,
  LeaderboardResponse,
} from '../../shared/api';

const getJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: T = await res.json();
  return data;
};

const postJson = async <T,>(url: string, body: unknown): Promise<T> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: T = await res.json();
  return data;
};

export const fetchInit = (): Promise<InitResponse> =>
  getJson<InitResponse>('/api/init');

export const postGuess = (index: number, direction: Direction): Promise<GuessResponse> =>
  postJson<GuessResponse>('/api/guess', { index, direction });

export const startEndless = (): Promise<EndlessStartResponse | ErrorResponse> =>
  postJson<EndlessStartResponse | ErrorResponse>('/api/endless/start', {});

export const postEndlessGuess = (
  index: number,
  direction: Direction
): Promise<EndlessGuessResponse> =>
  postJson<EndlessGuessResponse>('/api/endless/guess', { index, direction });

export const fetchLeaderboard = (): Promise<LeaderboardResponse> =>
  getJson<LeaderboardResponse>('/api/leaderboard');

// Centralized Redis key builders. Redis is per-installation (per subreddit),
// but we also namespace by subreddit name so cross-sub helpers stay unambiguous.

export const keys = {
  deck: (sub: string, date: string): string => `deck:${sub}:${date}`,
  candidates: (sub: string, date: string): string => `cand:${sub}:${date}`,
  run: (sub: string, date: string, user: string): string =>
    `run:${sub}:${date}:${user.toLowerCase()}`,
  finalGate: (sub: string, date: string, user: string): string =>
    `final:${sub}:${date}:${user.toLowerCase()}`,
  playedToday: (sub: string, date: string): string => `played:${sub}:${date}`,
  user: (user: string): string => `user:${user.toLowerCase()}`,
  lbToday: (sub: string, date: string): string => `lb:today:${sub}:${date}`,
  lbAllTime: (sub: string): string => `lb:all:${sub}`,
  endless: (user: string): string => `endless:${user.toLowerCase()}`,
} as const;

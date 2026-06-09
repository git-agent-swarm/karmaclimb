// Impure layer: fetch real posts from the Reddit Data API and freeze them into
// plain FrozenPost records. Auto-localizes to the host subreddit, falling back
// to the curated SFW allowlist when the host can't supply enough content.

import { reddit } from '@devvit/web/server';
import type { FrozenPost } from './deck';
import { shuffle } from './deck';
import { isCleanTitle } from './safety';
import { ALLOWLIST_SUBS } from '../data/allowlist';

const MIN_SCORE = 50;
const MIN_HOST_CANDIDATES = 24;
const TARGET_POOL = 60;
const MAX_SUPPLEMENT_FETCHES = 4;

const httpThumb = (url: string | undefined): string | null => {
  if (!url) return null;
  return url.startsWith('http://') || url.startsWith('https://') ? url : null;
};

const fetchTop = async (sub: string, limit: number): Promise<FrozenPost[]> => {
  try {
    const posts = await reddit
      .getTopPosts({ subredditName: sub, timeframe: 'year', limit })
      .all();
    const out: FrozenPost[] = [];
    for (const p of posts) {
      if (p.nsfw || p.spoiler || p.stickied || p.removed) continue;
      if (p.score < MIN_SCORE) continue;
      const title = p.title.trim();
      if (title.length === 0 || !isCleanTitle(title)) continue;
      out.push({
        id: p.id,
        title,
        subreddit: p.subredditName,
        score: p.score,
        thumb: httpThumb(p.thumbnail?.url),
      });
    }
    return out;
  } catch {
    return [];
  }
};

// Gather a candidate pool for a subreddit's deck. Prefer the host subreddit's
// own top posts; supplement from a bounded number of random allowlist subs if
// there aren't enough (bounded so a single bake never fans out unbounded).
export const gatherCandidates = async (hostSub: string): Promise<FrozenPost[]> => {
  let pool = await fetchTop(hostSub, 100);
  if (pool.length < MIN_HOST_CANDIDATES) {
    let fetches = 0;
    for (const sub of shuffle(ALLOWLIST_SUBS)) {
      if (pool.length >= TARGET_POOL || fetches >= MAX_SUPPLEMENT_FETCHES) break;
      pool = pool.concat(await fetchTop(sub, 50));
      fetches++;
    }
  }
  return pool;
};

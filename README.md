# 🧗 Karma Climb

**Higher or Lower — played with real Reddit upvotes.**

Two real Reddit posts appear. You see how many upvotes the first one got. Did the
next post get **more** or **fewer**? Tap Higher or Lower, build a run, and see how
high you can climb. One wrong guess ends it.

Every community gets a **fresh daily climb built from its own top posts**, plus an
endless mode, daily streaks, leaderboards, and a spoiler-free share card to
challenge your friends.

---

## How to play

1. The top card shows a real post and its upvote count.
2. Guess whether the **next** post has **more** (⬆️ Higher) or **fewer** (⬇️ Lower) upvotes.
3. Keep going — every correct guess climbs higher. One miss ends the run.
4. Come back tomorrow for a new daily climb and grow your 🔥 streak.

**Share your result** with the spoiler-free grid:

```
Karma Climb · r/aww · #9
🟩🟩🟩🟩🟥
4/11 🧗
```

## For moderators

Install Karma Climb on your subreddit and it drops in a game post automatically.
The daily climb is built from **your community's own top posts**, so it's
different in every subreddit and refreshes every day. You can add another post
any time from the subreddit's mod menu → **"Create a Karma Climb post."**

There's nothing to moderate: the game only ever shows posts that are already
public on Reddit, NSFW / spoiler / removed posts are filtered out (with an extra
title safety filter on top), and players never submit any content of their own.

## Privacy & data

Karma Climb stores only your **Reddit username**, your **game scores/streaks**,
and the day's **cached deck**, all in Reddit's per-community Redis. It is used
solely for in-app leaderboards and streaks, is **never shared with third
parties**, and the app makes **no external network calls** at runtime. There is
no personal data collected and no user-generated content. Questions:
message the developer at [Kobey Dev Services](https://github.com/git-agent-swarm).

---

## How it works (for developers)

Built on **Devvit Web** — a React client in a Reddit iframe with a Hono/Node
serverless backend, Redis for storage, and **zero external network calls**.

- **Content** comes from the Reddit Data API (`reddit.getTopPosts`) — the host
  subreddit's own top posts, supplemented from a curated SFW allowlist for small
  or brand-new communities. Posts are frozen (id, title, subreddit, score,
  thumbnail) into a deck that is **baked once per subreddit per day** and cached
  in Redis, so every player gets the identical daily climb (Wordle-style).
- **Anti-cheat:** a post's upvote score is never sent to the client until the
  player has committed a guess; run progress is tracked server-side and the guess
  endpoint validates the client's position against the server's.
- **Daily rotation needs no scheduler** — the deck is keyed by date and
  lazily baked on the day's first visit.
- Streaks, daily + all-time leaderboards (Redis sorted sets), and an endless mode
  round out the loop.

### Project layout

```
src/server   Hono API (routes/api.ts) + core/ (deck, reddit, store, scoring,
             users, leaderboard) + data/allowlist.ts
src/client   React game (game.tsx, views/*, hooks/useClimb.ts, lib/api.ts)
src/shared   Types shared across client + server
test/        Pure-logic unit tests (deck builder, scoring, streaks, share grid)
```

### Commands

- `npm run dev` — playtest live on a test subreddit
- `npm run build` — build client + server
- `npm run type-check` / `npm run lint` / `npm test`
- `npm run launch` — publish for review

Built by [Kobey Dev Services](https://github.com/git-agent-swarm).

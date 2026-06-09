import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { HUB_TITLE, submitPost } from '../core/post';
import { getOrBakeDeck } from '../core/store';
import { isoDate } from '../core/scoring';

export const triggers = new Hono();

// On install: pre-bake today's deck (so the first player doesn't wait on the
// Reddit fetch) and drop the Karma Climb post into the community.
triggers.post('/on-app-install', async (c) => {
  try {
    const sub = context.subredditName ?? 'unknown';
    await getOrBakeDeck(sub, isoDate(new Date()));
    const { id } = await submitPost(HUB_TITLE);
    return c.json<TriggerResponse>(
      { status: 'success', message: `Karma Climb live in r/${sub} (post ${id})` },
      200
    );
  } catch (error) {
    console.error(`Install failed: ${error}`);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Failed to set up Karma Climb' },
      400
    );
  }
});

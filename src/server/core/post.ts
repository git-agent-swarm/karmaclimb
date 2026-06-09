import { reddit } from '@devvit/web/server';

export const HUB_TITLE =
  '🧗 Karma Climb — can you guess which post Reddit upvoted more?';

export const submitPost = async (title: string): Promise<{ id: string }> => {
  const post = await reddit.submitCustomPost({ title });
  return { id: post.id };
};

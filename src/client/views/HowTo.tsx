import type { ClimbApi } from '../hooks/useClimb';
import { Button, Card } from '../ui';

export const HowTo = ({ game }: { game: ClimbApi }) => (
  <div className="flex flex-col gap-4">
    <div className="text-center">
      <div className="text-5xl">🧗</div>
      <h1 className="mt-1 text-2xl font-black text-white">How to play</h1>
    </div>
    <Card className="flex flex-col gap-3 p-5 text-sm leading-relaxed text-slate-200">
      <p>① You’ll see two real Reddit posts.</p>
      <p>
        ② The top post shows its upvotes. Guess whether the next post got{' '}
        <span className="font-bold text-emerald-400">more</span> (Higher) or{' '}
        <span className="font-bold text-rose-400">fewer</span> (Lower) upvotes.
      </p>
      <p>③ Keep going — one wrong guess ends your climb. How high can you get?</p>
      <p>
        Come back every day for a fresh climb and grow your 🔥 streak. Posts are
        pulled live from r/{game.subreddit || 'this community'}.
      </p>
    </Card>
    <Button onClick={() => game.setScreen('play')}>Start climbing →</Button>
  </div>
);

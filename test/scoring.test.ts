import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  climbNumber,
  dayDiff,
  isoDate,
  nextStreak,
  shareGrid,
} from '../src/server/core/scoring.ts';

test('isoDate + dayDiff', () => {
  assert.equal(isoDate(new Date('2026-06-09T12:00:00Z')), '2026-06-09');
  assert.equal(dayDiff('2026-06-08', '2026-06-09'), 1);
  assert.equal(dayDiff('2026-06-01', '2026-06-09'), 8);
});

test('climbNumber counts up from the epoch and never goes below 1', () => {
  assert.equal(climbNumber('2026-06-01'), 1);
  assert.equal(climbNumber('2026-06-09'), 9);
  assert.equal(climbNumber('2026-05-01'), 1);
});

test('nextStreak advances on a consecutive day', () => {
  assert.deepEqual(nextStreak('2026-06-08', '2026-06-09', 4, 4), {
    streak: 5,
    bestStreak: 5,
    isNewDay: true,
  });
});

test('nextStreak resets after a gap but keeps best', () => {
  assert.deepEqual(nextStreak('2026-06-05', '2026-06-09', 4, 7), {
    streak: 1,
    bestStreak: 7,
    isNewDay: true,
  });
});

test('nextStreak is a no-op on the same day', () => {
  assert.deepEqual(nextStreak('2026-06-09', '2026-06-09', 4, 7), {
    streak: 4,
    bestStreak: 7,
    isNewDay: false,
  });
});

test('nextStreak starts fresh with no history', () => {
  assert.deepEqual(nextStreak(null, '2026-06-09', 0, 0), {
    streak: 1,
    bestStreak: 1,
    isNewDay: true,
  });
});

test('shareGrid renders greens + a miss for an incomplete climb', () => {
  const g = shareGrid(3, 11, 9, 'aww');
  assert.match(g, /Karma Climb · r\/aww · #9/);
  assert.match(g, /🟩🟩🟩🟥/);
  assert.match(g, /3\/11/);
  assert.ok(!g.includes('🏆'));
});

test('shareGrid renders a trophy for a perfect climb', () => {
  const g = shareGrid(11, 11, 9, 'aww');
  assert.equal((g.match(/🟩/g) ?? []).length, 11);
  assert.ok(!g.includes('🟥'));
  assert.ok(g.includes('🏆'));
});

test('shareGrid handles a zero score (missed the first guess)', () => {
  const g = shareGrid(0, 11, 9, 'aww');
  assert.ok(!g.includes('🟩'));
  assert.ok(g.includes('🟥'));
});

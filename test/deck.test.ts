import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChain,
  DECK_SIZE,
  isGuessCorrect,
  prepareCandidates,
  revealedScores,
  toDeckItem,
  type FrozenPost,
} from '../src/server/core/deck.ts';

const mk = (id: string, score: number, title = `post ${id}`): FrozenPost => ({
  id,
  title,
  subreddit: 'aww',
  score,
  thumb: null,
});

const pool = (n: number): FrozenPost[] =>
  Array.from({ length: n }, (_, i) => mk(`t3_${i}`, (i + 1) * 100));

test('prepareCandidates drops invalid, duplicate-id, and duplicate-score posts', () => {
  const raw: FrozenPost[] = [
    mk('t3_a', 100),
    mk('t3_a', 200), // dup id
    mk('t3_b', 100), // dup score
    mk('t3_c', 0), // invalid score
    { ...mk('t3_d', 300), title: '   ' }, // blank title
    mk('t3_e', 400),
  ];
  const out = prepareCandidates(raw);
  const ids = out.map((p) => p.id);
  assert.deepEqual(ids.sort(), ['t3_a', 't3_e']);
});

test('buildChain returns up to DECK_SIZE posts, all from input, no dupes', () => {
  const chain = buildChain(pool(50));
  assert.equal(chain.length, DECK_SIZE);
  const ids = new Set(chain.map((p) => p.id));
  assert.equal(ids.size, chain.length);
  for (const p of chain) assert.ok(p.score > 0);
});

test('buildChain never has two adjacent posts with equal scores', () => {
  // run several times since ordering is randomized
  for (let r = 0; r < 25; r++) {
    const chain = buildChain(pool(40));
    for (let i = 1; i < chain.length; i++) {
      assert.notEqual(chain[i]!.score, chain[i - 1]!.score);
    }
  }
});

test('buildChain caps at the available pool size', () => {
  const chain = buildChain(pool(5));
  assert.equal(chain.length, 5);
});

test('isGuessCorrect resolves higher/lower correctly', () => {
  assert.equal(isGuessCorrect(100, 200, 'higher'), true);
  assert.equal(isGuessCorrect(100, 200, 'lower'), false);
  assert.equal(isGuessCorrect(300, 200, 'lower'), true);
  assert.equal(isGuessCorrect(300, 200, 'higher'), false);
});

test('revealedScores hides everything beyond the current index', () => {
  const deck = pool(5);
  const r = revealedScores(deck, 2);
  assert.deepEqual(r, [deck[0]!.score, deck[1]!.score, deck[2]!.score, null, null]);
});

test('toDeckItem strips the score', () => {
  const item = toDeckItem(mk('t3_x', 999, 'hello'));
  assert.deepEqual(item, { id: 't3_x', title: 'hello', subreddit: 'aww', thumb: null });
  assert.ok(!('score' in item));
});

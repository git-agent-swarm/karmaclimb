import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCleanTitle } from '../src/server/core/safety.ts';

test('clean titles pass', () => {
  assert.equal(isCleanTitle('My dog sits pretty'), true);
  assert.equal(isCleanTitle('Artemis II becomes the farthest human travel'), true);
  assert.equal(isCleanTitle('A raccoon ate my sandwich'), true);
});

test('titles with unambiguous slurs are rejected', () => {
  assert.equal(isCleanTitle('this is retarded honestly'), false);
});

test('innocent substrings are not false positives', () => {
  assert.equal(isCleanTitle('I visited Scunthorpe and saw a raccoon'), true);
  assert.equal(isCleanTitle('Specially picked grapes'), true);
});

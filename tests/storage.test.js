import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, saveProgress } from '../js/storage.js';

test('progress saves and reloads through browser storage', () => {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const progress = { ...loadProgress(), unlocked: 7, bestScore: 1250 };
  assert.equal(saveProgress(progress), true);
  assert.equal(loadProgress().unlocked, 7);
  assert.equal(loadProgress().bestScore, 1250);
  delete globalThis.localStorage;
});

test('progress falls back to memory when browser storage is unavailable', () => {
  globalThis.localStorage = { getItem() { throw new Error('Storage disabled'); }, setItem() { throw new Error('Storage disabled'); } };
  const progress = { ...loadProgress(), bestScore: 900 };
  assert.equal(saveProgress(progress), false);
  assert.equal(loadProgress().bestScore, 900);
  delete globalThis.localStorage;
});

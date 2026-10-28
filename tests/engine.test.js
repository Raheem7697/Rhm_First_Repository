import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../js/levels.js';
import { boardIsEmpty, createBoard, findCluster, findLandingCell, removeUnsupported, resolveShot } from '../js/engine.js';

const geometry = { radius: 10, originX: 0, originY: 0, rowStep: 17.32 };

test('all 50 levels have distinct data and playable constraints', () => {
  assert.equal(LEVELS.length, 50);
  assert.equal(new Set(LEVELS.map((level) => level.name)).size, 50);
  for (const level of LEVELS) {
    assert.ok(level.layout.length > 0);
    assert.ok(level.maxShots >= 25);
    assert.ok(level.colors.length >= 2 && level.colors.length <= 5);
    assert.equal(level.stars.length, 3);
    assert.ok(level.stars[0] < level.stars[1] && level.stars[1] < level.stars[2]);
  }
  assert.equal(new Set(LEVELS.map((level) => JSON.stringify(level.layout))).size, 50);
  assert.equal(LEVELS[5].colors.length, 3);
  assert.ok(LEVELS[49].maxShots > LEVELS[0].maxShots);
});

test('connected matching follows the staggered grid and removes groups of three', () => {
  const board = createBoard([{ row: 0, col: 3, color: 'coral' }, { row: 1, col: 3, color: 'coral' }, { row: 1, col: 4, color: 'coral' }]);
  assert.equal(findCluster(board, 0, 3).length, 3);
  const result = resolveShot(board, 0, 4, { color: 'coral', type: 'normal' });
  assert.equal(result.valid, true);
  assert.equal(result.matched.length, 4);
  assert.equal(result.score, 40);
});

test('unsupported bubbles fall after their ceiling support is removed', () => {
  const board = createBoard([{ row: 0, col: 4, color: 'gold' }, { row: 1, col: 4, color: 'blue' }, { row: 5, col: 8, color: 'mint' }]);
  const dropped = removeUnsupported(board);
  assert.equal(dropped.length, 1);
  board[0][4] = null;
  assert.equal(removeUnsupported(board).length, 1);
  assert.equal(boardIsEmpty(board), true);
});

test('landing snaps to an empty cell touching the ceiling or a bubble', () => {
  const board = createBoard([{ row: 0, col: 4, color: 'mint' }]);
  assert.deepEqual(findLandingCell(board, 90, 8, geometry), [0, 3]);
});

test('specials and frozen durability resolve without removing stone obstacles', () => {
  const board = createBoard([{ row: 0, col: 3, color: 'coral' }, { row: 0, col: 4, type: 'stone' }, { row: 1, col: 3, type: 'frozen' }]);
  const result = resolveShot(board, 1, 4, { color: 'coral', type: 'bomb' });
  assert.equal(result.valid, true);
  assert.ok(board[0][4]);
  assert.equal(board[1][3].hits, 1);
});

test('rainbow matches an adjacent color group and line clears only its row', () => {
  const rainbowBoard = createBoard([{ row: 0, col: 3, color: 'coral' }, { row: 0, col: 4, color: 'coral' }]);
  const rainbow = resolveShot(rainbowBoard, 1, 3, { color: null, type: 'rainbow' });
  assert.equal(rainbow.matched.length, 3);
  const lineBoard = createBoard([{ row: 0, col: 5, type: 'stone' }, { row: 1, col: 2, color: 'mint' }, { row: 1, col: 3, color: 'gold' }, { row: 1, col: 5, type: 'stone' }, { row: 2, col: 3, color: 'blue' }]);
  resolveShot(lineBoard, 1, 4, { color: null, type: 'line' });
  assert.equal(lineBoard[1][2], null);
  assert.equal(lineBoard[1][3], null);
  assert.ok(lineBoard[1][5]);
  assert.equal(lineBoard[2][3], null);
});

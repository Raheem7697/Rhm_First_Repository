export const ROWS = 12;
export const COLS = 9;

export function createBoard(layout = []) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (const cell of layout) {
    if (cell.row >= 0 && cell.row < ROWS && cell.col >= 0 && cell.col < COLS) {
      board[cell.row][cell.col] = { color: cell.color ?? null, type: cell.type ?? 'normal', hits: cell.type === 'frozen' ? 2 : 1 };
    }
  }
  return board;
}

export function neighbors(row, col) {
  const horizontal = [[row, col - 1], [row, col + 1]];
  const diagonals = row % 2 === 0
    ? [[row - 1, col - 1], [row - 1, col], [row + 1, col - 1], [row + 1, col]]
    : [[row - 1, col], [row - 1, col + 1], [row + 1, col], [row + 1, col + 1]];
  return [...horizontal, ...diagonals].filter(([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < COLS);
}

export function findCluster(board, row, col, accepts = (bubble) => bubble?.type !== 'stone') {
  const start = board[row]?.[col];
  if (!start || !accepts(start, start)) return [];
  const queue = [[row, col]];
  const visited = new Set([`${row},${col}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const [currentRow, currentCol] = queue[index];
    for (const [nextRow, nextCol] of neighbors(currentRow, currentCol)) {
      const key = `${nextRow},${nextCol}`;
      const bubble = board[nextRow][nextCol];
      if (!visited.has(key) && bubble && accepts(bubble, start)) {
        visited.add(key);
        queue.push([nextRow, nextCol]);
      }
    }
  }
  return queue;
}

export function findMatches(board, row, col) {
  const shot = board[row]?.[col];
  if (!shot || shot.type === 'stone' || shot.type === 'frozen') return [];
  if (shot.type === 'rainbow') {
    const matching = neighbors(row, col).find(([r, c]) => board[r][c]?.color);
    if (!matching) return [];
    const cluster = findCluster(board, ...matching, (bubble, start) => bubble.type !== 'stone' && bubble.color === start.color);
    return cluster.length >= 2 ? [[row, col], ...cluster] : [];
  }
  return findCluster(board, row, col, (bubble, start) => bubble.type !== 'stone' && (bubble.color === start.color || bubble.type === 'rainbow'));
}

export function removeUnsupported(board) {
  const connected = new Set();
  const queue = [];
  for (let col = 0; col < COLS; col += 1) if (board[0][col]) queue.push([0, col]);
  for (let index = 0; index < queue.length; index += 1) {
    const [row, col] = queue[index];
    const key = `${row},${col}`;
    if (connected.has(key)) continue;
    connected.add(key);
    for (const [nextRow, nextCol] of neighbors(row, col)) if (board[nextRow][nextCol] && !connected.has(`${nextRow},${nextCol}`)) queue.push([nextRow, nextCol]);
  }
  const dropped = [];
  for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
    if (board[row][col] && !connected.has(`${row},${col}`)) {
      dropped.push([row, col, board[row][col]]);
      board[row][col] = null;
    }
  }
  return dropped;
}

export function findLandingCell(board, x, y, geometry) {
  const { radius, originX, originY, rowStep } = geometry;
  const candidates = [];
  for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
    if (board[row][col]) continue;
    const point = cellCenter(row, col, geometry);
    const touchingTop = row === 0 && y <= originY + radius;
    const touchingBubble = neighbors(row, col).some(([r, c]) => {
      if (!board[r][c]) return false;
      const other = cellCenter(r, c, geometry);
      return Math.hypot(x - other.x, y - other.y) <= radius * 2 + 1;
    });
    if (touchingTop || touchingBubble) candidates.push({ row, col, distance: Math.hypot(x - point.x, y - point.y) });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0] ? [candidates[0].row, candidates[0].col] : null;
}

export function cellCenter(row, col, { radius, originX, originY, rowStep }) {
  return { x: originX + radius + col * radius * 2 + (row % 2) * radius, y: originY + radius + row * rowStep };
}

export function resolveShot(board, row, col, shot) {
  if (!board[row] || board[row][col]) return { valid: false, matched: [], dropped: [], score: 0 };
  board[row][col] = { ...shot, hits: shot.hits ?? 1 };
  let matched = [];
  if (shot.type === 'bomb' || shot.type === 'line') matched = [[row, col]];
  else matched = findMatches(board, row, col);
  const pending = [...matched];
  const targets = new Map();
  const triggered = new Set();
  for (let index = 0; index < pending.length; index += 1) {
    const [currentRow, currentCol] = pending[index];
    const key = `${currentRow},${currentCol}`;
    const bubble = board[currentRow][currentCol];
    if (!bubble || bubble.type === 'stone') continue;
    targets.set(key, [currentRow, currentCol]);
    if (triggered.has(key)) continue;
    triggered.add(key);
    let extras = [];
    if (bubble.type === 'bomb') extras = neighbors(currentRow, currentCol);
    if (bubble.type === 'line') extras = board[currentRow].map((item, colIndex) => item ? [currentRow, colIndex] : null).filter(Boolean);
    for (const [extraRow, extraCol] of extras) {
      if (board[extraRow][extraCol]?.type !== 'stone' && !targets.has(`${extraRow},${extraCol}`)) pending.push([extraRow, extraCol]);
    }
  }
  const popped = [];
  for (const [r, c] of targets.values()) {
    if (board[r][c]?.type === 'frozen') {
      board[r][c].hits -= 1;
      if (board[r][c].hits <= 0) { board[r][c] = null; popped.push([r, c]); }
    } else if (board[r][c]) {
      board[r][c] = null;
      popped.push([r, c]);
    }
  }
  const dropped = removeUnsupported(board);
  const count = popped.length + dropped.length;
  return { valid: true, matched: popped, dropped, score: popped.length * 10 + dropped.length * 20 + (count >= 5 ? (count - 4) * 5 : 0) };
}

export function boardIsEmpty(board) {
  return board.every((row) => row.every((bubble) => !bubble));
}

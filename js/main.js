import { LEVELS } from './levels.js';
import { ROWS, COLS, boardIsEmpty, cellCenter, createBoard, findLandingCell, removeUnsupported, resolveShot } from './engine.js';
import { loadProgress, saveProgress } from './storage.js';
import { playTone } from './audio.js';

const COLORS = { coral: '#ff6f78', gold: '#ffc95c', mint: '#55dcb5', blue: '#62a8ff', violet: '#ae83ff', rainbow: '#fff' };
const SPECIALS = ['bomb', 'rainbow', 'line'];
const $ = (selector) => document.querySelector(selector);
const canvas = $('#game-canvas');
const ctx = canvas.getContext('2d');
const progress = loadProgress();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { screen: 'home', level: null, board: null, score: 0, cleared: 0, shots: 0, current: null, next: null, aim: 0, flight: null, particles: [], paused: false, sound: progress.settings.sound, motion: progress.settings.motion || reducedMotion, effects: progress.settings.effects, lastTime: 0, combo: 0, lastClearAt: 0, specialText: '' };
let geometry = { radius: 20, originX: 0, originY: 30, rowStep: 34.64 };
let loopFrame = 0;

function showScreen(name) {
  state.screen = name;
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === `${name}-screen`));
  if (name === 'home') renderHome();
  if (name === 'levels') renderLevels();
  if (name === 'progress') renderProgress();
  if (name === 'settings') renderSettings();
  if (name === 'game') { resizeCanvas(); canvas.focus(); }
}

function renderHome() {
  $('#home-best').textContent = progress.bestScore.toLocaleString();
  $('#home-level').textContent = `${progress.unlocked} / 50`;
}

function renderLevels() {
  const grid = $('#level-grid');
  grid.replaceChildren();
  LEVELS.forEach((level) => {
    const button = document.createElement('button');
    const completed = Boolean(progress.completed[level.number]);
    const unlocked = level.number <= progress.unlocked;
    button.className = `level-tile${completed ? ' completed' : ''}${unlocked ? '' : ' locked'}`;
    button.type = 'button';
    button.disabled = !unlocked;
    button.setAttribute('aria-label', `${unlocked ? 'Level' : 'Locked level'} ${level.number}${completed ? `, ${progress.completed[level.number].stars} stars` : ''}`);
    button.innerHTML = `<span>${String(level.number).padStart(2, '0')}</span><small>${completed ? '★'.repeat(progress.completed[level.number].stars) : unlocked ? level.difficulty.toUpperCase() : 'LOCKED'}</small>`;
    if (unlocked) button.addEventListener('click', () => startLevel(level.number));
    grid.append(button);
  });
}

function renderProgress() {
  const completed = Object.values(progress.completed);
  $('#progress-cleared').innerHTML = `${completed.length} <span>/ 50</span>`;
  $('#progress-stars').innerHTML = `${completed.reduce((sum, item) => sum + item.stars, 0)} <span>/ 150</span>`;
  $('#progress-best').textContent = progress.bestScore.toLocaleString();
  const milestones = [['First pop', completed.length >= 1], ['A few favorites', completed.length >= 10], ['Halfway there', completed.length >= 25], ['Orbit complete', completed.length >= 50], ['Star collector', completed.reduce((sum, item) => sum + item.stars, 0) >= 75]];
  $('#achievement-list').innerHTML = milestones.map(([title, earned]) => `<div class="achievement-row${earned ? ' earned' : ''}"><span>${earned ? '✦' : '○'}</span><b>${title}</b><small>${earned ? 'UNLOCKED' : 'NOT YET'}</small></div>`).join('');
}

function renderSettings() {
  $('#setting-sound').checked = state.sound;
  $('#setting-motion').checked = state.motion;
  $('#setting-effects').value = state.effects;
}

function save() { saveProgress(progress); }

function startLevel(number) {
  cancelAnimationFrame(loopFrame);
  state.level = LEVELS[number - 1];
  state.board = createBoard(state.level.layout);
  state.score = 0;
  state.cleared = 0;
  state.shots = state.level.maxShots;
  state.current = randomBubble();
  state.next = randomBubble();
  state.flight = null;
  state.particles = [];
  state.combo = 0;
  state.paused = false;
  state.specialText = state.level.special ? `${state.level.special}: ${state.level.number < 21 ? 'disconnect them from the ceiling to drop them.' : 'watch their distinct shapes and plan around them.'}` : 'Match three colors to pop them. Keep an eye on what comes next.';
  $('#hud-level').textContent = String(number).padStart(2, '0');
  $('#level-name').textContent = state.level.name;
  $('#hud-target').innerHTML = `${state.level.target} <small>left</small>`;
  $('#hud-shots').textContent = state.shots;
  $('#hud-score').textContent = '0';
  $('#booster-count').textContent = progress.boosters;
  $('#special-note').textContent = state.specialText;
  $('#special-note').hidden = false;
  $('#game-overlay').hidden = true;
  $('#canvas-hint').textContent = 'AIM · TAP TO SHOOT';
  updateBubbles();
  updateHUD();
  showScreen('game');
  state.lastTime = performance.now();
  loopFrame = requestAnimationFrame(loop);
}

function randomBubble() {
  const color = state.level.colors[Math.floor(Math.random() * state.level.colors.length)];
  const type = state.level.number >= 21 && Math.random() < 0.08 ? SPECIALS[Math.floor(Math.random() * SPECIALS.length)] : 'normal';
  return { color, type, hits: 1 };
}

function updateBubbles() {
  const show = (selector, bubble) => {
    const parent = $(selector);
    parent.style.setProperty('--bubble-color', bubble.type === 'rainbow' ? 'conic-gradient(#ff6f78,#ffc95c,#55dcb5,#62a8ff,#ae83ff,#ff6f78)' : COLORS[bubble.color]);
    parent.dataset.special = bubble.type;
    parent.querySelector('span').textContent = bubble.type === 'bomb' ? '✹' : bubble.type === 'line' ? '↔' : bubble.type === 'rainbow' ? '✦' : '';
  };
  show('#current-bubble', state.current);
  show('#next-bubble', state.next);
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * dpr);
  canvas.height = Math.round(bounds.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const radius = Math.max(11, Math.min(23, (bounds.width - 22) / 19, (bounds.height - 110) / (2 + 11 * Math.sqrt(3))));
  const boardWidth = radius * 19;
  const originX = Math.max(6, (bounds.width - boardWidth) / 2);
  const rowStep = radius * Math.sqrt(3);
  const boardHeight = radius * 2 + rowStep * (ROWS - 1);
  geometry = { radius, originX, originY: Math.max(18, (bounds.height - boardHeight - 80) / 2), rowStep };
  draw();
}

function drawBubble(x, y, bubble, radius, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createRadialGradient(x - radius * 0.32, y - radius * 0.4, radius * 0.04, x, y, radius);
  if (bubble.type === 'rainbow') {
    gradient.addColorStop(0, '#fff'); gradient.addColorStop(0.35, '#ffc95c'); gradient.addColorStop(0.65, '#62a8ff'); gradient.addColorStop(1, '#ae83ff');
  } else {
    const color = COLORS[bubble.color] ?? '#fff';
    gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(0.22, color); gradient.addColorStop(1, color);
  }
  ctx.shadowColor = bubble.type === 'stone' ? '#9aa8bb' : COLORS[bubble.color] ?? '#fff';
  ctx.shadowBlur = state.motion ? 0 : (state.effects === 'high' ? 12 : 5);
  ctx.beginPath(); ctx.arc(x, y, radius * (bubble.type === 'stone' ? 0.93 : 0.97), 0, Math.PI * 2);
  ctx.fillStyle = bubble.type === 'stone' ? '#647185' : gradient; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.ellipse(x - radius * 0.28, y - radius * 0.35, radius * 0.23, radius * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fill();
  if (bubble.type === 'stone') {
    ctx.strokeStyle = '#bbc5d4'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - radius * .4, y); ctx.lineTo(x - radius * .06, y - radius * .27); ctx.lineTo(x + radius * .34, y - radius * .04); ctx.lineTo(x + radius * .2, y + radius * .37); ctx.stroke();
  } else if (bubble.type === 'frozen') {
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - radius * .4); ctx.lineTo(x, y + radius * .4); ctx.moveTo(x - radius * .4, y); ctx.lineTo(x + radius * .4, y); ctx.stroke();
  } else if (bubble.type !== 'normal') {
    ctx.fillStyle = '#fff'; ctx.font = `bold ${radius * 1.15}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bubble.type === 'bomb' ? '✹' : bubble.type === 'line' ? '↔' : '✦', x, y + radius * .04);
  }
  ctx.restore();
}

function draw() {
  if (!canvas.width) return;
  const width = canvas.clientWidth; const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.035)';
  for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
    const { x, y } = cellCenter(row, col, geometry);
    ctx.beginPath(); ctx.arc(x, y, geometry.radius * .92, 0, Math.PI * 2); ctx.fill();
  }
  if (state.board) for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
    const bubble = state.board[row][col]; if (bubble) { const { x, y } = cellCenter(row, col, geometry); drawBubble(x, y, bubble, geometry.radius); }
  }
  const launcher = { x: width / 2, y: height - geometry.radius * 2.3 };
  if (state.flight) drawBubble(state.flight.x, state.flight.y, state.flight.bubble, geometry.radius);
  else if (state.current && state.screen === 'game') {
    const direction = { x: Math.sin(state.aim), y: -Math.cos(state.aim) };
    ctx.save(); ctx.setLineDash([3, 7]); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    let x = launcher.x; let y = launcher.y; let dx = direction.x; const dy = direction.y;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let step = 0; step < 32; step += 1) {
      x += dx * 12; y += dy * 12;
      if (x < geometry.radius || x > width - geometry.radius) { dx *= -1; x = Math.max(geometry.radius, Math.min(width - geometry.radius, x)); }
      if (y < geometry.originY) break;
      ctx.lineTo(x, y);
      if (state.board.some((row, r) => row.some((bubble, c) => bubble && Math.hypot(x - cellCenter(r, c, geometry).x, y - cellCenter(r, c, geometry).y) <= geometry.radius * 1.9))) break;
    }
    ctx.stroke(); ctx.restore();
    drawBubble(launcher.x, launcher.y, state.current, geometry.radius);
  }
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life); ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function loop(now) {
  if (state.screen !== 'game') return;
  const dt = Math.min((now - state.lastTime) / 16.67, 2); state.lastTime = now;
  if (!state.paused && state.flight) advanceShot(dt);
  state.particles = state.particles.filter((particle) => particle.life > 0);
  state.particles.forEach((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= 0.025 * dt; });
  draw();
  loopFrame = requestAnimationFrame(loop);
}

function aimAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left - rect.width / 2;
  const y = clientY - rect.top - (rect.height - geometry.radius * 2.3);
  state.aim = Math.max(-1.25, Math.min(1.25, Math.atan2(x, -y)));
  draw();
}

function fire() {
  if (state.screen !== 'game' || state.paused || state.flight || state.shots <= 0) return;
  const width = canvas.clientWidth; const height = canvas.clientHeight;
  state.flight = { x: width / 2, y: height - geometry.radius * 2.3, vx: Math.sin(state.aim) * 8, vy: -Math.cos(state.aim) * 8, bubble: state.current };
  state.current = state.next; state.next = randomBubble();
  state.shots -= 1; updateBubbles(); updateHUD(); playTone('shoot', state.sound);
}

function advanceShot(dt) {
  const shot = state.flight; const width = canvas.clientWidth;
  shot.x += shot.vx * dt; shot.y += shot.vy * dt;
  if (shot.x <= geometry.radius || shot.x >= width - geometry.radius) shot.vx *= -1;
  let collision = shot.y <= geometry.originY + geometry.radius;
  if (!collision) collision = state.board.some((row, r) => row.some((bubble, c) => bubble && Math.hypot(shot.x - cellCenter(r, c, geometry).x, shot.y - cellCenter(r, c, geometry).y) <= geometry.radius * 1.95));
  if (!collision) return;
  const cell = findLandingCell(state.board, shot.x, shot.y, geometry);
  if (!cell) { state.flight = null; endGame(false); return; }
  const [row, col] = cell;
  const result = resolveShot(state.board, row, col, shot.bubble);
  state.flight = null;
  if (!result.valid) return;
  state.score += result.score;
  const cleared = result.matched.length + result.dropped.length;
  state.cleared += cleared;
  if (cleared >= 3) {
    const now = performance.now(); state.combo = now - state.lastClearAt < 4500 ? state.combo + 1 : 1; state.lastClearAt = now;
    $('#combo-value').textContent = state.combo > 1 ? `${state.combo}× COMBO` : 'NICE POP';
    state.score += Math.max(0, state.combo - 1) * 25;
    playTone(state.combo > 1 ? 'combo' : 'pop', state.sound);
    if (!state.motion) createParticles(cellCenter(row, col, geometry), result.matched, result.dropped);
  } else { state.combo = 0; $('#combo-value').textContent = 'READY'; }
  updateHUD();
  if (boardIsEmpty(state.board) || state.cleared >= state.level.target) endGame(true);
  else if (state.shots <= 0) endGame(false);
}

function createParticles(origin, matched, dropped) {
  const amount = state.effects === 'high' ? 16 : state.effects === 'low' ? 6 : 10;
  [...matched, ...dropped].slice(0, 12).forEach(([row, col]) => {
    const point = cellCenter(row, col, geometry);
    for (let i = 0; i < amount / 2; i += 1) state.particles.push({ x: point.x, y: point.y, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5, size: Math.random() * 3 + 1, life: 1, color: '#fff' });
  });
}

function updateHUD() {
  $('#hud-score').textContent = state.score.toLocaleString();
  $('#hud-target').innerHTML = `${Math.max(0, state.level.target - state.cleared)} <small>left</small>`;
  $('#target-progress').style.width = `${Math.min(100, state.cleared / state.level.target * 100)}%`;
  $('#hud-shots').textContent = state.shots;
  const dots = $('#shot-dots');
  dots.replaceChildren(...Array.from({ length: Math.min(state.level.maxShots, 30) }, (_, index) => {
    const dot = document.createElement('span');
    dot.className = `shot-dot${index >= state.shots ? ' used' : ''}`;
    return dot;
  }));
  $('#mobile-score').textContent = state.score.toLocaleString(); $('#mobile-shots').textContent = state.shots;
}

function endGame(won) {
  if (won) {
    const stars = state.score >= state.level.stars[2] ? 3 : state.score >= state.level.stars[1] ? 2 : 1;
    const previous = progress.completed[state.level.number]?.stars ?? 0;
    progress.completed[state.level.number] = { stars: Math.max(stars, previous), score: Math.max(state.score, progress.completed[state.level.number]?.score ?? 0) };
    progress.unlocked = Math.max(progress.unlocked, Math.min(50, state.level.number + 1));
    if (state.level.number % 5 === 0) progress.boosters = Math.min(9, progress.boosters + 1);
    $('#booster-count').textContent = progress.boosters;
    progress.bestScore = Math.max(progress.bestScore, state.score); save();
    showResult(true, stars);
  } else showResult(false, 0);
}

function showResult(won, stars) {
  state.screen = 'result';
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === 'result-screen'));
  $('#result-eyebrow').textContent = won ? 'A BRIGHT CLEAR' : 'THE SKY CAN WAIT';
  $('#result-title').textContent = won ? 'Lovely work.' : 'Nearly had it.';
  $('#result-copy').textContent = won ? `Stage ${state.level.number} is clear. ${state.level.number < 50 ? 'A new patch of sky is waiting.' : 'You cleared every stage!'}` : 'A fresh angle might be all it takes.';
  $('#result-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#result-stars').setAttribute('aria-label', `${stars} stars`);
  $('#result-score').textContent = state.score.toLocaleString();
  $('#result-actions').replaceChildren();
  const addAction = (text, action, primary = false) => { const button = document.createElement('button'); button.className = primary ? 'primary-button' : 'secondary-button'; button.textContent = text; button.addEventListener('click', action); $('#result-actions').append(button); };
  if (won && state.level.number < 50) addAction('Continue →', () => startLevel(state.level.number + 1), true);
  addAction(won ? 'Play again' : 'Try again', () => startLevel(state.level.number), !won);
  addAction('Stage select', () => showScreen('levels'));
  addAction('Menu', () => showScreen('home'));
  playTone(won ? 'win' : 'lose', state.sound);
}

function pause() {
  if (state.screen !== 'game') return;
  state.paused = true; $('#game-overlay').hidden = false;
  $('#overlay-symbol').textContent = 'Ⅱ'; $('#overlay-title').textContent = 'Paused'; $('#overlay-copy').textContent = 'Take a breath. Your bubbles are right where you left them.';
  $('#overlay-actions').replaceChildren();
  const resume = document.createElement('button'); resume.className = 'primary-button'; resume.textContent = 'Resume'; resume.onclick = () => { state.paused = false; $('#game-overlay').hidden = true; canvas.focus(); }; $('#overlay-actions').append(resume);
  addOverlayButton('Restart stage', () => startLevel(state.level.number)); addOverlayButton('Return to menu', () => showScreen('home'));
}

function addOverlayButton(label, callback) { const button = document.createElement('button'); button.className = 'secondary-button'; button.textContent = label; button.onclick = callback; $('#overlay-actions').append(button); }

function useBooster() {
  if (!state.level || progress.boosters <= 0 || state.screen !== 'game' || state.flight) return;
  const occupied = [];
  for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) if (state.board[row][col] && state.board[row][col].type !== 'stone') occupied.push([row, col]);
  if (!occupied.length) return;
  progress.boosters -= 1;
  const [row, col] = occupied[Math.floor(Math.random() * occupied.length)];
  state.board[row][col] = null;
  state.cleared += 1;
  const dropped = removeUnsupported(state.board); state.cleared += dropped.length;
  state.score += 10 + dropped.length * 20; updateHUD();
  save(); $('#booster-count').textContent = progress.boosters;
  if (boardIsEmpty(state.board) || state.cleared >= state.level.target) endGame(true);
  draw();
}

function swap() { if (state.flight || state.screen !== 'game') return; [state.current, state.next] = [state.next, state.current]; updateBubbles(); draw(); }

function persistSetting(key, value) { progress.settings[key] = value; save(); }

document.addEventListener('click', (event) => {
  const navigation = event.target.closest('[data-screen]');
  if (navigation) showScreen(navigation.dataset.screen);
});
$('#play-button').addEventListener('click', () => startLevel(progress.unlocked));
$('#guide-play').addEventListener('click', () => startLevel(progress.unlocked));
$('#game-menu').addEventListener('click', () => showScreen('home'));
$('#pause-button').addEventListener('click', pause);
$('#swap-button').addEventListener('click', swap);
$('#booster-button').addEventListener('click', useBooster);
$('#shoot-button').addEventListener('click', fire);
$('#mobile-shoot').addEventListener('click', fire);
$('#sound-toggle').addEventListener('click', () => { state.sound = !state.sound; persistSetting('sound', state.sound); renderSettings(); $('#sound-toggle').classList.toggle('muted', !state.sound); });
$('#motion-toggle').addEventListener('click', () => { state.motion = !state.motion; persistSetting('motion', state.motion); renderSettings(); });
$('#setting-sound').addEventListener('change', (event) => { state.sound = event.target.checked; persistSetting('sound', state.sound); });
$('#setting-motion').addEventListener('change', (event) => { state.motion = event.target.checked; persistSetting('motion', state.motion); });
$('#setting-effects').addEventListener('change', (event) => { state.effects = event.target.value; persistSetting('effects', state.effects); });
$('#canvas-hint').addEventListener('click', fire);
canvas.addEventListener('pointermove', (event) => aimAt(event.clientX, event.clientY));
canvas.addEventListener('pointerdown', (event) => { if (event.button === 0) { aimAt(event.clientX, event.clientY); fire(); } });
canvas.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); state.aim = Math.max(-1.25, Math.min(1.25, state.aim + (event.key === 'ArrowLeft' ? -.08 : .08))); draw(); }
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); fire(); }
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.screen === 'game') pause(); });
window.addEventListener('resize', resizeCanvas);
$('#booster-count').textContent = progress.boosters;
renderHome();

const KEY = 'orbit-pop-save-v1';
const EMPTY = { unlocked: 1, completed: {}, bestScore: 0, boosters: 3, settings: { sound: true, motion: false, effects: 'normal' } };
let memorySave = structuredClone(EMPTY);

export function loadProgress() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) memorySave = { ...structuredClone(EMPTY), ...JSON.parse(raw) };
  } catch {
    // Keep the in-memory save when browser storage is blocked or malformed.
  }
  return structuredClone(memorySave);
}

export function saveProgress(progress) {
  memorySave = structuredClone(progress);
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}

export function initialProgress() { return structuredClone(EMPTY); }

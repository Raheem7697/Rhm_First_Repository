let context;

export function playTone(kind, enabled = true) {
  if (!enabled) return;
  try {
    context ??= new window.AudioContext();
    if (context.state === 'suspended') context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const tones = { shoot: [390, 0.07], pop: [650, 0.09], combo: [880, 0.16], win: [990, 0.3], lose: [180, 0.25] };
    const [frequency, duration] = tones[kind] ?? tones.pop;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * (kind === 'lose' ? 0.65 : 1.35), now + duration);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {
    // Audio is an enhancement; gameplay continues without it.
  }
}

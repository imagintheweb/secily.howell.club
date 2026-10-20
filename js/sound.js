// Tiny synthesized sound effects: meows, woofs, purrs, boings and a party tune.
let ctx = null;
let enabled = true;
try { enabled = localStorage.getItem('kc-sound') !== 'off'; } catch { /* storage blocked */ }

export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const isOn = () => enabled;
export function setOn(v) {
  enabled = v;
  try { localStorage.setItem('kc-sound', v ? 'on' : 'off'); } catch { /* ignore */ }
}

function ac() { return enabled ? initAudio() : null; }

function envelope(g, t, attack, peak, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(c, { type = 'sine', f0, f1, t, dur, vol = 0.2, attack = 0.01, filter }) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  envelope(g, t, attack, vol, dur);
  let node = o;
  if (filter) {
    const fl = c.createBiquadFilter();
    fl.type = filter.type || 'lowpass';
    fl.frequency.value = filter.f;
    fl.Q.value = filter.q || 1;
    o.connect(fl);
    node = fl;
  }
  node.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
  return o;
}

let noiseBuf;
function noise(c, t, dur, vol, f, q = 1) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const fl = c.createBiquadFilter();
  fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
  const g = c.createGain();
  envelope(g, t, 0.005, vol, dur);
  s.connect(fl).connect(g).connect(c.destination);
  s.start(t);
  s.stop(t + dur + 0.05);
}

export function meow(p = 1) {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const base = 480 * p;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(base * 0.75, t);
  o.frequency.linearRampToValueAtTime(base * 1.35, t + 0.14);
  o.frequency.linearRampToValueAtTime(base * 1.1, t + 0.32);
  o.frequency.linearRampToValueAtTime(base * 0.7, t + 0.55);
  const f = c.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = 2.5;
  f.frequency.setValueAtTime(700 * p, t);
  f.frequency.linearRampToValueAtTime(1800 * p, t + 0.16);
  f.frequency.linearRampToValueAtTime(900 * p, t + 0.55);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.55, t + 0.06);
  g.gain.setValueAtTime(0.55, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(f).connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.65);
}

export function woof(p = 1) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime;
  for (let k = 0; k < 2; k++) {
    const t = t0 + k * 0.24;
    tone(c, { type: 'sawtooth', f0: 330 * p, f1: 120 * p, t, dur: 0.16, vol: 0.45, attack: 0.008, filter: { f: 900 * p, q: 1.5 } });
    noise(c, t, 0.08, 0.18, 1100 * p, 1.2);
  }
}

export function purr() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = 26;
  const fl = c.createBiquadFilter();
  fl.type = 'lowpass'; fl.frequency.value = 260;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.4, t + 0.15);
  g.gain.setValueAtTime(0.4, t + 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  o.connect(fl).connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 1.2);
}

export function boing() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const o = tone(c, { f0: 160, f1: 520, t, dur: 0.35, vol: 0.3 });
  const lfo = c.createOscillator();
  const lg = c.createGain();
  lfo.frequency.value = 28; lg.gain.value = 50;
  lfo.connect(lg).connect(o.frequency);
  lfo.start(t); lfo.stop(t + 0.45);
}

export function chime() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  [1047, 1319, 1568, 2093].forEach((f, i) => {
    tone(c, { f0: f, t: t + i * 0.07, dur: 0.4, vol: 0.14 });
    tone(c, { type: 'triangle', f0: f * 2, t: t + i * 0.07, dur: 0.2, vol: 0.04 });
  });
}

export function pop() {
  const c = ac(); if (!c) return;
  tone(c, { f0: 500, f1: 1200, t: c.currentTime, dur: 0.09, vol: 0.25 });
}

const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319];
export function note(i) {
  const c = ac(); if (!c) return;
  const t = c.currentTime, f = SCALE[i % SCALE.length];
  tone(c, { f0: f, t, dur: 0.5, vol: 0.2 });
  tone(c, { type: 'triangle', f0: f * 2, t, dur: 0.25, vol: 0.05 });
}

export function giggle() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  for (let k = 0; k < 6; k++) {
    tone(c, { type: 'triangle', f0: 950 - k * 60, f1: 650 - k * 40, t: t + k * 0.11, dur: 0.08, vol: 0.3, filter: { type: 'bandpass', f: 1400, q: 2 } });
  }
}

export function party() {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + 0.05, step = 0.16;
  const mel = [
    523, 659, 784, 659, 523, 659, 784, 1047,
    698, 880, 1047, 880, 698, 880, 1047, 1397,
    784, 988, 1175, 988, 784, 988, 1175, 1568,
    1047, 784, 659, 784, 1047, 0, 1047, 0,
  ];
  const bass = [131, 175, 196, 131];
  mel.forEach((f, i) => {
    if (f) tone(c, { type: 'triangle', f0: f, t: t0 + i * step, dur: 0.14, vol: 0.16 });
    if (i % 4 === 0) tone(c, { type: 'square', f0: bass[Math.floor(i / 8)], t: t0 + i * step, dur: 0.25, vol: 0.06, filter: { f: 800 } });
    if (i % 2 === 1) noise(c, t0 + i * step, 0.04, 0.06, 6000, 0.8);
  });
}

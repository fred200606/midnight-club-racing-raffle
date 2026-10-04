/* Web Audio synth: countdown tones, fanfare and engine. */
'use strict';

/* ---------- sound (Web Audio synth, no files) ---------- */
let actx = null, eng = null;
function audioCtx() {
  if (!el.sound.checked) return null;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  } catch (e) { return null; }
}
function tone(freq, dur, when = 0, vol = 0.12, type = 'square') {
  const a = audioCtx(); if (!a) return;
  const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
function fanfare() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.16, i * 0.11, 0.1));
  tone(783.99, 0.5, 0.48, 0.09); tone(1046.5, 0.9, 0.62, 0.1);
}
function engineStart() {
  const a = audioCtx(); if (!a || eng) return;
  const g = a.createGain(), f = a.createBiquadFilter(), o1 = a.createOscillator(), o2 = a.createOscillator();
  f.type = 'lowpass'; f.frequency.value = 380;
  o1.type = o2.type = 'sawtooth'; o1.frequency.value = 48; o2.frequency.value = 72.7;
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.05, a.currentTime + 0.6);
  o1.start(); o2.start(); eng = { o1, o2, f, g };
}
function engineSet(v) {
  if (!eng) return; v = Math.max(0, Math.min(1.4, v || 0));
  const t = actx.currentTime, hz = 46 + v * 52;
  eng.o1.frequency.setTargetAtTime(hz, t, 0.15); eng.o2.frequency.setTargetAtTime(hz * 1.5 + 0.7, t, 0.15);
  eng.f.frequency.setTargetAtTime(280 + v * 520, t, 0.2);
}
function engineStop() {
  if (!eng) return;
  const { o1, o2, g } = eng, t = actx.currentTime;
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o1.stop(t + 0.9); o2.stop(t + 0.9); eng = null;
}

/* DOM handles, shared race state, storage and fair-draw randomness. */
'use strict';

const $ = (s) => document.querySelector(s);
const el = {
  stage: $('#stage'), arena: $('#arena'), canvas: $('#track'),
  names: $('#names'), count: $('#count'), sampleNote: $('#sampleNote'),
  start: $('#btnStart'), skip: $('#btnSkip'), dur: $('#duration'), wins: $('#winners'), sound: $('#sound'), fs: $('#btnFs'),
  status: $('#status'), clock: $('#clock'), countdown: $('#countdown'), cdText: $('#cdText'),
  lights: [...document.querySelectorAll('.lights i')],
  shuffle: $('#btnShuffle'), dedupe: $('#btnDedupe'), file: $('#file'), clear: $('#btnClear'),
  find: $('#find'), standings: $('#standings'), log: $('#log'), copy: $('#btnCopy'), clearLog: $('#btnClearLog'),
  dlg: $('#results'), resEyebrow: $('#resEyebrow'), resName: $('#resName'), resMeta: $('#resMeta'), resCar: $('#resCar'), podium: $('#podium'),
  again: $('#btnAgain'), removeW: $('#btnRemoveWinners'), closeRes: $('#btnCloseRes'),
  metaDrivers: $('#metaDrivers'), metaRace: $('#metaRace'), metaDist: $('#metaDist'), announcer: $('#announcer'),
  tabEntrants: $('#tab-entrants'), tabStandings: $('#tab-standings'),
};
const ctx = el.canvas.getContext('2d', { alpha: false });
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- state ---------- */
let geo = {}, A = {}, boards = [];
let cars = [], drawOrder = [], standing = [], raceOrder = [], N = 0;
let state = 'idle', cdT = 0, cdStep = -1, raceT = 0, D = 20, L = 8000, T_RESULTS = 0, T_END = 0, winnerCount = 1;
let START_X = 80, FINISH_X = 8080, camX = 0, camGoal = 0;
let raceNo = 0, resultsShown = false, winnerCrossed = false, lastWinners = [];
let pinId = -1, hoverId = -1, leaderId = -1, lastAnnounce = 0, lastStand = 0;
let particles = [], fireworksUntil = 0, dirty = true, lastT = performance.now();
let log = [], isSample = false;

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const pad = (n) => String(n).padStart(2, '0');
const ordinal = (n) => n + (['th','st','nd','rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
const fmt = (t) => `${pad(Math.floor(t / 60))}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const hl = () => (hoverId >= 0 ? hoverId : pinId);
const pixelRatio = () => Math.min(2, window.devicePixelRatio || 1);
const locked = () => state === 'countdown' || (state === 'racing' && !resultsShown);
function announce(msg) { el.announcer.textContent = ''; setTimeout(() => { el.announcer.textContent = msg; }, 30); }

/* unbiased crypto random for the draw */
function randInt(n) {
  const buf = new Uint32Array(1), lim = Math.floor(0x100000000 / n) * n;
  let x; do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= lim);
  return x % n;
}
function fairShuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

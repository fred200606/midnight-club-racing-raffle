/* Track geometry, entrants, race simulation and fireworks. */
'use strict';

/* ---------- geometry ---------- */
function resize() {
  const r = el.stage.getBoundingClientRect();
  const W = Math.max(280, Math.round(r.width)), H = Math.max(240, Math.round(r.height));
  const DPR = pixelRatio();
  el.canvas.width = Math.round(W * DPR); el.canvas.height = Math.round(H * DPR);
  const CW = Math.max(40, Math.min(100, W * (0.08 - Math.min(N, 100) * 0.00018)));
  geo = { W, H, DPR, CW, k: CW / UW, horizon: H * 0.28, roadTop: H * 0.345, roadBot: H * 0.945 };
  geo.roadH = geo.roadBot - geo.roadTop; geo.curbH = Math.max(4, H * 0.011); geo.tTop = geo.horizon - H * 0.13;
  fitCache.clear();
  if (state === 'idle') planRace();
  buildAssets(); rebuildSprites(); layoutCars();
  if (state === 'idle') placeGrid();
  camGoal = camTarget(); camX = camGoal; dirty = true;
}
let resizeQueued = false;
function queueResize() { if (resizeQueued) return; resizeQueued = true; requestAnimationFrame(() => { resizeQueued = false; resize(); }); }

let gridCols = 1, gridGap = 60;
function planRace() {
  gridCols = N > 24 ? Math.ceil(N / 20) : N > 8 ? 2 : 1;
  gridGap = geo.CW * 1.2;
  START_X = geo.CW * 1.25 + 24 + (gridCols - 1) * gridGap;
  D = +el.dur.value;
  L = Math.round(D * Math.max(300, geo.W * 0.42));
  FINISH_X = START_X + L;
  buildBoards();
}
function layoutCars() {
  const { roadTop, roadH } = geo;
  for (const c of cars) { c.y = roadTop + roadH * (0.14 + 0.82 * c.depth); c.sc = 0.62 + 0.38 * c.depth; }
}
function placeGrid() {
  drawOrder.forEach((c, j) => { c.x0 = START_X - (j % gridCols) * gridGap; c.x = c.x0; c.vx = 0; });
}
function assignDepths() {
  const perm = cars.map((_, i) => i);
  for (let i = perm.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
  cars.forEach((c, i) => { c.depth = N > 1 ? perm[i] / (N - 1) : 0.5; });
  drawOrder = cars.slice().sort((a, b) => a.depth - b.depth);
  layoutCars();
}

/* ---------- entrants ---------- */
function parseNames(text) {
  let parts = text.split(/\r?\n/);
  if (parts.filter(s => s.trim()).length <= 1 && text.includes(',')) parts = text.split(',');
  return parts.map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
}
function buildCars(names) {
  const prevN = N; N = names.length;
  cars = names.map((name, i) => ({
    id: i, num: i + 1, name, color: COLORS[(i * 5) % 16], shape: SHAPES[i % 3], stripe: Math.floor(i / 48) % 2 === 1,
    x: START_X, vx: 0, depth: 0.5, y: 0, sc: 1, T: 0, rank: 0,
  }));
  pinId = hoverId = -1; el.find.value = '';
  assignDepths();
  if (prevN !== N && geo.W) resize(); else rebuildSprites();
  standing = cars.slice();
  buildStandingsDom();
}
function applyNames() {
  if (locked()) return;
  const all = parseNames(el.names.value);
  store.set('rr.names', el.names.value);
  if (el.dlg.open) el.dlg.close();
  buildCars(all.slice(0, MAX));
  toIdle();
  const dupes = all.length - new Set(all.map(s => s.toLowerCase())).size;
  let html = `<b>${N}</b> driver${N === 1 ? '' : 's'} on the grid`;
  if (dupes) html += ` · ${dupes} duplicate${dupes === 1 ? '' : 's'}`;
  if (N < 2) html += ' · <span class="warn">Add at least 2 names to race.</span>';
  if (all.length > MAX) html += ` · <span class="warn">Only the first ${MAX} of ${all.length} race.</span>`;
  el.count.innerHTML = html;
  el.sampleNote.hidden = !isSample;
}
function setNames(list) { el.names.value = list.join('\n'); isSample = false; applyNames(); }

/* ---------- race ---------- */
function toIdle() {
  state = 'idle'; raceT = 0; resultsShown = false; winnerCrossed = false; fireworksUntil = 0; particles = [];
  engineStop(); releaseWake();
  planRace(); placeGrid();
  standing = cars.slice();
  el.countdown.hidden = true; el.clock.textContent = fmt(0);
  renderStandings(); setUI(); dirty = true;
}
function dist(t) { return t < ACC ? t * t / (2 * ACC) : t - ACC / 2; }
function carX(c, t) {
  if (t <= 0) return c.x0;
  if (t < c.T) {
    const u = dist(t) / c.dT, P = Math.PI;
    return c.x0 + (FINISH_X - c.x0) * (u + c.a1 * Math.sin(P * u) + c.a2 * Math.sin(2 * P * u) + c.a3 * Math.sin(3 * P * u));
  }
  return FINISH_X + c.vEnd * TAU * (1 - Math.exp(-(t - c.T) / TAU));
}
function startRace() {
  if (state === 'countdown') return;
  if (N < 2) { announce('Add at least two names to start a race.'); selectTab(el.tabEntrants); el.names.focus(); return; }
  if (el.dlg.open) el.dlg.close();
  toIdle(); assignDepths(); placeGrid();
  winnerCount = Math.min(+el.wins.value, N);
  raceOrder = fairShuffle(cars.map(c => c.id));
  const spread = D * Math.min(0.22, 0.012 * (N - 1)), step = spread / (N - 1);
  raceOrder.forEach((id, rank) => {
    const c = cars[id], R = Math.random;
    c.rank = rank; c.T = D + rank * step + (rank > 0 ? 0.05 : 0);
    c.a1 = (R() * 2 - 1) * 0.07; c.a2 = (R() * 2 - 1) * 0.04; c.a3 = (R() * 2 - 1) * 0.025;
    c.dT = dist(c.T);
    c.vEnd = (FINISH_X - c.x0) * (1 - c.a1 * Math.PI + 2 * Math.PI * c.a2 - 3 * Math.PI * c.a3) / c.dT;
  });
  T_RESULTS = cars[raceOrder[winnerCount - 1]].T + 1.2;
  T_END = cars[raceOrder[N - 1]].T + 3;
  raceNo++; store.set('rr.raceNo', raceNo);
  leaderId = -1; lastAnnounce = 0;
  state = 'countdown'; cdT = 0; cdStep = -1;
  el.countdown.hidden = false;
  audioCtx(); requestWake(); selectTab(el.tabStandings); setUI();
}
function skipToFinish() {
  if (state !== 'racing' || resultsShown) return;
  raceT = Math.max(raceT, cars[raceOrder[winnerCount - 1]].T + 0.02);
  for (const c of cars) { c.x = carX(c, raceT); c.vx = 0; }
  camGoal = camTarget(); camX = camGoal;
}
function sortStanding() {
  const key = (c) => (raceT >= c.T && state !== 'idle' ? 1e9 - c.rank : c.x);
  standing = cars.slice().sort((a, b) => key(b) - key(a));
}
function camTarget() {
  if (state === 'idle' || state === 'countdown' || !cars.length) return 0;
  let lead = -Infinity; for (const c of cars) if (c.x > lead) lead = c.x;
  const maxCam = Math.max(0, FINISH_X - geo.W * 0.6);
  return Math.max(0, Math.min(maxCam, lead - geo.W * 0.62));
}

function update(dt, now) {
  if (state === 'countdown') {
    cdT += dt;
    const step = cdT >= 2.4 ? 3 : cdT >= 1.6 ? 2 : cdT >= 0.8 ? 1 : 0;
    if (step !== cdStep) {
      cdStep = step;
      el.lights.forEach((l, i) => { l.className = step === 3 ? 'green' : (i <= step ? 'red' : ''); });
      el.cdText.textContent = ['3', '2', '1', 'GO'][step];
      if (step < 3) { tone(440, 0.2); announce(String(3 - step)); }
      else { tone(880, 0.5); announce('Go!'); state = 'racing'; raceT = 0; engineStart(); setUI(); }
    }
  } else if (state === 'racing') {
    raceT += dt;
    if (raceT > 0.7 && !el.countdown.hidden) el.countdown.hidden = true;
    let lead = null;
    for (const c of cars) { const x = carX(c, raceT); c.vx = dt > 0 ? (x - c.x) / dt : 0; c.x = x; if (!lead || x > lead.x) lead = c; }
    sortStanding();
    const w0 = cars[raceOrder[0]];
    if (!winnerCrossed && raceT >= w0.T) {
      winnerCrossed = true; fanfare();
      if (!reduceMotion.matches) fireworksUntil = now + 4200;
      announce(`${w0.name} takes the checkered flag!`); setUI();
    }
    if (standing[0].id !== leaderId) {
      leaderId = standing[0].id;
      if (!winnerCrossed && now - lastAnnounce > 5000) { announce(`Leader: ${standing[0].name}`); lastAnnounce = now; }
    }
    if (eng && lead) engineSet(lead.vx / (L / D));
    if (!resultsShown && raceT >= T_RESULTS) showResults();
    el.clock.textContent = fmt(winnerCrossed ? w0.T : raceT);
    if (raceT >= T_END) { state = 'done'; renderStandings(); setUI(); releaseWake(); }
  }
  camGoal = camTarget();
  camX += (camGoal - camX) * Math.min(1, dt * 5);
  if (Math.abs(camGoal - camX) < 0.2) camX = camGoal;
  if (fireworksUntil > now && Math.random() < dt * 2.4) burst();
  if (particles.length) stepParticles(dt);
  if ((state === 'racing') && now - lastStand > 250) { lastStand = now; renderStandings(); }
}

/* ---------- fireworks ---------- */
function burst() {
  const { W, H } = geo, x = W * (0.3 + Math.random() * 0.65), y = H * (0.05 + Math.random() * 0.15);
  const col = ['#ffb347', '#ff3d8b', '#43e0ff', '#ffe9a8', '#9be15d'][Math.random() * 5 | 0];
  for (let i = 0; i < 46; i++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 110; particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col }); }
  if (particles.length > 600) particles.splice(0, particles.length - 600);
}
function stepParticles(dt) {
  for (const p of particles) { p.vy += 60 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.life -= dt * 0.7; }
  particles = particles.filter(p => p.life > 0);
}

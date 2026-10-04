/* Wake lock, fullscreen, tabs, standings, results and event wiring. */
'use strict';

/* ---------- wake lock & fullscreen ---------- */
let wake = null;
function requestWake() { try { navigator.wakeLock && navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {}); } catch (e) {} }
function releaseWake() { try { wake && wake.release(); } catch (e) {} wake = null; }
function toggleFs() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.arena.requestFullscreen) el.arena.requestFullscreen().catch(() => announce('Fullscreen is not available here.'));
  } catch (e) {}
}

/* ---------- UI ---------- */
function setUI() {
  const lock = locked();
  el.start.disabled = lock || N < 2;
  el.start.textContent = (state === 'done' || resultsShown) ? 'Race again' : 'Start race';
  el.skip.disabled = !(state === 'racing' && !resultsShown);
  for (const x of [el.dur, el.wins, el.shuffle, el.dedupe, el.clear, el.file]) x.disabled = lock;
  el.names.readOnly = lock;
  el.status.textContent =
    N < 2 ? 'Add drivers to race' :
    state === 'idle' ? `On the grid · ${N} cars` :
    state === 'countdown' ? `Race ${pad(raceNo)} · Lights` :
    state === 'racing' ? (winnerCrossed ? 'Checkered flag' : `Race ${pad(raceNo)} · Live`) :
    `Race ${pad(raceNo)} · Finished`;
  el.metaDrivers.textContent = N;
  el.metaRace.textContent = pad(raceNo);
  el.metaDist.textContent = `${D * M_PER_S} m`;
  el.removeW.textContent = winnerCount > 1 ? 'Remove winners from list' : 'Remove winner from list';
}

const tabs = [...document.querySelectorAll('[role=tab]')];
function selectTab(t) {
  tabs.forEach(b => {
    const on = b === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
    document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
  });
}
tabs.forEach((b, i) => {
  b.addEventListener('click', () => selectTab(b));
  b.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    selectTab(n); n.focus(); e.preventDefault();
  });
});

/* one driver row (position · colour swatch · car number · name), shared by standings and podium */
function makeRow(list) {
  const li = document.createElement('li');
  li.innerHTML = '<span class="pos"></span><span class="sw"></span><span class="num"></span><span class="nm"></span>';
  list.appendChild(li); return li;
}
function fillRow(li, pos, c) {
  const [p, sw, num, nm] = li.children;
  p.textContent = pos; sw.style.background = c.color; num.textContent = '#' + c.num; nm.textContent = c.name;
}

let rowEls = [];
function buildStandingsDom() {
  el.standings.textContent = '';
  rowEls = cars.map(() => makeRow(el.standings));
  renderStandings();
}
function renderStandings() {
  const h = hl();
  standing.forEach((c, i) => {
    const li = rowEls[i]; if (!li) return;
    fillRow(li, i + 1, c);
    li.dataset.car = c.id; li.classList.toggle('hl', c.id === h);
  });
}
el.standings.addEventListener('mouseover', e => {
  const li = e.target.closest('li'); if (!li) return;
  hoverId = +li.dataset.car; dirty = true; renderStandings();
});
el.standings.addEventListener('mouseleave', () => { hoverId = -1; dirty = true; renderStandings(); });
el.find.addEventListener('input', () => {
  const q = el.find.value.trim().toLowerCase().replace(/^#/, '');
  const c = !q ? null : cars.find(c => String(c.num) === q) || cars.find(c => c.name.toLowerCase().includes(q));
  pinId = c ? c.id : -1; dirty = true; renderStandings();
});

el.canvas.addEventListener('click', e => {
  const r = el.canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, k = geo.k;
  for (let i = drawOrder.length - 1; i >= 0; i--) {
    const c = drawOrder[i], sc = c.sc, x = c.x - camX;
    if (px <= x && px >= x - NOSE * k * sc && py <= c.y && py >= c.y - (c.shape.g - 4.6) * k * sc) {
      pinId = pinId === c.id ? -1 : c.id;
      if (pinId >= 0) announce(`Car #${c.num}: ${c.name}`);
      dirty = true; renderStandings(); return;
    }
  }
  pinId = -1; dirty = true; renderStandings();
});

/* ---------- results ---------- */
function showResults() {
  resultsShown = true; engineStop();
  lastWinners = raceOrder.slice(0, winnerCount).map(id => cars[id]);
  const w = lastWinners[0];
  el.resEyebrow.textContent = `Race ${pad(raceNo)} · Checkered flag`;
  el.resName.textContent = w.name;
  el.resMeta.textContent = `Car #${w.num} · 1st place · ${fmt(w.T)}`;
  const dpr = pixelRatio(), rc = el.resCar;
  rc.width = 240 * dpr; rc.height = 91 * dpr;
  const g = rc.getContext('2d'); g.clearRect(0, 0, rc.width, rc.height);
  g.drawImage(makeSprite(w, (240 / UW) * dpr), 0, 0);
  el.podium.textContent = '';
  lastWinners.slice(1).forEach((c, i) => fillRow(makeRow(el.podium), ordinal(i + 2), c));
  el.podium.hidden = lastWinners.length < 2;
  log.push({ race: raceNo, time: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    winners: lastWinners.map((c, i) => ({ place: i + 1, num: c.num, name: c.name })) });
  store.set('rr.log', log); renderLog();
  announce(`Winner: ${w.name}, car number ${w.num}.`);
  setUI();
  try { if (!el.dlg.open) el.dlg.showModal(); } catch (e) {}
  el.again.focus();
}
function renderLog() {
  el.log.textContent = '';
  if (!log.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'No races yet. Winners from each race are listed here.'; el.log.appendChild(li); return; }
  for (const r of log.slice().reverse()) {
    const li = document.createElement('li'), h3 = document.createElement('h3');
    h3.textContent = `Race ${pad(r.race)} · ${r.time}`; li.appendChild(h3);
    for (const w of r.winners) { const p = document.createElement('p'); if (w.place === 1) p.className = 'first'; p.textContent = `${ordinal(w.place)} · ${w.name} (#${w.num})`; li.appendChild(p); }
    el.log.appendChild(li);
  }
}
function resultsText() {
  return ['Raffle Racing results', ...log.map(r => `Race ${pad(r.race)} (${r.time}): ` + r.winners.map(w => `${ordinal(w.place)} ${w.name} #${w.num}`).join(', '))].join('\n');
}

/* ---------- events ---------- */
el.start.addEventListener('click', startRace);
el.skip.addEventListener('click', skipToFinish);
el.again.addEventListener('click', startRace);
el.closeRes.addEventListener('click', () => el.dlg.close());
el.dlg.addEventListener('close', () => { if (state !== 'countdown') el.start.focus(); });
el.removeW.addEventListener('click', () => {
  const remove = new Set(lastWinners.map(c => c.id));
  const all = parseNames(el.names.value).filter((_, i) => !remove.has(i));
  el.dlg.close(); setNames(all);
  announce(`Removed ${remove.size} winner${remove.size === 1 ? '' : 's'}. ${N} drivers remain.`);
  selectTab(el.tabEntrants);
});
el.fs.addEventListener('click', toggleFs);
document.addEventListener('fullscreenchange', () => { el.fs.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; });
el.sound.addEventListener('change', () => { if (!el.sound.checked) engineStop(); else if (state === 'racing' && !resultsShown) engineStart(); saveSettings(); });
el.dur.addEventListener('change', () => { if (state !== 'idle') toIdle(); else { planRace(); setUI(); dirty = true; } saveSettings(); });
el.wins.addEventListener('change', () => { winnerCount = Math.min(+el.wins.value, Math.max(1, N)); setUI(); saveSettings(); });
function saveSettings() { store.set('rr.settings', { dur: el.dur.value, wins: el.wins.value, sound: el.sound.checked }); }

let namesTimer = 0;
el.names.addEventListener('input', () => { isSample = false; clearTimeout(namesTimer); namesTimer = setTimeout(applyNames, 300); });
el.shuffle.addEventListener('click', () => { setNames(fairShuffle(parseNames(el.names.value))); announce('Entrants shuffled. Car numbers follow the new order.'); });
el.dedupe.addEventListener('click', () => {
  const seen = new Set(), all = parseNames(el.names.value);
  const out = all.filter(n => { const k = n.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  setNames(out); announce(`Removed ${all.length - out.length} duplicate${all.length - out.length === 1 ? '' : 's'}.`);
});
el.file.addEventListener('change', async () => {
  const f = el.file.files[0]; if (!f) return;
  let lines = (await f.text()).split(/\r?\n/);
  if (/\.csv$/i.test(f.name) || f.type === 'text/csv') {
    lines = lines.map(l => l.split(',')[0].replace(/^"|"$/g, '').trim());
    if (lines[0] && /^(full )?names?$|^participants?$|^entrants?$/i.test(lines[0])) lines.shift();
  }
  setNames(lines.map(s => s.trim()).filter(Boolean)); el.file.value = '';
  announce(`Loaded ${N} names from ${f.name}.`);
});
function confirmTwice(btn, fn) {
  const label = btn.textContent; let t = 0;
  btn.addEventListener('click', () => {
    if (btn.dataset.armed) { clearTimeout(t); delete btn.dataset.armed; btn.textContent = label; fn(); return; }
    btn.dataset.armed = '1'; btn.textContent = 'Click again to confirm';
    t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = label; }, 3000);
  });
}
confirmTwice(el.clear, () => { setNames([]); el.names.focus(); });
confirmTwice(el.clearLog, () => { log = []; raceNo = 0; store.set('rr.log', log); store.set('rr.raceNo', 0); renderLog(); setUI(); });
el.copy.addEventListener('click', () => {
  const text = resultsText(), done = () => { el.copy.textContent = 'Copied'; setTimeout(() => { el.copy.textContent = 'Copy results'; }, 1600); };
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); };
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
});
document.addEventListener('keydown', e => {
  if (el.dlg.open || e.target.closest('input,textarea,select,button,[contenteditable]')) return;
  if (e.code === 'Space') { e.preventDefault(); if (state === 'racing' && !resultsShown) skipToFinish(); else startRace(); }
  else if (e.key === 'f' || e.key === 'F') toggleFs();
});
document.addEventListener('visibilitychange', () => { if (!actx) return; if (document.hidden) actx.suspend(); else actx.resume(); });

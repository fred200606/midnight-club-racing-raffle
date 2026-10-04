/* Canvas helpers, car sprites and pre-rendered scenery. */
'use strict';

/* ---------- canvas helpers ---------- */
function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * geo.DPR)); c.height = Math.max(1, Math.round(h * geo.DPR));
  const g = c.getContext('2d'); g.scale(geo.DPR, geo.DPR);
  c.cssW = w; c.cssH = h; return { canvas: c, ctx: g };
}
function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function trace(g, cmds) {
  g.beginPath();
  for (const c of cmds) {
    if (c[0] === 'M') g.moveTo(c[1], c[2]); else if (c[0] === 'L') g.lineTo(c[1], c[2]);
    else if (c[0] === 'Q') g.quadraticCurveTo(c[1], c[2], c[3], c[4]); else g.closePath();
  }
}
function addPoly(g, pts) { pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; }
const fitCache = new Map();
function fit(text, max) {
  const key = ctx.font + '|' + max + '|' + text; let v = fitCache.get(key);
  if (v !== undefined) return v;
  v = text;
  if (ctx.measureText(v).width > max) { while (v.length > 1 && ctx.measureText(v + '…').width > max) v = v.slice(0, -1); v += '…'; }
  if (fitCache.size > 3000) fitCache.clear();
  fitCache.set(key, v); return v;
}

/* ---------- sprites & scenery (pre-rendered once per resize) ---------- */
function makeSprite(car, px) {
  const s = car.shape, c = document.createElement('canvas');
  c.width = Math.ceil(UW * px); c.height = Math.ceil(UH * px);
  const g = c.getContext('2d'); g.scale(px, px);
  const dark = lum(car.color) < 0.2;
  g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.ellipse(36.5, s.g - 0.3, 35, 2.1, 0, 0, Math.PI * 2); g.fill();
  trace(g, s.body); g.fillStyle = car.color; g.fill();
  g.save(); trace(g, s.body); g.clip();
  const sh = g.createLinearGradient(0, 4, 0, 21.5);
  sh.addColorStop(0, 'rgba(255,255,255,.32)'); sh.addColorStop(0.42, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.42)');
  g.fillStyle = sh; g.fillRect(0, 0, UW, UH);
  if (car.stripe) { g.fillStyle = lum(car.color) > 0.55 ? '#1b1d2e' : '#f6f2e8'; g.fillRect(0, s.stripe - 0.9, UW, 1.8); }
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, 11.6, UW, 0.5);
  g.restore();
  trace(g, s.body); g.lineWidth = 0.6; g.strokeStyle = dark ? 'rgba(220,225,255,.5)' : 'rgba(0,0,0,.45)'; g.stroke();
  // glass with a streak of streetlight
  g.save(); g.beginPath(); s.glass.forEach(p => addPoly(g, p));
  const gg = g.createLinearGradient(0, 5, 0, 10.5); gg.addColorStop(0, '#2d3870'); gg.addColorStop(1, '#0a0d1f');
  g.fillStyle = gg; g.fill(); g.clip();
  g.strokeStyle = 'rgba(255,230,190,.28)'; g.lineWidth = 1.1; g.beginPath();
  for (const p of s.glass) { const x0 = p[0][0] + 3; g.moveTo(x0, 11); g.lineTo(x0 + 5, 4); }
  g.stroke(); g.restore();
  // lights + chrome
  g.fillStyle = '#fff3c4'; g.fillRect(...s.head);
  g.fillStyle = '#ff2a3d'; g.fillRect(...s.tail);
  g.fillStyle = '#c4ccd8'; g.fillRect(65.5, 19.6, 6.2, 1.3); g.fillRect(0.6, 19.6, 5, 1.3);
  // door number roundel
  const [nx, ny] = s.num;
  g.fillStyle = '#f6f2e8'; g.beginPath(); g.arc(nx, ny, 3.9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#12132a'; g.font = `700 ${car.num > 99 ? 3.7 : 4.9}px ${BODY}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(car.num), nx, ny + 0.35);
  // wheels
  for (const wx of s.wheels) {
    g.fillStyle = '#07070d'; g.beginPath(); g.arc(wx, WHEEL_Y, s.r + 0.9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#16161f'; g.beginPath(); g.arc(wx, WHEEL_Y, s.r, 0, Math.PI * 2); g.fill();
    g.fillStyle = car.stripe ? '#e8c46a' : '#cfd6e2'; g.beginPath(); g.arc(wx, WHEEL_Y, s.r * 0.55, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4b5165'; g.beginPath(); g.arc(wx, WHEEL_Y, s.r * 0.2, 0, Math.PI * 2); g.fill();
  }
  return c;
}

function buildSky() {
  const { W, H, horizon } = geo, { canvas: c, ctx: g } = mk(W, H);
  let gr = g.createLinearGradient(0, 0, 0, horizon);
  gr.addColorStop(0, '#03041a'); gr.addColorStop(0.5, '#0c0e31'); gr.addColorStop(0.85, '#25164a'); gr.addColorStop(1, '#46205a');
  g.fillStyle = gr; g.fillRect(0, 0, W, horizon + 1);
  g.fillStyle = '#0b0c22'; g.fillRect(0, horizon, W, H - horizon);
  const stars = Math.round(W * H / 2600);
  for (let i = 0; i < stars; i++) {
    g.fillStyle = `rgba(236,233,255,${(0.15 + Math.random() * 0.7).toFixed(2)})`;
    const s = Math.random() < 0.9 ? 1 : 1.8; g.fillRect(Math.random() * W, Math.random() * horizon * 0.85, s, s);
  }
  const mx = W * 0.86, my = H * 0.11, mr = Math.max(9, H * 0.036);
  const rg = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 5);
  rg.addColorStop(0, 'rgba(241,231,201,.22)'); rg.addColorStop(1, 'rgba(241,231,201,0)');
  g.fillStyle = rg; g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
  g.fillStyle = '#f1e7c9'; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(120,110,90,.2)';
  [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [0.05, 0.42, 0.1]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2); g.fill(); });
  gr = g.createLinearGradient(0, horizon - H * 0.16, 0, horizon);
  gr.addColorStop(0, 'rgba(255,61,139,0)'); gr.addColorStop(1, 'rgba(255,61,139,.16)');
  g.fillStyle = gr; g.fillRect(0, horizon - H * 0.16, W, H * 0.16);
  return c;
}

function buildSkyline() {
  const w = 960, h = Math.round(geo.H * 0.19), { canvas: c, ctx: g } = mk(w, h);
  let x = 0; g.fillStyle = '#1b1744';
  while (x < w) { const bw = Math.min(w - x, 20 + Math.random() * 50), bh = h * (0.35 + Math.random() * 0.55); g.fillRect(x, h - bh, bw + 0.5, bh); x += bw; }
  x = 0;
  while (x < w) {
    const bw = Math.min(w - x, 28 + Math.random() * 60), bh = h * (0.2 + Math.random() * 0.7);
    g.fillStyle = ['#0f1030', '#121437', '#0d0e29'][Math.random() * 3 | 0]; g.fillRect(x, h - bh, bw - 1.5, bh);
    for (let wy = h - bh + 5; wy < h - 4; wy += 6.5)
      for (let wx = x + 4; wx < x + bw - 6; wx += 5.5)
        if (Math.random() < 0.28) { g.fillStyle = Math.random() < 0.18 ? 'rgba(67,224,255,.75)' : 'rgba(255,201,120,.8)'; g.fillRect(wx, wy, 2, 2.6); }
    if (bh > h * 0.75 && Math.random() < 0.6) { g.fillStyle = '#ff2a3d'; g.fillRect(x + bw / 2 - 1, h - bh - 4, 2, 2); }
    x += bw;
  }
  return c;
}

function buildTrack() {
  const { H, horizon, roadTop, roadBot, roadH, curbH, tTop } = geo;
  const { canvas: c, ctx: g } = mk(TILE, H - tTop); g.translate(0, -tTop);
  let gr = g.createLinearGradient(0, horizon, 0, roadTop);
  gr.addColorStop(0, '#1d1f3f'); gr.addColorStop(1, '#0d0e22');
  g.fillStyle = gr; g.fillRect(0, horizon, TILE, roadTop - horizon);
  g.fillStyle = 'rgba(255,255,255,.035)';
  for (let x = 0; x < TILE; x += 50) g.fillRect(x, horizon + 5, 1, roadTop - horizon - curbH - 5);
  g.save(); g.shadowColor = '#ff3d8b'; g.shadowBlur = 8; g.fillStyle = '#ff6fa8'; g.fillRect(-30, horizon + 2, TILE + 60, 1.6); g.restore();
  for (let x = 0; x < TILE; x += 40) {
    g.fillStyle = '#a3223a'; g.fillRect(x, roadTop - curbH, 20, curbH);
    g.fillStyle = '#c7c4d6'; g.fillRect(x + 20, roadTop - curbH, 20, curbH);
  }
  gr = g.createLinearGradient(0, roadTop, 0, roadBot);
  gr.addColorStop(0, '#16172a'); gr.addColorStop(1, '#26283b');
  g.fillStyle = gr; g.fillRect(0, roadTop, TILE, roadH);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.18)';
    g.fillRect(Math.random() * TILE, roadTop + Math.random() * roadH, 1.2, 1.2);
  }
  for (const f of [0.25, 0.5, 0.75]) {
    const y = roadTop + roadH * f, t = 1.4 + f * 1.8; g.fillStyle = 'rgba(236,233,255,.24)';
    for (let x = 0; x < TILE; x += 80) g.fillRect(x + 10, y - t / 2, 40, t);
  }
  const bc = curbH * 1.5;
  for (let x = 0; x < TILE; x += 40) {
    g.fillStyle = '#b3253c'; g.fillRect(x, roadBot, 20, bc);
    g.fillStyle = '#d7d4e4'; g.fillRect(x + 20, roadBot, 20, bc);
  }
  gr = g.createLinearGradient(0, roadBot + bc, 0, H);
  gr.addColorStop(0, '#0c1420'); gr.addColorStop(1, '#05070f');
  g.fillStyle = gr; g.fillRect(0, roadBot + bc, TILE, H - roadBot - bc);
  // sodium streetlight, one per tile
  const px = 150, top = horizon - H * 0.12;
  g.fillStyle = '#2a2d4d'; g.fillRect(px - 1.5, top, 3, roadTop - curbH - top);
  g.strokeStyle = '#2a2d4d'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, top + 1); g.quadraticCurveTo(px + 10, top - 3, px + 26, top + 1); g.stroke();
  g.fillStyle = '#ffe3a6'; g.beginPath(); g.ellipse(px + 26, top + 2.4, 6, 2, 0, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'lighter';
  let rg = g.createRadialGradient(px + 26, top + 3, 0, px + 26, top + 3, 38);
  rg.addColorStop(0, 'rgba(255,179,71,.55)'); rg.addColorStop(1, 'rgba(255,179,71,0)');
  g.fillStyle = rg; g.fillRect(px - 12, top - 35, 76, 76);
  g.save(); const cx = px + 40, cy = roadTop + roadH * 0.32, rx = 150, ry = roadH * 0.42;
  g.translate(cx, cy); g.scale(1, ry / rx);
  rg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  rg.addColorStop(0, 'rgba(255,170,70,.15)'); rg.addColorStop(1, 'rgba(255,170,70,0)');
  g.fillStyle = rg; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
  return c;
}

function buildBeam() {
  const len = geo.CW * 2.4, h = geo.CW * 0.55, { canvas: c, ctx: g } = mk(len, h);
  g.beginPath(); g.moveTo(0, h * 0.44); g.lineTo(len, 0); g.lineTo(len, h); g.lineTo(0, h * 0.56); g.closePath();
  const gr = g.createLinearGradient(0, 0, len, 0);
  gr.addColorStop(0, 'rgba(255,228,160,.16)'); gr.addColorStop(0.35, 'rgba(255,220,150,.05)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = gr; g.fill(); return c;
}

function buildVignette() {
  const { W, H } = geo, { canvas: c, ctx: g } = mk(W, H);
  const rg = g.createRadialGradient(W / 2, H * 0.58, Math.min(W, H) * 0.45, W / 2, H * 0.58, Math.max(W, H) * 0.78);
  rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H); return c;
}

function makeSign(text, o) {
  const h = o.h, fs = Math.round(h * 0.5), padX = Math.round(h * 0.42), m = 8, chk = o.checker ? h * 0.6 : 0;
  const t = document.createElement('canvas').getContext('2d'); t.font = `400 ${fs}px ${DISPLAY}`;
  const w = Math.ceil(t.measureText(text).width + padX * 2 + chk * 2);
  const { canvas: c, ctx: g } = mk(w + m * 2, h + m * 2); g.translate(m, m);
  g.fillStyle = o.bg || 'rgba(9,10,28,.95)'; rrect(g, 0, 0, w, h, 3); g.fill();
  if (o.glow) { g.save(); g.shadowColor = o.color; g.shadowBlur = 8; g.strokeStyle = o.color; g.lineWidth = 1.5; rrect(g, 1, 1, w - 2, h - 2, 3); g.stroke(); g.restore(); }
  if (chk) {
    const q = h / 4;
    for (const sx of [0, w - chk]) for (let r = 0; r < 4; r++) for (let cc = 0; cc * q < chk; cc++) {
      g.fillStyle = (r + cc) % 2 ? '#16172a' : '#eceaf8'; g.fillRect(sx + cc * q, r * q, Math.min(q, chk - cc * q), q);
    }
  }
  g.font = `400 ${fs}px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (o.glow) { g.shadowColor = o.color; g.shadowBlur = 10; }
  g.fillStyle = o.ink || o.color; g.fillText(text, w / 2, h / 2 + fs * 0.06);
  c.cssW = w + m * 2; c.cssH = h + m * 2; return c;
}

function buildSigns() {
  const { H, horizon, roadTop } = geo, bh = Math.max(16, H * 0.06);
  A.signs = [['MIDNIGHT RUN', '#43e0ff'], ['RAFFLE RACING', '#ffb347'], ['NITRO', '#ff3d8b'], ['NO BRAKES', '#43e0ff'], ['TURBO 88', '#ffb347'], ['GOOD LUCK', '#ff3d8b']]
    .map(([t, col]) => makeSign(t, { h: bh, color: col, glow: true }));
  A.marks = {};
  for (const mm of [300, 200, 100]) A.marks[mm] = makeSign(String(mm), { h: Math.max(12, (roadTop - horizon) * 0.55), color: '#eceaf8', bg: '#e9e6f5', ink: '#12132a' });
  A.start = makeSign('START', { h: bh, color: '#3dff8a', glow: true });
  A.finish = makeSign('FINISH', { h: Math.max(22, H * 0.09), color: '#ffffff', glow: true, checker: true });
}

function buildBoards() {
  const { H, horizon, roadTop, curbH } = geo; boards = [];
  if (!A.signs) return;
  let i = 0;
  for (let x = START_X + 620; x < FINISH_X - 760; x += 1450, i++) boards.push({ x, s: A.signs[i % A.signs.length], y: horizon - H * 0.1, post: horizon });
  const total = D * M_PER_S;
  for (const mm of [300, 200, 100]) if (mm < total * 0.8) boards.push({ x: FINISH_X - L * mm / total - 20, s: A.marks[mm], y: horizon + (roadTop - horizon) * 0.08, post: 0 });
  boards.push({ x: START_X - 14, s: A.start, y: horizon - H * 0.115, post: roadTop - curbH });
  boards.push({ x: FINISH_X - A.finish.cssW / 2, s: A.finish, y: horizon - H * 0.19, post: roadTop - curbH });
}

function buildAssets() {
  A.sky = buildSky(); A.skyline = buildSkyline(); A.track = buildTrack();
  A.beam = buildBeam(); A.vignette = buildVignette(); buildSigns(); buildBoards();
}
function rebuildSprites() { const px = geo.k * geo.DPR; for (const c of cars) c.sprite = makeSprite(c, px); }

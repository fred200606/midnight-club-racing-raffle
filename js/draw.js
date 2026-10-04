/* Per-frame canvas drawing and the animation loop. */
'use strict';

/* ---------- drawing ---------- */
function draw() {
  dirty = false;
  const { W, H, DPR, k, horizon, roadTop, roadH } = geo;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.drawImage(A.sky, 0, 0, W, H);
  if (particles.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, 2, 2); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  const sk = A.skyline;
  for (let x = -((camX * 0.16) % sk.cssW); x < W; x += sk.cssW) ctx.drawImage(sk, Math.floor(x), horizon - sk.cssH, sk.cssW, sk.cssH);
  const tt = A.track;
  for (let x = -(camX % TILE); x < W; x += TILE) ctx.drawImage(tt, Math.floor(x), geo.tTop, TILE, tt.cssH);

  for (const b of boards) {
    const s = b.s, x = b.x - camX;
    if (x > W || x + s.cssW < 0) continue;
    if (b.post) { ctx.fillStyle = '#262948'; const top = b.y + s.cssH - 10; ctx.fillRect(x + 12, top, 3, b.post - top); ctx.fillRect(x + s.cssW - 15, top, 3, b.post - top); }
    ctx.drawImage(s, x, b.y, s.cssW, s.cssH);
  }
  let sx = START_X - camX;
  if (sx > -10 && sx < W + 10) { ctx.fillStyle = 'rgba(240,238,255,.8)'; ctx.fillRect(sx + 1, roadTop, 3, roadH); }
  sx = FINISH_X - camX; const cell = roadH / 14;
  if (sx > -cell * 3 && sx < W + 10) {
    for (let r = 0; r < 14; r++) for (let col = 0; col < 3; col++) {
      ctx.fillStyle = (r + col) % 2 ? '#16172a' : '#eceaf8';
      ctx.fillRect(sx + col * cell * 0.6, roadTop + r * cell, cell * 0.6 + 0.5, cell + 0.5);
    }
  }

  const beam = A.beam, h = hl();
  ctx.globalCompositeOperation = 'lighter';
  for (const c of drawOrder) {
    const x = c.x - camX, bl = beam.cssW * c.sc;
    if (x + bl < 0 || x > W) continue;
    const bh = beam.cssH * c.sc, hy = c.y - (c.shape.g - 14) * k * c.sc;
    ctx.drawImage(beam, x - 2, hy - bh / 2, bl, bh);
  }
  ctx.globalCompositeOperation = 'source-over';
  const jitter = state === 'countdown' && !reduceMotion.matches;
  for (const c of drawOrder) {
    const sc = c.sc, x = c.x - camX, w = UW * k * sc;
    if (x < -4 || x - w > W) continue;
    if (c.id === h) {
      ctx.strokeStyle = '#43e0ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x - 36 * k * sc, c.y - 1, 40 * k * sc, 5 * k * sc, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const jy = jitter ? (Math.random() - 0.5) * 0.8 : 0;
    ctx.drawImage(c.sprite, x - NOSE * k * sc, c.y - c.shape.g * k * sc + jy, w, UH * k * sc);
  }
  drawTags();
  ctx.drawImage(A.vignette, 0, 0, W, H);
  drawMinimap();
  drawBoard();
}

function drawTags() {
  // top TAGS drivers get a name tag; drawn 10th→1st so the podium tags sit on top, a highlighted car last
  const show = [], h = hl();
  if (state === 'racing' || state === 'done') for (let i = Math.min(TAGS, standing.length) - 1; i >= 0; i--) show.push([standing[i], i]);
  const hi = show.findIndex(s => s[0].id === h);
  if (hi >= 0) show.push(show.splice(hi, 1)[0]); else if (h >= 0 && cars[h]) show.push([cars[h], -1]);
  ctx.font = `600 11px ${BODY}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for (const [c, i] of show) {
    const sc = c.sc, x = c.x - camX - 36 * geo.k * sc, top = c.y - (c.shape.g - 4.6) * geo.k * sc - 6;
    if (x < -80 || x > geo.W + 80) continue;
    const label = (i >= 0 ? `${i + 1}  ` : `#${c.num}  `) + fit(c.name, 140);
    const w = ctx.measureText(label).width + 14, hh = 18, ty = top - hh;
    const lx = Math.max(4, Math.min(geo.W - w - 4, x - w / 2));
    // podium: gold/silver/bronze tag with dark text · 4th–10th: dark tag with light text · picked car: cyan
    const podium = i >= 0 && i < 3, pack = i >= 3;
    ctx.fillStyle = podium ? PLACE[i] : pack ? 'rgba(18,20,49,.92)' : '#43e0ff';
    rrect(ctx, lx, ty, w, hh, 9); ctx.fill();
    if (pack) { ctx.strokeStyle = 'rgba(236,233,255,.35)'; ctx.lineWidth = 1; rrect(ctx, lx + 0.5, ty + 0.5, w - 1, hh - 1, 8.5); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x - 4, top - 0.5); ctx.lineTo(x + 4, top - 0.5); ctx.lineTo(x, top + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pack ? '#ece9ff' : '#12132a'; ctx.fillText(label, lx + 7, ty + hh / 2 + 0.5);
  }
}

function drawMinimap() {
  const { W } = geo, x0 = 14, x1 = W - 26, y = 13, span = x1 - x0;
  ctx.fillStyle = 'rgba(236,233,255,.16)'; ctx.fillRect(x0, y - 1, span, 2);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#16172a' : '#eceaf8'; ctx.fillRect(x1 + 3 + i * 4, y - 6 + j * 4, 4, 4); }
  for (const c of cars) {
    const p = Math.max(0, Math.min(1, (c.x - START_X) / L));
    ctx.fillStyle = c.color; ctx.fillRect(x0 + p * span - 2, y - 2 + (c.depth - 0.5) * 4, 4, 4);
  }
  const h = hl();
  if (h >= 0 && cars[h]) {
    const p = Math.max(0, Math.min(1, (cars[h].x - START_X) / L));
    ctx.strokeStyle = '#43e0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x0 + p * span, y, 6, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawBoard() {
  if (!(state === 'racing' || state === 'done')) return;
  const rows = Math.min(geo.W < 640 ? 3 : 5, standing.length), x = 10, y = 28, w = Math.min(240, geo.W * 0.55), rh = 19;
  ctx.fillStyle = 'rgba(8,9,26,.82)'; rrect(ctx, x, y, w, 26 + rows * rh + 4, 8); ctx.fill();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `700 10px ${BODY}`; ctx.fillStyle = '#ffb347';
  ctx.fillText(winnerCrossed ? 'FINISH ORDER' : 'LIVE ORDER', x + 10, y + 13);
  ctx.font = `600 12px ${BODY}`;
  for (let i = 0; i < rows; i++) {
    const c = standing[i], ry = y + 26 + i * rh + rh / 2;
    ctx.fillStyle = PLACE[i] || '#a3a1c9'; ctx.fillText(String(i + 1), x + 10, ry);
    ctx.fillStyle = c.color; ctx.fillRect(x + 26, ry - 5, 10, 10);
    ctx.strokeStyle = 'rgba(236,233,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x + 26.5, ry - 4.5, 9, 9);
    ctx.fillStyle = '#a3a1c9'; ctx.fillText('#' + c.num, x + 42, ry);
    ctx.fillStyle = '#ece9ff'; ctx.fillText(fit(c.name, w - 88), x + 78, ry);
  }
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
  update(dt, now);
  if (dirty || state === 'countdown' || state === 'racing' || particles.length || camX !== camGoal) draw();
  requestAnimationFrame(frame);
}

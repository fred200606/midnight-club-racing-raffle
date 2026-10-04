/* Boot: restore saved names/settings and start the loop. */
'use strict';

/* ---------- boot ---------- */
function boot(data = {}) {
  const saved = data && data.names != null ? data.names : store.get('rr.names', null);
  isSample = saved == null;
  el.names.value = saved == null ? SAMPLE.join('\n') : saved;
  const s = store.get('rr.settings', null);
  if (s) { el.dur.value = s.dur; el.wins.value = s.wins; el.sound.checked = !!s.sound; }
  log = store.get('rr.log', []); raceNo = store.get('rr.raceNo', log.length);
  resize(); applyNames(); renderLog();
  new ResizeObserver(queueResize).observe(el.stage);
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load(`400 20px ${DISPLAY}`), document.fonts.load(`700 12px ${BODY}`), document.fonts.load(`600 12px ${BODY}`)])
      .then(() => { fitCache.clear(); buildAssets(); rebuildSprites(); dirty = true; }).catch(() => {});
  }
  requestAnimationFrame(frame);
}
boot();

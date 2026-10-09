/* Grok Sports Command - touch input: floating joystick (left side) + swipe / tap / drag gestures, keyboard + mouse fallback */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U;
  const I = SP.Input = { joyOn: true, jx: 0, jy: 0, h: null, active: {}, keys: {}, enabled: true };
  const JOY_R = 56;
  let joyId = null, jox = 0, joy = 0;
  function el(id) { return document.getElementById(id); }
  function emit(k, e) { if (I.h && I.h[k] && I.enabled) I.h[k](e); }
  function showJoy(on, x, y) { const j = el('joy'); if (!j) return; j.classList.toggle('hidden', !on); if (on) { j.style.left = (x - 65) + 'px'; j.style.top = (y - 65) + 'px'; } el('joyKnob').style.transform = 'translate(0px,0px)'; }
  function setJoy(dx, dy) { const d = Math.hypot(dx, dy), k = d > JOY_R ? JOY_R / d : 1; dx *= k; dy *= k; el('joyKnob').style.transform = 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) + 'px)'; I.jx = dx / JOY_R; I.jy = dy / JOY_R; const m = Math.hypot(I.jx, I.jy); if (m < 0.18) { I.jx = 0; I.jy = 0; } emit('move', { x: I.jx, y: I.jy }); }
  function isJoyZone(x, y) { return I.joyOn && (I.joyAll || (x < innerWidth * 0.42 && y > innerHeight * 0.38)); }
  function start(id, x, y) {
    if (!I.enabled) return;
    if (joyId == null && isJoyZone(x, y)) { joyId = id; jox = x; joy = y; showJoy(true, x, y); setJoy(0, 0); return; }
    const g = { id, x0: x, y0: y, x, y, t0: performance.now(), pts: [[x, y, performance.now()]] }; I.active[id] = g;
    emit('down', { x, y, sx: x / innerWidth, sy: y / innerHeight });
  }
  function move(id, x, y) {
    if (id === joyId) { setJoy(x - jox, y - joy); return; }
    const g = I.active[id]; if (!g) return; g.x = x; g.y = y; g.pts.push([x, y, performance.now()]); if (g.pts.length > 60) g.pts.splice(1, 1);
    emit('drag', { x, y, dx: x - g.x0, dy: y - g.y0, sx: x / innerWidth, sy: y / innerHeight, x0: g.x0, y0: g.y0 });
  }
  function end(id, x, y) {
    if (id === joyId) { joyId = null; showJoy(false); I.jx = 0; I.jy = 0; emit('move', { x: 0, y: 0 }); return; }
    const g = I.active[id]; if (!g) return; delete I.active[id];
    if (x != null) { g.x = x; g.y = y; g.pts.push([x, y, performance.now()]); }
    const dt = Math.max(0.016, (performance.now() - g.t0) / 1000), dx = g.x - g.x0, dy = g.y - g.y0, len = Math.hypot(dx, dy);
    const ev = { x: g.x, y: g.y, x0: g.x0, y0: g.y0, dx, dy, len, dur: dt, sx: g.x / innerWidth, sy: g.y / innerHeight, sx0: g.x0 / innerWidth, sy0: g.y0 / innerHeight };
    emit('up', ev);
    if (len < 16 && dt < 0.45) { emit('tap', ev); return; }
    // speed over the last ~120 ms, plus curve (sideways bend at the end vs the start direction) for spin
    const pts = g.pts, tEnd = pts[pts.length - 1][2]; let k = pts.length - 1; while (k > 0 && tEnd - pts[k][2] < 120) k--;
    const a = pts[k], fdx = g.x - a[0], fdy = g.y - a[1], fdt = Math.max(0.016, (tEnd - a[2]) / 1000);
    ev.spd = Math.hypot(fdx, fdy) / fdt; ev.fdx = fdx; ev.fdy = fdy;
    const mid = pts[Math.floor(pts.length / 2)], d1x = mid[0] - g.x0, d1y = mid[1] - g.y0, d2x = g.x - mid[0], d2y = g.y - mid[1];
    const a1 = Math.atan2(d1x, -d1y), a2 = Math.atan2(d2x, -d2y); ev.curve = Math.hypot(d1x, d1y) > 10 && Math.hypot(d2x, d2y) > 10 ? U.ang(a2 - a1) : 0;
    ev.power = U.clamp(len / (innerHeight * 0.42) * 0.55 + ev.spd / 2600 * 0.45, 0.05, 1);
    emit('swipe', ev);
  }
  I.init = function () {
    const t = el('touch');
    t.addEventListener('touchstart', (e) => { e.preventDefault(); SP.Snd.unlock(); for (const c of e.changedTouches) start(c.identifier, c.clientX, c.clientY); }, { passive: false });
    t.addEventListener('touchmove', (e) => { e.preventDefault(); for (const c of e.changedTouches) move(c.identifier, c.clientX, c.clientY); }, { passive: false });
    t.addEventListener('touchend', (e) => { e.preventDefault(); for (const c of e.changedTouches) end(c.identifier, c.clientX, c.clientY); }, { passive: false });
    t.addEventListener('touchcancel', (e) => { for (const c of e.changedTouches) end(c.identifier); });
    let md = false;
    t.addEventListener('mousedown', (e) => { SP.Snd.unlock(); md = true; start('m', e.clientX, e.clientY); });
    addEventListener('mousemove', (e) => { if (md) move('m', e.clientX, e.clientY); });
    addEventListener('mouseup', (e) => { if (md) { md = false; end('m', e.clientX, e.clientY); } });
    addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return; const k = e.key.toLowerCase(); if (I.keys[k]) return; I.keys[k] = true; keyMove();
      if (k === ' ' || k === 'enter') emit('tap', { x: innerWidth / 2, y: innerHeight * 0.6, sx: 0.5, sy: 0.6, key: true, dx: 0, dy: 0, len: 0 });
      if (k === 'escape' || k === 'p') emit('pause', {});
      const sw = { i: [0, -1], k: [0, 1], j: [-0.6, -1], l: [0.6, -1], u: [-0.3, -1], o: [0.3, -1] }[k];
      if (sw) { const len = innerHeight * 0.3, dx = sw[0] * len * 0.5, dy = sw[1] * len; emit('swipe', { x: innerWidth / 2 + dx, y: innerHeight * 0.6 + dy, x0: innerWidth / 2, y0: innerHeight * 0.6, dx, dy, len: Math.hypot(dx, dy), spd: 1500, power: e.shiftKey ? 1 : 0.6, curve: 0, dur: 0.2, sx: 0.5, sy: 0.5, sx0: 0.5, sy0: 0.6, key: true }); }
    });
    addEventListener('keyup', (e) => { I.keys[e.key.toLowerCase()] = false; keyMove(); });
  };
  function keyMove() { const K = I.keys; const x = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0), y = (K.s || K.arrowdown ? 1 : 0) - (K.w || K.arrowup ? 1 : 0); if (joyId != null) return; const m = Math.hypot(x, y) || 1; I.jx = x / m; I.jy = y / m; emit('move', { x: I.jx, y: I.jy }); }
  I.reset = function () { joyId = null; I.active = {}; I.jx = 0; I.jy = 0; showJoy(false); };
  I.setJoy = function (on) { I.joyOn = on; if (!on) { joyId = null; showJoy(false); } };
})();

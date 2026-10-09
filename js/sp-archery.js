/* Grok Sports Command - Archery: 3 ends x 3 arrows at 18/30/50 m, hold-to-draw, drag to aim, wobble + wind, zoom scope */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, T = THREE;
  const ENDS = [{ d: 18, r: 0.4 }, { d: 30, r: 0.61 }, { d: 50, r: 0.61 }], ARROWS = 3, TY = 1.3, DRAW_T = 0.7;
  const ringOf = (x, y, r) => { const q = Math.hypot(x, y) / r; return q > 1 ? 0 : Math.min(10, 10 - Math.floor(q * 10)); };
  SP.Sports.archery = function (ctx) {
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length;
    const st = { end: 0, arrow: 0, turn: 0, phase: 'intro', t: 0, wind: 0, aim: null, scores: ctx.players.map(() => []), fly: null, over: false, x10: ctx.players.map(() => 0) };
    ctx.players.forEach((pl, i) => S.P.push({ x: -1.4 + i * 1.4, y: 0, z: 0, ry: Math.PI, a: 'idle', at: 0, sd: 1, pw: 0 }));
    const end = () => ENDS[Math.min(st.end, ENDS.length - 1)];
    const total = (i) => st.scores[i].reduce((s, v) => s + v, 0);
    function newWind() { const k = [0.8, 1.6, 2.6][st.end]; st.wind = Math.round((R() * 2 - 1) * k * 10) / 10; }
    function upd() { const h = S.hud, me = st.turn;
      if (n === 2) { h.l = ctx.players[0].name; h.r = ctx.players[1].name; h.ls = total(0); h.rs = total(1); } else { h.l = ctx.players[me].name; h.ls = total(me); h.r = ''; h.rs = ''; }
      h.mid = end().d + ' m · END ' + (st.end + 1) + '/3';
      h.turn = '🏹 ' + ctx.players[me].name + ' · arrow ' + (st.arrow + 1) + '/3 · wind ' + (st.wind === 0 ? 'calm' : Math.abs(st.wind).toFixed(1) + (st.wind > 0 ? ' →' : ' ←')) + (n > 2 ? ' · ' + ctx.players.map((p, i) => p.name.slice(0, 7) + ' ' + total(i)).join(' · ') : '');
      h.tip = st.turn === ctx.me && st.phase === 'aim' ? (st.aim ? (st.aim.pw < 1 ? 'Keep holding to draw...' : 'Slide to aim, let go to SHOOT') : 'HOLD to draw the bow') : '';
      h.meter = st.aim && st.turn === ctx.me ? { v: st.aim.pw, lo: 0.9, hi: 1.0 } : null; }
    function startTurn() { st.phase = 'aim'; st.t = 0; st.aim = null; if (st.arrow === 0 && st.turn === 0) newWind(); else if (R() < 0.5) st.wind = U.clamp(st.wind + (R() - 0.5) * 0.8, -3, 3); upd(); }
    /* ---- input ---- */
    function input(i, ev) {
      if (i !== st.turn || st.phase !== 'aim') return;
      if (ev.k === 'down') { st.aim = { x: 0, y: 0, ox: 0, oy: 0, pw: 0, t: 0, bx: 0, by: 0 }; E.act(S.P[i], 'draw'); return; }
      if (ev.k === 'drag' && st.aim) { const r = end().r; st.aim.x = st.aim.bx + ev.dx * r * 4.2; st.aim.y = st.aim.by - ev.dy * r * 4.2; return; }
      if (ev.k === 'up' && st.aim) { const a = st.aim; if (ev.dx != null) { const r = end().r; a.x = a.bx + ev.dx * r * 4.2; a.y = a.by - ev.dy * r * 4.2; } shoot(i, a.x + a.ox, a.y + a.oy, a.pw); return; }
      if (ev.k === 'shoot') shoot(i, +ev.x || 0, +ev.y || 0, U.clamp(+ev.pw || 1, 0, 1));
    }
    function shoot(i, ax, ay, pw) {
      const e = end(); st.aim = null; S.P[i].a = 'idle';
      // weak draw: arrow drops; wind drift; tiny release noise
      const drop = pw < 0.9 ? (0.9 - pw) * e.d * 0.09 : 0, drift = st.wind * (e.d / 50) * 0.28;
      const hx = ax + drift + Ph.gauss(R) * 0.012 * e.d / 18, hy = ay - drop + Ph.gauss(R) * 0.01 * e.d / 18;
      const sc = ringOf(hx, hy, e.r); st.fly = { i, x: hx, y: hy, sc, t: 0, T: 0.25 + e.d / 70, sx: S.P[i].x, miss: sc === 0 };
      st.phase = 'fly'; st.t = 0; ctx.ev({ t: 'fx', k: 'twang' }); E.act(S.P[i], 'throw'); upd();
    }
    function land() {
      const f = st.fly, i = f.i; st.scores[i].push(f.sc); if (f.sc === 10) st.x10[i]++;
      arrows.push(mkArrow(f.x, f.y));
      ctx.ev({ t: 'fx', k: f.sc >= 9 ? 'cup' : f.sc ? 'thud' : 'miss', a: 0.6 });
      ctx.ev({ t: 'msg', b: f.sc === 10 ? 'BULLSEYE!' : f.sc ? String(f.sc) : 'MISS', s: ctx.players[i].name, d: 1100 });
      if (f.sc === 10) { ctx.ev({ t: 'party', x: 0, y: TY + 1, z: -end().d, n: 40 }); VN.roar(0.8); if (ctx.isHuman(i)) ctx.stat(i, 'bull'); }
      st.phase = 'show'; st.t = 0; upd();
    }
    function next() {
      st.turn++; if (st.turn >= n) { st.turn = 0; st.arrow++; }
      if (st.arrow >= ARROWS) { st.arrow = 0; st.end++; clearArrows(); if (st.end >= ENDS.length) return finish(); ctx.ev({ t: 'msg', b: ENDS[st.end].d + ' METERS', s: 'End ' + (st.end + 1) + ' of 3', d: 1500 }); moveTarget(); st.phase = 'intro'; st.t = 0; return; }
      startTurn();
    }
    function cpuShoot() {
      const d = ctx.D, e = end(), i = st.turn; const comp = -st.wind * (e.d / 50) * 0.28 * (0.3 + d.smart * 0.75);
      const sd = e.r * (d.aim * 0.4 - 0.02) * (0.8 + e.d / 100);
      shoot(i, comp + Ph.gauss(R) * sd, Ph.gauss(R) * sd, R() < d.err * 0.3 ? 0.8 : 1);
    }
    function sim(dt) {
      if (st.over) return; st.t += dt;
      if (st.phase === 'intro') { if (st.t > 1.6) startTurn(); return; }
      if (st.phase === 'aim') {
        const a = st.aim, e = end();
        if (a) { a.t += dt; a.pw = Math.min(1, a.t / DRAW_T); const tired = Math.max(0, a.t - 3.2) * 0.6, assist = ctx.assist(st.turn) ? 0.55 : 1;
          const w = e.r * (0.07 + tired) * assist * (0.8 + e.d / 60); a.ox = (Math.sin(a.t * 1.9) * 0.6 + Math.sin(a.t * 3.7 + 1) * 0.4) * w; a.oy = (Math.cos(a.t * 1.5) * 0.6 + Math.sin(a.t * 4.3) * 0.4) * w; S.P[st.turn].pw = a.pw; }
        if (!ctx.isHuman(st.turn) && st.t > 1.4 + R() * 0.05) { cpuShoot(); return; }
        if (ctx.isHuman(st.turn) && st.t > 45) { shoot(st.turn, 0, 0, 1); return; }
        upd(); return;
      }
      if (st.phase === 'fly') { st.fly.t += dt; if (st.fly.t >= st.fly.T) land(); return; }
      if (st.phase === 'show' && st.t > 1.5) next();
    }
    function finish() {
      st.over = true; st.phase = 'over'; const tot = ctx.players.map((p, i) => total(i)); const best = Math.max(...tot), w = tot.map((t, i) => i).filter((i) => tot[i] === best);
      let wi = w.length === 1 ? w[0] : (w.sort((a, b) => st.x10[b] - st.x10[a]), st.x10[w[0]] > st.x10[w[1]] ? w[0] : -1);
      const score = {}; tot.forEach((t, i) => { score[i] = t; }); ctx.ev({ t: 'roar', k: 1 });
      ctx.end({ win: wi < 0 ? -1 : ctx.players[wi].team, title: wi < 0 ? "It's a tie!" : ctx.players[wi].name + ' wins with ' + best + '!', lines: ctx.players.map((p, i) => p.name + ': ' + tot[i] + ' / 90 · ' + st.x10[i] + ' bullseyes'), score });
    }
    /* ---- view ---- */
    let tgt, reticle, flyM, arrows = [], flag, lane;
    function mkArrow(x, y) { const b = new M.B(); b.cyl(0.008, 0.008, 0.7, '#7c2d12', 0, 0, 0.35, Math.PI / 2, 0, 0, null, 5); b.box(0.06, 0.04, 0.12, 0.01, '#ef4444', 0, 0.02, 0.66); b.box(0.06, 0.04, 0.12, 0.01, '#facc15', 0, -0.02, 0.66); const g = b.group(false); g.position.set(x, TY + y, -end().d + 0.05); g.rotation.set(Ph.gauss(R) * 0.05, Ph.gauss(R) * 0.05, 0); V.world.add(g); return g; }
    function clearArrows() { arrows.forEach((a) => V.world.remove(a)); arrows = []; }
    function face(r) {
      const g = new T.Group(), cols = ['#f8fafc', '#f8fafc', '#111827', '#111827', '#38bdf8', '#38bdf8', '#ef4444', '#ef4444', '#facc15', '#facc15'];
      for (let k = 0; k < 10; k++) { const ro = r * (1 - k / 10), ri = r * (1 - (k + 1) / 10); const m = new T.Mesh(new T.RingGeometry(ri, ro, 48), new T.MeshLambertMaterial({ color: cols[k] })); m.position.z = 0.001 * k; g.add(m); const l = new T.Mesh(new T.RingGeometry(ro - 0.003, ro, 48), new T.MeshBasicMaterial({ color: k === 2 || k === 3 ? '#e5e7eb' : '#111827' })); l.position.z = 0.012; g.add(l); }
      const x = new T.Mesh(new T.RingGeometry(r * 0.04, r * 0.05, 24), new T.MeshBasicMaterial({ color: '#111827' })); x.position.z = 0.013; g.add(x); return g;
    }
    function moveTarget() { const e = end(); if (tgt) V.world.remove(tgt); tgt = new T.Group(); const b = new M.B();
      b.cyl(0.85, 0.85, 0.35, '#e7c9a0', 0, TY, -0.2, Math.PI / 2, 0, 0, null, 28); b.cyl(0.87, 0.87, 0.06, '#a16207', 0, TY, -0.2, Math.PI / 2, 0, 0, null, 28);
      [[-0.55, 1], [0.55, 1]].forEach((q) => b.box(0.08, 2.2, 0.08, 0.02, '#78350f', q[0], 0.95, -0.55, -0.2, 0, q[0] * 0.25)); b.box(0.08, 2.0, 0.08, 0.02, '#78350f', 0, 0.9, -1.1, 0.5, 0, 0);
      tgt.add(b.group(true)); const f = face(e.r); f.position.set(0, TY, 0.0); tgt.add(f); tgt.position.set(0, 0, -e.d); V.world.add(tgt);
      const nb = V.sign(e.d + ' m', 1.2, 0.5, '#1e3a8a', '#fde047'); nb.position.set(-1.6, 0.5, -e.d + 0.3); tgt.add(nb); nb.position.set(-1.6, 0.5, 0.3);
      reticle.scale.setScalar(e.r / 0.4);
    }
    function build() {
      V.env(VN.ENV.day); VN.ground(500, '#5cc466', '#47ad52', -0.04);
      const b = new M.B();
      // shooting line + mown range stripes, side hedges, flags, spectator tent, scoreboard
      for (let k = 0; k < 14; k++) b.box(9, 0.01, 4, 0, k % 2 ? '#62cc6c' : '#55bd5f', 0, 0.0, 1 - k * 4 - 2);
      b.box(9, 0.02, 0.1, 0, '#f8fafc', 0, 0.012, -0.8);
      [-1, 1].forEach((k) => { for (let z = 2; z > -58; z -= 2) b.sph(0.9, '#166534', k * 5.4, 0.7, z, 1, 0.9, 1.3, 0, 0, 0, null, 8, 6); });
      for (let z = -8; z > -56; z -= 8) [-1, 1].forEach((k) => { b.cyl(0.03, 0.03, 2.4, '#e5e7eb', k * 4.4, 1.2, z, 0, 0, 0, null, 5); });
      b.box(3, 0.1, 2.4, 0.05, '#f8fafc', -6.8, 2.3, 1.5); [[-1.4, -1.1], [1.4, -1.1], [-1.4, 1.1], [1.4, 1.1]].forEach((q) => b.cyl(0.04, 0.04, 2.3, '#94a3b8', -6.8 + q[0], 1.15, 1.5 + q[1], 0, 0, 0, null, 5)); b.geo(new T.ConeGeometry(2.1, 0.8, 4), '#ef4444', -6.8, 2.75, 1.5, 0, Math.PI / 4, 0);
      for (let i = 0; i < 4; i++) b.box(0.5, 0.9, 0.06, 0.02, '#f8fafc', -1.5 + i, 0.45, 1.2); // quivers stands
      VN.add(b.group(true));
      VN.stand({ x: 7.5, z: -3, ry: Math.PI / 2, len: 12, rows: M.low ? 3 : 4, seats: ['#eab308', '#16a34a'], wall: '#14532d', seed: 71 });
      [[-9, -20], [10, -30], [-11, -45], [12, -55], [-8, -62], [6, -66], [-14, 4], [13, 6]].forEach((p, i) => VN.tree(p[0], p[1], 1.1 + (i % 3) * 0.2));
      VN.clouds(M.low ? 5 : 10, 200, 60);
      const fb = new M.B(); fb.cyl(0.03, 0.03, 4, '#e5e7eb', 3.6, 2, -10, 0, 0, 0, null, 6); VN.add(fb.group(true)); flag = new T.Mesh(new T.PlaneGeometry(0.9, 0.5), new T.MeshLambertMaterial({ color: '#ef4444', side: T.DoubleSide })); flag.position.set(3.6, 3.7, -10); V.world.add(flag);
      VN.jumbo(-8.5, 5, -18, 0.45, 5, 2.5);
      E.makeModels('bow', { tags: true, ring: false });
      reticle = new T.Group(); [0.06, 0.012].forEach((r, k) => { const m = new T.Mesh(new T.RingGeometry(r - (k ? 0.012 : 0.008), r, 32), new T.MeshBasicMaterial({ color: k ? '#ff2d55' : '#22ff88', depthTest: false, transparent: true })); m.renderOrder = 10; reticle.add(m); });
      [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach((q) => { const m = new T.Mesh(new T.PlaneGeometry(q[0] ? 0.05 : 0.006, q[1] ? 0.05 : 0.006), new T.MeshBasicMaterial({ color: '#22ff88', depthTest: false, transparent: true })); m.position.set(q[0] * 0.085, q[1] * 0.085, 0); m.renderOrder = 10; reticle.add(m); });
      V.world.add(reticle);
      const fb2 = new M.B(); fb2.cyl(0.01, 0.01, 0.75, '#7c2d12', 0, 0, 0, Math.PI / 2, 0, 0, null, 5); fb2.box(0.05, 0.05, 0.1, 0.01, '#ef4444', 0, 0, 0.32); flyM = fb2.group(false); V.world.add(flyM); flyM.visible = false;
      moveTarget(); S.hud.mid = ''; upd(); ctx.ev({ t: 'msg', b: '18 METERS', s: 'End 1 of 3', d: 1400 });
    }
    let fov = 50;
    function view(dt) {
      E.syncModels(dt); const e = end(), a = st.aim;
      reticle.visible = !!(a && st.turn === ctx.me && st.phase === 'aim'); if (reticle.visible) reticle.position.set(a.x + a.ox, TY + a.y + a.oy, -e.d + 0.05);
      const f = st.fly; flyM.visible = st.phase === 'fly'; if (f && st.phase === 'fly') { const k = f.t / f.T, z0 = -0.5, z1 = -e.d + 0.4; flyM.position.set(U.lerp(f.sx, f.x, k), U.lerp(1.5, TY + f.y, k) + Math.sin(k * Math.PI) * e.d * 0.012, U.lerp(z0, z1, k)); }
      flag.rotation.y = st.wind * -0.35 + Math.sin(V.t * 6) * 0.08 * (0.3 + Math.abs(st.wind)); flag.position.x = 3.6 + st.wind * 0.12;
      S.P.forEach((p, i) => { p.a = st.aim && i === st.turn ? 'draw' : p.a === 'draw' ? 'idle' : p.a; p.hid = false; });
    }
    function cam(dt, snap) {
      const e = end(), p = S.P[st.turn];
      if (st.phase === 'aim' && st.aim || st.phase === 'fly' || st.phase === 'show') {
        // scope: zoom onto the target face
        const want = 2 * Math.atan((e.r * 2.6) / e.d) * 180 / Math.PI; fov = U.lerp(fov, want, 1 - Math.exp(-dt * 6)); E.fov(fov);
        E.camLook(p.x * 0.3, 1.65, 0.6, 0, TY, -e.d, dt, 6, snap);
      } else { fov = U.lerp(fov, 52, 1 - Math.exp(-dt * 5)); E.fov(fov); E.camLook(p.x + 2.4, 2.7, 4.8, p.x * 0.2, 1.1, -e.d * 0.6, dt, 4, snap); }
    }
    return { S, build, sim, input, view, cam, st, joy: false, shoot, ENDS };
  };
  SP.Sports.archery.rec = { match: { n: 'Best target score' } };
})();

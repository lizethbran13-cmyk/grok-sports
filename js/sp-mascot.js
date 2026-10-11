/* Grok Sports Command - DLC Ratita Stadium Night: Mascot Race. Giant mascot suits race the stadium track:
   TAP rhythm to run, SWIPE UP to jump the cheese hurdles, grab glowing cheese bites for a burst */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, ST = SP.Stadium, T = THREE;
  const RR = 13, SL = 40, LW = 1.25, LAP = 2 * SL + 2 * Math.PI * RR, VMAX = 8.6, GRAV = 13;
  const KINDS = ['ratita', 'kitty', 'pup', 'frog'];
  // position on the oval: s = distance along the inside lane, lane = 0..3
  function at(s, lane) {
    s = ((s % LAP) + LAP) % LAP; const r = RR + 0.7 + lane * LW;
    if (s < SL) return { x: r, z: SL / 2 - s, ry: Math.PI };
    s -= SL; if (s < Math.PI * RR) { const a = s / RR; return { x: Math.cos(a) * r, z: -SL / 2 - Math.sin(a) * r, ry: Math.PI + a }; }
    s -= Math.PI * RR; if (s < SL) return { x: -r, z: -SL / 2 + s, ry: 0 };
    s -= SL; const a = s / RR; return { x: -Math.cos(a) * r, z: SL / 2 + Math.sin(a) * r, ry: a };
  }
  const HURDLES = [9, 21, 33, SL + Math.PI * RR + 8, SL + Math.PI * RR + 20, SL + Math.PI * RR + 32];
  const BITES = [SL + Math.PI * RR * 0.5, 2 * SL + Math.PI * RR * 1.5];
  SP.Mascot = { at, LAP, HURDLES };
  SP.Sports.mascot = function (ctx) {
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length, LAPS = ctx.mode.id === 'sprint' ? 1 : 2, GOAL = LAPS * LAP;
    const st = { phase: 'count', t: 0, over: false, order: [], knocked: {}, bites: {} };
    const rs = ctx.players.map((p, i) => ({ s: 0, v: 0, y: 0, vy: 0, lane: i, wob: 0, burst: 0, done: false, time: 0, cadence: 0, cpuT: 0, jumpPlan: -1 }));
    ctx.players.forEach((p, i) => { const q = at(0, i); S.P.push({ x: q.x, y: 0, z: q.z, ry: q.ry, a: 'idle', at: 0, sd: 1 }); });
    const place = () => rs.map((r, i) => i).sort((a, b) => (rs[b].done ? 1e6 - rs[b].time : rs[b].s) - (rs[a].done ? 1e6 - rs[a].time : rs[a].s));
    function upd() { const h = S.hud, me = ctx.me >= 0 ? ctx.me : 0, r = rs[me], pl = place().indexOf(me) + 1; h.solo = true; h.l = ctx.players[me].name; h.ls = ['1st', '2nd', '3rd', '4th'][pl - 1]; h.r = ''; h.rs = '';
      h.mid = st.phase === 'count' ? 'GET READY' : 'LAP ' + Math.min(LAPS, Math.floor(r.s / LAP) + 1) + '/' + LAPS; h.turn = '🐭 ' + place().map((i) => ctx.players[i].name.slice(0, 8)).join(' · ');
      h.tip = st.phase === 'run' && !r.done ? 'TAP TAP TAP to run · SWIPE UP to jump!' : ''; h.meter = st.phase === 'run' && !r.done ? { v: r.v / VMAX, lo: 0.8, hi: 1 } : null; }
    function tapRun(i) { const r = rs[i]; if (st.phase !== 'run' || r.done) return; const boost = ctx.assist(i) ? 1.55 : 1.3; r.v = Math.min(VMAX + (r.burst > 0 ? 3 : 0), r.v + boost * (r.wob > 0 ? 0.4 : 1)); }
    function jump(i) { const r = rs[i]; if (st.phase !== 'run' || r.done || r.y > 0.02) return; r.vy = 5.6; E.act(S.P[i], 'jump'); ctx.ev({ t: 'fx', k: 'swoosh' }); }
    function input(i, ev) {
      if (ev.k === 'assist') { ctx.cfg.assist = ctx.cfg.assist || {}; ctx.cfg.assist[i] = !!ev.on; return; }
      if (ev.k === 'tap') { tapRun(i); return; }
      if (ev.k === 'swipe') { if ((+ev.uy || 0) < -0.4 || (+ev.dy || 0) < -30) jump(i); else tapRun(i); }
    }
    function sim(dt) {
      if (st.over) return; st.t += dt;
      if (st.phase === 'count') { const c = 3 - Math.floor(st.t); if (c !== st.lastC && c > 0) { st.lastC = c; ctx.ev({ t: 'msg', b: String(c), d: 700 }); ctx.ev({ t: 'fx', k: 'tick' }); } if (st.t >= 3) { st.phase = 'run'; st.t = 0; ctx.ev({ t: 'msg', b: 'GO!', s: 'Tap tap tap!', d: 900 }); ctx.ev({ t: 'fx', k: 'whistle' }); ctx.ev({ t: 'roar', k: 0.8 }); } upd(); return; }
      if (st.phase === 'done') { if (st.t > 2.5) finish(); }
      rs.forEach((r, i) => {
        const p = S.P[i];
        if (r.done) { r.v = Math.max(0, r.v - dt * 4); r.s += r.v * dt; const q = at(r.s, r.lane); p.x = q.x; p.z = q.z; p.ry = q.ry; return; }
        r.time += dt; r.wob = Math.max(0, r.wob - dt); r.burst = Math.max(0, r.burst - dt);
        if (!ctx.isHuman(i)) cpu(i, r, dt);
        else if (ctx.assist(i)) { const nh = nextHurdle(r); if (nh != null && nh - r.s < 1.15 + r.v * 0.12 && nh - r.s > 0 && r.y <= 0.02) jump(i); }
        r.v = Math.max(0, r.v - (2.2 + r.v * 0.5) * dt * (r.burst > 0 ? 0.5 : 1));
        const s0 = r.s; r.s += r.v * dt;
        if (r.y > 0 || r.vy > 0) { r.vy -= GRAV * dt; r.y += r.vy * dt; if (r.y <= 0) { r.y = 0; r.vy = 0; } }
        // hurdles: crossing one on the ground knocks it over and slows you right down
        HURDLES.forEach((h, k) => { const lap = Math.floor(s0 / LAP), hs = lap * LAP + h; if (s0 < hs && r.s >= hs && hs < GOAL) { if (r.y < 0.35) { const key = i + ':' + lap + ':' + k; if (!st.knocked[key]) { st.knocked[key] = 1; r.v *= 0.32; r.wob = 0.7; E.act(p, 'sad'); ctx.ev({ t: 'fx', k: 'thud' }); if (i === ctx.me) ctx.ev({ t: 'hint', b: 'BONK! Swipe UP to jump the cheese', d: 1200 }); S.x.kn = Object.keys(st.knocked); } } else if (ctx.isHuman(i)) ctx.stat(i, 'hurdle'); } });
        BITES.forEach((b, k) => { const lap = Math.floor(s0 / LAP), bs = lap * LAP + b, key = i + ':' + lap + ':' + k; if (s0 < bs && r.s >= bs && !st.bites[key]) { st.bites[key] = 1; r.burst = 1.6; r.v = Math.min(VMAX + 3, r.v + 3); ctx.ev({ t: 'fx', k: 'coin' }); if (i === ctx.me) ctx.ev({ t: 'hint', b: '🧀 CHEESE BURST!', d: 900 }); } });
        const q = at(r.s, r.lane); p.x = q.x; p.z = q.z; p.y = r.y; p.ry = q.ry; if (r.y <= 0.01 && p.a === 'jump') p.a = 'idle';
        if (p.a === 'sad' && p.at > 0.6) p.a = 'idle';
        if (Math.floor(r.s / LAP) > Math.floor(s0 / LAP) && r.s < GOAL && i === ctx.me) ctx.ev({ t: 'msg', b: 'FINAL LAP!', d: 1100 });
        if (r.s >= GOAL) { r.done = true; st.order.push(i); const pos = st.order.length; E.act(p, pos === 1 ? 'cheer' : 'wave'); ctx.ev({ t: 'msg', b: pos === 1 ? ctx.players[i].name + ' WINS!' : ['', '', '2nd', '3rd', '4th'][pos] + ': ' + ctx.players[i].name, s: r.time.toFixed(2) + 's', d: 1500 }); ctx.ev({ t: 'roar', k: pos === 1 ? 1 : 0.5 }); if (pos === 1) ctx.ev({ t: 'party', x: p.x, y: 2, z: p.z, n: 70 }); }
      });
      // race ends when every human finished (CPUs get placed by distance) or after a long time
      if (st.phase === 'run' && ((st.order.length && rs.every((r, i) => r.done || !ctx.isHuman(i))) || st.t > 150)) { st.phase = 'done'; st.t = 0; }
      upd();
    }
    function nextHurdle(r) { const lap = Math.floor(r.s / LAP); for (let l = lap; l <= lap + 1; l++) for (const h of HURDLES) { const hs = l * LAP + h; if (hs > r.s && hs < GOAL) return hs; } return null; }
    function cpu(i, r, dt) {
      const d = ctx.D; r.cpuT -= dt; const cad = 3.6 + d.speed * 2.1 + Math.sin(st.t * 0.7 + i) * 0.3; if (r.cpuT <= 0) { r.cpuT = 1 / cad; tapRun(i); }
      const nh = nextHurdle(r); if (nh != null && r.y <= 0.02) { const dd = nh - r.s; if (r.jumpPlan !== nh && dd < 1.4 + r.v * 0.12) { r.jumpPlan = nh; if (R() > d.err * 1.6) jump(i); } }
    }
    function finish() {
      if (st.over) return; st.over = true; const ord = st.order.slice(); place().forEach((i) => { if (ord.indexOf(i) < 0) ord.push(i); });
      const w = ctx.players[ord[0]].team, score = {}; ord.forEach((i, k) => { score[i] = rs[i].done ? Math.round(rs[i].time * 100) / 100 : 999; });
      ctx.end({ win: w, title: ctx.players[ord[0]].name + ' wins the Mascot Race!', lines: ord.map((i, k) => (k + 1) + '. ' + ctx.players[i].name + ' (' + ST.MASCOTS[KINDS[i % 4]].n + ')' + (rs[i].done ? ' · ' + rs[i].time.toFixed(2) + 's' : ' · DNF')), score, scoreLabel: 'seconds' });
    }
    /* ---------- view ---------- */
    let hms = [], bms = [];
    function build() {
      track(); E.makeModels('none', { tags: true, ring: false }); ctx.models.forEach((m, i) => ST.dress(m, KINDS[i % 4]));
      // cheese hurdles on every lane
      HURDLES.forEach((h) => { for (let l = 0; l < 4; l++) { const b = new M.B(); [-1, 1].forEach((q) => b.cyl(0.04, 0.04, 0.55, '#f8fafc', q * 0.5, 0.27, 0, 0, 0, 0, null, 6)); const sh = new T.Shape(); sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(-0.5, 0.32); sh.lineTo(-0.5, 0); const wg = new T.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); wg.translate(0, 0, -0.1); b.geo(wg, '#facc15', 0, 0.3, 0, 0, 0, 0, 1, 1, 1, 'gloss'); [[-0.25, 0.38], [0.05, 0.36], [-0.35, 0.47]].forEach((q) => b.sph(0.05, '#d97706', q[0], q[1], 0.1, 1, 1, 0.3)); const m = b.group(true); const q = at(h, l); m.position.set(q.x, 0, q.z); m.rotation.y = q.ry + Math.PI / 2; V.world.add(m); hms.push({ m, h, l }); } });
      BITES.forEach((bb) => { for (let l = 0; l < 4; l++) { const b = new M.B(); const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0.36, 0); sh.lineTo(0, 0.24); sh.lineTo(0, 0); const wg = new T.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false }); wg.translate(-0.12, -0.08, -0.09); b.geo(wg, '#fde047', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'glow'); const m = b.group(false); const q = at(bb, l); m.position.set(q.x, 1.0, q.z); V.world.add(m); bms.push(m); } });
      V.env(ST.ENV); upd();
    }
    function view(dt) {
      E.syncModels(dt); bms.forEach((m, i) => { m.rotation.y = V.t * 2 + i; m.position.y = 1.0 + Math.sin(V.t * 3 + i) * 0.12; });
      const kn = S.x.kn || []; hms.forEach((hm) => { const down = kn.some((k2) => { const a = k2.split(':'); return +a[0] === hm.l && HURDLES[+a[2]] === hm.h; }); hm.m.rotation.x += ((down ? -1.4 : 0) - hm.m.rotation.x) * Math.min(1, dt * 8); });
    }
    function cam(dt, snap) { const me = ctx.me >= 0 ? ctx.me : 0, r = rs[me] || rs[0]; const b = at(r.s - 6.5, Math.max(0, r.lane - 0.5)), f = at(r.s + 7, r.lane); E.fov(60); E.camLook(b.x, 3.6, b.z, f.x, 0.9, f.z, dt, 5, snap); }
    const sync = { get: () => ({ ph: st.phase, s: rs.map((r) => Math.round(r.s * 10) / 10), v: rs.map((r) => Math.round(r.v * 10) / 10) }), set: (v) => { st.phase = String(v.ph); if (Array.isArray(v.s)) v.s.forEach((x, i) => { if (rs[i]) rs[i].s = +x || 0; }); if (Array.isArray(v.v)) v.v.forEach((x, i) => { if (rs[i]) rs[i].v = +x || 0; }); } };
    return { S, build, sim, input, view, cam, st, joy: false, sync, rs, tapRun, jump };
  };
  SP.Sports.mascot.rec = { '2lap': { n: 'Best 2-lap time', low: true }, sprint: { n: 'Best 1-lap time', low: true } };
  function track() {
    const w = (RR + 0.7 + 4 * LW) * 2 + 2, l = SL + w;
    ST.venue(w, l, { gap: 2.5, jumbo: [0, 12, -(l / 2 + 2.5 + 9), 0] });
    const b = new M.B();
    // red rubber track ring (lathe-free: straights + arcs as real slabs), lane lines, infield grass, start/finish
    const ro = RR + 0.7 + 4 * LW + 0.2, ri = RR + 0.5;
    const ring = (cz, a0) => { const g = new T.RingGeometry(ri, ro, 40, 1, a0, Math.PI); g.rotateX(-Math.PI / 2); return g; };
    b.geo(ring(-SL / 2, 0), '#c2410c', 0, 0.01, -SL / 2); b.geo(ring(SL / 2, Math.PI), '#c2410c', 0, 0.01, SL / 2);
    [-1, 1].forEach((k) => b.box(ro - ri, 0.02, SL, 0, '#c2410c', k * (ri + ro) / 2, 0.01, 0));
    for (let lane = 0; lane <= 4; lane++) { const r = RR + 0.7 + lane * LW - LW / 2; [-1, 1].forEach((k) => b.box(0.05, 0.022, SL, 0, '#fff7ed', k * r, 0.012, 0)); [[-SL / 2, 0], [SL / 2, Math.PI]].forEach((q) => { const g = new T.RingGeometry(r - 0.025, r + 0.025, 48, 1, q[1], Math.PI); g.rotateX(-Math.PI / 2); b.geo(g, '#fff7ed', 0, 0.013, q[0]); }); }
    // infield grass with Ratita logo
    b.box((ri - 0.1) * 2, 0.03, SL, 0, '#15803d', 0, 0.0, 0); [-1, 1].forEach((k) => { const g = new T.CircleGeometry(ri - 0.1, 40, k > 0 ? Math.PI : 0, Math.PI); g.rotateX(-Math.PI / 2); b.geo(g, '#15803d', 0, 0.005, k * SL / 2); });
    for (let i = 0; i < 8; i++) b.box((ri - 0.1) * 2, 0.005, SL / 8, 0, i % 2 ? '#166534' : '#15803d', 0, 0.018, -SL / 2 + (i + 0.5) * SL / 8);
    for (let i = 0; i < 8; i++) b.box(0.24, 0.025, 0.24, 0, i % 2 ? '#111827' : '#f8fafc', ri + (i + 0.5) * (ro - ri) / 8, 0.02, SL / 2 - 0.1);
    b.cyl(0.14, 0.18, 6.4, '#f8fafc', ro + 1.0, 3.2, SL / 2, 0, 0, 0, null, 10); b.box(ro - ri + 1.6, 0.16, 0.16, 0, '#f8fafc', (ri + ro) / 2 + 0.2, 6.3, SL / 2); b.box(ro - ri + 0.4, 0.7, 0.12, 0.05, '#7c3aed', (ri + ro) / 2, 5.8, SL / 2);
    const m = b.group(true); m.traverse((q) => { if (q.isMesh) q.receiveShadow = true; }); VN.add(m);
    const fin = V.sign('🏁 FINISH', 2.4, 0.5, '#7c3aed', '#ffe14d'); fin.position.set((ri + ro) / 2, 5.8, SL / 2 - 0.07); fin.rotation.y = Math.PI; VN.add(fin);
    const rat = ST.ratitaStatue(1.6); rat.position.set(0, 0, 0); rat.traverse((q) => { if (q.isMesh) q.castShadow = !M.low; }); VN.add(rat); V.anim((dt, t) => { rat.rotation.y = Math.sin(t * 0.6) * 0.6; rat.userData.head.rotation.z = Math.sin(t * 2) * 0.12; });
  }
})();

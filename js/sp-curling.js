/* Grok Sports Command - DLC Ratita Stadium Night: Cheese Curling. Slide cheese wheels down the ice to the house,
   curl them with a bent swipe, TAP to sweep, knock the other side's cheese out. 3 wheels each per end. */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, ST = SP.Stadium, T = THREE;
  const SR = 0.3, HW = 2.3, HACK = 13, TEE = -12, HOUSE = 1.83, HOG = -5.5, BACK = TEE - 2.6, FR = 0.24, FRS = 0.15, PER = 3;
  // one physics step for every moving stone. returns list of events
  function step(stones, dt, sweep) {
    for (const s of stones) {
      if (!s.v || !s.mv) continue;
      const sp = Math.hypot(s.vx, s.vz); if (sp < 0.02) { s.vx = s.vz = 0; s.mv = false; continue; }
      const fr = s.sw && sweep > 0 ? FRS : FR, ns = Math.max(0, sp - fr * dt);
      // curl: sideways pull that grows as the stone slows (sweeping keeps it straighter)
      const c = (s.curl || 0) * 0.16 / (sp + 0.55) * (s.sw && sweep > 0 ? 0.55 : 1);
      const ux = s.vx / sp, uz = s.vz / sp;
      s.vx = ux * ns - uz * c * dt; s.vz = uz * ns + ux * c * dt;
      s.x += s.vx * dt; s.z += s.vz * dt; s.rot = (s.rot || 0) + (s.curl || 0) * dt * 1.2;
    }
    // stone-on-stone hits (equal mass, a bit of energy lost)
    for (let i = 0; i < stones.length; i++) for (let j = i + 1; j < stones.length; j++) {
      const a = stones[i], b = stones[j]; if (!a.v || !b.v) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < SR * 2 && d > 1e-4) { const nx = dx / d, nz = dz / d, rv = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz; const ov = SR * 2 - d; a.x -= nx * ov / 2; a.z -= nz * ov / 2; b.x += nx * ov / 2; b.z += nz * ov / 2;
        if (rv > 0) { const k = rv * 0.92; a.vx -= k * nx; a.vz -= k * nz; b.vx += k * nx; b.vz += k * nz; a.mv = b.mv = true; a.hit = b.hit = Math.max(a.hit || 0, rv); } }
    }
    for (const s of stones) { if (!s.v) continue; if (Math.abs(s.x) > HW - SR * 0.6 || s.z < BACK - SR) { s.v = false; s.mv = false; s.out = true; } }
  }
  function moving(stones) { return stones.some((s) => s.v && s.mv); }
  // predict where a lone stone stops (for the CPU + assist)
  function predict(x, vx, vz, curl, sweep) { const s = { x, z: HACK - 1.2, vx, vz, curl, v: true, mv: true, sw: !!sweep }; let t = 0; while (s.mv && t < 30) { step([s], 1 / 60, sweep ? 1 : 0); t += 1 / 60; } return s; }
  SP.Curling = { step, predict, TEE, HACK };

  SP.Sports.curling = function (ctx) {
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length, ENDS = ctx.mode.id === '2' ? 2 : 4;
    const stones = []; for (let i = 0; i < n * PER; i++) { const s = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, v: false, mv: false, own: i % n, curl: 0 }; stones.push(s); S.O.push(s); }
    const st = { end: 0, turn: 0, thrown: 0, phase: 'intro', t: 0, sweep: 0, aim: 0, endPts: [], tot: {}, lead: 0, over: false, cur: -1 };
    const teams = [...new Set(ctx.players.map((p) => p.team))]; teams.forEach((t) => { st.tot[t] = 0; });
    ctx.players.forEach((p, i) => S.P.push({ x: -HW - 1 - i * 0.8, y: 0, z: HACK - 2 - i, ry: Math.PI, a: 'idle', at: 0, sd: 1 }));
    const tname = (t) => { const ps = ctx.players.filter((p) => p.team === t); return ps.length === 1 ? ps[0].name : E.teamName(t); };
    function upd() { const h = S.hud; if (teams.length === 2) { h.l = tname(teams[0]); h.r = tname(teams[1]); h.ls = st.tot[teams[0]]; h.rs = st.tot[teams[1]]; h.solo = false; } else { h.solo = true; h.l = ctx.players[st.turn].name; h.ls = st.tot[ctx.players[st.turn].team]; h.r = ''; h.rs = ''; }
      h.mid = 'END ' + Math.min(st.end + 1, ENDS) + '/' + ENDS; const left = PER - Math.floor(st.thrown / n) - (st.thrown % n > st.turn ? 1 : 0);
      h.turn = '🧀 ' + ctx.players[st.turn].name + ' · ' + Math.max(0, PER - stones.filter((s) => s.own === st.turn && (s.v || s.out)).length) + ' left' + (teams.length > 2 ? ' · ' + teams.map((t) => tname(t).slice(0, 7) + ' ' + st.tot[t]).join(' · ') : ''); void left;
      h.tip = st.turn === ctx.me && st.phase === 'aim' ? 'SWIPE UP to slide · bend it to curl' : st.phase === 'slide' && st.cur >= 0 && stones[st.cur].own === ctx.me ? 'TAP TAP TAP to sweep!' : ''; h.meter = st.phase === 'slide' && st.cur >= 0 && stones[st.cur].own === ctx.me ? { v: U.clamp(st.sweep / 0.6, 0, 1), lo: 0, hi: 0 } : null; }
    function startEnd(k) { st.end = k; st.thrown = 0; st.phase = 'intro'; st.t = 0; stones.forEach((s) => { s.v = false; s.mv = false; s.out = false; s.x = 0; s.z = 99; }); st.turn = (st.lead + k) % n; ctx.ev({ t: 'msg', b: 'END ' + (k + 1), s: 'Get your cheese closest to the button!', d: 1600 }); upd(); }
    function nextStone() { const k = st.thrown; if (k >= n * PER) return scoreEnd(); st.turn = (st.lead + st.end + k) % n; st.phase = 'aim'; st.t = 0; st.aim = 0; const p = S.P[st.turn]; p.x = 0.5; p.z = HACK + 0.4; p.ry = Math.PI; p.a = 'idle'; S.P.forEach((q, i) => { if (i !== st.turn) { q.x = -HW - 0.9 - (i % 2) * 0.8; q.z = HACK - 3 - i * 1.2; q.ry = Math.PI / 2 + 0.4; q.a = 'idle'; } }); upd(); }
    function throwStone(i, aim, spd, curl) {
      const idx = stones.findIndex((s) => s.own === i && !s.v && !s.out); if (idx < 0) { st.thrown++; nextStone(); return; }
      const s = stones[idx]; s.v = true; s.mv = true; s.out = false; s.x = 0; s.z = HACK - 1.2; s.vx = Math.sin(aim) * spd; s.vz = -Math.cos(aim) * spd; s.curl = U.clamp(curl, -1, 1); s.sw = true; s.rot = 0;
      st.cur = idx; st.phase = 'slide'; st.t = 0; st.sweep = 0; st.thrown++; E.act(S.P[i], 'bowl'); ctx.ev({ t: 'fx', k: 'roll' }); upd();
    }
    function input(i, ev) {
      if (ev.k === 'assist') return;
      if (st.phase === 'slide' && st.cur >= 0 && stones[st.cur].own === i && (ev.k === 'tap' || ev.k === 'down')) { if (ev.k === 'tap') { st.sweep = Math.min(0.9, st.sweep + 0.32); E.act(S.P[i], 'swing', S.P[i].sd > 0 ? -1 : 1); ctx.ev({ t: 'fx', k: 'swoosh' }); } return; }
      if (i !== st.turn || st.phase !== 'aim' || ev.k !== 'swipe') return;
      const wz = +ev.z || -1, wx = +ev.x || 0, pow = U.clamp(+ev.power || 0.5, 0.05, 1); if (wz > -0.15) return;
      let aim = U.clamp(Math.atan2(wx, -wz) * 0.25, -0.06, 0.06), spd = 2.15 + pow * 1.75; const curl = U.clamp((+ev.curve || 0) * 2.2, -1, 1);
      if (ctx.assist(i)) { const ideal = Math.sqrt(2 * FR * (HACK - 1.2 - TEE)); if (spd < ideal + 0.6) spd = U.lerp(spd, ideal, 0.6); const p = predict(0, Math.sin(aim) * spd, -Math.cos(aim) * spd, curl, false); aim -= U.clamp(p.x / (HACK - TEE), -0.05, 0.05) * 0.8; }
      throwStone(i, aim, spd, curl);
    }
    function cpuThrow() {
      const i = st.turn, d = ctx.D, me = ctx.players[i].team;
      // takeout an enemy stone sitting on the button, otherwise draw to the button
      const enemy = stones.filter((s) => s.v && ctx.players[s.own].team !== me && Math.hypot(s.x, s.z - TEE) < HOUSE).sort((a, b) => Math.hypot(a.x, a.z - TEE) - Math.hypot(b.x, b.z - TEE))[0];
      const mine = stones.filter((s) => s.v && ctx.players[s.own].team === me).map((s) => Math.hypot(s.x, s.z - TEE)).sort((a, b) => a - b)[0];
      const curl = R() < 0.5 ? -0.6 : 0.6; let aim = 0, spd;
      if (enemy && (mine == null || mine > Math.hypot(enemy.x, enemy.z - TEE)) && R() < 0.4 + d.smart * 0.5) { spd = 4.4 + R() * 0.4; aim = Math.atan2(enemy.x, HACK - 1.2 - enemy.z); }
      else { spd = Math.sqrt(2 * FR * (HACK - 1.2 - TEE)); let best = 0, bd = 9; for (let k = -6; k <= 6; k++) { const a = k * 0.006, p = predict(0, Math.sin(a) * spd, -Math.cos(a) * spd, curl, false); const dd = Math.hypot(p.x, p.z - TEE); if (dd < bd) { bd = dd; best = a; } } aim = best; }
      aim += Ph.gauss(R) * (0.002 + d.aim * 0.007); spd *= 1 + Ph.gauss(R) * (0.012 + d.aim * 0.045); throwStone(i, aim, spd, curl);
    }
    function scoreEnd() {
      st.phase = 'scored'; st.t = 0; const ins = stones.filter((s) => s.v && Math.hypot(s.x, s.z - TEE) < HOUSE + SR).map((s) => ({ s, d: Math.hypot(s.x, s.z - TEE), t: ctx.players[s.own].team })).sort((a, b) => a.d - b.d);
      let pts = 0, who = -1; if (ins.length) { who = ins[0].t; const other = ins.find((q) => q.t !== who); for (const q of ins) { if (q.t !== who) break; if (!other || q.d < other.d) pts++; } }
      if (who >= 0) { st.tot[who] += pts; ctx.ev({ t: 'msg', b: pts + ' POINT' + (pts > 1 ? 'S' : '') + '!', s: tname(who) + ' wins the end', d: 2000 }); ctx.ev({ t: 'roar', k: 0.9 }); ctx.ev({ t: 'party', x: 0, y: 2, z: TEE, n: 30 + pts * 15 }); ctx.players.forEach((p, i) => { if (p.team === who && ctx.isHuman(i)) ctx.stat(i, 'cheese', pts); }); }
      else ctx.ev({ t: 'msg', b: 'BLANK END', s: 'Nobody in the house', d: 1800 });
      st.endPts.push({ who, pts }); upd();
    }
    function sim(dt) {
      if (st.over) return; st.t += dt;
      if (st.phase === 'intro') { if (st.t > 1.6) nextStone(); return; }
      if (st.phase === 'aim') { if (!ctx.isHuman(st.turn) && st.t > 1.2) cpuThrow(); else if (ctx.isHuman(st.turn) && st.t > 30) throwStone(st.turn, 0, 3.2, 0); upd(); return; }
      if (st.phase === 'slide') {
        st.sweep = Math.max(0, st.sweep - dt * 0.9); const cs = stones[st.cur];
        if (!ctx.isHuman(cs.own) && cs.z > TEE + 1 && Math.hypot(cs.vx, cs.vz) < 1.6 && R() < dt * 4) st.sweep = 0.6;   // CPU sweeps a slow draw
        if (cs.z < TEE - 3) cs.sw = false;
        for (let k = 0; k < 2; k++) step(stones, dt / 2, st.sweep);
        stones.forEach((s) => { if (s.hit) { ctx.ev({ t: 'fx', k: 'thud', a: U.clamp(s.hit / 3, 0.2, 1) }); if (s.hit > 1.2) ctx.ev({ t: 'roar', k: 0.5 }); s.hit = 0; } });
        // thrower glides behind the cheese and sweeps
        const p = S.P[cs.own]; if (cs.v && cs.z > TEE - 2) { const tz = cs.z + 1.0, tx = cs.x + 0.7; p.x += (tx - p.x) * Math.min(1, dt * 5); p.z += (tz - p.z) * Math.min(1, dt * 5); p.ry = Math.PI; if (st.sweep > 0.05 && p.at > 0.18) E.act(p, 'swing', p.sd > 0 ? -1 : 1); }
        if (cs.v && !cs.mv && cs.z > HOG && !moving(stones)) { cs.v = false; cs.out = true; ctx.ev({ t: 'hint', b: 'Didn\u2019t pass the hog line - cheese removed', d: 1500 }); }
        if (!moving(stones) || st.t > 25) { stones.forEach((s) => { s.mv = false; }); const d0 = cs.v ? Math.hypot(cs.x, cs.z - TEE) : 99; if (d0 < 0.45) { ctx.ev({ t: 'msg', b: 'ON THE BUTTON!', s: ctx.players[cs.own].name, d: 1200 }); ctx.ev({ t: 'fx', k: 'perfect' }); if (ctx.isHuman(cs.own)) ctx.stat(cs.own, 'button'); } st.phase = 'wait'; st.t = 0; }
        upd(); return;
      }
      if (st.phase === 'wait' && st.t > 1.0) { nextStone(); return; }
      if (st.phase === 'scored' && st.t > 2.6) { if (st.end + 1 >= ENDS) return finish(); startEnd(st.end + 1); }
    }
    function finish() {
      st.over = true; st.phase = 'over'; const mx = Math.max(...teams.map((t) => st.tot[t])), w = teams.filter((t) => st.tot[t] === mx); const win = w.length === 1 ? w[0] : -1;
      const score = {}; ctx.players.forEach((p, i) => { score[i] = st.tot[p.team]; }); ctx.ev({ t: 'roar', k: 1 });
      ctx.end({ win, title: win < 0 ? "It's a tie!" : tname(win) + ' wins ' + teams.map((t) => st.tot[t]).join('-') + '!', lines: [st.endPts.map((e, k) => 'End ' + (k + 1) + ': ' + (e.who < 0 ? 'blank' : tname(e.who) + ' +' + e.pts)).join(' · ')], score, scoreLabel: 'points' });
    }
    /* ---------------- view ---------------- */
    let sms = [], aimDots = [], sweepFx = null;
    const COLS = ['#facc15', '#fb923c', '#fde68a', '#f472b6'];
    function build() {
      sheet(); E.makeModels('broom', { tags: false, ring: false });
      stones.forEach((s) => { const b = new M.B(), c = COLS[s.own % 4];
        b.cyl(SR, SR * 0.96, 0.22, c, 0, 0.11, 0, 0, 0, 0, 'gloss', 24); b.cyl(SR * 1.01, SR * 1.01, 0.05, M.darker(c, 0.25), 0, 0.2, 0, 0, 0, 0, null, 24);   // wheel + rind
        for (let k = 0; k < 6; k++) { const a = k * 1.1, r = 0.08 + (k % 3) * 0.06; b.cyl(0.028 + (k % 2) * 0.012, 0.028, 0.02, M.darker(c, 0.35), Math.sin(a) * r, 0.225, Math.cos(a) * r, 0, 0, 0, null, 10); }
        b.cyl(0.035, 0.035, 0.12, '#1f2937', 0, 0.28, 0, 0, 0, 0, null, 8); b.cap(0.035, 0.18, '#1f2937', 0.06, 0.34, 0, 0, 0, Math.PI / 2);   // handle
        const m = b.group(true); V.world.add(m); sms.push(m); });
      for (let k = 0; k < 24; k++) { const d = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 })); d.visible = false; V.world.add(d); aimDots.push(d); }
      sweepFx = new T.Mesh(new T.TorusGeometry(SR * 1.5, 0.03, 6, 28), new T.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.7 })); sweepFx.rotation.x = -Math.PI / 2; V.world.add(sweepFx);
      V.env(ST.ENV); startEnd(0);
    }
    function view(dt) {
      E.syncModels(dt); stones.forEach((s, i) => { const m = sms[i]; m.visible = s.v; if (s.v) { m.position.set(s.x, 0, s.z); m.rotation.y = s.rot || 0; } });
      const cs = stones[st.cur]; sweepFx.visible = st.phase === 'slide' && !!cs && cs.v && st.sweep > 0.05; if (sweepFx.visible) { sweepFx.position.set(cs.x, 0.02, cs.z - 0.55); sweepFx.scale.setScalar(0.8 + st.sweep * 0.6); }
      aimDots.forEach((d) => { d.visible = false; });
      if (st.phase === 'aim' && st.turn === ctx.me && ctx.assist(st.turn)) { const spd = Math.sqrt(2 * FR * (HACK - 1.2 - TEE)); for (let k = 0; k < aimDots.length; k++) { const z = HACK - 2 - k * ((HACK - TEE - 1) / aimDots.length); aimDots[k].visible = true; aimDots[k].position.set(0, 0.04, z); } void spd; }
    }
    function cam(dt, snap) {
      E.fov(56); const cs = stones[st.cur];
      if (st.phase === 'slide' && cs && cs.v) { E.camLook(cs.x * 0.5, 3.4, cs.z + 5.2, cs.x * 0.5, 0, cs.z - 3.5, dt, 4, snap); return; }
      if (st.phase === 'scored' || st.phase === 'wait' || st.phase === 'intro') { E.camLook(0, 8.5, TEE + 3.8, 0, 0, TEE - 0.2, dt, 2.5, snap); return; }
      E.camLook(0, 3.2, HACK + 4.2, 0, 0, TEE + 3, dt, 3, snap);
    }
    function localInput(ev) { void ev; }
    const sync = { get: () => ({ ph: st.phase, tu: st.turn, cu: st.cur, sw: Math.round(st.sweep * 100) / 100, tot: st.tot, th: st.thrown }), set: (v) => { st.phase = String(v.ph); st.turn = v.tu | 0; st.cur = v.cu | 0; st.sweep = +v.sw || 0; if (v.tot && typeof v.tot === 'object') st.tot = v.tot; st.thrown = v.th | 0; } };
    return { S, build, sim, input, view, cam, st, joy: false, sync, localInput, stones, cpuThrow, throwStone };
  };
  SP.Sports.curling.rec = { '4': { n: 'Points in a 4-end game' }, '2': { n: 'Points in a 2-end game' } };
  function sheet() {
    ST.venue(HW * 2 + 4, (HACK - BACK) + 6, { gap: 3, jumbo: [0, 11, BACK - 14, 0] });
    const b = new M.B(), L = HACK - BACK + 3, cz = (HACK + 1.5 + BACK - 1.5) / 2;
    b.box(HW * 2, 0.1, L, 0, '#eef7ff', 0, -0.05, cz, 0, 0, 0, 'gloss');
    // the house: cheese-coloured rings, the button, tee/centre/hog/back lines
    [[HOUSE, '#2563eb'], [1.22, '#f8fafc'], [0.61, '#f59e0b'], [0.15, '#f8fafc']].forEach((q) => { const g = new T.CircleGeometry(q[0], 40); g.rotateX(-Math.PI / 2); b.geo(g, q[1], 0, 0.004 + (2 - q[0]) * 0.001, TEE); });
    const g2 = new T.CircleGeometry(HOUSE, 40); g2.rotateX(-Math.PI / 2); b.geo(g2, '#2563eb', 0, 0.003, HACK - 1.5);
    const g3 = new T.CircleGeometry(0.61, 30); g3.rotateX(-Math.PI / 2); b.geo(g3, '#f59e0b', 0, 0.005, HACK - 1.5);
    b.box(0.04, 0.012, L - 1, 0, '#64748b', 0, 0.006, cz); [TEE, HACK - 1.5].forEach((z) => b.box(HW * 2, 0.012, 0.04, 0, '#64748b', 0, 0.007, z));
    [HOG, HACK - 8].forEach((z) => b.box(HW * 2, 0.012, 0.14, 0, '#dc2626', 0, 0.007, z)); b.box(HW * 2, 0.012, 0.04, 0, '#1e293b', 0, 0.007, BACK);
    b.box(0.5, 0.06, 0.25, 0.02, '#111827', 0, 0.03, HACK + 0.1);   // hack
    // side bumpers + end boards with cheese wedge ads
    [-1, 1].forEach((k) => b.box(0.18, 0.26, L, 0.05, '#f8fafc', k * (HW + 0.09), 0.13, cz)); b.box(HW * 2 + 0.36, 0.5, 0.2, 0.05, '#1e3a8a', 0, 0.25, BACK - 1.5); b.box(HW * 2 + 0.36, 0.5, 0.2, 0.05, '#1e3a8a', 0, 0.25, HACK + 1.6);
    for (let i = 0; i < 4; i++) { const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0.9, 0); sh.lineTo(0, 0.55); sh.lineTo(0, 0); const wg = new T.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); b.geo(wg, '#facc15', -HW + 0.3 + i * 1.25, 0.5, BACK - 1.75); }
    const m = b.group(true); m.traverse((q) => { if (q.isMesh) q.receiveShadow = true; }); VN.add(m);
    // giant cheese wheels stacked by the boards
    const c = new M.B(); [[-HW - 2.2, TEE - 1], [HW + 2.3, TEE + 2], [-HW - 2.4, HACK - 4]].forEach((q, i) => { for (let k = 0; k < 2 + (i % 2); k++) { c.cyl(0.8, 0.8, 0.5, '#facc15', q[0], 0.25 + k * 0.52, q[1], 0, k * 0.4, 0, 'gloss', 24); c.cyl(0.81, 0.81, 0.1, '#d97706', q[0], 0.47 + k * 0.52, q[1], 0, 0, 0, null, 24); } });
    VN.add(c.group(true));
  }
})();

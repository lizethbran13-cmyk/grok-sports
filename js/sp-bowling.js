/* Grok Sports Command - Bowling: 5 or 10 frames, real strike/spare scoring, hook spin, 2D pin physics with chain reactions */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, T = THREE;
  const LW = 1.05, LL = 18.29, GUT = 0.24, BR = 0.109, PR = 0.061, PS = 0.3048, OIL = 11.5;
  const PIN0 = (() => { const a = []; let k = 0; for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) { a.push({ x: (c - r / 2) * PS, z: -LL - r * PS * 0.866, n: ++k }); } return a; })();
  // standard scoring. rolls = [pins...], frames = N. returns {cum:[], marks:[[..]], done}
  function score(rolls, N) {
    const cum = [], marks = []; let i = 0, tot = 0;
    for (let f = 0; f < N; f++) {
      const last = f === N - 1, m = [];
      if (i >= rolls.length) { marks.push(m); continue; }
      if (!last) {
        if (rolls[i] === 10) { m.push('X'); if (rolls[i + 2] != null) { tot += 10 + rolls[i + 1] + rolls[i + 2]; cum.push(tot); } i += 1; }
        else { m.push(rolls[i] ? String(rolls[i]) : '-'); if (rolls[i + 1] != null) { const sp = rolls[i] + rolls[i + 1] === 10; m.push(sp ? '/' : rolls[i + 1] ? String(rolls[i + 1]) : '-'); if (sp) { if (rolls[i + 2] != null) { tot += 10 + rolls[i + 2]; cum.push(tot); } } else { tot += rolls[i] + rolls[i + 1]; cum.push(tot); } } i += 2; }
      } else {
        const a = rolls[i], b = rolls[i + 1], c = rolls[i + 2];
        m.push(a === 10 ? 'X' : a ? String(a) : '-');
        if (b != null) m.push(a === 10 ? (b === 10 ? 'X' : b ? String(b) : '-') : (a + b === 10 ? '/' : b ? String(b) : '-'));
        if (c != null) m.push(c === 10 && (a === 10 && (b === 10 || a + b === 20) || a + b === 10) ? 'X' : (a === 10 && b !== 10 && b + c === 10) ? '/' : c ? String(c) : '-');
        const need = a === 10 || (b != null && a + b === 10) ? 3 : 2, have = [a, b, c].filter((v) => v != null).length;
        if (have >= need) { tot += a + (b || 0) + (need === 3 ? c || 0 : 0); cum.push(tot); }
        i += 3;
      }
      marks.push(m);
    }
    return { cum, marks, total: tot };
  }
  function frameDone(rolls, N) { // is the player's current frame finished? returns {frame, ball, done}
    let i = 0, f = 0;
    while (f < N - 1 && i < rolls.length) { if (rolls[i] === 10) { i++; f++; } else if (i + 1 < rolls.length) { i += 2; f++; } else return { frame: f, ball: 1, standing: 10 - rolls[i] }; }
    if (f < N - 1) return { frame: f, ball: 0, standing: 10 };
    const r = rolls.slice(i), a = r[0], b = r[1];
    if (r.length === 0) return { frame: f, ball: 0, standing: 10 };
    if (r.length === 1) return { frame: f, ball: 1, standing: a === 10 ? 10 : 10 - a };
    if (r.length === 2) { if (a === 10 || a + b === 10) return { frame: f, ball: 2, standing: a === 10 && b !== 10 ? 10 - b : 10 }; return { frame: f, done: true }; }
    return { frame: f, done: true };
  }
  const KB = { down: 0.06, e: 0.4, kv: 1.1, mv: 1.3, fr: 3 };
  SP.Bowling = { score, frameDone, KB };

  SP.Sports.bowling = function (ctx) {
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length, N = ctx.mode.id === 'full' ? 10 : 5;
    const ball = { x: 0, y: BR, z: 0.3, vx: 0, vy: 0, vz: 0, v: true, spin: 0, gut: false }; S.O.push(ball);
    const pins = PIN0.map((p) => ({ x: p.x, y: 0, z: p.z, vx: 0, vz: 0, rx: 0, ry: 0, rz: 0, v: true, down: false, tilt: 0, hit: false, home: p })); pins.forEach((p) => S.O.push(p));
    const st = { turn: 0, phase: 'aim', t: 0, posX: 0, rolls: ctx.players.map(() => []), over: false, standingBefore: 10 };
    ctx.players.forEach(() => S.P.push({ x: 0, y: 0, z: 1.2, ry: Math.PI, a: 'idle', at: 0, sd: 1, hid: true, notag: true }));
    function rack(full) { pins.forEach((p) => { if (full || !p.down) { if (full) { p.down = false; p.v = true; } p.x = p.home.x; p.z = p.home.z; p.vx = p.vz = 0; p.tilt = 0; p.rx = p.rz = 0; p.hit = false; } if (!full && p.down) { p.v = false; } }); }
    function setup() {
      const fd = frameDone(st.rolls[st.turn], N);
      if (fd.ball === 0 || fd.standing === 10) rack(true); else pins.forEach((p) => { if (p.down) { p.v = false; p.x = 99; } else { p.x = p.home.x; p.z = p.home.z; p.vx = p.vz = 0; p.tilt = 0; p.hit = false; } });
      st.standingBefore = pins.filter((p) => !p.down).length;
      st.phase = 'aim'; st.t = 0; ball.x = st.posX = ctx.isHuman(st.turn) ? (st.lastX && st.lastX[st.turn] != null ? st.lastX[st.turn] : 0.12) : 0.12; ball.z = 0.3; ball.y = BR; ball.vx = ball.vz = 0; ball.gut = false; ball.v = true; ball.spin = 0;
      S.P.forEach((p, i) => { p.hid = i !== st.turn; p.x = ball.x + 0.25; p.z = 1.6; p.ry = Math.PI; p.a = 'idle'; });
      upd();
    }
    function sheet(i) { const s = score(st.rolls[i], N); return s.marks.map((m, f) => (m.join('') || '·') ).join(' ') + ' = ' + s.total; }
    function upd() { const h = S.hud, me = st.turn, fd = frameDone(st.rolls[me], N); h.solo = n !== 2; const sc = (i) => score(st.rolls[i], N).total;
      if (n === 2) { h.l = ctx.players[0].name; h.r = ctx.players[1].name; h.ls = sc(0); h.rs = sc(1); } else { h.l = ctx.players[me].name; h.ls = sc(me); h.r = ''; h.rs = ''; }
      h.mid = 'FRAME ' + Math.min(N, (fd.frame || 0) + 1) + '/' + N + (fd.ball ? ' · BALL ' + (fd.ball + 1) : '');
      h.turn = '🎳 ' + ctx.players[me].name + ': ' + sheet(me);
      h.tip = me === ctx.me && st.phase === 'aim' ? 'Drag ↔ to move · SWIPE UP to roll · curve it for spin' : ''; S.x.sheet = ctx.players.map((p, i) => [p.name, score(st.rolls[i], N)]); }
    function input(i, ev) {
      if (i !== st.turn || st.phase !== 'aim') return;
      if (ev.k === 'drag') { if (Math.abs(ev.dx) > Math.abs(ev.dy) * 1.6 && Math.abs(ev.dy) < 0.06) { if (st.dragX0 == null) st.dragX0 = st.posX; st.posX = U.clamp(st.dragX0 + ev.dx * 1.4, -LW / 2 + 0.12, LW / 2 - 0.12); ball.x = st.posX; S.P[i].x = ball.x + 0.25; } return; }
      if (ev.k === 'up') { st.dragX0 = null; return; }
      if (ev.k === 'move') { return; }
      if (ev.k === 'swipe') {
        const up = -(ev.uy == null ? -1 : ev.uy); if (up < 0.5) return;
        const ang = U.clamp((ev.ux || 0) / Math.max(0.4, up), -1, 1) * 0.11, pow = U.clamp(ev.power == null ? 0.6 : ev.power, 0.15, 1), spin = U.clamp(-(ev.curve || 0) * 1.6, -1, 1);
        let a = ang; if (ctx.assist(i)) { const want = aimFor(ball.x, spin, 6.5 + pow * 3.5); a = U.lerp(ang, want, 0.45); }
        st.dragX0 = null; roll(i, a, 6.5 + pow * 3.5, spin);
      }
      if (ev.k === 'tap' && ctx.assist(i)) roll(i, aimFor(ball.x, 0.3, 8), 8, 0.3);
    }
    // angle that sends the ball into the 1-3 pocket given a hook
    function hookDx(spin, spd) { const tt = (LL - OIL) / spd; return 0.5 * spin * 1.25 * tt * tt; }
    function aimFor(x, spin, spd) { return Math.atan2(0.08 - hookDx(spin, spd || 8) - x, LL); }
    function roll(i, ang, spd, spin) {
      if (st.phase !== 'aim') return; st.phase = 'roll'; st.t = 0; ball.vx = Math.sin(ang) * spd; ball.vz = -Math.cos(ang) * spd; ball.spin = spin; ball.gut = false; st.lastX = st.lastX || {}; st.lastX[i] = st.posX;
      E.act(S.P[i], 'bowl'); ctx.ev({ t: 'fx', k: 'roll', a: 0.6 }); upd(); pins.forEach((p) => { p.hit = false; });
    }
    function sim(dt) {
      if (st.over) return; st.t += dt;
      if (st.phase === 'aim') { const p = S.P[st.turn]; if (!ctx.isHuman(st.turn) && st.t > 1.4) cpuRoll(); if (ctx.isHuman(st.turn) && st.t > 25) roll(st.turn, aimFor(ball.x, 0, 7.5), 7.5, 0); p.x = ball.x + 0.25; upd(); return; }
      if (st.phase === 'roll' || st.phase === 'settle') {
        const sub = 4, h = dt / sub; for (let k = 0; k < sub; k++) physics(h);
        if (st.phase === 'roll' && (ball.z < -LL - 1.6 || st.t > 6)) { st.phase = 'settle'; st.t = 0; }
        if (st.phase === 'settle' && st.t > 1.8) count();
        return;
      }
      if (st.phase === 'show' && st.t > 1.7) next();
    }
    function physics(h) {
      // ball
      if (ball.z > -LL - 1.8) {
        if (!ball.gut) { if (ball.z < -OIL) ball.vx += ball.spin * 1.25 * h; if (Math.abs(ball.x) > LW / 2 && ball.z > -LL + 0.3) { ball.gut = true; ball.x = Math.sign(ball.x) * (LW / 2 + GUT / 2); ball.vx = 0; ctx.ev({ t: 'fx', k: 'thunk', a: 0.4 }); if (ctx.isHuman(st.turn)) ctx.ev({ t: 'hint', b: 'Gutter ball!', d: 800 }); } }
        ball.x += ball.vx * h; ball.z += ball.vz * h; ball.vz *= Math.exp(-0.03 * h); ball.rx = (ball.rx || 0) + ball.vz * h / BR;
      }
      // ball vs pins
      if (!ball.gut || ball.z < -LL - 0.2) for (const p of pins) { if (!p.v) continue; const dx = p.x - ball.x, dz = p.z - ball.z, d = Math.hypot(dx, dz), rr = BR + PR; if (d < rr && d > 1e-4) { const nx = dx / d, nz = dz / d, rv = (ball.vx - p.vx) * nx + (ball.vz - p.vz) * nz; if (rv > 0) { const mb = 7, mp = 1.5, j = (1 + 0.7) * rv / (1 / mb + 1 / mp); ball.vx -= j / mb * nx; ball.vz -= j / mb * nz; p.vx += j / mp * nx; p.vz += j / mp * nz; knock(p, 1); } const o = rr - d; p.x += nx * o; p.z += nz * o; } }
      // pin vs pin
      for (let a = 0; a < pins.length; a++) { const p = pins[a]; if (!p.v) continue; for (let b = a + 1; b < pins.length; b++) { const q = pins[b]; if (!q.v) continue; const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), rr = PR * 2 + (p.down || q.down ? KB.down : 0); if (d < rr && d > 1e-4) { const nx = dx / d, nz = dz / d, rv = (p.vx - q.vx) * nx + (p.vz - q.vz) * nz; if (rv > 0.05) { const j = (1 + KB.e) * rv / 2; p.vx -= j * nx; p.vz -= j * nz; q.vx += j * nx; q.vz += j * nz; if (rv > KB.kv) { knock(p, rv); knock(q, rv); } } const o = (rr - d) / 2; p.x -= nx * o; p.z -= nz * o; q.x += nx * o; q.z += nz * o; } } }
      // pins move, fall, bounce off side walls (kickbacks) and fall into the pit
      for (const p of pins) { if (!p.v) continue; p.x += p.vx * h; p.z += p.vz * h; const f = Math.exp(-(p.down ? KB.fr : 3.5) * h); p.vx *= f; p.vz *= f;
        if (Math.abs(p.x) > LW / 2 + GUT) { p.x = Math.sign(p.x) * (LW / 2 + GUT); p.vx *= -0.6; }
        if (!p.down && Math.hypot(p.vx, p.vz) > KB.mv) knock(p, 1);
        if (!p.down && Math.abs(p.x) > LW / 2 + 0.02) knock(p, 1);
        if (p.down) { p.tilt = Math.min(Math.PI / 2, p.tilt + h * 9); }
        if (p.z < -LL - 1.4) { p.vz = Math.abs(p.vz) * 0.2; p.z = -LL - 1.4; } }
    }
    function knock(p, k) { if (p.down) return; p.down = true; p.fall = Math.atan2(p.vx || (R() - 0.5), p.vz || -1); if (!st.clack || st.t - st.clack > 0.08) { st.clack = st.t; ctx.ev({ t: 'fx', k: 'pins', a: U.clamp(k, 0.3, 1) }); } }
    function count() {
      const down = pins.filter((p) => p.v && p.down).length; const knocked = Math.min(down, st.standingBefore);
      const r = st.rolls[st.turn]; r.push(knocked); st.phase = 'show'; st.t = 0;
      const fd0 = frameDone(r.slice(0, -1), N), wasFirst = fd0.ball === 0 || (fd0.frame === N - 1 && (fd0.standing === 10));
      let msg = knocked + (knocked === 1 ? ' PIN' : ' PINS'), sub = '';
      if (knocked === 10 && wasFirst && st.standingBefore === 10) { msg = 'STRIKE!'; ctx.ev({ t: 'party', x: 0, y: 1.5, z: -LL, n: 50 }); ctx.ev({ t: 'roar', k: 1 }); if (ctx.isHuman(st.turn)) ctx.stat(st.turn, 'strike'); }
      else if (knocked === st.standingBefore && st.standingBefore < 10) { msg = 'SPARE!'; ctx.ev({ t: 'roar', k: 0.7 }); ctx.ev({ t: 'fx', k: 'win' }); if (ctx.isHuman(st.turn)) ctx.stat(st.turn, 'spare'); }
      else if (knocked === 0) { msg = ball.gut ? 'GUTTER' : 'MISS'; }
      else { const left = pins.filter((p) => !p.down).map((p) => p.home.n); if (left.length === 2 && Math.abs(PIN0[left[0] - 1].x - PIN0[left[1] - 1].x) > PS * 1.5) sub = 'Split!'; }
      ctx.ev({ t: 'msg', b: msg, s: sub || ctx.players[st.turn].name, d: 1400 }); upd();
    }
    function next() {
      const fd = frameDone(st.rolls[st.turn], N);
      if (fd.done || fd.ball === 0) { // frame finished: next bowler
        let t = st.turn; for (let k = 0; k < n; k++) { t = (t + 1) % n; if (!frameDone(st.rolls[t], N).done) break; }
        if (ctx.players.every((p, i) => frameDone(st.rolls[i], N).done)) return finish();
        st.turn = t;
      }
      setup();
      if (st.turn === ctx.me && frameDone(st.rolls[st.turn], N).ball === 0 && st.rolls[st.turn].length === 0) ctx.ev({ t: 'msg', b: 'YOUR TURN!', s: 'Drag to move, swipe up to roll', d: 1500 });
    }
    function cpuRoll() {
      const d = ctx.D, standing = pins.filter((p) => !p.down);
      let tx = 0.08, x0 = 0.12, spin = 0.25 + d.smart * 0.35;
      if (standing.length < 10 && standing.length) { // spare: aim at the middle of what is left, little spin
        const cx = standing.reduce((s, p) => s + p.home.x, 0) / standing.length; tx = cx; spin = 0; x0 = U.clamp(-cx * 0.6, -0.35, 0.35); }
      ball.x = st.posX = x0; S.P[st.turn].x = x0 + 0.25;
      const spd = 7.6 + d.power * 1.2, want = Math.atan2(tx - hookDx(spin, spd) - x0, LL), err = Ph.gauss(R) * (0.002 + Math.pow(d.aim, 1.3) * 0.014);
      roll(st.turn, want + err, spd + Ph.gauss(R) * 0.3, U.clamp(spin + Ph.gauss(R) * d.aim * 0.15, -1, 1));
    }
    function finish() {
      st.over = true; st.phase = 'over'; const tot = ctx.players.map((p, i) => score(st.rolls[i], N).total), mx = Math.max(...tot), w = tot.map((t, i) => i).filter((i) => tot[i] === mx);
      let win = w.length === 1 ? ctx.players[w[0]].team : -1; if (ctx.cfg.teamUp) { const tt = [0, 0]; ctx.players.forEach((p, i) => { tt[p.team] += tot[i]; }); win = tt[0] > tt[1] ? 0 : tt[1] > tt[0] ? 1 : -1; }
      const score2 = {}; tot.forEach((t, i) => { score2[i] = t; }); ctx.ev({ t: 'roar', k: 1 });
      ctx.end({ win, title: win < 0 ? "It's a tie!" : ctx.players[w[0]].name + ' wins with ' + mx + '!', lines: ctx.players.map((p, i) => p.name + ': ' + sheet(i)), score: score2 });
    }
    /* ---- view ---- */
    let bm, pms = [], arrow;
    function build() {
      V.env(VN.ENV.night);
      const b = new M.B(); const lanes = [-3.6, -1.8, 0, 1.8, 3.6];
      lanes.forEach((lx, li) => { b.box(LW, 0.06, LL + 3, 0, li === 2 ? '#e8b980' : '#d6a46c', lx, -0.03, -LL / 2 - 0.6, 0, 0, 0, 'gloss'); [-1, 1].forEach((s) => { b.cyl(GUT / 2, GUT / 2, LL + 2, '#475569', lx + s * (LW / 2 + GUT / 2), -0.1, -LL / 2 - 0.4, Math.PI / 2, 0, 0, null, 10); b.box(0.08, 0.2, LL + 3, 0.02, '#1e293b', lx + s * (LW / 2 + GUT + 0.04), 0.07, -LL / 2 - 0.6); });
        for (let a = 0; a < 7; a++) { const ax = (a - 3) * LW / 8; b.cyl(0, 0.035, 0.12, '#7c2d12', lx + ax, 0.002, -4.6 - Math.abs(a - 3) * 0.3, -Math.PI / 2, 0, 0, null, 3); }
        b.box(LW, 0.012, 0.03, 0, '#ef4444', lx, 0.005, 0); for (let a = 0; a < 5; a++) b.sph(0.025, '#1e293b', lx + (a - 2) * 0.2, 0.0, -2.1, 1, 0.2, 1);
      });
      b.box(10, 0.05, 6, 0, '#334155', 0, -0.05, 3.5); b.box(10, 1.6, 0.6, 0.05, '#0f172a', 0, 0.8, -LL - 1.9); b.box(10, 0.6, 1.4, 0.05, '#7c3aed', 0, 1.9, -LL - 1.1, 0, 0, 0, 'gloss');
      for (let i = 0; i < 6; i++) b.box(0.2, 3, 0.4, 0.05, '#1e1b4b', -4.5 + i * 1.8, 1.5, -LL - 1.5);
      // ball return + rack
      b.box(0.5, 0.5, 1.2, 0.15, '#7c3aed', 0.95, 0.25, 2.2, 0, 0, 0, 'gloss'); b.sph(0.11, '#22d3ee', 0.95, 0.6, 2.0, 1, 1, 1, 0, 0, 0, 'gloss'); b.sph(0.11, '#f472b6', 0.95, 0.6, 2.35, 1, 1, 1, 0, 0, 0, 'gloss');
      // side walls with neon stripes
      [-1, 1].forEach((s) => { b.box(0.3, 5, LL + 10, 0.05, '#1e1b4b', s * 5.2, 2.5, -LL / 2); b.box(0.32, 0.12, LL + 10, 0.05, s > 0 ? '#22d3ee' : '#f472b6', s * 5.15, 3.2, -LL / 2, 0, 0, 0, 'glow'); b.box(0.32, 0.12, LL + 10, 0.05, '#facc15', s * 5.15, 1.2, -LL / 2, 0, 0, 0, 'glow'); });
      b.box(10.6, 0.3, LL + 10, 0, '#110d2e', 0, 5, -LL / 2);
      for (let i = 0; i < 8; i++) b.cyl(0.3, 0.3, 0.06, '#fffbe6', (i % 2 ? 1.8 : -1.8), 4.82, -2 - i * 2.4, 0, 0, 0, 'glow', 12);
      // seats + scorer table behind
      for (let i = 0; i < 4; i++) b.box(0.9, 0.45, 0.6, 0.15, ['#f472b6', '#22d3ee', '#facc15', '#a78bfa'][i], -2.5 + i * 1.6 - 0.8, 0.22, 5.2, 0, 0, 0, 'gloss');
      VN.add(b.group(true));
      const sc = VN.jumbo(0, 3.6, -LL - 1.0, 0, 3.6, 1.6); void sc;
      E.makeModels('none', { tags: false, ring: false });
      bm = M.sportBall('bowl', BR); V.world.add(bm); bm.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      pins.forEach(() => { const m = M.pin(); V.world.add(m); pms.push(m); });
      arrow = new T.Mesh(new T.ConeGeometry(0.06, 0.25, 3), new T.MeshBasicMaterial({ color: '#ffe14d', transparent: true, opacity: 0.85 })); arrow.rotation.x = -Math.PI / 2; V.world.add(arrow);
      setup();
    }
    function view(dt) {
      E.syncModels(dt); bm.position.set(ball.x, ball.gut ? BR * 0.4 : BR, ball.z); bm.rotation.x = ball.rx || 0; bm.visible = ball.z > -LL - 1.7;
      pins.forEach((p, i) => { const m = pms[i]; m.visible = p.v; if (!p.v) return; m.position.set(p.x, 0, p.z); m.rotation.set(0, 0, 0); if (p.tilt > 0) { m.rotation.order = 'YXZ'; m.rotation.y = p.fall || 0; m.rotation.x = -p.tilt; m.position.y = Math.sin(p.tilt) * 0.06; } });
      arrow.visible = st.phase === 'aim' && st.turn === ctx.me; if (arrow.visible) arrow.position.set(ball.x, 0.05, ball.z - 0.6 - Math.abs(Math.sin(V.t * 3)) * 0.2);
      const fd = S.x.sheet; if (fd && VN.boards) { const me = st.turn; VN.drawScore('GROK BOWL', fd[0] ? fd[0][1].total : 0, fd[1] ? fd[1][1].total : '', fd[0] ? fd[0][0] : '', fd[1] ? fd[1][0] : '', 'Frame ' + Math.min(N, (frameDone(st.rolls[me] || [], N).frame || 0) + 1)); }
    }
    function cam(dt, snap) {
      E.fov(52);
      if (st.phase === 'aim') E.camLook(ball.x * 0.4, 2.3, 3.9, ball.x * 0.15, 0.2, -LL * 0.7, dt, 4, snap);
      else if (st.phase === 'roll' && ball.z > -LL + 5) E.camLook(ball.x * 0.6, 1.4, ball.z + 3.0, ball.x * 0.3, 0.2, ball.z - 6, dt, 6, snap);
      else E.camLook(0, 1.3, -LL + 3.6, 0, 0.15, -LL - 0.4, dt, 3.5, snap);
    }
    return { S, build, sim, input, view, cam, st, joy: false, roll, pins, ball, cpuRoll };
  };
  SP.Sports.bowling.rec = { quick: { n: 'Best 5-frame score' }, full: { n: 'Best game' } };
})();

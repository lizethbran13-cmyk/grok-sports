/* Grok Sports Command - Mini Golf: 9 holes (windmill, bumpers, slopes, water, castle), slingshot putting, stroke play */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, T = THREE;
  const BR = 0.075, CUP = 0.15, FR = 1.25, MAXV = 9.2, MAXS = 6, SC = 1.8;
  const P2 = (pts) => pts.map((p) => ({ x: p[0], z: p[1] }));
  // hole: outline polygon, tee, cup, par, extra walls [x1,z1,x2,z2], bumpers [x,z,r], water rects [x0,z0,x1,z1], slopes [x0,z0,x1,z1,fx,fz], mill {x,z}, mound {x,z,r,k}
  const HOLES = [
    { n: 'Warm Up', par: 2, poly: [[-0.8, 0.5], [0.8, 0.5], [0.8, -8], [-0.8, -8]], tee: [0, 0], cup: [0, -7.2] },
    { n: 'Dogleg', par: 2, poly: [[-0.8, 0.5], [0.8, 0.5], [0.8, -4.2], [4.5, -4.2], [4.5, -6.2], [-0.8, -6.2]], tee: [0, 0], cup: [3.8, -5.2], walls: [[2.2, -4.2, 2.2, -5.0]] },
    { n: 'Pinball', par: 3, poly: [[-1.4, 0.5], [1.4, 0.5], [1.4, -9], [-1.4, -9]], tee: [0, 0], cup: [0.6, -8.3], bump: [[0, -3, 0.3], [-0.7, -5, 0.25], [0.7, -5, 0.25], [0, -6.8, 0.3]] },
    { n: 'Windmill', par: 3, poly: [[-1, 0.5], [1, 0.5], [1, -10], [-1, -10]], tee: [0, 0], cup: [0, -9.2], mill: { x: 0, z: -5 }, walls: [[-1, -5, -0.22, -5], [0.22, -5, 1, -5]] },
    { n: 'Sideways Hill', par: 2, poly: [[-1.6, 0.5], [1.6, 0.5], [1.6, -8], [-1.6, -8]], tee: [-0.9, 0], cup: [1.0, -7.2], slope: [[-1.6, -6, 1.6, -2, -1.4, 0]] },
    { n: 'Lake Jump', par: 3, poly: [[-2, 0.5], [2, 0.5], [2, -9], [-2, -9]], tee: [0, 0], cup: [-1.2, -8.2], water: [[-2, -6, 1.1, -3]], walls: [[1.1, -3, 1.1, -6]] },
    { n: 'Zig Zag', par: 3, poly: [[-0.8, 0.5], [0.8, 0.5], [0.8, -3], [3.6, -3], [3.6, -8.5], [2, -8.5], [2, -4.6], [-0.8, -4.6]], tee: [0, 0], cup: [2.8, -7.8], bump: [[2.8, -5.8, 0.22]] },
    { n: 'Volcano', par: 2, poly: [[-1.8, 0.5], [1.8, 0.5], [1.8, -8], [-1.8, -8]], tee: [0, 0], cup: [0, -5.6], mound: { x: 0, z: -5.6, r: 1.4, k: 1.2 }, bump: [[-1.1, -2.6, 0.25], [1.1, -2.6, 0.25]] },
    { n: 'Grok Castle', par: 3, poly: [[-2.2, 0.5], [2.2, 0.5], [2.2, -10], [-2.2, -10]], tee: [0, 0], cup: [0, -9.2], walls: [[-2.2, -6, -0.3, -6], [0.3, -6, 2.2, -6]], bump: [[-1.2, -3.5, 0.3], [1.2, -3.5, 0.3]], slope: [[-2.2, -8.8, 2.2, -6.2, 0, 0.9]], castle: { x: 0, z: -6 } }
  ];
  // scale every hole up so the lanes fit our chunky athletes
  const prep = (h) => { const sc = (a) => a.map((v) => v * SC); h.poly = h.poly.map(sc); h.tee = sc(h.tee); h.cup = sc(h.cup); if (h.walls) h.walls = h.walls.map(sc); if (h.bump) h.bump = h.bump.map(sc); if (h.water) h.water = h.water.map(sc);
    if (h.slope) h.slope = h.slope.map((q) => [q[0] * SC, q[1] * SC, q[2] * SC, q[3] * SC, q[4], q[5]]); if (h.mill) { h.mill.x *= SC; h.mill.z *= SC; } if (h.mound) { h.mound.x *= SC; h.mound.z *= SC; h.mound.r *= SC; } if (h.castle) { h.castle.x *= SC; h.castle.z *= SC; } (h.extra || []).forEach((q) => { q.x *= SC; q.z *= SC; }); return h; };
  HOLES.forEach(prep);
  const PAR = HOLES.reduce((s, h) => s + h.par, 0);
  // segment list for a hole (outline + extra walls)
  function segs(h) { const s = []; const p = h.poly; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s.push([a[0], a[1], b[0], b[1]]); } (h.walls || []).forEach((w) => s.push(w)); return s; }
  function inPoly(x, z, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function millSegs(h, t) { if (!h.mill) return []; const a0 = t * 1.6, out = []; for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2; out.push([h.mill.x, h.mill.z, h.mill.x + Math.cos(a) * 0.95, h.mill.z, a]); } return out; }
  // one physics step for a ball. returns 'cup' | 'water' | null
  function step(b, h, S0, t, dt) {
    let ax = 0, az = 0;
    (h.slope || []).forEach((s) => { if (b.x > s[0] && b.x < s[2] && b.z > s[1] && b.z < s[3]) { ax += s[4]; az += s[5]; } });
    if (h.mound) { const m = h.mound, dx = b.x - m.x, dz = b.z - m.z, d = Math.hypot(dx, dz); if (d < m.r && d > 0.12) { ax += dx / d * m.k * (1 - d / m.r) * 1.6; az += dz / d * m.k * (1 - d / m.r) * 1.6; } }
    b.vx += ax * dt; b.vz += az * dt; const sp = Math.hypot(b.vx, b.vz);
    if (sp > 0) { const ns = Math.max(0, sp - FR * dt); b.vx *= ns / sp; b.vz *= ns / sp; }
    b.x += b.vx * dt; b.z += b.vz * dt;
    // walls
    const all = S0;
    for (const s of all) collideSeg(b, s[0], s[1], s[2], s[3], 0.78);
    if (h.mill) { // windmill blades block the tunnel when they are down
      const a = (t * 1.6) % (Math.PI / 2); const down = Math.abs(a - Math.PI / 4) > 0.52; if (down && Math.abs(b.x - h.mill.x) < 0.5) collideSeg(b, h.mill.x - 0.42, h.mill.z + 0.08, h.mill.x + 0.42, h.mill.z + 0.08, 0.6);
    }
    (h.bump || []).forEach((c) => { const dx = b.x - c[0], dz = b.z - c[1], d = Math.hypot(dx, dz), rr = c[2] + BR; if (d < rr && d > 1e-4) { const nx = dx / d, nz = dz / d, vn = b.vx * nx + b.vz * nz; b.x = c[0] + nx * rr; b.z = c[1] + nz * rr; if (vn < 0) { b.vx -= 2.1 * vn * nx; b.vz -= 2.1 * vn * nz; b.bump = 1; } } });
    for (const w of (h.water || [])) if (b.x > w[0] && b.x < w[2] && b.z > w[1] && b.z < w[3]) return 'water';
    // cup: slow enough + over the hole
    const dc = Math.hypot(b.x - h.cup[0], b.z - h.cup[1]), s2 = Math.hypot(b.vx, b.vz);
    if (dc < CUP && s2 < 2.4) return 'cup';
    if (dc < CUP * 1.6 && s2 < 2.4) { b.vx += (h.cup[0] - b.x) * 6 * dt; b.vz += (h.cup[1] - b.z) * 6 * dt; } // lip pulls it in a little
    if (!inPoly(b.x, b.z, h.poly)) { b.x = b.lx; b.z = b.lz; b.vx *= -0.5; b.vz *= -0.5; }
    b.lx = b.x; b.lz = b.z;
    return null;
  }
  function collideSeg(b, x1, z1, x2, z2, e) {
    const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz; let t = ((b.x - x1) * dx + (b.z - z1) * dz) / L2; t = U.clamp(t, 0, 1);
    const px = x1 + dx * t, pz = z1 + dz * t, ex = b.x - px, ez = b.z - pz, d = Math.hypot(ex, ez), rr = BR + 0.05;
    if (d < rr && d > 1e-5) { const nx = ex / d, nz = ez / d, vn = b.vx * nx + b.vz * nz; b.x = px + nx * rr; b.z = pz + nz * rr; if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vz -= (1 + e) * vn * nz; b.wall = 1; } }
  }
  // simulate a putt (for CPU planning + assist preview). returns {res, x, z, path}
  function simulate(h, x, z, vx, vz, t0, keepPath) {
    const b = { x, z, vx, vz, lx: x, lz: z }, S0 = segs(h), path = keepPath ? [[x, z]] : null; let t = t0, r = null;
    for (let i = 0; i < 1400; i++) { r = step(b, h, S0, t, 1 / 120); t += 1 / 120; if (path && i % 6 === 0) path.push([b.x, b.z]); if (r) break; if (Math.hypot(b.vx, b.vz) < 0.02 && !h.slope && !h.mound) break; if (Math.hypot(b.vx, b.vz) < 0.01) break; }
    return { res: r, x: b.x, z: b.z, path, t };
  }
  SP.Golf = { HOLES, simulate, PAR, prep, segs };

  SP.Sports.golf = function (ctx, opt) {
    opt = opt || {}; const HOLES_ = opt.holes || HOLES, PAL = Object.assign({ felt: '#22c55e', base: '#7c2d12', wall: '#a16207', rail: '#fde68a', bump: '#ef4444', bump2: '#fde047', glow: false }, opt.pal || {});
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length, NH = opt.nh ? opt.nh(ctx.mode.id) : ctx.mode.id === '3' ? 3 : 9;
    const balls = ctx.players.map(() => ({ x: 0, y: BR, z: 0, vx: 0, vz: 0, v: true, done: false, lx: 0, lz: 0 })); balls.forEach((b) => S.O.push(b));
    const st = { hole: 0, turn: 0, phase: 'intro', t: 0, simT: 0, strokes: ctx.players.map(() => []), cur: ctx.players.map(() => 0), aim: null, over: false };
    ctx.players.forEach(() => S.P.push({ x: 0, y: 0, z: 0, ry: Math.PI, a: 'aimputt', at: 0, sd: 1, pw: 0, notag: true }));
    let H = HOLES_[0], S0 = segs(H);
    function startHole(k) {
      st.hole = k; H = HOLES_[k]; S0 = segs(H); st.phase = 'intro'; st.t = 0; st.cur = ctx.players.map(() => 0);
      balls.forEach((b, i) => { b.x = H.tee[0] + (i - (n - 1) / 2) * 0.3; b.z = H.tee[1]; b.lx = b.x; b.lz = b.z; b.vx = b.vz = 0; b.done = false; b.v = true; b.safe = [b.x, b.z]; });
      st.turn = 0; ctx.ev({ t: 'msg', b: 'HOLE ' + (k + 1), s: H.n + ' · Par ' + H.par, d: 1600 }); S.x.hole = k; drawHole(); upd();
    }
    function totals(i) { return st.strokes[i].reduce((s, v) => s + v, 0) + (st.phase !== 'over' ? st.cur[i] : 0); }
    function upd() { const h = S.hud; h.solo = n !== 2; const me = st.turn;
      if (n === 2) { h.l = ctx.players[0].name; h.r = ctx.players[1].name; h.ls = totals(0); h.rs = totals(1); } else { h.l = ctx.players[me].name; h.ls = totals(me); h.r = ''; h.rs = ''; }
      h.mid = 'HOLE ' + (st.hole + 1) + '/' + NH + ' · PAR ' + H.par; h.turn = '⛳ ' + ctx.players[me].name + ' · stroke ' + (st.cur[me] + 1) + (n > 1 ? ' · ' + ctx.players.map((p, i) => p.name.slice(0, 7) + ' ' + totals(i)).join(' · ') : '');
      h.tip = st.turn === ctx.me && st.phase === 'aim' ? 'PULL BACK anywhere, let go to putt' : ''; h.meter = st.aim && st.turn === ctx.me ? { v: st.aim.pw, lo: 0, hi: 0 } : null; }
    function nextTurn() {
      // next player who is not done; order: whoever is farthest from the cup goes first (golf rule)
      const live = balls.map((b, i) => i).filter((i) => !balls[i].done); if (!live.length) return holeOver();
      live.sort((a, b) => Math.hypot(balls[b].x - H.cup[0], balls[b].z - H.cup[1]) - Math.hypot(balls[a].x - H.cup[0], balls[a].z - H.cup[1]));
      st.turn = live[0]; st.phase = 'aim'; st.t = 0; st.aim = null; upd();
    }
    function holeOver() {
      st.cur.forEach((c, i) => st.strokes[i].push(c)); st.phase = 'hdone'; st.t = 0;
      const line = ctx.players.map((p, i) => p.name + ' ' + st.cur[i]).join(' · '); ctx.ev({ t: 'hint', b: 'Hole ' + (st.hole + 1) + ': ' + line, d: 2000 });
    }
    function input(i, ev) {
      if (i !== st.turn || st.phase !== 'aim') return;
      if (ev.k === 'down') { st.aim = { dx: 0, dy: 0, pw: 0, fx: ev.fx, fz: ev.fz }; return; }
      if (ev.k === 'drag' && st.aim) { const b = E.camBasis ? null : null; void b; st.aim.dx = ev.dx; st.aim.dy = ev.dy; st.aim.pw = U.clamp(Math.hypot(ev.dx, ev.dy) / 0.32, 0, 1); st.aim.basis = ev.basis || st.aim.basis; return; }
      if (ev.k === 'up' && st.aim) { const a = st.aim; a.dx = ev.dx; a.dy = ev.dy; a.pw = U.clamp(Math.hypot(ev.dx, ev.dy) / 0.32, 0, 1); if (a.pw > 0.06) putt(i, -a.dx, -a.dy, a.pw, ev.cam); st.aim = null; return; }
      if (ev.k === 'putt') { putt(i, +ev.sx || 0, +ev.sy || 0, U.clamp(+ev.pw || 0, 0, 1), ev.cam); }
    }
    // screen pull vector -> world direction using the camera basis sent with the input
    function putt(i, sx, sy, pw, cam) {
      const c = cam && isFinite(cam.rx) && isFinite(cam.rz) && isFinite(cam.fx) && isFinite(cam.fz) ? cam : basis(); let wx = c.rx * sx - c.fx * sy, wz = c.rz * sx - c.fz * sy; const l = Math.hypot(wx, wz) || 1; wx /= l; wz /= l;
      const b = balls[i], sp = 0.25 + pw * pw * MAXV; b.vx = wx * sp; b.vz = wz * sp; b.safe = [b.x, b.z]; st.cur[i]++; st.phase = 'roll'; st.t = 0;
      E.act(S.P[i], 'putt'); ctx.ev({ t: 'fx', k: 'thunk', a: 0.3 + pw * 0.5 }); upd();
    }
    function basis() { const b = E.camBasis(); return b; }
    function cpuPutt() {
      const i = st.turn, b = balls[i], d = ctx.D; let best = null;
      const toC = Math.atan2(H.cup[0] - b.x, H.cup[1] - b.z), N = 40 + Math.round(d.smart * 60);
      for (let k = 0; k < N; k++) { const ang = k < 12 ? toC + (k - 6) * 0.03 : R() * Math.PI * 2, sp = 0.4 + R() * MAXV * 0.95;
        const r = simulate(H, b.x, b.z, Math.sin(ang) * sp, Math.cos(ang) * sp, st.simT, false); const dist = r.res === 'cup' ? -1 + sp * 0.01 : r.res === 'water' ? 99 : Math.hypot(r.x - H.cup[0], r.z - H.cup[1]);
        if (!best || dist < best.d) best = { d: dist, ang, sp }; }
      const err = d.aim * 0.085 + 0.004, ang = best.ang + Ph.gauss(R) * err, sp = best.sp * (1 + Ph.gauss(R) * (0.015 + d.aim * 0.09));
      b.vx = Math.sin(ang) * sp; b.vz = Math.cos(ang) * sp; b.safe = [b.x, b.z]; st.cur[i]++; st.phase = 'roll'; st.t = 0; E.act(S.P[i], 'putt'); ctx.ev({ t: 'fx', k: 'thunk', a: 0.5 }); upd();
    }
    function sim(dt) {
      if (st.over) return; st.t += dt; st.simT += dt;
      if (st.phase === 'intro') { if (st.t > 1.8) nextTurn(); return; }
      if (st.phase === 'aim') { const p = S.P[st.turn], b = balls[st.turn]; place(p, b); if (!ctx.isHuman(st.turn) && st.t > 1.1) cpuPutt(); if (ctx.isHuman(st.turn) && st.t > 40) { const a = Math.atan2(H.cup[0] - b.x, H.cup[1] - b.z); b.vx = Math.sin(a) * 2; b.vz = Math.cos(a) * 2; st.cur[st.turn]++; st.phase = 'roll'; st.t = 0; } upd(); return; }
      if (st.phase === 'roll') {
        const b = balls[st.turn]; let r = null; const sub = 4; for (let k = 0; k < sub && !r; k++) r = step(b, H, S0, st.simT + k * dt / sub, dt / sub);
        if (b.wall || b.bump) { ctx.ev({ t: 'fx', k: 'thud', a: 0.25 }); b.wall = b.bump = 0; }
        if (r === 'cup') { b.done = true; b.v = false; const c = st.cur[st.turn]; const nm = c === 1 ? 'HOLE IN ONE!' : c - H.par <= -2 ? 'EAGLE!' : c - H.par === -1 ? 'BIRDIE!' : c === H.par ? 'PAR' : c - H.par === 1 ? 'BOGEY' : '+' + (c - H.par);
          ctx.ev({ t: 'fx', k: 'cup' }); ctx.ev({ t: 'msg', b: nm, s: ctx.players[st.turn].name, d: 1400 }); if (c <= H.par) ctx.ev({ t: 'party', x: H.cup[0], y: 1, z: H.cup[1], n: c === 1 ? 90 : 30 }); E.act(S.P[st.turn], c <= H.par ? 'cheer' : 'idle'); if (ctx.isHuman(st.turn)) { if (c === 1) ctx.stat(st.turn, 'ace'); if (c < H.par) ctx.stat(st.turn, 'birdie'); if (c <= H.par) ctx.stat(st.turn, 'par'); } st.phase = 'wait'; st.t = 0; return; }
        if (r === 'water') { ctx.ev({ t: 'fx', k: 'splash' }); ctx.ev({ t: 'burst', x: b.x, y: 0.1, z: b.z, c: '#7dd3fc', n: 16 }); ctx.ev({ t: 'msg', b: 'SPLASH!', s: '+1 stroke', d: 1100 }); st.cur[st.turn]++; b.x = b.safe[0]; b.z = b.safe[1]; b.lx = b.x; b.lz = b.z; b.vx = b.vz = 0; st.phase = 'wait'; st.t = 0; return; }
        if (Math.hypot(b.vx, b.vz) < 0.03 || st.t > 14) { b.vx = b.vz = 0; st.phase = 'wait'; st.t = 0; }
        upd(); return;
      }
      if (st.phase === 'wait' && st.t > 0.9) {
        const b = balls[st.turn]; if (!b.done && st.cur[st.turn] >= MAXS) { b.done = true; b.v = false; ctx.ev({ t: 'hint', b: 'Max ' + MAXS + ' strokes - picked up', d: 1200 }); st.cur[st.turn] = MAXS + 1 > MAXS ? MAXS : MAXS; }
        nextTurn(); return;
      }
      if (st.phase === 'hdone' && st.t > 2.2) { if (st.hole + 1 >= NH) return finish(); startHole(st.hole + 1); }
    }
    function place(p, b) { const toC = Math.atan2(H.cup[0] - b.x, H.cup[1] - b.z); p.x = b.x + Math.cos(toC) * 0.42; p.z = b.z - Math.sin(toC) * 0.42; S.P.forEach((q, j) => { q.hid = j !== st.turn; }); p.ry = Math.atan2(b.x - p.x, b.z - p.z); p.pw = st.aim ? st.aim.pw : 0; if (st.phase === 'aim' && p.a !== 'putt') p.a = 'aimputt'; }
    function finish() {
      st.over = true; st.phase = 'over'; const tot = ctx.players.map((p, i) => st.strokes[i].reduce((s, v) => s + v, 0)), mn = Math.min(...tot), w = tot.map((t, i) => i).filter((i) => tot[i] === mn);
      const par = HOLES_.slice(0, NH).reduce((s, h) => s + h.par, 0);
      let win = w.length === 1 ? ctx.players[w[0]].team : -1; if (ctx.cfg.teamUp) { const tt = [0, 0]; ctx.players.forEach((p, i) => { tt[p.team] += tot[i]; }); win = tt[0] < tt[1] ? 0 : tt[1] < tt[0] ? 1 : -1; }
      const score = {}; tot.forEach((t, i) => { score[i] = t; }); ctx.ev({ t: 'roar', k: 1 });
      ctx.end({ win, title: win < 0 ? "It's a tie!" : ctx.players[w[0]].name + ' wins with ' + mn + '!', lines: ctx.players.map((p, i) => p.name + ': ' + tot[i] + ' (' + (tot[i] - par >= 0 ? '+' : '') + (tot[i] - par) + ') · ' + st.strokes[i].join(' ')), score, scoreLabel: 'strokes' });
    }
    /* ---------------- view ---------------- */
    let holeG = null, bms = [], aimDots = [], mill = null, flag = null;
    function decor() {
      V.env(VN.ENV.day); VN.ground(400, '#56c060', '#3fa64b', -0.06);
      const b = new M.B();
      // paths, flower beds, rocks, fence, little bridge + pond, castle backdrop, giant golf ball statue
      for (let i = 0; i < 40; i++) { const a = U.hash(i, 3) * Math.PI * 2, r = 12 + U.hash(i, 5) * 12, x = Math.sin(a) * r * 1.1, z = -8 + Math.cos(a) * r; b.sph(0.18 + U.hash(i, 7) * 0.2, ['#f472b6', '#facc15', '#f97316', '#a78bfa', '#ffffff'][i % 5], x, 0.15, z, 1, 0.7, 1, 0, 0, 0, null, 8, 6); b.cyl(0.02, 0.02, 0.3, '#15803d', x, 0.05, z, 0, 0, 0, null, 4); }
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, x = Math.sin(a) * 14, z = -8 + Math.cos(a) * 17; b.sph(0.5 + U.hash(i, 1) * 0.5, '#94a3b8', x, 0.2, z, 1.2, 0.6, 1, 0, a, 0, null, 8, 6); }
      for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, x = Math.sin(a) * 16, z = -8 + Math.cos(a) * 18; b.box(0.08, 0.7, 0.08, 0.02, '#f8fafc', x, 0.35, z); const a2 = (i + 1) / 60 * Math.PI * 2; b.box(0.04, 0.06, Math.hypot(Math.sin(a2) * 16 - x, Math.cos(a2) * 18 - Math.cos(a) * 18) + 0.05, 0.01, '#f8fafc', (x + Math.sin(a2) * 16) / 2, 0.55, (z - 8 + Math.cos(a2) * 18) / 2, 0, Math.atan2(Math.sin(a2) * 16 - x, Math.cos(a2) * 18 - Math.cos(a) * 18), 0); }
      b.sph(1.6, '#ffffff', -10, 1.6, -24, 1, 1, 1, 0, 0, 0, 'gloss', 20, 14); b.cyl(0.4, 0.8, 0.6, '#ef4444', -10, 0.1, -24, 0, 0, 0, null, 16);
      [[-12, -14], [12, -6], [-13, 2], [13, 4], [-6, 8], [7, 8], [0, -27], [-15, -22], [15, -22]].forEach((p, i) => VN.tree(p[0], p[1], 1 + (i % 3) * 0.2, b));
      // castle backdrop
      const cx = 7, cz = -26; b.box(5, 3, 2, 0.1, '#cbd5e1', cx, 1.5, cz); [-2.5, 2.5].forEach((k) => { b.cyl(0.9, 0.9, 4.4, '#e2e8f0', cx + k, 2.2, cz, 0, 0, 0, null, 14); b.geo(new T.ConeGeometry(1.1, 1.6, 14), '#7c3aed', cx + k, 5.2, cz); });
      for (let i = 0; i < 6; i++) b.box(0.5, 0.5, 2.1, 0.05, '#cbd5e1', cx - 2.2 + i * 0.88, 3.2, cz); b.box(1.2, 1.6, 0.1, 0.4, '#7c2d12', cx, 0.8, cz + 1.02);
      VN.add(b.group(true)); VN.clouds(M.low ? 5 : 10, 160, 50);
      VN.flags([[-5, 4], [5, 4], [-6, -22], [11, -21]], 3.2);
      const sg = V.sign('GROK PUTT PARK', 4.6, 1.0, '#16a34a', '#ffffff'); sg.position.set(-4.5, 2.4, -25); V.world.add(sg); const b2 = new M.B(); b2.cyl(0.08, 0.08, 2.0, '#7c2d12', -6.4, 1.0, -25.1, 0, 0, 0, null, 6); b2.cyl(0.08, 0.08, 2.0, '#7c2d12', -2.6, 1.0, -25.1, 0, 0, 0, null, 6); VN.add(b2.group(true));
    }
    function drawHole() {
      if (holeG) { V.world.remove(holeG); holeG.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }
      holeG = new T.Group(); const b = new M.B(), h = H;
      const sh = new T.Shape(); h.poly.forEach((p, i) => (i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1])));
      const g = new T.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); b.geo(g, PAL.felt, 0, 0.01, 0, 0, 0, 0, 1, 1, 1, PAL.glow ? 'gloss' : null);
      // felt base slab + border, walls
      const bg = new T.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }); bg.rotateX(-Math.PI / 2); b.geo(bg, PAL.base, 0, -0.115, 0);
      segs(h).forEach((s) => { const dx = s[2] - s[0], dz = s[3] - s[1], L = Math.hypot(dx, dz); b.box(0.1, 0.2, L + 0.1, 0.03, PAL.wall, (s[0] + s[2]) / 2, 0.07, (s[1] + s[3]) / 2, 0, Math.atan2(dx, dz), 0, 'gloss'); b.box(0.11, 0.025, L + 0.11, 0.005, PAL.rail, (s[0] + s[2]) / 2, 0.21, (s[1] + s[3]) / 2, 0, Math.atan2(dx, dz), 0, PAL.glow ? 'glow' : null); });
      (h.bump || []).forEach((c) => { b.cyl(c[2], c[2], 0.16, PAL.bump, c[0], 0.08, c[1], 0, 0, 0, 'gloss', 20); b.cyl(c[2] * 0.6, c[2] * 0.6, 0.18, PAL.bump2, c[0], 0.09, c[1], 0, 0, 0, PAL.glow ? 'glow' : 'gloss', 16); });
      (h.water || []).forEach((w) => { b.box(w[2] - w[0], 0.02, w[3] - w[1], 0, '#0ea5e9', (w[0] + w[2]) / 2, 0.02, (w[1] + w[3]) / 2, 0, 0, 0, 'gloss'); for (let i = 0; i < 5; i++) b.sph(0.12, '#16a34a', w[0] + 0.4 + U.hash(i, 2) * (w[2] - w[0] - 0.8), 0.03, w[1] + 0.3 + U.hash(i, 6) * (w[3] - w[1] - 0.6), 1.3, 0.15, 1); });
      (h.slope || []).forEach((s) => { const n2 = 5; for (let i = 0; i < n2; i++) { const x = U.lerp(s[0] + 0.4, s[2] - 0.4, (i + 0.5) / n2), z = (s[1] + s[3]) / 2 + Math.sin(i) * 0.6; b.geo(new T.ConeGeometry(0.12, 0.3, 3), '#bbf7d0', x, 0.02, z, Math.PI / 2, Math.atan2(s[4], s[5]) * -1 + Math.PI, 0, 1, 0.12, 1); } b.box(s[2] - s[0], 0.004, s[3] - s[1], 0, '#16a34a', (s[0] + s[2]) / 2, 0.013, (s[1] + s[3]) / 2); });
      if (h.mound) { b.cyl(h.mound.r, h.mound.r, 0.01, '#15803d', h.mound.x, 0.014, h.mound.z, 0, 0, 0, null, 24); b.tor(h.mound.r * 0.6, 0.03, '#f97316', h.mound.x, 0.02, h.mound.z, Math.PI / 2, 0, 0); b.geo(new T.ConeGeometry(0.9, 1.0, 16, 1, true), '#78350f', h.mound.x + 4.6, 0.5, h.mound.z - 1.2); b.cyl(0.32, 0.32, 0.05, '#f97316', h.mound.x + 4.6, 1.0, h.mound.z - 1.2, 0, 0, 0, 'glow', 12); }
      if (h.castle) { const c = h.castle; [-1, 1].forEach((k) => { b.box(1.0, 1.5, 0.6, 0.05, '#cbd5e1', c.x + k * 1.05, 0.75, c.z); b.geo(new T.ConeGeometry(0.65, 0.9, 10), '#e11d48', c.x + k * 1.05, 1.95, c.z); }); b.box(1.1, 0.4, 0.6, 0.05, '#cbd5e1', c.x, 1.3, c.z); }
      // cup + flag
      b.cyl(CUP, CUP, 0.012, '#0b0b0b', h.cup[0], 0.017, h.cup[1], 0, 0, 0, null, 20); b.tor(CUP, 0.008, '#f8fafc', h.cup[0], 0.018, h.cup[1], Math.PI / 2, 0, 0);
      b.box(0.6, 0.02, 0.5, 0.01, '#e5e7eb', h.tee[0], 0.016, h.tee[1]);
      const mg = b.group(true); mg.traverse((m) => { if (m.isMesh) m.receiveShadow = true; }); holeG.add(mg);
      flag = new M.B(); flag.cyl(0.02, 0.02, 2.0, '#f8fafc', 0, 1.0, 0, 0, 0, 0, null, 6); flag.box(0.6, 0.4, 0.01, 0, '#ef4444', 0.3, 1.78, 0); const fg = flag.group(true); fg.position.set(h.cup[0], 0, h.cup[1]); holeG.add(fg);
      const sg = V.sign((st.hole + 1) + ' · ' + h.n + ' · PAR ' + h.par, 2.2, 0.5, '#1e3a8a', '#fde047'); sg.position.set(h.tee[0] - 2.8, 0.8, h.tee[1] + 0.2); sg.rotation.y = 0.5; holeG.add(sg);
      mill = null; if (h.mill) { const w = new M.B(); [-1, 1].forEach((k) => w.box(0.55, 1.6, 1.2, 0.06, '#f8fafc', k * 0.68, 0.8, -0.6)); w.box(1.9, 0.9, 1.2, 0.06, '#f8fafc', 0, 2.05, -0.6); w.box(0.8, 0.5, 1.22, 0.04, '#1e293b', 0, 0.25, -0.6); w.geo(new T.ConeGeometry(1.25, 1.1, 4), '#dc2626', 0, 3.05, -0.6, 0, Math.PI / 4, 0); w.box(0.3, 0.4, 0.05, 0.05, '#7dd3fc', -0.45, 2.05, 0.01, 0, 0, 0, 'glow'); w.box(0.3, 0.4, 0.05, 0.05, '#7dd3fc', 0.45, 2.05, 0.01, 0, 0, 0, 'glow'); const base = w.group(true); base.position.set(h.mill.x, 0, h.mill.z); holeG.add(base);
        const bl = new M.B(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; bl.box(0.3, 1.7, 0.04, 0.03, k % 2 ? '#facc15' : '#3b82f6', Math.sin(a) * 0.9, Math.cos(a) * 0.9, 0, 0, 0, -a); } bl.cyl(0.14, 0.14, 0.14, '#1e293b', 0, 0, 0.02, Math.PI / 2, 0, 0, null, 10); mill = bl.group(true); mill.position.set(h.mill.x, 1.85, h.mill.z + 0.06); holeG.add(mill); }
      if (opt.holeDeco) opt.holeDeco(holeG, h, st.hole);
      V.world.add(holeG);
    }
    function build() {
      if (opt.decor) opt.decor(); else decor(); E.makeModels('putter', { tags: false, ring: false });
      ctx.players.forEach((p, i) => { const m = M.sportBall('golf', BR); const col = ['#ffffff', '#facc15', '#f472b6'][i % 3]; m.traverse((q) => { if (q.isMesh && q.geometry.attributes.color) { const c = new T.Color(col), a = q.geometry.attributes.color; for (let k = 0; k < a.count; k++) a.setXYZ(k, c.r, c.g, c.b); a.needsUpdate = true; } }); V.world.add(m); bms.push(m); });
      for (let k = 0; k < 40; k++) { const d = new T.Mesh(new T.SphereGeometry(0.04, 6, 4), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 })); d.visible = false; V.world.add(d); aimDots.push(d); }
      startHole(0);
    }
    function view(dt) {
      E.syncModels(dt); balls.forEach((b, i) => { bms[i].visible = b.v; bms[i].position.set(b.x, BR + 0.012, b.z); });
      if (mill) mill.rotation.z = -st.simT * 1.6;
      // aim preview: straight dotted line, or full bounce path in Assist
      aimDots.forEach((d) => { d.visible = false; });
      const a = st.aim; if (a && st.turn === ctx.me && a.pw > 0.03) {
        const c = basis(); let wx = c.rx * -a.dx - c.fx * -a.dy, wz = c.rz * -a.dx - c.fz * -a.dy; const l = Math.hypot(wx, wz) || 1; wx /= l; wz /= l; const b = balls[st.turn], sp = 0.25 + a.pw * a.pw * MAXV;
        if (ctx.assist(st.turn)) { const r = simulate(H, b.x, b.z, wx * sp, wz * sp, st.simT, true); const pts = r.path; for (let k = 0; k < aimDots.length && k * 2 < pts.length; k++) { const q = pts[k * 2]; aimDots[k].visible = true; aimDots[k].position.set(q[0], 0.06, q[1]); aimDots[k].material.color.set(r.res === 'cup' ? '#4ade80' : r.res === 'water' ? '#f87171' : '#ffffff'); } }
        else for (let k = 0; k < 14; k++) { aimDots[k].visible = true; aimDots[k].position.set(b.x + wx * (k + 1) * 0.2 * (0.5 + a.pw * 2), 0.06, b.z + wz * (k + 1) * 0.2 * (0.5 + a.pw * 2)); aimDots[k].material.color.set('#ffffff'); }
      }
    }
    function cam(dt, snap) {
      E.fov(55); const b = balls[st.turn] || balls[0];
      if (st.phase === 'intro' || st.phase === 'hdone') { const cx = (H.tee[0] + H.cup[0]) / 2, cz = (H.tee[1] + H.cup[1]) / 2; E.camLook(cx, 14, H.tee[1] + 7, cx, 0, cz - 1, dt, 3, snap); return; }
      const toC = Math.atan2(H.cup[0] - b.x, H.cup[1] - b.z); const dist = Math.min(7, 3.2 + Math.hypot(H.cup[0] - b.x, H.cup[1] - b.z) * 0.35);
      if (st.camRy == null || st.phase === 'aim' && !st.aim) st.camRy = toC;
      E.camLook(b.x - Math.sin(st.camRy) * dist, 3.2 + dist * 0.75, b.z - Math.cos(st.camRy) * dist, b.x + Math.sin(st.camRy) * 2.6, 0, b.z + Math.cos(st.camRy) * 2.6, dt, 3.5, snap);
    }
    // guests: send the putt with the camera basis so the direction matches what they see
    function localInput(ev) { if (ev.k === 'down') st.aim = { dx: 0, dy: 0, pw: 0 }; else if (ev.k === 'drag' && st.aim) { st.aim.dx = ev.dx; st.aim.dy = ev.dy; st.aim.pw = U.clamp(Math.hypot(ev.dx, ev.dy) / 0.32, 0, 1); } else if (ev.k === 'up') st.aim = null; }
    const sync = { get: () => ({ ph: st.phase, tu: st.turn, mt: Math.round(st.simT * 100) / 100, cur: st.cur }), set: (v) => { st.phase = String(v.ph); st.turn = v.tu | 0; st.simT = +v.mt || 0; if (Array.isArray(v.cur)) st.cur = v.cur; } };
    const prepInput = (ev) => { if (ev.k === 'up' || ev.k === 'putt') { const c = E.camBasis(); ev.cam = { rx: c.rx, rz: c.rz, fx: c.fx, fz: c.fz }; } return ev; };
    return { S, build, sim, input, view, cam, st, joy: false, sync, prepInput, balls, cpuPutt, putt, localInput, startHole, holes: HOLES_, onX: (x) => { if (x.hole != null && x.hole !== st.hole) { st.hole = x.hole; H = HOLES_[x.hole]; S0 = segs(H); drawHole(); } } };
  };
  SP.Sports.golf.rec = { '9': { n: 'Best 9-hole score', low: true }, '3': { n: 'Best 3-hole score', low: true } };
})();

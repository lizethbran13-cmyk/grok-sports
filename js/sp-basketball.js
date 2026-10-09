/* Grok Sports Command - Basketball: 3-Point Contest (timed racks, money balls, power meter) + 2v2 half court to 11 */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, T = THREE;
  const RIM = { x: 0, y: 3.05, z: -5.4, r: 0.23 }, BOARD_Z = -5.8, BASE_Z = -7, ARC = 6.75, HW = 7.5, MID_Z = 7, BR = 0.12, G = 9.8;
  const rimPts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; rimPts.push([RIM.x + Math.sin(a) * RIM.r, RIM.z + Math.cos(a) * RIM.r]); }
  // ball physics vs floor, rim, backboard. returns 'make' when it drops through the hoop
  function stepBall(b, dt, ev) {
    const py = b.y; Ph.step(b, dt, G, 0.02);
    if (b.y < BR) { b.y = BR; if (b.vy < -1) { b.vy = -b.vy * 0.72; ev && ev({ t: 'fx', k: 'thud', a: 0.5 }); } else b.vy = 0; b.vx *= 0.985; b.vz *= 0.985; }
    // backboard (z plane, 1.8 wide, 2.9..3.95 high)
    if (b.z - BR < BOARD_Z && b.z > BOARD_Z - 0.3 && Math.abs(b.x) < 0.9 && b.y > 2.9 && b.y < 3.95 && b.vz < 0) { b.z = BOARD_Z + BR; b.vz = -b.vz * 0.55; b.vx *= 0.8; ev && ev({ t: 'fx', k: 'thud', a: 0.6 }); b.rim = (b.rim || 0) + 1; }
    // rim ring
    if (Math.abs(b.y - RIM.y) < BR + 0.03) {
      for (const p of rimPts) { const dx = b.x - p[0], dz = b.z - p[1], dy = b.y - RIM.y, d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d < BR + 0.012 && d > 1e-4) { const nx = dx / d, ny = dy / d, nz = dz / d, vn = b.vx * nx + b.vy * ny + b.vz * nz; if (vn < 0) { b.vx -= 1.55 * vn * nx; b.vy -= 1.55 * vn * ny; b.vz -= 1.55 * vn * nz; b.vx *= 0.8; b.vz *= 0.8; b.x = p[0] + nx * (BR + 0.013); b.y = RIM.y + ny * (BR + 0.013); b.z = p[1] + nz * (BR + 0.013); b.rim = (b.rim || 0) + 1; ev && ev({ t: 'fx', k: 'rim' }); } break; } }
    }
    if (!b.made && py >= RIM.y && b.y < RIM.y && Math.hypot(b.x - RIM.x, b.z - RIM.z) < RIM.r - BR * 0.35) { b.made = true; return 'make'; }
    // walls of the gym
    if (Math.abs(b.x) > HW + 1.5) { b.x = Math.sign(b.x) * (HW + 1.5); b.vx *= -0.5; } if (b.z < BASE_Z - 1.5) { b.z = BASE_Z - 1.5; b.vz *= -0.5; } if (b.z > MID_Z + 3) { b.z = MID_Z + 3; b.vz *= -0.5; }
    return null;
  }
  // velocity to drop into the hoop from (x,y,z) with an offset (miss) and arc
  function shotVel(x, y, z, offX, offZ, arc) {
    const tx = RIM.x + offX, tz = RIM.z + offZ, d = Math.hypot(tx - x, tz - z), t = 0.75 + d * 0.05 + (arc || 0);
    return Ph.solve([x, y, z], [tx, RIM.y + 0.02, tz], t, G, 0.02);
  }
  const pingpong = (t) => { const k = t % 2; return k < 1 ? k : 2 - k; };
  function gym(cam) {
    V.env(VN.ENV.indoor);
    VN.arena(34, 34, 12, { wall: '#7c2d12', trim: '#f97316', floor: '#3f2a1d' });
    VN.field(HW * 2 + 2, 16.5, '#d9a066', { planks: true, gloss: true, y: 0.001 });
    const f = new M.B(); f.box(5.0, 0.012, 5.8, 0, '#c2410c', 0, 0.012, BASE_Z + 2.9); f.cyl(1.8, 1.8, 0.012, '#c2410c', 0, 0.012, BASE_Z + 5.8, 0, 0, 0, null, 32); VN.add(f.group(false));
    const L = VN.rect(-HW, BASE_Z, HW, MID_Z).concat(VN.rect(-2.5, BASE_Z, 2.5, BASE_Z + 5.8), VN.arc(0, BASE_Z + 5.8, 1.8, -Math.PI / 2, Math.PI / 2, 12));
    // 3-point line: corners straight then arc
    const a0 = Math.asin(6.6 / ARC); L.push([-6.6, BASE_Z, -6.6, RIM.z + Math.cos(a0) * ARC], [6.6, BASE_Z, 6.6, RIM.z + Math.cos(a0) * ARC]); VN.arc(RIM.x, RIM.z, ARC, -a0, a0, 28).forEach((s) => L.push(s));
    VN.lines(L, 0.06, '#ffffff', 0.014);
    const b = new M.B();
    b.box(1.8, 1.05, 0.05, 0.02, '#f8fafc', 0, 3.42, BOARD_Z, 0, 0, 0, 'gloss'); b.box(0.59, 0.45, 0.06, 0, '#ef4444', 0, 3.27, BOARD_Z + 0.002); b.box(0.5, 0.36, 0.07, 0, '#f8fafc', 0, 3.27, BOARD_Z + 0.004);
    b.tor(RIM.r, 0.018, '#f97316', RIM.x, RIM.y, RIM.z, Math.PI / 2, 0, 0, 'gloss');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; b.cyl(0.006, 0.006, 0.42, '#f8fafc', RIM.x + Math.sin(a) * RIM.r * 0.8, RIM.y - 0.2, RIM.z + Math.cos(a) * RIM.r * 0.8, Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2, null, 4); }
    b.box(0.1, 0.1, 0.42, 0.02, '#64748b', 0, RIM.y + 0.05, BOARD_Z - 0.2); b.box(0.25, 4.0, 0.25, 0.05, '#1f2937', 0, 2.0, BASE_Z - 0.8); b.box(0.25, 0.25, 1.2, 0.05, '#1f2937', 0, 3.6, BASE_Z - 0.3);
    b.box(1.0, 1.2, 0.5, 0.15, '#f97316', 0, 0.6, BASE_Z - 0.8);
    VN.add(b.group(true));
    VN.stand({ x: 0, z: MID_Z + 5, ry: 0, len: 22, rows: M.low ? 4 : 7, seats: ['#f97316', '#1f2937'], wall: '#431407', seed: 5 });
    VN.stand({ x: -HW - 4, z: 0, ry: -Math.PI / 2, len: 16, rows: M.low ? 4 : 6, seats: ['#f97316', '#1f2937'], wall: '#431407', seed: 6 });
    VN.stand({ x: HW + 4, z: 0, ry: Math.PI / 2, len: 16, rows: M.low ? 4 : 6, seats: ['#f97316', '#1f2937'], wall: '#431407', seed: 7 });
    VN.jumbo(0, 8.5, BASE_Z - 3.5, 0, 7, 3.4);
  }
  function ballMesh() { const m = M.sportBall('basket', BR); m.traverse((q) => { if (q.isMesh) q.castShadow = true; }); V.world.add(m); return m; }

  SP.Sports.basketball = function (ctx) { return ctx.mode.id === '2v2' ? twoVtwo(ctx) : contest(ctx); };
  SP.Sports.basketball.rec = { '3pt': { n: '3-Point Contest score' }, '2v2': { n: 'Points scored' } };

  /* ================= 3-point contest ================= */
  function contest(ctx) {
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length;
    const racks = [-80, -42, 0, 42, 80].map((a) => { const r = a * Math.PI / 180, d = ARC + 0.45; return { x: RIM.x + Math.sin(r) * d * (Math.abs(a) > 70 ? 0.98 : 1), z: RIM.z + Math.cos(r) * d, a: r }; });
    const balls = []; for (let i = 0; i < 4; i++) { const b = { x: 0, y: -5, z: 0, vx: 0, vy: 0, vz: 0, v: false, fly: false }; balls.push(b); S.O.push(b); }
    const st = { turn: 0, phase: 'ready', t: 0, time: 60, rack: 0, ball: 0, pts: ctx.players.map(() => 0), made: ctx.players.map(() => 0), hold: null, cool: 0, over: false };
    ctx.players.forEach(() => S.P.push({ x: 0, y: 0, z: 0, ry: Math.PI, a: 'idle', at: 0, sd: 1, hid: true, notag: true }));
    const lo = (i) => ctx.assist(i) ? 0.55 : 0.63, hi = (i) => ctx.assist(i) ? 0.86 : 0.79, PERF = 0.71;
    function setup() { st.phase = 'ready'; st.t = 0; st.time = 60; st.rack = 0; st.ball = 0; st.hold = null; S.P.forEach((p, i) => { p.hid = i !== st.turn; p.notag = true; }); place(); upd(); if (st.turn === ctx.me) ctx.ev({ t: 'msg', b: 'YOUR TURN!', s: 'Hold, then SWIPE UP in the green', d: 1600 }); else ctx.ev({ t: 'msg', b: ctx.players[st.turn].name, s: 'is shooting', d: 1300 }); }
    function place() { const r = racks[Math.min(st.rack, 4)], p = S.P[st.turn]; p.x = r.x; p.z = r.z; p.ry = Math.atan2(RIM.x - r.x, RIM.z - r.z) ; }
    function upd() { const h = S.hud, me = st.turn; h.solo = true; h.l = ctx.players[me].name; h.ls = st.pts[me]; h.r = ''; h.rs = ''; h.mid = '⏱ ' + Math.ceil(st.time) + 's · RACK ' + (Math.min(st.rack, 4) + 1); h.turn = ctx.players.map((p, i) => (i === me ? '▶ ' : '') + p.name.slice(0, 8) + ' ' + st.pts[i]).join(' · ');
      h.tip = me === ctx.me && st.phase === 'shoot' ? (st.ball === 4 ? '🌈 MONEY BALL = 2 points!' : 'Hold finger, SWIPE UP when the bar is GREEN') : '';
      h.meter = me === ctx.me && st.phase === 'shoot' && ctx.isHuman(me) ? { v: st.hold != null ? pingpong((st.t - st.hold) / 0.85) : 0, lo: lo(me), hi: hi(me) } : null; }
    function input(i, ev) {
      if (i !== st.turn || st.phase !== 'shoot') return;
      if (ev.k === 'down') { st.hold = st.t; return; }
      if (ev.k === 'swipe' || ev.k === 'tap') {
        let pw; if (st.hold != null && ev.k === 'swipe' && !ev.key) pw = pingpong((st.t - st.hold) / 0.85); else pw = ev.k === 'tap' ? (ctx.assist(i) ? PERF + Ph.gauss(R) * 0.07 : 0.4) : PERF + Ph.gauss(R) * 0.05;
        st.hold = null; const side = ev.k === 'swipe' ? U.clamp((ev.ux || 0) / Math.max(0.3, -(ev.uy || -1)), -1, 1) : 0;
        shoot(i, pw, side * (ctx.assist(i) ? 0.5 : 1));
      }
    }
    function shoot(i, pw, side) {
      if (st.cool > 0) return; const b = balls.find((q) => !q.fly); if (!b) return;
      const p = S.P[i], money = st.ball === 4, inG = pw >= lo(i) && pw <= hi(i);
      // depth miss from power, side miss from crooked swipes (assist shrinks errors)
      let dz = (pw - PERF) * (inG ? 1.2 : 3.0), dx = side * 0.6 + Ph.gauss(R) * (inG ? 0.05 : 0.12);
      const dirx = (RIM.x - p.x), dirz = (RIM.z - p.z), l = Math.hypot(dirx, dirz); const ox = dx * (-dirz / l) + dz * (dirx / l) * -1, oz = dx * (dirx / l) + dz * (dirz / l) * -1;
      b.x = p.x + dirx / l * 0.3; b.y = 2.3; b.z = p.z + dirz / l * 0.3; const v = shotVel(b.x, b.y, b.z, -ox * 0, 0, 0); const v2 = shotVel(b.x, b.y, b.z, ox, oz, 0.05);
      b.vx = v2[0]; b.vy = v2[1]; b.vz = v2[2]; b.v = true; b.fly = true; b.made = false; b.rim = 0; b.money = money; b.who = i; b.age = 0; void v;
      E.act(p, 'shoot'); ctx.ev({ t: 'fx', k: 'whoosh', a: 0.5 }); st.cool = 0.75;
      st.ball++; if (st.ball >= 5) { st.ball = 0; st.rack++; if (st.rack < 5) { place(); } }
      if (st.rack >= 5) st.phase = 'last';
      if (ctx.isHuman(i) && inG) ctx.ev({ t: 'hint', b: Math.abs(pw - PERF) < 0.03 ? 'PERFECT release!' : 'Good release', d: 600 });
    }
    function sim(dt) {
      if (st.over) return;
      st.t += dt; st.cool = Math.max(0, st.cool - dt);
      balls.forEach((b) => { if (!b.fly) return; b.age += dt; const r = stepBall(b, dt, ctx.ev); if (r === 'make') { const v = b.money ? 2 : 1; st.pts[b.who] += v; st.made[b.who]++; ctx.ev({ t: 'fx', k: b.rim ? 'cup' : 'swish' }); ctx.ev({ t: 'burst', x: RIM.x, y: RIM.y, z: RIM.z, c: b.money ? '#ff4fd8' : '#ffe14d', n: 14 }); if (b.money) ctx.ev({ t: 'hint', b: '🌈 MONEY! +2', d: 700 }); VN.roar(0.4); if (ctx.isHuman(b.who)) ctx.stat(b.who, 'bucket'); if (ctx.isHuman(b.who)) ctx.stat(b.who, 'three'); }
        if (b.age > 3.2) { b.fly = false; b.v = false; b.y = -5; } });
      if (st.phase === 'ready') { st.t > 1.6 && (st.phase = 'shoot', st.t = 0); upd(); return; }
      if (st.phase === 'shoot' || st.phase === 'last') {
        st.time -= dt;
        if (st.phase === 'shoot' && !ctx.isHuman(st.turn) && st.cool <= 0 && st.t > 0.4) { const d = ctx.D; if (R() < dt * (2.4 + d.smart)) { const pw = PERF + Ph.gauss(R) * (0.012 + d.aim * 0.11); shoot(st.turn, pw, Ph.gauss(R) * d.aim * 0.06); } }
        if (st.time <= 0 || (st.phase === 'last' && balls.every((b) => !b.fly))) { st.phase = 'done'; st.t = 0; st.time = Math.max(0, st.time); ctx.ev({ t: 'fx', k: 'buzzer' }); ctx.ev({ t: 'msg', b: st.pts[st.turn] + ' POINTS', s: ctx.players[st.turn].name + ' · ' + st.made[st.turn] + '/25 made', d: 1800 }); }
      }
      if (st.phase === 'done' && st.t > 2.6) { st.turn++; if (st.turn >= n) return finish(); setup(); }
      upd();
    }
    function finish() {
      st.over = true; st.phase = 'over'; st.turn = n - 1; const mx = Math.max(...st.pts), w = st.pts.map((t, i) => i).filter((i) => st.pts[i] === mx);
      let win = w.length === 1 ? ctx.players[w[0]].team : -1; if (ctx.cfg.teamUp) { const tt = [0, 0]; ctx.players.forEach((p, i) => { tt[p.team] += st.pts[i]; }); win = tt[0] > tt[1] ? 0 : tt[1] > tt[0] ? 1 : -1; }
      const score = {}; st.pts.forEach((t, i) => { score[i] = t; }); ctx.ev({ t: 'roar', k: 1 });
      ctx.end({ win, title: win < 0 ? "It's a tie!" : (w.length === 1 ? ctx.players[w[0]].name + ' wins the contest!' : 'Team wins!'), lines: ctx.players.map((p, i) => p.name + ': ' + st.pts[i] + ' pts (' + st.made[i] + '/25)'), score });
    }
    let bms = [], rackM = [];
    function build() {
      gym(); E.makeModels('none', { tags: false, ring: false });
      balls.forEach(() => bms.push(ballMesh()));
      racks.forEach((r) => { const b = new M.B(); b.box(1.0, 0.7, 0.45, 0.06, '#334155', 0, 0.35, 0); b.box(1.0, 0.05, 0.5, 0.02, '#94a3b8', 0, 0.72, 0, 0, 0, 0, 'gloss'); const g = b.group(true); g.position.set(r.x + Math.cos(r.a) * 1.1, 0, r.z - Math.sin(r.a) * 1.1); g.rotation.y = r.a; V.world.add(g); const bs = []; for (let k = 0; k < 5; k++) { const m = M.sportBall(k === 4 ? 'money' : 'basketball', BR); m.position.set(-0.4 + k * 0.2, 0.86, 0); g.add(m); bs.push(m); } rackM.push(bs); });
      setup();
    }
    function view(dt) {
      E.syncModels(dt); balls.forEach((b, i) => { const m = bms[i]; m.visible = b.v; m.position.set(b.x, b.y, b.z); m.rotation.x -= dt * 8; });
      rackM.forEach((bs, r) => bs.forEach((m, k) => { m.visible = st.phase === 'ready' || r > st.rack || (r === st.rack && k >= st.ball); }));
    }
    function cam(dt, snap) { const p = S.P[st.turn], dx = RIM.x - p.x, dz = RIM.z - p.z, l = Math.hypot(dx, dz); E.fov(56); E.camLook(p.x - dx / l * 4.8 - dz / l * 1.1, 4.0, p.z - dz / l * 4.8 + dx / l * 1.1, RIM.x, 2.7, RIM.z, dt, 5, snap); }
    return { S, build, sim, input, view, cam, st, joy: false, shoot, sync: U.syncer(st, ['turn', 'phase', 'rack', 'ball']) };
  }

  /* ================= 2 vs 2 half court ================= */
  function twoVtwo(ctx) {
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length;
    const ball = { x: 0, y: 1, z: 6, vx: 0, vy: 0, vz: 0, v: true, owner: -1, fly: false, last: -1 }; S.O.push(ball);
    const st = { phase: 'check', t: 0, off: 0, score: [0, 0], clock: 300, shotClock: 14, over: false, shot: null };
    ctx.players.forEach((pl) => S.P.push({ x: 0, y: 0, z: 0, ry: Math.PI, a: 'idle', at: 0, sd: 1, team: pl.team, mx: 0, mz: 0, jump: 0, cool: 0, think: 0, tx: 0, tz: 0, pts: 0 }));
    const P = S.P, mates = (i) => P.map((q, j) => j).filter((j) => j !== i && P[j].team === P[i].team), opps = (t) => P.map((q, j) => j).filter((j) => P[j].team !== t);
    const behindArc = (x, z) => Math.hypot(x - RIM.x, z - RIM.z) > ARC || (Math.abs(x) > 6.6 && z < RIM.z + 1.5);
    function check(t) {
      st.phase = 'check'; st.t = 0; st.off = t; st.shotClock = 14; ball.fly = false; st.shot = null;
      const o = P.map((q, j) => j).filter((j) => P[j].team === t), d = opps(t);
      o.forEach((j, k) => { P[j].x = k ? 3.5 : 0; P[j].z = k ? 3 : 6.4; P[j].ry = Math.PI; });
      d.forEach((j, k) => { P[j].x = k ? 3 : 0; P[j].z = k ? 1.5 : 4.6; P[j].ry = 0; });
      ball.owner = o[0]; upd();
    }
    function upd() { const h = S.hud; h.l = E.teamName(0); h.r = E.teamName(1); h.ls = st.score[0]; h.rs = st.score[1]; const c = Math.max(0, Math.ceil(st.clock)); h.mid = st.sudden ? 'NEXT BUCKET WINS' : 'TO 11 · ' + Math.floor(c / 60) + ':' + String(c % 60).padStart(2, '0'); VN.drawScore('GROK HOOPS', h.ls, h.rs, h.l, h.r, '2 vs 2 · to 11');
      const me = ctx.me; h.tip = me >= 0 ? (ball.owner === me ? 'SWIPE UP to shoot · TAP to pass' : P[me] && P[me].team === st.off ? 'Get open! Your mate will pass' : 'TAP near the ball to steal · SWIPE UP to block') : '';
      h.meter = null; }
    const dist = (i) => Math.hypot(ball.x - P[i].x, ball.z - P[i].z);
    function input(i, ev) {
      const p = P[i]; if (!p) return;
      if (ev.k === 'assist') { ctx.cfg.assist = ctx.cfg.assist || {}; ctx.cfg.assist[i] = !!ev.on; return; }
      if (ev.k === 'move') { p.mx = U.clamp(+ev.x || 0, -1, 1); p.mz = U.clamp(+ev.z || 0, -1, 1); return; }
      if (st.phase === 'check' && ball.owner === i && (ev.k === 'tap' || ev.k === 'swipe')) { st.t = 9; return; }
      if (st.phase !== 'play') return;
      if (ev.k === 'tap') { if (ball.owner === i) pass(i); else if (p.team !== st.off) steal(i); else callBall(i); return; }
      if (ev.k === 'swipe') { const up = -(ev.uy == null ? -1 : ev.uy); if (up < 0.4) { if (ball.owner === i) pass(i); return; } if (ball.owner === i) shoot(i, ev.power, ctx.assist(i)); else if (p.team !== st.off) block(i); }
    }
    function callBall(i) { const o = ball.owner; if (o >= 0 && o !== i && P[o].team === P[i].team && !ctx.isHuman(o)) pass(o, i); }
    function pass(i, to) {
      const m = mates(i); if (!m.length) return; to = to == null ? m[0] : to; const p = P[i], q = P[to];
      // defender in the lane can pick it off
      const lane = opps(p.team).some((j) => { const o = P[j]; const t = U.clamp(((o.x - p.x) * (q.x - p.x) + (o.z - p.z) * (q.z - p.z)) / (Math.hypot(q.x - p.x, q.z - p.z) ** 2 || 1), 0, 1); return Math.hypot(p.x + (q.x - p.x) * t - o.x, p.z + (q.z - p.z) * t - o.z) < 0.5 && t > 0.15 && t < 0.85; });
      ball.owner = -1; ball.fly = true; ball.pass = { from: i, to, t: 0, d: Math.hypot(q.x - p.x, q.z - p.z) / 11 + 0.15, x0: p.x, z0: p.z, int: lane && R() < 0.45 ? opps(p.team).sort((a, b) => Math.hypot(P[a].x - p.x, P[a].z - p.z) - Math.hypot(P[b].x - p.x, P[b].z - p.z))[0] : -1 };
      E.act(p, 'throw'); ctx.ev({ t: 'fx', k: 'whoosh', a: 0.3 });
    }
    function steal(i) { const p = P[i]; if (p.cool > 0) return; p.cool = 1.0; E.act(p, 'tackle'); const o = ball.owner; if (o >= 0 && P[o].team !== p.team && dist(i) < 1.4) { const ch = ctx.isHuman(i) ? (ctx.assist(i) ? 0.42 : 0.35) : 0.12 + ctx.D.grab * 0.22; if (R() < ch) { ctx.ev({ t: 'msg', b: 'STEAL!', s: ctx.players[i].name, d: 1100 }); ctx.ev({ t: 'fx', k: 'catch' }); if (ctx.isHuman(i)) ctx.stat(i, 'steal'); st.phase = 'turn'; st.t = 0; st.next = p.team; ball.owner = i; } } }
    function block(i) { const p = P[i]; if (p.jump > 0 || p.cool > 0) return; p.jump = 0.7; p.cool = 1.2; E.act(p, 'block'); }
    function shoot(i, pow, assist) {
      const p = P[i], d = Math.hypot(p.x - RIM.x, p.z - RIM.z), three = behindArc(p.x, p.z), hum = ctx.isHuman(i), dd = ctx.D;
      let cont = 0; opps(p.team).forEach((j) => { const q = P[j], dq = Math.hypot(q.x - p.x, q.z - p.z); if (dq < 1.6) cont = Math.max(cont, (1.6 - dq) / 1.6); });
      // make chance: distance, contest, skill
      let base = U.clamp(0.82 - Math.max(0, d - 1.5) * 0.055, 0.25, 0.85); if (d < 1.6) base = 0.8;
      if (hum) { const ideal = U.clamp(0.35 + d * 0.06, 0.4, 0.85), perr = Math.abs((pow || 0.6) - ideal); base -= assist ? perr * 0.5 : perr * 1.1; base += assist ? 0.08 : 0; }
      else base = base * (0.4 + dd.smart * 0.65);
      const chance = U.clamp(base - cont * 0.35, 0.08, 0.9), make = R() < chance;
      const off = make ? [Ph.gauss(R) * 0.04, Ph.gauss(R) * 0.04] : [(R() < 0.5 ? -1 : 1) * (0.2 + R() * 0.15), (R() - 0.3) * 0.35];
      ball.owner = -1; ball.fly = true; ball.pass = null; ball.x = p.x; ball.y = 2.4; ball.z = p.z; ball.made = false; ball.rim = 0;
      const v = shotVel(ball.x, ball.y, ball.z, off[0], off[1], 0.12); ball.vx = v[0]; ball.vy = v[1]; ball.vz = v[2];
      st.shot = { who: i, three, t: 0, team: p.team }; E.act(p, 'shoot'); p.jump = 0.5; ctx.ev({ t: 'fx', k: 'whoosh', a: 0.4 });
    }
    function sim(dt) {
      st.t += dt; P.forEach((p) => { p.cool = Math.max(0, p.cool - dt); p.jump = Math.max(0, p.jump - dt); p.y = p.jump > 0 ? Math.sin((1 - p.jump / 0.7) * Math.PI) * 0.6 : 0; });
      if (st.phase === 'check') { holdBall(); if (st.t > 1.6 && !(ctx.isHuman(ball.owner) && st.t < 6 && st.t < 9)) { st.phase = 'play'; st.t = 0; ctx.ev({ t: 'fx', k: 'whistle' }); } upd(); return; }
      if (st.phase === 'score' || st.phase === 'turn') { if (ball.fly) stepBall(ball, dt); else holdBall(); if (st.t > 1.4) { if (st.over) return; check(st.next); } upd(); return; }
      st.clock -= dt; st.shotClock -= dt;
      if (st.clock <= 0 && !st.sudden) { if (st.score[0] === st.score[1]) { st.sudden = true; ctx.ev({ t: 'msg', b: 'NEXT BUCKET WINS!', d: 1600 }); ctx.ev({ t: 'fx', k: 'whistle' }); } else return end(); }
      if (st.shotClock <= 0 && ball.owner >= 0) { ctx.ev({ t: 'msg', b: 'SHOT CLOCK!', d: 1000 }); ctx.ev({ t: 'fx', k: 'buzzer' }); st.phase = 'turn'; st.t = 0; st.next = 1 - st.off; return; }
      for (let i = 0; i < n; i++) control(i, dt);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = P[i], b = P[j], dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < 0.75 && d > 1e-3) { const k = (0.75 - d) / d * 0.5; a.x += dx * k; a.z += dz * k; b.x -= dx * k; b.z -= dz * k; } }
      P.forEach((p) => { p.x = U.clamp(p.x, -HW + 0.3, HW - 0.3); p.z = U.clamp(p.z, BASE_Z + 0.4, MID_Z - 0.3); });
      if (ball.owner >= 0) holdBall();
      else if (ball.pass) { const ps = ball.pass; ps.t += dt; const k = Math.min(1, ps.t / ps.d), tgt = ps.int >= 0 && k > 0.5 ? P[ps.int] : P[ps.to]; ball.x = U.lerp(ps.x0, tgt.x, k); ball.z = U.lerp(ps.z0, tgt.z, k); ball.y = 1.2 + Math.sin(k * Math.PI) * 0.4; if (k >= 1) { ball.pass = null; ball.fly = false; ball.owner = ps.int >= 0 ? ps.int : ps.to; if (ps.int >= 0) { ctx.ev({ t: 'msg', b: 'PICKED OFF!', s: ctx.players[ps.int].name, d: 1000 }); st.phase = 'turn'; st.t = 0; st.next = P[ps.int].team; } } }
      else if (ball.fly) {
        if (st.shot && st.shot.t < 0.35) { st.shot.t += dt; opps(st.shot.team).forEach((j) => { const q = P[j]; if (q.jump > 0.2 && Math.hypot(q.x - ball.x, q.z - ball.z) < 1.0 && ball.y < q.y + 2.9 && !st.shot.blk) { const ch = ctx.isHuman(j) ? 0.55 : 0.2 + ctx.D.grab * 0.3; st.shot.blk = 1; if (R() < ch) { ball.vx = (R() - 0.5) * 6; ball.vz = 3 + R() * 3; ball.vy = 1; st.shot = null; ctx.ev({ t: 'msg', b: 'BLOCKED!', s: ctx.players[j].name, d: 1000 }); ctx.ev({ t: 'fx', k: 'thud' }); VN.roar(0.6); if (ctx.isHuman(j)) ctx.stat(j, 'block'); } } }); }
        const r = stepBall(ball, dt, ctx.ev);
        if (r === 'make' && st.shot) { const v = st.shot.three ? 2 : 1, t = st.shot.team; st.score[t] += v; P[st.shot.who].pts += v; ctx.ev({ t: 'fx', k: ball.rim ? 'cup' : 'swish' }); ctx.ev({ t: 'msg', b: st.shot.three ? 'FROM DOWNTOWN!' : 'BUCKET!', s: ctx.players[st.shot.who].name + ' +' + v, d: 1100 }); VN.roar(0.8); if (ctx.isHuman(st.shot.who)) ctx.stat(st.shot.who, 'bucket', v); if (st.shot.three && ctx.isHuman(st.shot.who)) ctx.stat(st.shot.who, 'three'); st.phase = 'score'; st.t = 0; st.next = 1 - t; if (st.score[t] >= 11 || st.sudden) { st.over = true; setTimeout0(end); } upd(); return; }
        // rebound: grab when the ball comes down to reach
        if (ball.y < 2.6 && (!st.shot || ball.rim || ball.y < 2.0)) { let best = -1, bd = 1e9; P.forEach((p, i) => { const d = Math.hypot(ball.x - p.x, ball.z - p.z); if (d < 0.75 + (ctx.isHuman(i) && ctx.assist(i) ? 0.25 : 0) && d < bd) { bd = d; best = i; } }); if (best >= 0) { const was = st.off; ball.fly = false; ball.owner = best; st.shot = null; if (P[best].team !== was) { st.phase = 'turn'; st.t = 0; st.next = P[best].team; ctx.ev({ t: 'hint', b: 'Rebound ' + ctx.players[best].name, d: 700 }); } else { st.shotClock = 14; } } }
      }
      upd();
    }
    let endQ = null; function setTimeout0(f) { endQ = f; }
    function holdBall() { const o = ball.owner; if (o < 0) return; const p = P[o], dribble = Math.abs(Math.sin(st.t * 7)); ball.x = p.x + Math.sin(p.ry + 0.6) * 0.42; ball.z = p.z + Math.cos(p.ry + 0.6) * 0.42; ball.y = 0.2 + dribble * 0.75; ball.vx = ball.vy = ball.vz = 0; }
    function control(i, dt) {
      const p = P[i], hum = ctx.isHuman(i), sp = 5.6 * (hum ? 1 : ctx.D.speed) * (ball.owner === i ? 0.88 : 1);
      if (p.a !== 'idle' && p.at > 0.7) { p.a = 'idle'; p.at = 0; }
      if (hum && (Math.abs(p.mx) > 0.08 || Math.abs(p.mz) > 0.08)) { p.x += p.mx * sp * dt; p.z += p.mz * sp * dt; p.ry = U.lerpAng(p.ry, Math.atan2(p.mx, p.mz), Math.min(1, dt * 12)); if (ball.owner === i && p.a === 'idle') p.a = 'dribble'; return; }
      if (hum && !ctx.assist(i)) return;
      if (hum && ball.owner === i) { Ph.face(p, RIM.x, RIM.z, dt * 6); return; }
      ai(i, dt, sp * (hum ? 0.85 : 1), hum);
    }
    function ai(i, dt, sp, hum) {
      const p = P[i], d = ctx.D, offense = p.team === st.off;
      if (ball.fly && !ball.pass) { // rebound
        const tx = ball.x + ball.vx * 0.3, tz = ball.z + ball.vz * 0.3; Ph.moveTo(p, tx, tz, sp, dt); return; }
      if (offense) {
        if (ball.owner === i && !hum) {
          p.think -= dt; let guard = 99; opps(p.team).forEach((j) => { guard = Math.min(guard, Math.hypot(P[j].x - p.x, P[j].z - p.z)); });
          const dr = Math.hypot(p.x - RIM.x, p.z - RIM.z);
          if (p.think <= 0) {
            p.think = 0.35 + d.react;
            const open = guard > 1.8, mate = mates(i)[0];
            if ((open && (dr < 3 || (behindArc(p.x, p.z) && R() < 0.35 + d.smart * 0.3))) || st.shotClock < 2.5 || (dr < 1.8 && R() < 0.6)) { shoot(i); return; }
            if (mate != null && guard < 1.2 && R() < 0.5 + d.smart * 0.2) { pass(i, mate); return; }
            // drive: pick a lane away from the defender
            let ax = 0; opps(p.team).forEach((j) => { const q = P[j]; if (Math.hypot(q.x - p.x, q.z - p.z) < 3) ax += Math.sign(p.x - q.x || 1) * 1.8; });
            p.tx = U.clamp(p.x * 0.6 + ax, -5, 5); p.tz = U.clamp(p.z - 2.2, RIM.z + 1.0, 6);
          }
          Ph.moveTo(p, p.tx, p.tz, sp, dt); if (p.a === 'idle') p.a = 'dribble'; return;
        }
        // off-ball: spot up on the wing / corner
        const side = (P[ball.owner] && P[ball.owner].x > 0) ? -1 : 1; const tx = side * (ARC * 0.72), tz = RIM.z + ARC * 0.72 + 0.4; Ph.moveTo(p, tx, tz, sp * 0.8, dt);
        return;
      }
      // defense: guard nearest opponent, ball handler pressured
      const om = opps(p.team); const mine = om.sort((a, b) => Math.hypot(P[a].x - p.x, P[a].z - p.z) - Math.hypot(P[b].x - p.x, P[b].z - p.z))[0];
      const other = P.map((q, j) => j).filter((j) => j !== i && P[j].team === p.team)[0]; let man = mine;
      if (other != null && om.length > 1) { const a = om[0], b = om[1]; const mi = i < other ? (Math.hypot(P[a].x - p.x, P[a].z - p.z) + Math.hypot(P[b].x - P[other].x, P[b].z - P[other].z) < Math.hypot(P[b].x - p.x, P[b].z - p.z) + Math.hypot(P[a].x - P[other].x, P[a].z - P[other].z) ? a : b) : null; if (mi != null) man = mi; else { const a2 = om[0], b2 = om[1]; man = (Math.hypot(P[a2].x - P[other].x, P[a2].z - P[other].z) + Math.hypot(P[b2].x - p.x, P[b2].z - p.z) < Math.hypot(P[b2].x - P[other].x, P[b2].z - P[other].z) + Math.hypot(P[a2].x - p.x, P[a2].z - p.z)) ? b2 : a2; } }
      const q = P[man], k = 0.32 + (ball.owner === man ? 0 : 0.15); const tx = U.lerp(q.x, RIM.x, k), tz = U.lerp(q.z, RIM.z, k);
      Ph.moveTo(p, tx, tz, sp, dt); Ph.face(p, q.x, q.z, 1);
      if (!hum && ball.owner === man && Math.hypot(q.x - p.x, q.z - p.z) < 1.3 && R() < dt * (0.25 + d.smart * 0.5)) steal(i);
      if (!hum && st.shot && st.shot.t < 0.15 && Math.hypot(q.x - p.x, q.z - p.z) < 1.4 && R() < 0.15 + d.grab * 0.35) block(i);
    }
    function end() { st.over = true; st.phase = 'over'; const w = st.score[0] > st.score[1] ? 0 : st.score[1] > st.score[0] ? 1 : -1; upd(); ctx.ev({ t: 'fx', k: 'buzzer' }); ctx.ev({ t: 'roar', k: 1 });
      const score = {}; P.forEach((p, i) => { score[i] = p.pts; }); const top = P.map((p, i) => i).sort((a, b) => P[b].pts - P[a].pts)[0];
      ctx.end({ win: w, title: w < 0 ? 'Tie game ' + st.score[0] + '-' + st.score[1] : E.wins(w) + ' ' + st.score[w] + '-' + st.score[1 - w], lines: ['Top scorer: ' + ctx.players[top].name + ' (' + P[top].pts + ')'], score }); }
    const _sim = sim; function sim2(dt) { if (endQ) { const f = endQ; endQ = null; f(); return; } if (!st.over || st.phase !== 'over') _sim(dt); }
    let bm, mark;
    function build() {
      gym(); E.makeModels('none', { teamShirts: ['#2563eb', '#f97316'] });
      bm = ballMesh(); mark = new T.Mesh(new T.ConeGeometry(0.2, 0.36, 4), new T.MeshBasicMaterial({ color: '#ffe14d' })); mark.rotation.x = Math.PI; V.world.add(mark);
      check(0);
    }
    function view(dt) { E.syncModels(dt); bm.position.set(ball.x, ball.y, ball.z); bm.rotation.x -= dt * 6; const me = ctx.me; mark.visible = me >= 0 && !!P[me]; if (mark.visible) mark.position.set(P[me].x, P[me].y + 2.7 + Math.sin(V.t * 5) * 0.08, P[me].z); }
    function cam(dt, snap) { const fx = U.clamp(ball.x, -4, 4) * 0.4; E.fov(58); E.camLook(fx, 8.8, 13.5, fx * 0.6, 1.2, -1.2, dt, 3, snap); }
    return { S, build, sim: sim2, input, view, cam, st, ball, shoot };
  }
})();

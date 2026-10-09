/* Grok Sports Command - Dodgeball 3v3: rush, lock-on throws, catches bring a teammate back, dodge hops, best of 3 rounds */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, T = THREE;
  const HW = 5, HL = 8, BR = 0.13, G = 9.8, NB = 5, ROUND_T = 90;
  SP.Sports.dodgeball = function (ctx) {
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length;
    const balls = []; for (let k = 0; k < NB; k++) { const b = { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, v: true, owner: -1, live: false, from: -1, team: -1, tgt: -1, cool: 0 }; balls.push(b); S.O.push(b); }
    const st = { phase: 'ready', t: 0, round: 0, wins: [0, 0], clock: ROUND_T, over: false, outOrder: [[], []] };
    ctx.players.forEach((pl) => S.P.push({ x: 0, y: 0, z: 0, ry: 0, a: 'ready', at: 0, sd: 1, team: pl.team, mx: 0, mz: 0, out: false, hop: 0, catchT: -9, has: -1, think: 0, tx: 0, tz: 0, hits: 0, catches: 0, strafe: 0 }));
    const mateOfHuman = (i) => ctx.players.some((q, j) => j !== i && q.team === ctx.players[i].team && ctx.isHuman(j));
    const dOf = (i) => mateOfHuman(i) ? D.DIFF.normal : ctx.D;
    const P = S.P, side = (t) => t === 0 ? 1 : -1, team = (t) => P.map((p, i) => i).filter((i) => P[i].team === t), alive = (t) => team(t).filter((i) => !P[i].out);
    function setupRound() {
      st.phase = 'ready'; st.t = 0; st.clock = ROUND_T; st.outOrder = [[], []];
      P.forEach((p, i) => { const s = side(p.team), k = team(p.team).indexOf(i); p.out = false; p.x = (k - 1) * 2.6; p.z = s * (HL - 0.8); p.ry = s > 0 ? Math.PI : 0; p.has = -1; p.a = 'ready'; p.hid = false; p.hop = 0; });
      balls.forEach((b, k) => { b.x = (k - (NB - 1) / 2) * 1.9; b.z = 0; b.y = BR; b.vx = b.vy = b.vz = 0; b.owner = -1; b.live = false; b.cool = 0; });
      ctx.ev({ t: 'msg', b: 'ROUND ' + (st.round + 1), s: 'Get ready...', d: 1400 }); upd();
    }
    function upd() { const h = S.hud; h.l = E.teamName(0); h.r = E.teamName(1); h.ls = alive(0).length; h.rs = alive(1).length; h.mid = 'R' + (st.round + 1) + ' · ' + st.wins[0] + '-' + st.wins[1] + ' · ' + Math.max(0, Math.ceil(st.clock)) + 's';
      const me = P[ctx.me]; h.tip = !me ? '' : me.out ? 'You are OUT - catch-backs can save you!' : me.has >= 0 ? 'SWIPE toward someone to THROW' : incoming(ctx.me) ? 'TAP to CATCH!' : 'Run over a ball to grab it'; VN.drawScore('DODGE ARENA', h.ls, h.rs, h.l, h.r, 'Round ' + (st.round + 1) + ' · wins ' + st.wins[0] + '-' + st.wins[1]); }
    function incoming(i) { const p = P[i]; return balls.find((b) => b.live && b.tgt === i && Math.hypot(b.x - p.x, b.z - p.z) < 5); }
    /* ---- throwing ---- */
    function pickTarget(i, dx, dz) {
      const p = P[i], opp = alive(1 - p.team); if (!opp.length) return -1; let best = opp[0], bs = -1e9;
      opp.forEach((j) => { const q = P[j], vx = q.x - p.x, vz = q.z - p.z, l = Math.hypot(vx, vz) || 1, dot = (vx * dx + vz * dz) / l; const sc = dot * 3 - l * 0.12; if (sc > bs) { bs = sc; best = j; } }); return best;
    }
    function throwBall(i, j, pow, err) {
      const p = P[i]; if (p.has < 0 || j < 0) return; const b = balls[p.has], q = P[j];
      const sp = 12 + pow * 8, d = Math.hypot(q.x - p.x, q.z - p.z), t = d / sp;
      const lx = q.x + (q.vx || 0) * t * 0.7, lz = q.z + (q.vz || 0) * t * 0.7;
      const ex = Ph.gauss(R) * err * (0.9 + d * 0.08), ty = 1.0 + Ph.gauss(R) * err * 0.3;
      b.owner = -1; b.x = p.x; b.y = 1.5; b.z = p.z + side(p.team) * -0.3; const v = Ph.solve([b.x, b.y, b.z], [lx + ex, ty, lz], Math.max(0.2, t), G, 0); b.vx = v[0]; b.vy = v[1]; b.vz = v[2];
      b.live = true; b.from = i; b.team = p.team; b.tgt = j; b.cool = 0.25; p.has = -1; p.ry = Math.atan2(q.x - p.x, q.z - p.z); E.act(p, 'throw'); ctx.ev({ t: 'fx', k: 'whoosh', a: 0.5 });
      if (ctx.isHuman(j)) ctx.ev({ t: 'hint', b: 'INCOMING! TAP to catch', d: 600 });
    }
    function input(i, ev) {
      const p = P[i]; if (!p) return;
      if (ev.k === 'assist') { ctx.cfg.assist = ctx.cfg.assist || {}; ctx.cfg.assist[i] = !!ev.on; return; }
      if (ev.k === 'move') { p.mx = U.clamp(+ev.x || 0, -1, 1); p.mz = U.clamp(+ev.z || 0, -1, 1); return; }
      if (st.phase !== 'play' || p.out) return;
      if (ev.k === 'swipe' && p.has >= 0) { const j = pickTarget(i, +ev.x || 0, +ev.z || -side(p.team)); throwBall(i, j, U.clamp(ev.power == null ? 0.6 : ev.power, 0.2, 1), ctx.assist(i) ? 0.35 : 0.6); return; }
      if (ev.k === 'tap') { if (p.has >= 0 && ctx.assist(i)) { const j = pickTarget(i, 0, -side(p.team)); throwBall(i, j, 0.6, 0.45); return; } if (incoming(i) && Math.hypot(incoming(i).x - p.x, incoming(i).z - p.z) < 3.2) p.catchT = st.t; else if (p.hop <= 0 && (p.hopCool || 0) <= 0) { p.hop = 0.55; p.hopCool = 1.1; E.act(p, 'jump'); } }
    }
    /* ---- sim ---- */
    function sim(dt) {
      if (st.over) return; st.t += dt;
      if (st.phase === 'ready') { if (st.t > 1.6) { st.phase = 'play'; st.t = 0; ctx.ev({ t: 'fx', k: 'whistle' }); ctx.ev({ t: 'msg', b: 'DODGE!', d: 800 }); } moveAll(dt, true); upd(); return; }
      if (st.phase === 'rdone') { if (st.t > 2.5) { if (st.wins[0] >= 2 || st.wins[1] >= 2 || st.round >= 4) return finish(); st.round++; setupRound(); } return; }
      st.clock -= dt; if (st.clock <= 0) return roundOver(alive(0).length > alive(1).length ? 0 : alive(1).length > alive(0).length ? 1 : -1, "Time's up!");
      P.forEach((p) => { p.hop = Math.max(0, p.hop - dt); p.hopCool = Math.max(0, (p.hopCool || 0) - dt); p.y = p.hop > 0 ? Math.sin((1 - p.hop / 0.55) * Math.PI) * 0.75 : 0; if (p.a !== 'ready' && p.a !== 'out' && p.at > 0.6) { p.a = 'ready'; p.at = 0; } });
      moveAll(dt, false); stepBalls(dt); upd();
    }
    function moveAll(dt, frozen) {
      P.forEach((p, i) => {
        const px = p.x, pz = p.z;
        if (p.out) { const s = side(p.team), k = st.outOrder[p.team].indexOf(i); Ph.moveTo(p, -HW - 1.2, s * (HL - 1 - k * 1.2), 5, dt); p.a = 'out'; p.vx = p.vz = 0; return; }
        if (frozen) return;
        const hum = ctx.isHuman(i), sp = 5.2 * (hum ? 1 : dOf(i).speed) * (p.has >= 0 ? 0.92 : 1);
        if (hum && (Math.abs(p.mx) > 0.08 || Math.abs(p.mz) > 0.08)) { p.x += p.mx * sp * dt; p.z += p.mz * sp * dt; p.ry = U.lerpAng(p.ry, Math.atan2(p.mx, p.mz), Math.min(1, dt * 12)); }
        else if (!hum || ctx.assist(i)) ai(i, dt, sp * (hum ? 0.85 : 1), hum);
        const s = side(p.team); p.x = U.clamp(p.x, -HW + 0.35, HW - 0.35); p.z = s > 0 ? U.clamp(p.z, 0.45, HL - 0.35) : U.clamp(p.z, -HL + 0.35, -0.45);
        p.vx = (p.x - px) / dt; p.vz = (p.z - pz) / dt;
        // pick up balls
        if (p.has < 0) balls.forEach((b, k) => { if (p.has >= 0 || b.owner >= 0 || b.live || b.cool > 0) return; if (b.y < 0.5 && Math.hypot(b.x - p.x, b.z - p.z) < 0.6 && Math.hypot(b.vx, b.vz) < 6) { b.owner = i; p.has = k; ctx.ev({ t: 'fx', k: 'catch', a: 0.3 }); } });
      });
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = P[i], b = P[j]; if (a.out || b.out) continue; const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < 0.7 && d > 1e-3) { const k = (0.7 - d) / d * 0.5; a.x += dx * k; a.z += dz * k; b.x -= dx * k; b.z -= dz * k; } }
    }
    function ai(i, dt, sp, hum) {
      const p = P[i], s = side(p.team), d = dOf(i); p.think -= dt;
      // dodge / catch an incoming ball
      const inc = incoming(i);
      if (inc && !hum) { const dist = Math.hypot(inc.x - p.x, inc.z - p.z); const tLeft = dist / Math.max(1, Math.hypot(inc.vx, inc.vz)); if (tLeft < 0.32 && !inc.react) { inc.react = 1; const r = R(); if (r < d.grab * 0.4) p.catchT = st.t + 0.05; else if (r < d.grab * 0.4 + 0.12 + d.smart * 0.25) { p.hop = 0.55; p.hopCool = 1.1; E.act(p, 'jump'); p.tx = p.x + (R() < 0.5 ? -1.6 : 1.6); } } }
      if (p.has >= 0) {
        if (hum) return; // humans throw themselves (assist: TAP throws)
        if (Math.abs(p.z) < 3.2) { Ph.moveTo(p, p.x * 0.9, s * 4.2, sp, dt); p.think = Math.max(p.think, 0.25 + R() * 0.5); return; }
        if (p.think <= 0) { p.think = 1.1 + d.react * 2.5 + R() * 1.3;
          const opp = alive(1 - p.team); if (opp.length) { let j = opp[0], bd = 1e9; opp.forEach((q) => { const dd = Math.hypot(P[q].x - p.x, P[q].z - p.z) + (P[q].has >= 0 ? 1.5 : 0) + R() * (1 - d.smart) * 4; if (dd < bd) { bd = dd; j = q; } }); throwBall(i, j, 0.5 + d.power * 0.45, d.aim * 1.1 + 0.15); } }
        Ph.moveTo(p, U.clamp(p.x, -3, 3), s * 3.6, sp * 0.7, dt); return;
      }
      // fetch the nearest free ball on my side (or the centre line)
      let best = -1, bd = 1e9; balls.forEach((b, k) => { if (b.owner >= 0 || b.live) return; if (b.z * s < -0.2) return; const dd = Math.hypot(b.x - p.x, b.z - p.z); const taken = P.some((q, j) => j !== i && q.team === p.team && !q.out && q.goal === k); if (!taken && dd < bd) { bd = dd; best = k; } });
      p.goal = best;
      if (best >= 0 && (!hum || bd < 7)) { const b = balls[best]; Ph.moveTo(p, b.x, b.z, sp, dt); return; }
      // no ball: strafe at the back, keep away from enemy throwers
      p.strafe -= dt; if (p.strafe <= 0) { p.strafe = 0.8 + R() * 1.2; p.tx = (R() - 0.5) * (HW * 1.6); p.tz = s * (HL * 0.55 + R() * HL * 0.35); }
      Ph.moveTo(p, p.tx, p.tz, sp * 0.75, dt); Ph.face(p, 0, 0, dt * 4);
    }
    function stepBalls(dt) {
      balls.forEach((b) => {
        b.cool = Math.max(0, b.cool - dt);
        if (b.owner >= 0) { const p = P[b.owner]; if (p.out) { b.owner = -1; p.has = -1; return; } b.x = p.x + Math.sin(p.ry + 0.7) * 0.38; b.z = p.z + Math.cos(p.ry + 0.7) * 0.38; b.y = 1.0 + (p.y || 0); b.vx = b.vy = b.vz = 0; return; }
        Ph.step(b, dt, G, 0.05);
        if (b.y < BR) { b.y = BR; if (b.vy < -1.2) { b.vy = -b.vy * 0.5; ctx.ev({ t: 'fx', k: 'thud', a: 0.3 }); } else b.vy = 0; b.live = false; const f = Math.exp(-2.2 * dt); b.vx *= f; b.vz *= f; }
        if (Math.abs(b.x) > HW + 1.5) { b.x = Math.sign(b.x) * (HW + 1.5); b.vx *= -0.5; b.live = false; }
        if (Math.abs(b.z) > HL + 1.5) { b.z = Math.sign(b.z) * (HL + 1.5); b.vz *= -0.5; b.live = false; }
        // balls that roll to the back wall drift back onto the court
        if (!b.live && b.y <= BR + 0.01 && (Math.abs(b.x) > HW || Math.abs(b.z) > HL)) { b.vx += -Math.sign(b.x) * (Math.abs(b.x) > HW ? 2 : 0) * dt; b.vz += -Math.sign(b.z) * (Math.abs(b.z) > HL ? 2 : 0) * dt; }
        if (!b.live) return;
        // hit test against opponents
        for (let j = 0; j < n; j++) {
          const q = P[j]; if (q.out || q.team === b.team) continue;
          if (q.hop > 0.08) continue; const by = b.y - (q.y || 0); if (by < 0.1 || by > 1.9) continue; const d = Math.hypot(b.x - q.x, b.z - q.z); if (d > 0.42) continue;
          // catch?
          const win = ctx.isHuman(j) ? (ctx.assist(j) ? 0.45 : 0.3) : 0.3;
          if (st.t - q.catchT < win && st.t - q.catchT > -0.05) { caught(j, b); return; }
          hit(j, b); return;
        }
      });
    }
    function caught(j, b) {
      const q = P[j], th = b.from; b.live = false; b.owner = j; q.has = balls.indexOf(b); b.vx = b.vy = b.vz = 0; q.catchT = -9; q.catches++; E.act(q, 'catch');
      ctx.ev({ t: 'msg', b: 'CAUGHT IT!', s: ctx.players[j].name + ' catches · ' + ctx.players[th].name + ' is OUT', d: 1400 }); ctx.ev({ t: 'fx', k: 'catch' }); VN.roar(0.9); if (ctx.isHuman(j)) ctx.stat(j, 'catch');
      if (th >= 0 && !P[th].out) out(th);
      // a teammate comes back in
      const back = st.outOrder[q.team].shift(); if (back != null) { const r = P[back]; r.out = false; r.a = 'cheer'; r.at = 0; r.x = 0; r.z = side(r.team) * (HL - 1); ctx.ev({ t: 'hint', b: ctx.players[back].name + ' is back in!', d: 1000 }); }
      check();
    }
    function hit(j, b) {
      const q = P[j]; b.live = false; b.vx *= -0.25; b.vz *= -0.25; b.vy = 2; const th = b.from; if (th >= 0) { P[th].hits++; if (ctx.isHuman(th)) ctx.stat(th, 'hit'); }
      ctx.ev({ t: 'fx', k: 'thud' }); ctx.ev({ t: 'burst', x: q.x, y: 1.2, z: q.z, c: '#ef4444', n: 14 }); ctx.ev({ t: 'shake', k: j === ctx.me ? 0.3 : 0.08 });
      ctx.ev({ t: 'msg', b: j === ctx.me ? "YOU'RE OUT!" : 'OUT!', s: ctx.players[j].name + ' hit by ' + (th >= 0 ? ctx.players[th].name : '?'), d: 1100 }); out(j); check();
    }
    function out(j) { const q = P[j]; q.out = true; E.act(q, 'out'); if (q.has >= 0) { const b = balls[q.has]; b.owner = -1; b.y = 1; b.vx = (R() - 0.5) * 2; b.vz = -side(q.team) * 0.5; q.has = -1; } st.outOrder[q.team].push(j); }
    function check() { const a = alive(0).length, b = alive(1).length; if (!a || !b) roundOver(a ? 0 : 1, (a ? E.teamName(0) : E.teamName(1)) + ' win the round'); }
    function roundOver(w, why) {
      if (st.phase !== 'play') return; st.phase = 'rdone'; st.t = 0; if (w >= 0) st.wins[w]++;
      ctx.ev({ t: 'msg', b: w < 0 ? 'TIE ROUND' : w === ctx.myTeam ? 'ROUND WON!' : 'ROUND LOST', s: why + ' · ' + st.wins[0] + '-' + st.wins[1], d: 2000 }); ctx.ev({ t: 'roar', k: 1 }); ctx.ev({ t: 'fx', k: 'whistle' });
      if (w >= 0) team(w).forEach((i) => { if (!P[i].out) E.act(P[i], 'cheer'); }); upd();
    }
    function finish() {
      st.over = true; st.phase = 'over'; const w = st.wins[0] > st.wins[1] ? 0 : st.wins[1] > st.wins[0] ? 1 : -1; ctx.ev({ t: 'roar', k: 1 });
      const score = {}; P.forEach((p, i) => { score[i] = p.hits + p.catches * 2; }); const top = P.map((p, i) => i).sort((a, b) => score[b] - score[a])[0];
      ctx.end({ win: w, title: w < 0 ? 'Tied ' + st.wins[0] + '-' + st.wins[1] : E.wins(w) + ' ' + st.wins[w] + '-' + st.wins[1 - w], lines: ['MVP: ' + ctx.players[top].name + ' (' + P[top].hits + ' hits, ' + P[top].catches + ' catches)'], score });
    }
    /* ---- view ---- */
    let bms = [], mark, warn;
    function build() {
      V.env(VN.ENV.indoor);
      VN.arena(30, 36, 16, { wall: '#991b1b', trim: '#facc15', floor: '#1f2937' });
      VN.field(HW * 2 + 3, HL * 2 + 3, '#e2b07a', { planks: true, gloss: true, y: 0.001 });
      const f = new M.B(); f.box(HW * 2, 0.012, HL, 0, '#2563eb', 0, 0.036, HL / 2, 0, 0, 0, null); f.box(HW * 2, 0.012, HL, 0, '#dc2626', 0, 0.036, -HL / 2); VN.add(f.group(false));
      // paint: centre circle + team logos
      VN.lines(VN.rect(-HW, -HL, HW, HL).concat([[-HW, 0, HW, 0]], VN.arc(0, 0, 1.8, 0, Math.PI * 2, 30), [[-HW, 3, HW, 3], [-HW, -3, HW, -3]]), 0.08, '#ffffff', 0.05);
      const b = new M.B();
      // padded walls, benches for the out players, ball racks, team banners
      [-1, 1].forEach((k) => { b.box(0.3, 1.4, HL * 2 + 3, 0.1, k > 0 ? '#1e3a8a' : '#7f1d1d', k * (HW + 2.6), 0.7, 0); b.box(HW * 2 + 5.5, 1.4, 0.3, 0.1, k > 0 ? '#1e3a8a' : '#7f1d1d', 0, 0.7, k * (HL + 1.8)); });
      [-1, 1].forEach((k) => { b.box(0.6, 0.45, 6, 0.1, '#475569', -HW - 1.9, 0.22, k * (HL - 3.5)); b.box(0.62, 0.08, 6, 0.04, k > 0 ? '#3b82f6' : '#ef4444', -HW - 1.9, 0.48, k * (HL - 3.5), 0, 0, 0, 'gloss'); });
      for (let k = 0; k < 3; k++) { b.box(0.8, 1.0, 0.5, 0.06, '#334155', HW + 1.6, 0.5, -3 + k * 3); for (let q = 0; q < 3; q++) b.sph(BR, '#ef4444', HW + 1.35 + q * 0.25, 1.1, -3 + k * 3, 1, 1, 1, 0, 0, 0, 'gloss', 10, 8); }
      VN.add(b.group(true));
      VN.stand({ x: 0, z: -HL - 5, ry: Math.PI, len: 22, rows: M.low ? 4 : 6, seats: ['#ef4444', '#f8fafc'], wall: '#7f1d1d', seed: 61 });
      VN.stand({ x: HW + 6, z: 0, ry: Math.PI / 2, len: 18, rows: M.low ? 3 : 5, seats: ['#3b82f6', '#f8fafc'], wall: '#1e3a8a', seed: 62 });
      VN.stand({ x: -HW - 6.5, z: 0, ry: -Math.PI / 2, len: 18, rows: M.low ? 3 : 5, seats: ['#3b82f6', '#ef4444'], wall: '#1e3a8a', seed: 63 });
      VN.jumbo(0, 8.5, -HL - 9.5, 0, 8, 3.8);
      E.makeModels('none', { teamShirts: ['#2563eb', '#dc2626'] });
      balls.forEach(() => { const m = M.sportBall('dodge', BR); m.traverse((q) => { if (q.isMesh) q.castShadow = true; }); V.world.add(m); bms.push(m); });
      mark = new T.Mesh(new T.ConeGeometry(0.2, 0.36, 4), new T.MeshBasicMaterial({ color: '#ffe14d' })); mark.rotation.x = Math.PI; V.world.add(mark);
      warn = new T.Mesh(new T.RingGeometry(0.5, 0.65, 28), new T.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide })); warn.rotation.x = -Math.PI / 2; V.world.add(warn);
      setupRound();
    }
    function view(dt) {
      E.syncModels(dt); balls.forEach((b, k) => { bms[k].position.set(b.x, b.y, b.z); if (b.live) bms[k].rotation.x += dt * 12; });
      const me = ctx.me, p = P[me]; mark.visible = !!p && !p.out; if (mark.visible) mark.position.set(p.x, p.y + 2.7 + Math.sin(V.t * 5) * 0.08, p.z);
      const inc = p && !p.out && incoming(me); warn.visible = !!inc; if (inc) { warn.position.set(p.x, 0.04, p.z); const s = 0.7 + Math.sin(V.t * 20) * 0.15; warn.scale.setScalar(s); }
    }
    function cam(dt, snap) { const s = side(ctx.myTeam || 0); E.fov(58); const p = P[ctx.me]; const fx = p && !p.out ? p.x * 0.3 : 0; E.camLook(fx, 9.2, s * (HL + 5.2), fx * 0.5, 0, -s * 2.2, dt, 3, snap); }
    return { S, build, sim, input, view, cam, st, balls, throwBall, pickTarget };
  };
  SP.Sports.dodgeball.rec = { '3v3': { n: 'Hits + catches in a match' } };
})();

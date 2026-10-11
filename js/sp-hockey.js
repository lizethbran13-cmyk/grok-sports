/* Grok Sports Command - DLC Ratita Stadium Night: Ice Hockey. 2v2 / 3v3 skaters + CPU goalies on a rink with boards
   and glass, gliding skating physics, stick-handling, passes, poke-checks, slap shots, golden goal */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, ST = SP.Stadium, T = THREE;
  const HW = 9, HL = 15, CR = 3.5, GW = 1.25, PR = 0.16, GZ = HL - 0.25;
  SP.Sports.hockey = function (ctx) {
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length;
    const puck = { x: 0, y: 0.05, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, v: true, owner: -1, last: -1 }; S.O.push(puck);
    const st = { phase: 'face', t: 0, clock: 150, score: [0, 0], faceT: 0, golden: false, deadT: 0, over: false };
    const side = (t) => t === 0 ? 1 : -1;   // team 0 defends z = +HL
    ctx.players.forEach((pl, i) => S.P.push({ x: 0, y: 0, z: 0, ry: 0, a: 'idle', at: 0, sd: 1, team: pl.team, vx: 0, vz: 0, mx: 0, mz: 0, stun: 0, chk: 0, cool: 0, think: 0, tx: 0, tz: 0, goals: 0 }));
    const GK = [n, n + 1]; [0, 1].forEach((t) => S.P.push({ x: 0, y: 0, z: side(t) * (GZ - 0.6), ry: t === 0 ? Math.PI : 0, a: 'ready', at: 0, sd: 1, team: t, vx: 0, vz: 0, gk: true, hold: 0, react: null }));
    const P = S.P, skaters = P.map((p, i) => i).filter((i) => !P[i].gk);
    const dist = (i) => Math.hypot(puck.x - P[i].x, puck.z - P[i].z);
    const slot = (i) => { const p = P[i], m = skaters.filter((j) => P[j].team === p.team); return m.indexOf(i); };
    function home(i) { const p = P[i], s = side(p.team), k = slot(i), m = skaters.filter((j) => P[j].team === p.team).length; const x = m === 1 ? 0 : (k / (m - 1) - 0.5) * 7; return [x, s * (k === 0 ? 1.2 : 4.5)]; }
    function faceoff() {
      st.phase = 'face'; st.faceT = 0; puck.x = 0; puck.z = 0; puck.vx = puck.vz = 0; puck.owner = -1;
      skaters.forEach((i) => { const h = home(i), p = P[i]; p.x = h[0]; p.z = h[1]; p.vx = p.vz = 0; p.ry = p.team === 0 ? Math.PI : 0; p.stun = 0; p.a = 'idle'; p.at = 0; });
      GK.forEach((g) => { const p = P[g]; p.x = 0; p.z = side(p.team) * (GZ - 0.6); p.hold = 0; });
      // the two centres line up on the dot
      [0, 1].forEach((t) => { const c = skaters.filter((j) => P[j].team === t)[0]; P[c].x = 0; P[c].z = side(t) * 0.9; }); upd();
    }
    function upd() { const h = S.hud; h.l = E.teamName(0); h.r = E.teamName(1); h.ls = st.score[0]; h.rs = st.score[1]; const c = Math.max(0, Math.ceil(st.clock)); h.mid = st.golden ? 'GOLDEN GOAL' : Math.floor(c / 60) + ':' + String(c % 60).padStart(2, '0'); VN.drawScore('RATITA STADIUM · HOCKEY', h.ls, h.rs, h.l, h.r, h.mid); h.tip = ctx.me >= 0 && puck.owner === ctx.me ? 'SWIPE to shoot · TAP to pass' : st.phase === 'face' ? 'Face-off! The puck drops in a second…' : ''; }
    /* ---------- puck ---------- */
    function hit(i, dx, dz, spd, kind) { const p = P[i], l = Math.hypot(dx, dz) || 1; puck.owner = -1; puck.vx = dx / l * spd; puck.vz = dz / l * spd; puck.last = i; puck.lastTeam = p.team; puck.kind = kind; p.cool = 0.35; E.act(p, 'swing', 1); p.ry = Math.atan2(dx, dz); ctx.ev({ t: 'fx', k: kind === 'shot' ? 'smash' : 'thunk', a: U.clamp(spd / 26, 0.2, 1) }); }
    function board(nx, nz) { const vn = puck.vx * nx + puck.vz * nz; if (vn > 0) { puck.vx -= 1.75 * vn * nx; puck.vz -= 1.75 * vn * nz; if (vn > 3) ctx.ev({ t: 'fx', k: 'thud', a: 0.4 }); } }
    function stepPuck(dt) {
      if (puck.owner >= 0) { const p = P[puck.owner], fx = Math.sin(p.ry), fz = Math.cos(p.ry); const tx = p.x + fx * 0.85 + Math.cos(p.ry) * 0.18, tz = p.z + fz * 0.85 - Math.sin(p.ry) * 0.18; puck.vx = (tx - puck.x) / dt * 0.45; puck.vz = (tz - puck.z) / dt * 0.45; puck.x += (tx - puck.x) * 0.45; puck.z += (tz - puck.z) * 0.45; return; }
      const f = Math.exp(-0.32 * dt); puck.vx *= f; puck.vz *= f; puck.x += puck.vx * dt; puck.z += puck.vz * dt; puck.ry += Math.hypot(puck.vx, puck.vz) * dt * 2;
      if (Math.abs(puck.x) > HW - PR) { puck.x = Math.sign(puck.x) * (HW - PR); board(Math.sign(puck.x), 0); }
      if (Math.abs(puck.z) > GZ - PR) {
        const t = puck.z > 0 ? 0 : 1;
        if (Math.abs(puck.x) < GW - PR * 0.5) { if (Math.abs(puck.z) > GZ + 0.35) return goal(1 - t); }
        else { puck.z = Math.sign(puck.z) * (GZ - PR); board(0, Math.sign(puck.z)); }
      }
      if (Math.abs(puck.z) > GZ + 0.8) { puck.z = Math.sign(puck.z) * (GZ + 0.8); puck.vz = 0; puck.vx *= 0.5; }
      const cx = HW - CR, cz = GZ - CR, ax = Math.abs(puck.x), az = Math.abs(puck.z);
      if (ax > cx && az > cz && az < GZ) { const dx = ax - cx, dz = az - cz, d = Math.hypot(dx, dz); if (d > CR - PR) { const nx = dx / d * Math.sign(puck.x), nz = dz / d * Math.sign(puck.z); puck.x = Math.sign(puck.x) * (cx + dx / d * (CR - PR)); puck.z = Math.sign(puck.z) * (cz + dz / d * (CR - PR)); board(nx, nz); } }
    }
    function goal(t) {
      if (st.phase !== 'play') return; st.phase = 'goal'; st.deadT = 0; st.score[t]++;
      const sc = puck.last >= 0 && P[puck.last].team === t && !P[puck.last].gk ? puck.last : -1; if (sc >= 0) { P[sc].goals++; if (ctx.isHuman(sc)) ctx.stat(sc, 'goal'); }
      ctx.ev({ t: 'msg', b: 'GOAL!', s: (sc >= 0 ? ctx.players[sc].name : E.teamName(t)) + ' scores · ' + st.score[0] + '-' + st.score[1], d: 2200 }); ctx.ev({ t: 'roar', k: 1 }); ctx.ev({ t: 'fx', k: 'buzzer' });
      ctx.ev({ t: 'party', x: puck.x, y: 2, z: puck.z, n: 60 }); ctx.ev({ t: 'shake', k: 0.25 });
      P.forEach((p) => { if (!p.gk) E.act(p, p.team === t ? 'cheer' : 'sad'); }); st.lastGoal = t; upd();
      if (st.golden) end();
    }
    function end() {
      st.over = true; st.phase = 'over'; const w = st.score[0] > st.score[1] ? 0 : st.score[1] > st.score[0] ? 1 : -1; upd(); ctx.ev({ t: 'fx', k: 'buzzer' }); ctx.ev({ t: 'roar', k: 1 });
      const score = {}; skaters.forEach((i) => { score[i] = P[i].goals; }); const top = skaters.slice().sort((a, b) => P[b].goals - P[a].goals)[0];
      ctx.end({ win: w, title: w < 0 ? 'Draw ' + st.score[0] + '-' + st.score[1] : E.wins(w) + ' ' + st.score[w] + '-' + st.score[1 - w], lines: [P[top].goals ? 'Top scorer: ' + ctx.players[top].name + ' (' + P[top].goals + ')' : 'A goalie battle!'], score });
    }
    /* ---------- control ---------- */
    function input(i, ev) {
      const p = P[i]; if (!p || p.gk) return;
      if (ev.k === 'assist') { ctx.cfg.assist = ctx.cfg.assist || {}; ctx.cfg.assist[i] = !!ev.on; return; }
      if (ev.k === 'move') { p.mx = U.clamp(+ev.x || 0, -1, 1); p.mz = U.clamp(+ev.z || 0, -1, 1); return; }
      if (st.phase !== 'play') return;
      if (ev.k === 'tap') { if (puck.owner === i) pass(i); else check(i); return; }
      if (ev.k === 'swipe') {
        const wx = +ev.x || 0, wz = +ev.z || 0, pow = U.clamp(+ev.power || 0.5, 0.1, 1);
        if (puck.owner !== i) { if (dist(i) < 2.4) { p.ry = Math.atan2(wx, wz); check(i); } return; }
        if (-side(p.team) * wz > 0.2) shoot(i, wx, wz, pow, ctx.assist(i)); else hit(i, wx, wz, 9 + pow * 10, 'pass');
      }
    }
    function shoot(i, wx, wz, pow, assist) {
      const p = P[i], s = side(p.team), gz = -s * (GZ + 0.4), t = Math.abs(wz) > 0.05 ? (gz - p.z) / wz : 99; let gx = p.x + wx * t;
      const gk = P[GK[1 - p.team]];
      if (assist) gx = U.clamp(U.lerp(gx, (gk.x > 0 ? -1 : 1) * GW * 0.7, 0.55), -GW + 0.25, GW - 0.25);
      const d = Math.hypot(gx - p.x, gz - p.z); gx += Ph.gauss(R) * ((assist ? 0.22 : 0.4) + d * 0.02 + (pow > 0.95 ? 0.35 : 0));
      hit(i, gx - p.x, gz - p.z, 15 + pow * 15, 'shot'); ctx.ev({ t: 'roar', k: 0.5 });
    }
    function pass(i) {
      const p = P[i], m = skaters.filter((j) => j !== i && P[j].team === p.team); if (!m.length) { const s = side(p.team); hit(i, Math.sin(p.ry), Math.cos(p.ry) - s * 0.3, 12, 'pass'); return; }
      const s = side(p.team); let best = m[0], bs = -1e9;
      m.forEach((j) => { const q = P[j]; let sc = -s * (q.z - p.z) * 0.5 - Math.hypot(q.x - p.x, q.z - p.z) * 0.12; P.forEach((o) => { if (o.team !== p.team && !o.gk) sc -= 3 / (0.5 + Math.hypot(o.x - q.x, o.z - q.z)); }); if (sc > bs) { bs = sc; best = j; } });
      const q = P[best], tx = q.x + q.vx * 0.35, tz = q.z + q.vz * 0.35, d = Math.hypot(tx - p.x, tz - p.z); hit(i, tx - p.x, tz - p.z, U.clamp(6 + d * 0.9, 8, 18), 'pass');
    }
    function check(i) { const p = P[i]; if (p.cool > 0 || p.chk > 0) return; p.chk = 0.35; p.cool = 0.8; E.act(p, 'swing', -1); if (dist(i) < 3) p.ry = Math.atan2(puck.x - p.x, puck.z - p.z); }
    /* ---------- step ---------- */
    function skate(p, dx, dz, spd, dt) { const l = Math.hypot(dx, dz); const tvx = l > 0.05 ? dx / Math.max(1, l) * spd : 0, tvz = l > 0.05 ? dz / Math.max(1, l) * spd : 0; const k = Math.min(1, dt * (l > 0.05 ? 3.2 : 1.1)); p.vx += (tvx - p.vx) * k; p.vz += (tvz - p.vz) * k; p.x += p.vx * dt; p.z += p.vz * dt; const sp = Math.hypot(p.vx, p.vz); if (sp > 0.4 && p.a === 'idle') p.ry = U.lerpAng(p.ry, Math.atan2(p.vx, p.vz), Math.min(1, dt * 9)); }
    function toward(p, tx, tz, spd, dt) { const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); skate(p, d > 0.3 ? dx / d * Math.min(1, d / 1.5) : 0, d > 0.3 ? dz / d * Math.min(1, d / 1.5) : 0, spd, dt); }
    function sim(dt) {
      st.t += dt;
      if (st.phase === 'face') { st.faceT += dt; P.forEach((p) => { p.at += 0; }); if (st.faceT > 1.4) { st.phase = 'play'; ctx.ev({ t: 'fx', k: 'whistle' }); const c = skaters.filter((j) => P[j].team === (R() < 0.5 ? 0 : 1))[0]; puck.owner = c; puck.last = c; } upd(); return; }
      if (st.phase === 'goal') { st.deadT += dt; stepPuck(dt); P.forEach((p) => { p.x += p.vx * dt; p.z += p.vz * dt; p.vx *= 0.97; p.vz *= 0.97; }); if (st.deadT > 2.6) { if (st.clock <= 0 && !st.golden) return timeUp(); faceoff(); } return; }
      if (st.phase !== 'play') return;
      st.clock -= dt; if (st.clock <= 0) return timeUp();
      P.forEach((p) => { p.cool = Math.max(0, (p.cool || 0) - dt); p.stun = Math.max(0, (p.stun || 0) - dt); if (p.chk > 0) p.chk -= dt; if (p.a !== 'idle' && p.a !== 'ready' && p.at > 0.5) { p.a = p.gk ? 'ready' : 'idle'; p.at = 0; } });
      skaters.forEach((i) => control(i, dt));
      for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) { const p = P[a], q = P[b], dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz); if (d < 0.85 && d > 1e-3) { const k = (0.85 - d) / d * 0.5; if (!p.gk) { p.x += dx * k; p.z += dz * k; } if (!q.gk) { q.x -= dx * k; q.z -= dz * k; } } }
      P.forEach((p) => { const lim = HW - 0.45; if (Math.abs(p.x) > lim) { p.x = Math.sign(p.x) * lim; p.vx *= -0.3; } const lz = GZ - 0.5; if (Math.abs(p.z) > lz) { p.z = Math.sign(p.z) * lz; p.vz *= -0.3; } });
      stepPuck(dt); if (st.phase !== 'play') return; possession(); goalies(dt); upd();
    }
    function timeUp() { if (st.score[0] === st.score[1] && !st.golden) { st.golden = true; st.clock = 60; ctx.ev({ t: 'msg', b: 'GOLDEN GOAL!', s: 'Next goal wins!', d: 2200 }); ctx.ev({ t: 'fx', k: 'buzzer' }); faceoff(); return; } end(); }
    function possession() {
      P.forEach((p, i) => { if (p.chk > 0 && puck.owner !== i) { const fx = p.x + Math.sin(p.ry) * 0.8, fz = p.z + Math.cos(p.ry) * 0.8; if (Math.hypot(puck.x - fx, puck.z - fz) < 0.95) { const o = puck.owner; if (o >= 0 && P[o].team !== p.team) { P[o].stun = 0.6; E.act(P[o], 'sad'); } if (o < 0 || P[o].team !== p.team) { puck.owner = i; puck.last = i; p.chk = 0; ctx.ev({ t: 'fx', k: 'thud' }); } } } });
      if (puck.owner >= 0) return;
      const sp = Math.hypot(puck.vx, puck.vz); let best = -1, bd = 0.9;
      skaters.forEach((i) => { const p = P[i]; if (p.cool > 0 && puck.last === i) return; if (p.stun > 0) return; const fx = p.x + Math.sin(p.ry) * 0.6, fz = p.z + Math.cos(p.ry) * 0.6, d = Math.min(Math.hypot(puck.x - fx, puck.z - fz), Math.hypot(puck.x - p.x, puck.z - p.z)); const lim = sp > 18 ? 0.5 : 0.9; if (d < lim && d < bd) { bd = d; best = i; } });
      if (best >= 0) { puck.owner = best; puck.last = best; }
    }
    function control(i, dt) {
      const p = P[i], hum = ctx.isHuman(i), spd = 7.4 * (hum ? 1 : ctx.D.speed) * (puck.owner === i ? 0.9 : 1);
      if (p.stun > 0) { skate(p, 0, 0, 0, dt); return; }
      if (hum && (Math.abs(p.mx) > 0.08 || Math.abs(p.mz) > 0.08)) { skate(p, p.mx, p.mz, spd, dt); p.ry = U.lerpAng(p.ry, Math.atan2(p.mx, p.mz), Math.min(1, dt * 10)); return; }
      if (hum && !ctx.assist(i)) { skate(p, 0, 0, 0, dt); return; }
      if (hum) { if (puck.owner === i) { skate(p, 0, 0, 0, dt); return; } const t = target(i); toward(p, t[0], t[1], spd * 0.9, dt); return; }
      ai(i, dt, spd);
    }
    function target(i) {
      const p = P[i], s = side(p.team), mates = skaters.filter((j) => P[j].team === p.team), own = puck.owner >= 0 && P[puck.owner].team === p.team;
      const chaser = mates.slice().sort((a, b) => dist(a) - dist(b))[0];
      if (puck.owner === i) return [p.x, p.z - s * 3];
      if (!own && chaser === i) { const lead = Math.min(0.45, dist(i) / 16); return [puck.x + puck.vx * lead, puck.z + puck.vz * lead]; }
      if (own) { const k = slot(i) % 2 ? 1 : -1; return [U.clamp(puck.x * 0.3 + k * 4, -HW + 1.5, HW - 1.5), U.clamp(puck.z - s * 5, -HL + 3, HL - 3)]; }
      return [puck.x * 0.5, U.lerp(puck.z, s * GZ, 0.45)];
    }
    function ai(i, dt, spd) {
      const p = P[i], s = side(p.team), d = ctx.D; p.think -= dt;
      if (puck.owner === i) {
        if (p.think > 0) { toward(p, p.tx, p.tz, spd, dt); return; }
        p.think = 0.15 + d.react * 0.4; const gz = -s * GZ, dg = Math.hypot(p.x, gz - p.z);
        let press = 99; skaters.forEach((j) => { const o = P[j]; if (o.team !== p.team) press = Math.min(press, Math.hypot(o.x - p.x, o.z - p.z)); });
        if (dg < 6 + d.smart * 6 && R() < 0.35 + d.smart * 0.4) { const gk = P[GK[1 - p.team]]; let gx = (gk.x > 0 ? -1 : 1) * GW * (0.4 + R() * 0.45) + Ph.gauss(R) * (0.3 + d.aim * 0.9); hit(i, gx - p.x, -s * (GZ + 0.4) - p.z, 15 + d.power * 12, 'shot'); return; }
        if (press < 1.8 && R() < 0.3 + d.smart * 0.3) { pass(i); return; }
        let ax = 0; skaters.forEach((j) => { const o = P[j]; if (o.team !== p.team) { const dx = p.x - o.x, dd = Math.hypot(dx, p.z - o.z); if (dd < 4 && -s * (o.z - p.z) > -0.5) ax += Math.sign(dx || 1) * (4 - dd) * 0.8; } });
        p.tx = U.clamp(p.x + ax, -HW + 1.5, HW - 1.5); p.tz = p.z - s * 4; toward(p, p.tx, p.tz, spd, dt); return;
      }
      const t = target(i); toward(p, t[0], t[1], spd, dt);
      if (puck.owner >= 0 && P[puck.owner].team !== p.team && dist(i) < 1.7 && p.cool <= 0 && R() < dt * (1.2 + d.smart * 3)) { p.ry = Math.atan2(puck.x - p.x, puck.z - p.z); check(i); }
    }
    function goalies(dt) {
      GK.forEach((g) => {
        const p = P[g], s = side(p.team), gz = s * (GZ - 0.6), gd = ctx.D;
        if (puck.owner === g) { p.hold += dt; puck.x = p.x; puck.z = p.z - s * 0.7; puck.vx = puck.vz = 0; if (p.hold > 0.9) { const m = skaters.filter((j) => P[j].team === p.team); let best = m[0]; m.forEach((j) => { if (Math.abs(P[j].x) > Math.abs(P[best].x)) best = j; }); const q = P[best]; puck.owner = -1; const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1; puck.vx = dx / l * 13; puck.vz = dz / l * 13; puck.last = g; p.cool = 0.5; E.act(p, 'swing', 1); ctx.ev({ t: 'fx', k: 'thunk' }); } return; }
        const toward_ = puck.vz * s > 4 && puck.owner < 0 && Math.abs(puck.z - gz) < 14;
        let tx = U.clamp(puck.x * 0.32, -GW + 0.35, GW - 0.35);
        if (toward_) { const tt = (gz - puck.z) / puck.vz, cx = puck.x + puck.vx * tt; if (Math.abs(cx) < GW + 0.5) { p.react = (p.react == null ? gd.react * 0.7 : p.react) - dt; if (p.react <= 0) { tx = U.clamp(cx, -GW, GW); if (Math.abs(cx - p.x) > 0.5 && p.a !== 'dive') E.act(p, 'dive', Math.sign(cx - p.x)); } } }
        else p.react = null;
        const mv = U.clamp(tx - p.x, -dt * (5 + gd.grab * 4), dt * (5 + gd.grab * 4)); p.x += mv; p.z += (gz - p.z) * Math.min(1, dt * 6); p.ry = s > 0 ? Math.PI : 0;
        const reach = 0.55 + gd.grab * 0.45 + (p.a === 'dive' ? 0.25 : 0);
        if (puck.owner < 0 && p.cool <= 0 && Math.abs(puck.z - p.z) < 0.5 && Math.abs(puck.x - p.x) < reach) { const sp = Math.hypot(puck.vx, puck.vz); if (sp < 14 || R() < 0.4) { puck.owner = g; p.hold = 0; ctx.ev({ t: 'fx', k: 'catch' }); } else { puck.vz = -puck.vz * 0.45; puck.vx = (R() - 0.5) * 10; puck.last = g; ctx.ev({ t: 'fx', k: 'thud' }); } ctx.ev({ t: 'msg', b: 'SAVE!', s: 'What a stop!', d: 900 }); ctx.ev({ t: 'roar', k: 0.6 }); p.react = null; p.cool = 0.3; }
        p.cool = Math.max(0, (p.cool || 0) - dt);
      });
    }
    /* ---------- view ---------- */
    let puckM, mark;
    function build() {
      rink(); E.makeModels('stick', { teamShirts: ['#2563eb', '#e11d48'] });
      GK.forEach((g) => { const p = P[g]; const lk = Object.assign(D.aiLook(70 + g), { shirt: p.team ? '#9f1239' : '#1e3a8a', shorts: '#111827', hat: 'cap', hatCol: '#f8fafc', tool: 'stick', toolCol: '#f8fafc' }); const m = M.athlete(lk);
        const pads = new M.B(); [-1, 1].forEach((q) => pads.box(0.2, 0.55, 0.16, 0.05, '#f8fafc', q * 0.11, -0.62, 0.06)); m.userData.hips.add(pads.group(true));
        if (!M.low) M.outline(m); m.traverse((q) => { if (q.isMesh) q.castShadow = !M.low; }); V.world.add(m); m.userData.prev = null; ctx.models.push(m); });
      const pb = new M.B(); pb.cyl(PR, PR, 0.07, '#111827', 0, 0, 0, 0, 0, 0, 'gloss', 20); pb.tor(PR * 0.98, 0.008, '#facc15', 0, 0.036, 0, Math.PI / 2, 0, 0); puckM = pb.group(true); V.world.add(puckM);
      mark = new T.Mesh(new T.ConeGeometry(0.22, 0.4, 4), new T.MeshBasicMaterial({ color: '#ffe14d' })); mark.rotation.x = Math.PI; V.world.add(mark);
      V.env(ST.ENV); faceoff();
    }
    function view(dt) { E.syncModels(dt); puckM.position.set(puck.x, 0.05, puck.z); puckM.rotation.y = puck.ry || 0; const me = ctx.me; mark.visible = me >= 0 && !!P[me]; if (mark.visible) mark.position.set(P[me].x, 2.75 + Math.sin(V.t * 5) * 0.1, P[me].z); }
    function cam(dt, snap) { const me = ctx.me >= 0 ? ctx.me : 0, s = side(P[me] ? P[me].team : 0), fx = U.clamp(puck.x, -HW + 3, HW - 3) * 0.7, fz = U.clamp(puck.z, -HL + 4, HL - 4); E.fov(58); E.camLook(fx, 13, fz + s * 12, fx, 0, fz - s * 2.5, dt, 3.5, snap); }
    return { S, build, sim, input, view, cam, st, puck, GK };
  };
  SP.Sports.hockey.rec = { '2v2': { n: 'Goals in a match' }, '3v3': { n: 'Goals in a match' } };
  function rink() {
    const g = ST.venue(HW * 2, HL * 2, { gap: 3.2 });
    const b = new M.B();
    // ice: rounded-rect slab, glossy
    const sh = new T.Shape(), cx = HW - CR, cz = HL - CR;
    sh.moveTo(-cx, -HL); sh.lineTo(cx, -HL); sh.absarc(cx, -cz, CR, -Math.PI / 2, 0, false); sh.lineTo(HW, cz); sh.absarc(cx, cz, CR, 0, Math.PI / 2, false); sh.lineTo(-cx, HL); sh.absarc(-cx, cz, CR, Math.PI / 2, Math.PI, false); sh.lineTo(-HW, -cz); sh.absarc(-cx, -cz, CR, Math.PI, Math.PI * 1.5, false);
    const ice = new T.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false, curveSegments: 10 }); ice.rotateX(Math.PI / 2); b.geo(ice, '#eaf6ff', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'gloss');
    // lines: red centre, blue lines, goal lines, face-off circles + dots, centre Ratita cheese logo
    b.box(HW * 2 - 0.4, 0.012, 0.3, 0, '#dc2626', 0, 0.006, 0); [-1, 1].forEach((k) => { b.box(HW * 2 - 0.4, 0.012, 0.3, 0, '#2563eb', 0, 0.006, k * 5); b.box(HW * 2 - 2.2, 0.012, 0.08, 0, '#dc2626', 0, 0.006, k * GZ); });
    const ring = (x, z, r, col) => { const rg = new T.RingGeometry(r - 0.07, r, 40); rg.rotateX(-Math.PI / 2); b.geo(rg, col, x, 0.008, z); };
    ring(0, 0, 2.3, '#2563eb'); [[-4.5, 9.5], [4.5, 9.5], [-4.5, -9.5], [4.5, -9.5]].forEach((q) => { ring(q[0], q[1], 2.1, '#dc2626'); b.cyl(0.25, 0.25, 0.012, '#dc2626', q[0], 0.008, q[1], 0, 0, 0, null, 16); });
    [-1, 1].forEach((k) => { const cr = new T.CircleGeometry(1.25, 24, 0, Math.PI); cr.rotateX(-Math.PI / 2); if (k > 0) cr.rotateY(Math.PI); b.geo(cr, '#93c5fd', 0, 0.007, k * GZ); });
    const wedge = new T.Shape(); wedge.moveTo(-1.1, 0.7); wedge.lineTo(1.2, 0.7); wedge.lineTo(-1.1, -0.8); wedge.lineTo(-1.1, 0.7); const wg = new T.ShapeGeometry(wedge); wg.rotateX(-Math.PI / 2); b.geo(wg, '#facc15', 0, 0.009, 0);
    [[-0.5, 0.2, 0.22], [0.1, 0.35, 0.15], [-0.7, -0.3, 0.16]].forEach((q) => b.cyl(q[2], q[2], 0.012, '#d97706', q[0], 0.011, q[1], 0, 0, 0, null, 14));
    // boards (yellow kick rail) + glass + rounded corners
    const seg = (x1, z1, x2, z2, col) => { const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), a = Math.atan2(dx, dz), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2; b.box(0.22, 1.05, L + 0.04, 0.05, col || '#f8fafc', mx, 0.52, mz, 0, a, 0); b.box(0.26, 0.16, L + 0.05, 0.04, '#facc15', mx, 1.05, mz, 0, a, 0, 'gloss'); b.box(0.24, 0.1, L + 0.05, 0, '#1e3a8a', mx, 0.08, mz, 0, a, 0); };
    const ads = ['#f8fafc', '#fef3c7', '#f8fafc', '#e0f2fe']; for (let i = 0; i < 6; i++) [-1, 1].forEach((k) => { const z0 = -cz + i * (2 * cz) / 6, z1 = z0 + (2 * cz) / 6; seg(k * (HW + 0.11), z0, k * (HW + 0.11), z1, ads[(i + (k > 0 ? 1 : 0)) % 4]); });
    [-1, 1].forEach((k) => { [-1, 1].forEach((q) => seg(q * GW, k * (HL + 0.11), q * cx, k * (HL + 0.11))); });
    for (let c = 0; c < 4; c++) { const sx = c & 1 ? 1 : -1, sz = c & 2 ? 1 : -1; for (let a = 0; a < 6; a++) { const a0 = a / 6 * Math.PI / 2, a1 = (a + 1) / 6 * Math.PI / 2, r = CR + 0.11; seg(sx * (cx + Math.sin(a0) * r), sz * (cz + Math.cos(a0) * r), sx * (cx + Math.sin(a1) * r), sz * (cz + Math.cos(a1) * r)); } }
    // goals: red pipe frame + white mesh net (in the end boards, like the arena soccer goals)
    [-1, 1].forEach((k) => { const z = k * GZ; [-1, 1].forEach((q) => b.cyl(0.06, 0.06, 1.15, '#dc2626', q * GW, 0.58, z, 0, 0, 0, 'gloss', 10)); b.cyl(0.06, 0.06, GW * 2, '#dc2626', 0, 1.15, z, 0, 0, Math.PI / 2, 'gloss', 10);
      for (let i = 0; i <= 10; i++) b.box(0.012, 1.1, 0.012, 0, '#f1f5f9', -GW + i * GW / 5, 0.56, z + k * 0.85); for (let j = 0; j <= 5; j++) b.box(GW * 2, 0.012, 0.012, 0, '#f1f5f9', 0, j * 0.22, z + k * 0.85);
      for (let i = 0; i <= 5; i++) b.box(0.012, 0.012, 0.85, 0, '#f1f5f9', -GW + i * GW * 0.4, 1.12, z + k * 0.42); [-1, 1].forEach((q) => { for (let j = 0; j <= 5; j++) b.box(0.012, 0.012, 0.85, 0, '#f1f5f9', q * GW, j * 0.22, z + k * 0.42); }); b.box(GW * 2 + 0.3, 0.06, 1.0, 0.02, '#e2e8f0', 0, 0.03, z + k * 0.45); });
    const m = b.group(true); m.traverse((q) => { if (q.isMesh) q.receiveShadow = true; }); VN.add(m);
    const glass = new M.B(); [-1, 1].forEach((k) => glass.box(0.05, 1.3, HL * 2 - 2 * CR, 0, '#ffffff', k * (HW + 0.13), 1.8, 0)); [-1, 1].forEach((k) => glass.box(HW * 2 - 2 * CR, 1.6, 0.05, 0, '#ffffff', 0, 1.95, k * (HL + 0.13)));
    const gm = new T.Mesh(glass.geometry(), M.glassMat); VN.add(gm);
    void g;
  }
})();

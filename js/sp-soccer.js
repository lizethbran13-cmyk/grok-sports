/* Grok Sports Command - Soccer: 3v3 arena match (walls, keepers, passing, tackles, golden goal) + penalty shootout */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, T = THREE;
  const HW = 12, HL = 18, GW = 2.6, GH = 2.2, BR = 0.11, G = 9.8;
  SP.Sports.soccer = function (ctx) {
    if (ctx.mode.id === 'shootout') return shootout(ctx);
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length;
    const ball = { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, v: true, owner: -1, last: -1, lastTeam: -1, cool: [] }; S.O.push(ball);
    const st = { phase: 'kickoff', t: 0, clock: 180, score: [0, 0], kickT: 0, kickTeam: 0, golden: false, deadT: 0, over: false };
    const side = (t) => t === 0 ? 1 : -1;   // team 0 defends z = +HL
    // roles: keeper = a CPU on the team if there is one (humans play in the field)
    const roles = [];
    [0, 1].forEach((t) => { const m = ctx.players.map((p, i) => i).filter((i) => ctx.players[i].team === t); const ai = m.filter((i) => !ctx.isHuman(i)); const gk = ai.length ? ai[0] : m[m.length - 1]; let f = 0; m.forEach((i) => { roles[i] = i === gk ? { gk: true, k: 0 } : { gk: false, k: ++f }; }); });
    ctx.players.forEach((pl, i) => S.P.push({ x: 0, y: 0, z: 0, ry: 0, a: 'idle', at: 0, sd: 1, team: pl.team, mx: 0, mz: 0, stun: 0, tackT: 0, cool: 0, aiT: 0, think: 0, tx: 0, tz: 0, stats: { goals: 0 } }));
    const P = S.P, isGK = (i) => roles[i].gk;
    const goalZ = (t) => side(t) * HL;   // own goal line
    function home(i) { const p = P[i], s = side(p.team), r = roles[i]; if (r.gk) return [0, s * (HL - 0.8)]; const off = st.phase === 'kickoff' ? 0 : 0; return [r.k === 1 ? -4.5 : 4.5, s * (st.phase === 'kickoff' ? 5 : 7) + off]; }
    function kickoff(t) {
      st.phase = 'kickoff'; st.kickT = 0; st.kickTeam = t; ball.x = 0; ball.z = 0; ball.y = BR; ball.vx = ball.vy = ball.vz = 0; ball.owner = -1;
      P.forEach((p, i) => { const h = home(i); p.x = h[0]; p.z = h[1]; p.ry = p.team === 0 ? Math.PI : 0; p.stun = 0; p.a = 'idle'; p.at = 0; });
      const taker = P.map((p, i) => i).filter((i) => P[i].team === t && !isGK(i))[0]; P[taker].x = 0; P[taker].z = side(t) * 0.7; st.taker = taker;
      upd();
    }
    function upd() { const h = S.hud; h.l = E.teamName(0); h.r = E.teamName(1); h.ls = st.score[0]; h.rs = st.score[1]; const c = Math.max(0, Math.ceil(st.clock)); h.mid = st.golden ? 'GOLDEN GOAL' : Math.floor(c / 60) + ':' + String(c % 60).padStart(2, '0'); VN.drawScore('GROK ARENA', h.ls, h.rs, h.l, h.r, h.mid); h.tip = ctx.me >= 0 && ball.owner === ctx.me ? 'SWIPE to shoot · TAP to pass' : ''; }
    /* ---------- ball ---------- */
    function kick(i, dx, dz, spd, lift, kind) {
      const p = P[i], l = Math.hypot(dx, dz) || 1; ball.owner = -1; ball.vx = dx / l * spd; ball.vz = dz / l * spd; ball.vy = lift; ball.y = Math.max(ball.y, BR + 0.02); ball.last = i; ball.lastTeam = p.team; ball.kickT = st.t; ball.kind = kind;
      p.cool = 0.35; E.act(p, 'kick', 1); ctx.ev({ t: 'fx', k: 'kick', a: U.clamp(spd / 24, 0.2, 1) }); p.ry = Math.atan2(dx, dz);
    }
    function stepBall(dt) {
      if (ball.owner >= 0) { const p = P[ball.owner], fx = Math.sin(p.ry), fz = Math.cos(p.ry); const tx = p.x + fx * 0.55, tz = p.z + fz * 0.55; ball.vx = (tx - ball.x) / dt * 0.5; ball.vz = (tz - ball.z) / dt * 0.5; ball.x += (tx - ball.x) * 0.5; ball.z += (tz - ball.z) * 0.5; ball.y = BR + Math.abs(Math.sin(st.t * 9)) * 0.06; ball.vy = 0; return; }
      Ph.step(ball, dt, G, 0.05);
      if (ball.y < BR) { ball.y = BR; if (ball.vy < -1.5) { ball.vy = -ball.vy * 0.5; ctx.ev({ t: 'fx', k: 'thud' }); } else ball.vy = 0; }
      if (ball.y <= BR + 0.01) { const f = Math.exp(-0.75 * dt); ball.vx *= f; ball.vz *= f; }
      // side boards
      if (Math.abs(ball.x) > HW - BR) { ball.x = Math.sign(ball.x) * (HW - BR); ball.vx *= -0.7; ctx.ev({ t: 'fx', k: 'thud' }); }
      // goals / end boards
      if (Math.abs(ball.z) > HL - BR) {
        const t = ball.z > 0 ? 0 : 1;   // whose goal
        if (Math.abs(ball.x) < GW - BR && ball.y < GH) { if (Math.abs(ball.z) > HL + 0.3) return goal(1 - t); }
        else { ball.z = Math.sign(ball.z) * (HL - BR); ball.vz *= -0.7; ctx.ev({ t: 'fx', k: 'thud' }); }
      }
      if (Math.abs(ball.z) > HL + 1.2) { ball.z = Math.sign(ball.z) * (HL + 1.2); ball.vz = 0; }
      // corner rounding
      const cx = HW - 3, cz = HL - 3, ax = Math.abs(ball.x), az = Math.abs(ball.z);
      if (ax > cx && az > cz && az < HL) { const dx = ax - cx, dz = az - cz, d = Math.hypot(dx, dz); if (d > 3 - BR) { const nx = dx / d * Math.sign(ball.x), nz = dz / d * Math.sign(ball.z); ball.x = Math.sign(ball.x) * (cx + dx / d * (3 - BR)); ball.z = Math.sign(ball.z) * (cz + dz / d * (3 - BR)); const vn = ball.vx * nx + ball.vz * nz; if (vn > 0) { ball.vx -= 1.7 * vn * nx; ball.vz -= 1.7 * vn * nz; } } }
    }
    function goal(t) {
      if (st.phase !== 'play') return; st.phase = 'goal'; st.deadT = 0; st.score[t]++;
      const sc = ball.last >= 0 && P[ball.last].team === t ? ball.last : -1; if (sc >= 0) { P[sc].stats.goals++; if (ctx.isHuman(sc)) ctx.stat(sc, 'goal'); }
      ctx.ev({ t: 'msg', b: 'GOOOAL!', s: (sc >= 0 ? ctx.players[sc].name : E.teamName(t)) + ' scores · ' + st.score[0] + '-' + st.score[1], d: 2200 }); ctx.ev({ t: 'roar', k: 1 }); ctx.ev({ t: 'fx', k: 'whistle' });
      ctx.ev({ t: 'party', x: ball.x, y: 2, z: ball.z, n: 60 }); ctx.ev({ t: 'shake', k: 0.25 });
      P.forEach((p) => E.act(p, p.team === t ? 'cheer' : 'sad')); st.lastGoal = t; upd();
      if (st.golden) return end();
    }
    function end() {
      st.over = true; st.phase = 'over'; const w = st.score[0] > st.score[1] ? 0 : st.score[1] > st.score[0] ? 1 : -1; upd();
      ctx.ev({ t: 'fx', k: 'whistle' }); ctx.ev({ t: 'roar', k: 1 });
      const score = {}; P.forEach((p, i) => { score[i] = p.stats.goals; });
      const top = P.map((p, i) => i).sort((a, b) => P[b].stats.goals - P[a].stats.goals)[0];
      ctx.end({ win: w, title: w < 0 ? 'Draw ' + st.score[0] + '-' + st.score[1] : E.wins(w) + ' ' + st.score[w] + '-' + st.score[1 - w], lines: [P[top].stats.goals ? 'Top scorer: ' + ctx.players[top].name + ' (' + P[top].stats.goals + ')' : 'No goals scored!'], score });
    }
    /* ---------- control ---------- */
    function input(i, ev) {
      const p = P[i]; if (!p) return;
      if (ev.k === 'assist') { ctx.cfg.assist = ctx.cfg.assist || {}; ctx.cfg.assist[i] = !!ev.on; return; }
      if (ev.k === 'move') { p.mx = U.clamp(+ev.x || 0, -1, 1); p.mz = U.clamp(+ev.z || 0, -1, 1); return; }
      if (st.phase === 'kickoff' && st.taker === i && (ev.k === 'tap' || ev.k === 'swipe')) { start(); }
      if (st.phase !== 'play') return;
      if (ev.k === 'tap') { if (ball.owner === i) pass(i); else tackle(i); return; }
      if (ev.k === 'swipe') {
        const wx = +ev.x || 0, wz = +ev.z || 0, pow = U.clamp(+ev.power || 0.5, 0.1, 1);
        if (ball.owner !== i) { if (dist(i) < 2.2 && p.cool <= 0) { p.ry = Math.atan2(wx, wz); tackle(i); } return; }
        const s = side(p.team), toGoal = -s * wz;
        if (toGoal > 0.25) shoot(i, wx, wz, pow, ctx.assist(i)); else kick(i, wx, wz, 9 + pow * 12, pow * 2, 'pass');
      }
    }
    const dist = (i) => Math.hypot(ball.x - P[i].x, ball.z - P[i].z);
    function shoot(i, wx, wz, pow, assist) {
      const p = P[i], s = side(p.team), gz = -s * (HL + 0.5);
      // where does the swipe point at the goal line?
      const t = Math.abs(wz) > 0.05 ? (gz - p.z) / wz : 99; let gx = p.x + wx * t;
      if (assist) gx = U.clamp(U.lerp(gx, Math.sign(gx || (R() - 0.5)) * GW * 0.65, 0.5), -GW + 0.4, GW - 0.4);
      const d = Math.hypot(gx - p.x, gz - p.z), err = (assist ? 0.35 : 0.6) + d * 0.025 + (pow > 0.95 ? 0.6 : 0);
      gx += Ph.gauss(R) * err; const spd = 14 + pow * 13;
      kick(i, gx - p.x, gz - p.z, spd, 1.2 + pow * 2.6 + R() * 0.8 - (d < 8 ? 1 : 0), 'shot');
      ctx.ev({ t: 'roar', k: 0.5 });
    }
    function pass(i) {
      const p = P[i], m = P.map((q, j) => j).filter((j) => j !== i && P[j].team === p.team && !isGK(j)); if (!m.length) return;
      const s = side(p.team); let best = m[0], bs = -1e9;
      m.forEach((j) => { const q = P[j]; let sc = -s * (q.z - p.z) * 0.6 - Math.hypot(q.x - p.x, q.z - p.z) * 0.15; P.forEach((o) => { if (o.team !== p.team) sc -= 3 / (0.5 + Math.hypot(o.x - q.x, o.z - q.z)); }); if (sc > bs) { bs = sc; best = j; } });
      const q = P[best], lead = 0.35, tx = q.x + Math.sin(q.ry) * lead * 2, tz = q.z + Math.cos(q.ry) * lead * 2, d = Math.hypot(tx - p.x, tz - p.z);
      kick(i, tx - p.x, tz - p.z, U.clamp(6 + d * 0.9, 7, 18), d > 12 ? 2.5 : 0.4, 'pass');
    }
    function tackle(i) {
      const p = P[i]; if (p.cool > 0 || p.tackT > 0) return; p.tackT = 0.45; p.cool = 0.9; E.act(p, 'tackle');
      if (ball.owner < 0 && dist(i) < 3) p.ry = Math.atan2(ball.x - p.x, ball.z - p.z);
    }
    function start() { st.phase = 'play'; ctx.ev({ t: 'fx', k: 'whistle' }); const t = st.taker; const m = P.map((q, j) => j).filter((j) => j !== t && P[j].team === P[t].team && !isGK(j)); const q = P[m[0] != null ? m[0] : t]; kick(t, q.x - P[t].x, q.z - P[t].z + side(P[t].team) * 1.5, 8, 0.2, 'pass'); }
    /* ---------- step ---------- */
    function sim(dt) {
      st.t += dt;
      if (st.phase === 'kickoff') { st.kickT += dt; if (!ctx.isHuman(st.taker) && st.kickT > 1.5) start(); else if (ctx.isHuman(st.taker) && st.kickT > 6) start(); S.hud.tip = st.taker === ctx.me ? 'TAP to kick off!' : ''; return; }
      if (st.phase === 'goal') { st.deadT += dt; stepBall(dt); if (st.deadT > 2.6) { if (st.clock <= 0 && !st.golden) return timeUp(); kickoff(1 - st.lastGoal); } return; }
      if (st.phase !== 'play') return;
      st.clock -= dt; if (st.clock <= 0) return timeUp();
      P.forEach((p) => { p.cool = Math.max(0, p.cool - dt); p.stun = Math.max(0, p.stun - dt); if (p.tackT > 0) p.tackT -= dt; });
      for (let i = 0; i < n; i++) control(i, dt);
      // separation
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = P[i], b = P[j], dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < 0.8 && d > 1e-3) { const k = (0.8 - d) / d * 0.5; a.x += dx * k; a.z += dz * k; b.x -= dx * k; b.z -= dz * k; } }
      P.forEach((p, i) => { p.x = U.clamp(p.x, -HW + 0.4, HW - 0.4); p.z = U.clamp(p.z, -HL + 0.3, HL - 0.3); if (isGK(i)) { const s = side(p.team); p.z = s > 0 ? U.clamp(p.z, HL - 4.5, HL - 0.3) : U.clamp(p.z, -HL + 0.3, -HL + 4.5); } });
      stepBall(dt); possession(); keepers(dt); upd();
    }
    function timeUp() { if (st.score[0] === st.score[1] && !st.golden) { st.golden = true; st.clock = 60; ctx.ev({ t: 'msg', b: 'GOLDEN GOAL!', s: 'Next goal wins!', d: 2200 }); ctx.ev({ t: 'fx', k: 'whistle' }); kickoff(R() < 0.5 ? 0 : 1); return; } end(); }
    function possession() {
      if (ball.y > 1.0) return;
      // tackles knock the ball loose
      P.forEach((p, i) => { if (p.tackT > 0 && ball.owner !== i) { const fx = p.x + Math.sin(p.ry) * 0.5, fz = p.z + Math.cos(p.ry) * 0.5; if (Math.hypot(ball.x - fx, ball.z - fz) < 1.0) { const o = ball.owner; if (o >= 0 && P[o].team !== p.team) { P[o].stun = 0.7; E.act(P[o], 'sad'); } if (o < 0 || P[o].team !== p.team) { ball.owner = i; ball.last = i; ball.lastTeam = p.team; p.tackT = 0; ctx.ev({ t: 'fx', k: 'thud' }); } } } });
      if (ball.owner >= 0) return;
      let best = -1, bd = 0.75; const sp = Math.hypot(ball.vx, ball.vz);
      P.forEach((p, i) => { if (p.cool > 0 && ball.last === i) return; if (p.stun > 0) return; const d = Math.hypot(ball.x - p.x, ball.z - p.z); const lim = isGK(i) ? 0.9 : sp > 16 ? 0.45 : 0.75; if (d < lim && d < bd) { bd = d; best = i; } });
      if (best >= 0) { ball.owner = best; ball.last = best; ball.lastTeam = P[best].team; if (isGK(best)) P[best].gkHold = 0; }
    }
    function control(i, dt) {
      const p = P[i], hum = ctx.isHuman(i), base = 6.0 * (hum ? 1 : ctx.D.speed) * (ball.owner === i ? 0.86 : 1);
      if (p.stun > 0) return;
      if (p.tackT > 0) { p.x += Math.sin(p.ry) * 7 * dt; p.z += Math.cos(p.ry) * 7 * dt; return; }
      if (p.a !== 'idle' && p.at > 0.6) { p.a = 'idle'; p.at = 0; }
      if (hum && (Math.abs(p.mx) > 0.08 || Math.abs(p.mz) > 0.08)) { p.x += p.mx * base * dt; p.z += p.mz * base * dt; p.ry = U.lerpAng(p.ry, Math.atan2(p.mx, p.mz), Math.min(1, dt * 12)); return; }
      if (hum && !ctx.assist(i)) return;
      if (isGK(i)) return;
      if (hum) { // assist: chase loose balls / press, otherwise support
        const t = target(i, true); Ph.moveTo(p, t[0], t[1], base * 0.9, dt); return;
      }
      ai(i, dt, base);
    }
    function target(i) {
      const p = P[i], s = side(p.team), mates = P.map((q, j) => j).filter((j) => P[j].team === p.team && !isGK(j));
      const own = ball.owner >= 0 && P[ball.owner].team === p.team;
      const chaser = mates.slice().sort((a, b) => dist(a) - dist(b))[0];
      if (ball.owner === i) return [p.x, p.z - s * 3];
      if (!own && chaser === i) { const lead = Math.min(0.5, dist(i) / 14); return [ball.x + ball.vx * lead, ball.z + ball.vz * lead]; }
      if (own) { const k = roles[i].k === 1 ? -1 : 1; return [U.clamp(ball.x * 0.3 + k * 5, -HW + 2, HW - 2), U.clamp(ball.z - s * 6, -HL + 3, HL - 3)]; }
      // cover: between ball and own goal
      return [ball.x * 0.5, U.lerp(ball.z, goalZ(p.team), 0.45)];
    }
    function ai(i, dt, base) {
      const p = P[i], s = side(p.team), d = ctx.D; p.think -= dt;
      if (ball.owner === i) {
        if (p.think > 0) { Ph.moveTo(p, p.tx, p.tz, base, dt); return; }
        p.think = 0.15 + d.react * 0.4;
        const gz = -s * HL, dg = Math.hypot(p.x, gz - p.z);
        let press = 99; P.forEach((o) => { if (o.team !== p.team) press = Math.min(press, Math.hypot(o.x - p.x, o.z - p.z)); });
        if (dg < 7 + d.smart * 7 && R() < 0.35 + d.smart * 0.4) { aiShoot(i); return; }
        if (press < 1.8 && R() < 0.35 + d.smart * 0.3) { pass(i); return; }
        // dribble toward goal, sidestepping the nearest defender
        let ax = 0; P.forEach((o) => { if (o.team !== p.team) { const dx = p.x - o.x, dz = p.z - o.z, dd = Math.hypot(dx, dz); if (dd < 4 && -s * (o.z - p.z) > -0.5) ax += Math.sign(dx || 1) * (4 - dd) * 0.8; } });
        p.tx = U.clamp(p.x + ax, -HW + 1.5, HW - 1.5); p.tz = p.z - s * 4; Ph.moveTo(p, p.tx, p.tz, base, dt); return;
      }
      const t = target(i); Ph.moveTo(p, t[0], t[1], base, dt);
      // tackle the ball carrier
      if (ball.owner >= 0 && P[ball.owner].team !== p.team && dist(i) < 1.6 && p.cool <= 0) { if (R() < dt * (1.2 + d.smart * 3)) { p.ry = Math.atan2(ball.x - p.x, ball.z - p.z); tackle(i); } }
    }
    function aiShoot(i) {
      const p = P[i], s = side(p.team), d = ctx.D; const gk = P.find((q, j) => isGK(j) && q.team !== p.team);
      let gx = (gk && gk.x > 0 ? -1 : 1) * GW * (0.45 + R() * 0.4); gx += Ph.gauss(R) * (0.6 + d.aim * 1.6);
      const gz = -s * (HL + 0.5), dd = Math.hypot(gx - p.x, gz - p.z), pow = 0.55 + d.power * 0.4;
      kick(i, gx - p.x, gz - p.z, 14 + pow * 12, 1.0 + R() * 2.4 - (dd < 8 ? 0.8 : 0), 'shot');
    }
    function keepers(dt) {
      P.forEach((p, i) => {
        if (!isGK(i)) return; const s = side(p.team), gz = s * HL, hum = ctx.isHuman(i), gd = hum ? D.DIFF.normal : ctx.D;
        if (ball.owner === i) { p.gkHold = (p.gkHold || 0) + dt; if (p.gkHold > 0.9) { const m = P.map((q, j) => j).filter((j) => j !== i && P[j].team === p.team); let best = m[0]; m.forEach((j) => { if (Math.abs(P[j].x) > Math.abs(P[best].x)) best = j; }); const q = P[best]; kick(i, q.x - p.x, q.z - p.z, 13, 3.5, 'pass'); } return; }
        // shot coming?
        const toward = ball.vz * s > 4 && ball.owner < 0 && Math.abs(ball.z - gz) < 16;
        if (toward) {
          const tt = (gz - s * 0.4 - ball.z) / ball.vz, cx = ball.x + ball.vx * tt;
          if (Math.abs(cx) < GW + 0.6) {
            p.react = (p.react == null ? gd.react * 0.8 : p.react) - dt;
            if (p.react <= 0) { const reach = 1.2 + gd.grab * 1.4, mv = U.clamp(cx - p.x, -reach, reach); p.x += U.clamp(mv, -dt * 9, dt * 9); if (Math.abs(cx - p.x) > 0.6 && p.a !== 'dive') E.act(p, 'dive', Math.sign(cx - p.x)); }
            if (Math.hypot(ball.x - p.x, ball.z - p.z) < 1.0 + gd.grab * 0.5 && ball.y < 2.4) save(i);
            return;
          }
        }
        p.react = null;
        const tx = U.clamp(ball.x * 0.35, -GW + 0.5, GW - 0.5), tz = gz - s * (0.7 + Math.max(0, 6 - Math.abs(ball.z - gz)) * 0.12);
        Ph.moveTo(p, tx, tz, 5.5, dt); p.ry = s > 0 ? Math.PI : 0;
        if (Math.hypot(ball.x - p.x, ball.z - p.z) < 1.2 && ball.owner >= 0 && P[ball.owner].team !== p.team && R() < dt * 2) tackle(i);
      });
    }
    function save(i) {
      const p = P[i], sp = Math.hypot(ball.vx, ball.vz);
      if (sp < 15 || R() < 0.35) { ball.owner = i; ball.last = i; ball.lastTeam = p.team; ball.vx = ball.vz = ball.vy = 0; p.gkHold = 0; ctx.ev({ t: 'fx', k: 'catch' }); }
      else { ball.vz = -ball.vz * 0.4; ball.vx = (R() - 0.5) * 12; ball.vy = 3; ball.last = i; ball.lastTeam = p.team; ctx.ev({ t: 'fx', k: 'thud' }); }
      ctx.ev({ t: 'msg', b: 'SAVED!', s: ctx.players[i].name, d: 1000 }); ctx.ev({ t: 'roar', k: 0.7 }); p.react = null;
    }
    /* ---------- view ---------- */
    let ballM, shadow, mark;
    function build() {
      arena(); E.makeModels('none', { teamShirts: ['#2563eb', '#e11d48'] });
      ballM = M.sportBall('soccer', BR * 1.4); V.world.add(ballM); ballM.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      shadow = new T.Mesh(new T.CircleGeometry(0.18, 16), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; V.world.add(shadow);
      mark = new T.Mesh(new T.ConeGeometry(0.22, 0.4, 4), new T.MeshBasicMaterial({ color: '#ffe14d' })); mark.rotation.x = Math.PI; V.world.add(mark);
      V.env(VN.ENV.night); kickoff(0);
    }
    function view(dt) {
      E.syncModels(dt); ballM.position.set(ball.x, ball.y + 0.04, ball.z); ballM.rotation.x += ball.vz * dt * 6; ballM.rotation.z -= ball.vx * dt * 6;
      shadow.position.set(ball.x, 0.02, ball.z);
      const me = ctx.me; mark.visible = me >= 0 && !!P[me]; if (mark.visible) { mark.position.set(P[me].x, 2.75 + Math.sin(V.t * 5) * 0.1, P[me].z); }
    }
    function cam(dt, snap) {
      const me = ctx.me >= 0 ? ctx.me : 0, s = side(P[me] ? P[me].team : 0), fx = U.clamp(ball.x, -HW + 4, HW - 4) * 0.7, fz = U.clamp(ball.z, -HL + 4, HL - 4);
      E.fov(58); E.camLook(fx, 15, fz + s * 14, fx, 0, fz - s * 2.5, dt, 3.5, snap);
    }
    return { S, build, sim, input, view, cam, st, ball, roles };
  };
  SP.Sports.soccer.rec = { '3v3': { n: 'Goals in a match' }, shootout: { n: 'Penalties scored' } };

    function arena() {
      VN.ground(400, '#2f9e44', '#237a35', -0.06);
      VN.field(HW * 2, HL * 2, '#22a447', { stripes: 12, th: 0.05 });
      const segs = VN.rect(-HW + 0.3, -HL + 0.3, HW - 0.3, HL - 0.3).concat([[-HW + 0.3, 0, HW - 0.3, 0]], VN.arc(0, 0, 3.5, 0, Math.PI * 2, 32), VN.rect(-6, HL - 0.3, 6, HL - 5), VN.rect(-6, -HL + 0.3, 6, -HL + 5), VN.arc(0, HL - 5, 2, Math.PI * 0.5, Math.PI * 1.5, 12), VN.arc(0, -HL + 5, 2, -Math.PI * 0.5, Math.PI * 0.5, 12));
      VN.lines(segs, 0.1, '#ffffff', 0.01);
      const b = new M.B();
      // boards with ad panels + rounded corners
      const cols = ['#facc15', '#2563eb', '#e11d48', '#16a34a', '#a855f7', '#f97316'];
      for (let i = 0; i < 8; i++) [-1, 1].forEach((k) => b.box(0.25, 1, (HL * 2 - 6) / 8, 0.06, cols[(i + (k > 0 ? 3 : 0)) % 6], k * (HW + 0.12), 0.5, -HL + 3 + (i + 0.5) * (HL * 2 - 6) / 8));
      [-1, 1].forEach((k) => { [-1, 1].forEach((q) => b.box((HW * 2 - 6 - GW * 2) / 2 + 3, 1, 0.25, 0.06, cols[(q + 2) % 6], q * (GW + ((HW - GW) / 2)), 0.5, k * (HL + 0.12))); });
      for (let c = 0; c < 4; c++) { const sx = c & 1 ? 1 : -1, sz = c & 2 ? 1 : -1; for (let a = 0; a < 8; a++) { const an = (a + 0.5) / 8 * Math.PI / 2; b.box(0.25, 1, 0.65, 0.05, '#f8fafc', sx * (HW - 3 + Math.sin(an) * 3.1), 0.5, sz * (HL - 3 + Math.cos(an) * 3.1), 0, sx * sz > 0 ? an : -an, 0); } }
      // goals: posts, crossbar, net
      [-1, 1].forEach((k) => { const z = k * HL; [-1, 1].forEach((q) => { b.cyl(0.07, 0.07, GH, '#ffffff', q * GW, GH / 2, z, 0, 0, 0, 'gloss', 10); b.cyl(0.04, 0.04, 1.3, '#e5e7eb', q * GW, GH * 0.5, z + k * 0.65, 0.9 * k, 0, 0, null, 6); }); b.cyl(0.07, 0.07, GW * 2, '#ffffff', 0, GH, z, 0, 0, Math.PI / 2, 'gloss', 10);
        for (let i = 0; i <= 12; i++) b.box(0.015, GH, 0.015, 0, '#e5e7eb', -GW + i * GW / 6, GH / 2, z + k * 1.2); for (let j = 0; j <= 6; j++) b.box(GW * 2, 0.015, 0.015, 0, '#e5e7eb', 0, j * GH / 6, z + k * 1.2);
        for (let i = 0; i <= 6; i++) b.box(0.015, 0.015, 1.2, 0, '#e5e7eb', -GW + i * GW / 3, GH, z + k * 0.6); b.box(0.2, 0.05, 1.3, 0.02, '#e5e7eb', 0, 0.02, z + k * 0.6);
        [-1, 1].forEach((q) => { for (let j = 0; j <= 6; j++) b.box(0.015, 0.015, 1.2, 0, '#e5e7eb', q * GW, j * GH / 6, z + k * 0.6); }); });
      VN.add(b.group(true));
      VN.bowl(HW * 2, HL * 2, { gap: 3, rows: M.low ? 5 : 8, seats: ['#2563eb', '#e11d48', '#facc15'], wall: '#1e1b4b' });
      [[-20, -26], [20, -26], [-20, 26], [20, 26]].forEach((p) => VN.tower(p[0], p[1], 20, Math.atan2(-p[0], -p[1])));
      VN.jumbo(-HW - 2, 12, 0, Math.PI / 2, 9, 4.2);
    }

  /* ---------- penalty shootout ---------- */
  function shootout(ctx) {
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length;
    const ball = { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, v: true }; S.O.push(ball);
    const SPOT = -HL + 5.5, st = { turn: 0, round: 0, kicks: ctx.players.map(() => []), phase: 'aim', t: 0, over: false, maxR: 5 };
    ctx.players.forEach(() => S.P.push({ x: 0, y: 0, z: 0, ry: Math.PI, a: 'idle', at: 0, sd: 1, hid: true, notag: true }));
    const K = { x: 0, y: 0, z: -HL + 0.3, ry: 0, a: 'ready', at: 0, sd: 1 }; S.P.push(K);   // CPU keeper
    const gd = ctx.D;
    function setup() { st.phase = 'aim'; st.t = 0; ball.x = 0; ball.z = SPOT; ball.y = BR; ball.vx = ball.vy = ball.vz = 0; K.x = 0; K.z = -HL + 0.3; K.a = 'ready'; K.at = 0; K.dive = 0;
      S.P.forEach((p, i) => { if (i < n) { p.hid = i !== st.turn; p.notag = i !== st.turn; p.x = 0.3; p.z = SPOT + 1.8; p.ry = Math.PI; p.a = 'idle'; } });
      upd(); if (st.turn === ctx.me) ctx.ev({ t: 'hint', b: 'SWIPE toward the goal to shoot!', d: 1500 }); }
    function upd() { const h = S.hud; const tot = (i) => st.kicks[i].filter((k) => k).length; h.solo = n > 2; if (n === 2) { h.l = ctx.players[0].name; h.r = ctx.players[1].name; h.ls = tot(0); h.rs = tot(1); } else { h.l = ctx.players[st.turn].name; h.ls = tot(st.turn); h.r = ''; h.rs = ''; }
      h.mid = 'KICK ' + Math.min(st.round + 1, st.maxR) + '/' + (st.maxR > 5 ? 'SD' : 5); h.turn = '⚽ ' + ctx.players[st.turn].name + ' · ' + ctx.players.map((p, i) => p.name.slice(0, 6) + ' ' + tot(i)).join(' · '); h.tip = st.turn === ctx.me && st.phase === 'aim' ? 'SWIPE to shoot - aim for the corners!' : ''; }
    function input(i, ev) { if (ev.k === 'assist') return; if (i !== st.turn || st.phase !== 'aim' || ev.k !== 'swipe') return; const wz = +ev.z || -1, wx = +ev.x || 0, pow = U.clamp(+ev.power || 0.5, 0.1, 1); if (wz > -0.2) return; shoot(wx / -wz, pow, ctx.assist(i) ? 0.35 : 0.6); }
    function shoot(slope, pow, err) {
      const gz = -HL - 0.3, dz = gz - SPOT; let gx = slope * -dz * 1.0 + Ph.gauss(R) * err; const hgt = U.clamp(0.3 + pow * 1.9 + Ph.gauss(R) * 0.25, 0.1, 3.2);
      const tt = 0.55 - pow * 0.18; ball.vx = gx / tt; ball.vz = dz / tt; ball.vy = (hgt - BR + 0.5 * G * tt * tt) / tt; st.phase = 'fly'; st.t = 0; st.gx = gx; st.gy = hgt;
      const p = S.P[st.turn]; E.act(p, 'kick', 1); ctx.ev({ t: 'fx', k: 'kick', a: 0.8 });
      // keeper guesses a side after his reaction time
      const read = R() < gd.grab * 0.5; K.tgt = read ? gx : (R() < 0.5 ? -1 : 1) * GW * 0.6 * (R() < 0.33 ? 0 : 1); K.wait = gd.react * 0.5;
    }
    function sim(dt) {
      st.t += dt; const p = S.P[st.turn];
      if (st.phase === 'aim') { if (!ctx.isHuman(st.turn) && st.t > 1.3) { const side = R() < 0.5 ? -1 : 1; shoot(side * (0.15 + R() * 0.17) + Ph.gauss(R) * gd.aim * 0.06, 0.45 + R() * 0.4, 0.3 + gd.aim * 0.5); } if (ctx.isHuman(st.turn) && st.t > 15) shoot(0.1, 0.6, 0.6); return; }
      if (st.phase === 'fly') {
        Ph.step(ball, dt, G, 0); if (ball.y < BR) { ball.y = BR; ball.vy = Math.abs(ball.vy) * 0.4; }
        K.wait -= dt; if (K.wait <= 0) { const sp = 7 + gd.grab * 3, dx = U.clamp(K.tgt - K.x, -sp * dt, sp * dt); K.x += dx; if (Math.abs(K.tgt) > 0.8 && K.a !== 'dive') E.act(K, 'dive', Math.sign(K.tgt)); }
        if (ball.z <= -HL + 0.6) {
          const kx = K.x, ky = 0.9, reach = 0.5 + gd.grab * 0.35; const inGoal = Math.abs(ball.x) < GW - BR && ball.y < GH;
          const saved = inGoal && Math.abs(ball.x - kx) < reach && ball.y < 2.0 + (K.a === 'dive' ? 0.2 : 0.4) && Math.abs(ball.y - ky) < 1.3;
          res(inGoal && !saved, saved);
        }
        return;
      }
      if (st.phase === 'res') { Ph.step(ball, dt, G, 0.5); if (ball.y < BR) { ball.y = BR; ball.vy = 0; ball.vx *= 0.9; ball.vz *= 0.9; } if (ball.z < -HL - 1.1) { ball.z = -HL - 1.1; ball.vz = 0; } if (st.t > 2.0) next(); }
    }
    function res(goal, saved) {
      st.phase = 'res'; st.t = 0; st.kicks[st.turn].push(goal);
      if (goal) { ctx.ev({ t: 'msg', b: 'GOAL!', s: ctx.players[st.turn].name, d: 1300 }); ctx.ev({ t: 'roar', k: 1 }); ctx.ev({ t: 'party', x: ball.x, y: 1.5, z: -HL, n: 40 }); E.act(S.P[st.turn], 'cheer'); if (ctx.isHuman(st.turn)) ctx.stat(st.turn, 'goal'); }
      else if (saved) { ball.vz = 6; ball.vx = (R() - 0.5) * 6; ball.vy = 2; ctx.ev({ t: 'msg', b: 'SAVED!', s: 'Great dive!', d: 1300 }); ctx.ev({ t: 'fx', k: 'catch' }); E.act(S.P[st.turn], 'sad'); }
      else { ctx.ev({ t: 'msg', b: 'MISSED!', s: Math.abs(ball.x) >= GW ? 'Wide!' : 'Over the bar!', d: 1300 }); ctx.ev({ t: 'fx', k: 'lose' }); E.act(S.P[st.turn], 'sad'); }
      upd();
    }
    function next() {
      st.turn++; if (st.turn >= n) { st.turn = 0; st.round++; }
      if (st.turn === 0 && st.round >= 5) {
        const tot = ctx.players.map((p, i) => st.kicks[i].filter((k) => k).length), mx = Math.max(...tot), lead = tot.filter((t) => t === mx).length;
        if (lead === 1 || st.round >= 10) return finish(tot);
        st.maxR = 10; ctx.ev({ t: 'msg', b: 'SUDDEN DEATH!', d: 1500 });
      }
      setup();
    }
    function finish(tot) {
      st.over = true; st.phase = 'over'; const mx = Math.max(...tot), winners = tot.map((t, i) => i).filter((i) => tot[i] === mx);
      const wt = winners.length === 1 ? ctx.players[winners[0]].team : -1;
      const teamTot = {}; ctx.players.forEach((p, i) => { teamTot[p.team] = (teamTot[p.team] || 0) + tot[i]; });
      let w = wt; if (ctx.cfg.teamUp) { const a = teamTot[0] || 0, b = teamTot[1] || 0; w = a > b ? 0 : b > a ? 1 : -1; }
      const score = {}; tot.forEach((t, i) => { score[i] = t; });
      ctx.ev({ t: 'roar', k: 1 });
      ctx.end({ win: w, title: w < 0 ? "It's a tie!" : (winners.length === 1 ? ctx.players[winners[0]].name : 'Team') + ' wins the shootout!', lines: ctx.players.map((p, i) => p.name + ': ' + st.kicks[i].map((k) => k ? '⚽' : '❌').join(' ') + ' = ' + tot[i]), score });
    }
    let ballM;
    function build() {
      // reuse the arena look
      arena(); E.makeModels('none', { tags: true });
      const km = M.athlete(Object.assign(D.aiLook(99), { shirt: '#facc15', shorts: '#111827', tool: 'none', hat: 'cap', hatCol: '#111827' })); if (!M.low) M.outline(km); km.traverse((m) => { if (m.isMesh) m.castShadow = !M.low; }); V.world.add(km); ctx.models.push(km); km.userData.prev = null;
      ballM = M.sportBall('soccer', BR * 1.4); V.world.add(ballM);
      V.env(VN.ENV.night); setup();
    }
    function view(dt) { E.syncModels(dt); ballM.position.set(ball.x, ball.y + 0.04, ball.z); ballM.rotation.x -= ball.vz * dt * 5; }
    function cam(dt, snap) { E.fov(55); E.camLook(0, 2.6, SPOT + 6.5, 0, 1.2, -HL, dt, 4, snap); }
    return { S, build, sim, input, view, cam, st, joy: false, shoot };
  }
})();

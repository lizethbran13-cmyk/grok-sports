/* Grok Sports Command - shared racket-sport engine (Tennis, Badminton, Table Tennis):
   real ballistic flight with drag, bounces, net, in/out calls, serve rules, tennis + rally scoring,
   human swipe/tap hitting with timing, assist auto-move, CPU movement prediction + shot choice by difficulty */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, T = THREE;
  const CFG = {
    tennis: { HW1: 4.115, HW2: 5.485, HL: 11.885, svc: 6.4, NH: 0.92, netW: 6.4, g: 9.8, k: 0.11, e: 0.74, fr: 0.82, r: 0.034, y0: 0, spd: 6.4, reach: 1.55, hmin: 0.15, hmax: 2.5, over: 3.1, base: 0.9, drive: 25, lob: 2.1, drop: 0.95, smash: 27, score: 'tennis', games: 3, ball: 'tennis', serveH: 2.7, minD: 3.5, sfx: 'pock' },
    badminton: { HW1: 2.59, HW2: 3.05, HL: 6.7, svc: 1.98, NH: 1.55, netW: 3.2, g: 9.8, k: 1.25, e: 0, fr: 0, r: 0.035, y0: 0, spd: 5.4, reach: 1.45, hmin: 0.25, hmax: 2.6, over: 3.2, base: 0.45, drive: 14, lob: 2.0, drop: 1.0, smash: 22, score: 'rally', to: 11, ball: 'shuttle', noBounce: true, serveH: 1.1, minD: 2.1, sfx: 'shuttle' },
    tabletennis: { HW1: 0.7625, HW2: 0.7625, HL: 1.37, svc: 0, NH: 0.1525, netW: 0.92, g: 9.8, k: 0.28, e: 0.86, fr: 0.9, r: 0.02, y0: 0.76, spd: 3.4, reach: 0.75, hmin: 0.82, hmax: 1.7, over: 1.9, base: 0.75, drive: 7.5, lob: 0.95, drop: 0.55, smash: 11, score: 'rally', to: 11, ball: 'pingpong', table: true, serveH: 1.05, minD: 0.35, sfx: 'ping', tt: true }
  };
  SP.NetGame = function (sid) {
    const C = CFG[sid];
    const make = function (ctx) {
      const dbl = ctx.mode.team === 2, HW = dbl ? C.HW2 : C.HW1, HL = C.HL, Y0 = C.y0, NT = Y0 + C.NH;
      const S = { P: [], O: [], hud: {}, x: {} };
      const n = ctx.players.length, side = (t) => t === 0 ? 1 : -1;   // team 0 lives at z > 0
      const ball = { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, v: true, live: false, lastTeam: -1, bounces: 0, hits: 0, netted: false, spin: 0, shot: '' };
      S.O.push(ball);
      const st = { phase: 'serve', server: 0, servTeam: 0, faults: 0, score: [0, 0], games: [0, 0], pts: [0, 0], t: 0, deadT: 0, serveT: 0, over: false, rallies: 0, lastWin: -1, longest: 0 };
      ctx.players.forEach((pl, i) => { const t = pl.team, k = ctx.players.filter((q, j) => q.team === t && j < i).length; S.P.push({ x: 0, y: 0, z: side(t) * (HL + C.base), ry: t === 0 ? Math.PI : 0, a: 'ready', at: 0, sd: 1, team: t, k, mx: 0, mz: 0, buf: null, ai: { react: 0, tx: 0, tz: 0, plan: null, cool: 0 }, stats: { pts: 0, hits: 0 } }); });
      const teamOf = (i) => S.P[i].team;
      const mates = (t) => S.P.map((p, i) => i).filter((i) => S.P[i].team === t);
      const homeX = (p) => dbl ? (p.k === 0 ? -1 : 1) * HW * 0.45 : 0;
      const homeZ = (p) => side(p.team) * (HL * (C.tt ? 1 : dbl && !C.tt ? 0.72 : 0.95) + C.base * (C.tt ? 1 : 0.4));
      const inCourt = (x, z, t) => Math.abs(x) <= HW + C.r && side(t) * z >= -C.r && side(t) * z <= HL + C.r;  // on team t's half
      const diffOf = (i) => ctx.D;
      function name(t) { return E.teamName(t); }
      /* ---------- serve ---------- */
      function setupServe() {
        st.phase = 'serve'; st.serveT = 0; ball.live = false; ball.lastTeam = -1; ball.bounces = 0; ball.hits = 0; ball.netted = false; ball.shot = '';
        const t = st.servTeam, ms = mates(t), srv = ms.length > 1 ? ms[st.server % ms.length] : ms[0]; st.srv = srv;
        const tot = C.score === 'tennis' ? st.pts[0] + st.pts[1] : st.score[t];
        st.svSide = (tot % 2 === 0) ? 1 : -1;   // +1 = server's right
        S.P.forEach((p, i) => { p.buf = null; p.a = 'ready'; p.at = 0; p.ai.plan = null; p.x = homeX(p); p.z = homeZ(p); p.ry = p.team === 0 ? Math.PI : 0; });
        const sp = S.P[srv], sx = side(t) * st.svSide * (C.tt ? 0.3 : (C.noBounce ? HW : C.HW1) * 0.4);
        sp.x = sx; sp.z = side(t) * (HL + (C.tt ? 0.45 : C.noBounce ? -HL + C.svc + 0.6 : 0.35));
        // receiver stands diagonally
        const rt = 1 - t, rs = mates(rt); const rcv = rs.length > 1 ? rs.find((i) => Math.sign(S.P[i].x || 1) === Math.sign(-sx || 1)) || rs[0] : rs[0];
        st.rcv = rcv; if (!C.tt) { S.P[rcv].x = -sx; S.P[rcv].z = side(rt) * (C.noBounce ? C.svc + 1.2 : HL + 0.2); }
        if (dbl) rs.forEach((i) => { if (i !== rcv) { S.P[i].x = sx; S.P[i].z = side(rt) * (HL * 0.5); } });
        placeBallOnServer();
        const me = ctx.me; S.hud.tip = srv === me ? 'SWIPE UP to serve!' : '';
        if (srv === me) ctx.ev({ t: 'hint', b: C.tt ? 'Your serve! Swipe up' : 'Your serve! Swipe up (aim with left/right)', d: 1600 });
        updHud();
      }
      function placeBallOnServer() { const sp = S.P[st.srv]; ball.x = sp.x + 0.35 * (sp.team === 0 ? 1 : -1) * 0; ball.z = sp.z - side(sp.team) * 0.45; ball.y = Y0 + (C.tt ? 0.25 : 1.1); ball.vx = ball.vy = ball.vz = 0; }
      /* ---------- shot solver ---------- */
      function crossY(p0, v0, tEnd) { // height when crossing z=0 (or null)
        let last = p0; for (let i = 1; i <= 40; i++) { const t = tEnd * i / 40, q = Ph.at(p0, v0, C.g, C.k, t); if ((last[2] > 0) !== (q[2] > 0)) { const f = last[2] / (last[2] - q[2]); return { y: last[1] + (q[1] - last[1]) * f, x: last[0] + (q[0] - last[0]) * f }; } last = q; } return null;
      }
      // type: drive | lob | drop | smash | serve. aim: -1..1, depth 0..1, pow 0..1, err (m), net: force into net
      function hit(i, type, aim, depth, pow, err, intoNet) {
        const p = S.P[i], t = p.team, s = side(t), r = ctx.rng;
        const p0 = [ball.x, Math.max(ball.y, Y0 + 0.08), ball.z];
        let tx, tz;
        const svc = type === 'serve';
        if (svc) {
          const tg = -(Math.sign(p.x) || 1); st.svTgt = tg;
          if (C.tt) { tx = U.clamp(aim, -1, 1) * HW * 0.7; tz = -s * (0.3 + depth * 0.9); }
          else { const bw = C.noBounce ? HW : C.HW1, ax = tg * bw * 0.5 + U.clamp(aim, -1, 1) * bw * 0.4; tx = tg * U.clamp(Math.sign(ax) === tg ? Math.abs(ax) : 0.4, 0.35, bw - 0.3); tz = C.noBounce ? -s * (C.svc + 0.6 + depth * (HL - C.svc - 1.4)) : -s * (C.svc * (0.55 + depth * 0.36)); }
        } else { tx = U.clamp(aim, -1, 1) * HW * 0.82; const dmin = type === 'drop' ? C.minD * 0.35 : C.minD; tz = -s * (dmin + U.clamp(depth, 0, 1) * (HL - dmin - (C.tt ? 0.08 : 0.4))); }
        tx += Ph.gauss(r) * err; tz += Ph.gauss(r) * err * 1.2;
        const dist = Math.hypot(tx - p0[0], tz - p0[2]);
        let T1;
        const pw = U.clamp(pow, 0.05, 1);
        if (type === 'lob') T1 = C.lob * (0.85 + 0.25 * depth);
        else if (type === 'drop') T1 = C.drop * (C.noBounce ? 1.2 : 1) * (0.9 + dist / (HL * 3));
        else if (type === 'smash') T1 = dist / (C.smash * (0.8 + 0.2 * pw));
        else if (svc) T1 = dist / (C.drive * (C.noBounce ? 0.45 : C.tt ? 0.55 : 0.85) * (0.75 + 0.3 * pw));
        else T1 = dist / (C.drive * (0.55 + 0.45 * pw));
        if (C.noBounce && type !== 'smash') T1 = Math.max(T1, dist / 9 + 0.35);
        const p1 = [tx, Y0 + C.r, tz];
        let v0 = Ph.solve(p0, p1, T1, C.g, C.k);
        if (!intoNet) for (let k = 0; k < 14; k++) { const c = crossY(p0, v0, T1); if (!c || c.y > NT + (type === 'smash' ? 0.06 : C.tt ? 0.03 : 0.12) + C.r) break; T1 *= 1.1; v0 = Ph.solve(p0, p1, T1, C.g, C.k); }
        else { T1 *= 0.6; v0 = Ph.solve(p0, [tx * 0.5, Y0 + C.NH * 0.45, -s * 0.05], T1, C.g, C.k); }
        st.dbg = [type, p0.map((v) => v.toFixed(2)).join(','), tx.toFixed(2), tz.toFixed(2), T1.toFixed(2), err.toFixed(2), !!intoNet].join('|');
        ball.vx = v0[0]; ball.vy = v0[1]; ball.vz = v0[2]; ball.live = true; ball.lastTeam = t; ball.bounces = 0; ball.hits++; ball.netted = false; ball.shot = type; ball.hitter = i;
        p.stats.hits++; const sd = ball.x >= p.x ? 1 : -1;
        E.act(p, type === 'smash' || (svc && !C.tt && !C.noBounce) ? 'over' : svc && (C.noBounce || C.tt) ? 'under' : 'swing', sd * (t === 0 ? 1 : -1));
        const spd = Math.hypot(v0[0], v0[1], v0[2]);
        ctx.ev({ t: 'fx', k: type === 'smash' ? 'smash' : C.sfx, a: U.clamp(spd / (C.smash), 0.2, 1) });
        if (type === 'smash') { ctx.ev({ t: 'shake', k: 0.15, d: 0.2 }); ctx.ev({ t: 'burst', x: ball.x, y: ball.y, z: ball.z, c: '#fff59d', n: 10 }); }
        st.phase = 'rally'; S.hud.tip = '';
        S.P.forEach((q, j) => { q.ai.plan = null; q.ai.react = ctx.isHuman(j) ? 0.45 : diffOf(0).react * (0.7 + ctx.rng() * 0.6); });
      }
      /* ---------- eligibility / prediction ---------- */
      function canHit(i) {
        const p = S.P[i]; if (!ball.live || ball.netted) return false; if (ball.lastTeam === p.team) return false;
        if (Math.sign(ball.z) !== side(p.team) && Math.abs(ball.z) > 0.25) return false;
        if (!C.noBounce) { if (ball.hits === 1 && ball.bounces < 1) return false; if (C.tt && ball.bounces < 1) return false; }
        if (ball.y < C.hmin + (C.tt ? 0 : Y0) || ball.y > (p.a === 'jump' ? C.over + 0.4 : C.over)) return false;
        return true;
      }
      function reachOf(i) { const p = S.P[i], base = C.reach * (ctx.isHuman(i) ? (ctx.assist(i) ? 1.35 : 1.12) : diffOf(i).reach); return base; }
      function distB(i) { const p = S.P[i]; return Math.hypot(ball.x - p.x, ball.z - p.z); }
      // simulate the ball forward; returns list of samples {t,x,y,z,b(bounces on my side)}
      function predict(maxT) {
        const out = []; const b = { x: ball.x, y: ball.y, z: ball.z, vx: ball.vx, vy: ball.vy, vz: ball.vz }; let bounces = ball.bounces, h = 1 / 60;
        for (let t = 0; t < (maxT || 3); t += h) {
          Ph.step(b, h, C.g, C.k);
          if (b.y <= Y0 + C.r && b.vy < 0) { if (C.noBounce) { out.push({ t, x: b.x, y: b.y, z: b.z, land: true, b: bounces }); break; } if (C.tt && (Math.abs(b.x) > HW || Math.abs(b.z) > HL)) { if (b.y < Y0 - 0.5) break; } else { b.y = Y0 + C.r; b.vy = -b.vy * C.e; b.vx *= C.fr; b.vz *= C.fr; bounces++; if (bounces >= 2) { out.push({ t, x: b.x, y: b.y, z: b.z, b: bounces, dead: true }); break; } } }
          if (b.y < Y0 - 1) break;
          if (((t * 60) | 0) % 2 === 0) out.push({ t, x: b.x, y: b.y, z: b.z, b: bounces });
        }
        return out;
      }
      function landing() { // first bounce / landing spot
        const pr = predict(4); for (const q of pr) if (q.land || q.b > ball.bounces) return q; return null;
      }
      // pick an interception spot for player i
      function plan(i) {
        const p = S.P[i], pr = predict(3.2), sp = C.spd * (ctx.isHuman(i) ? 1 : diffOf(i).speed), s = side(p.team);
        let best = null;
        for (const q of pr) {
          if (q.dead) break; if (Math.sign(q.z) !== s && Math.abs(q.z) > 0.2) continue;
          if (!C.noBounce && ((ball.hits === 1 && q.b < 1) || (C.tt && q.b < 1))) continue;
          if (C.noBounce && q.land) break;
          const hy = q.y - (C.tt ? 0 : Y0); if (hy < C.hmin + 0.1 || hy > C.over - 0.1) continue;
          const near = Math.hypot(q.x - p.x, q.z - p.z) < 2.2;
          const good = C.tt ? (q.y > Y0 + 0.12) : C.noBounce ? (hy > 0.6) : (q.b >= 1 && hy > 0.45 && hy < 1.6) || (q.b === 0 && Math.abs(q.z) < HL * 0.4 && near && hy < 2.0);
          const d = Math.max(0, Math.hypot(q.x - p.x, q.z - p.z) - reachOf(i) * 0.55), need = d / sp + (ctx.isHuman(i) ? 0 : 0.05);
          if (need <= q.t && good) { best = q; break; }
          if (!best && need <= q.t) best = q;
        }
        if (!best) { const lq = pr.filter((q) => Math.sign(q.z) === s); best = lq[Math.min(lq.length - 1, Math.floor(lq.length * 0.5))] || null; }
        return best;
      }
      /* ---------- point scoring ---------- */
      function point(winTeam, why) {
        if (st.phase === 'dead' || st.over) return;
        st.phase = 'dead'; st.deadT = 0; ball.live = false; st.rallies++; st.faults = 0; st.longest = Math.max(st.longest, ball.hits);
        const lose = 1 - winTeam; st.lastWin = winTeam; (st.log = st.log || []).push(winTeam + ':' + (why || '') + ':' + ball.hits + ':' + st.dbg + '@' + ball.x.toFixed(2) + ',' + ball.z.toFixed(2));
        S.P.forEach((p, i) => { if (p.team === winTeam && ctx.isHuman(i)) ctx.stat(i, 'point'); });
        let msg = '', sub = why || '';
        if (C.score === 'tennis') {
          st.pts[winTeam]++;
          if (st.pts[winTeam] >= 4 || (st.pts[winTeam] === 4 && st.pts[lose] === 3) || (st.pts[winTeam] >= 4)) { /* handled below */ }
          if (st.pts[winTeam] >= 4) { st.games[winTeam]++; st.pts = [0, 0]; msg = 'GAME!'; sub = name(winTeam) + ' wins the game · ' + st.games[0] + '-' + st.games[1]; st.servTeam = 1 - st.servTeam; st.server++; if (st.games[winTeam] >= C.games) return finish(winTeam); }
          else msg = callTennis();
        } else {
          st.score[winTeam]++; const a = st.score[winTeam], b = st.score[lose];
          msg = a + ' - ' + b;
          if ((a >= C.to && a - b >= 2) || a >= C.to + 4) return finish(winTeam);
          if (C.tt) { const tot = st.score[0] + st.score[1]; const every = st.score[0] >= 10 && st.score[1] >= 10 ? 1 : 2; if (tot % every === 0) { st.servTeam = 1 - st.servTeam; st.server++; } }
          else { if (st.servTeam !== winTeam) st.server++; st.servTeam = winTeam; }
        }
        const mine = ctx.players[ctx.me] && ctx.players[ctx.me].team === winTeam;
        ctx.ev({ t: 'msg', b: msg, s: sub, d: 1500 }); ctx.ev({ t: 'fx', k: mine ? 'point' : 'lose' }); ctx.ev({ t: 'roar', k: ball.hits > 6 ? 1 : 0.55 });
        S.P.forEach((p) => { E.act(p, p.team === winTeam ? 'cheer' : 'sad'); });
        updHud();
      }
      function callTennis() { const nm = ['0', '15', '30', '40']; const a = st.pts[0], b = st.pts[1]; if (a === 3 && b === 3) return 'DEUCE! Next point wins'; return nm[Math.min(3, a)] + ' - ' + nm[Math.min(3, b)]; }
      function finish(w) {
        st.over = true; st.phase = 'over'; updHud();
        S.P.forEach((p) => E.act(p, p.team === w ? 'cheer' : 'sad'));
        ctx.ev({ t: 'party', x: 0, y: 3, z: side(w) * HL * 0.5 }); ctx.ev({ t: 'roar', k: 1 });
        const sc = C.score === 'tennis' ? st.games : st.score;
        const score = {}; S.P.forEach((p, i) => { score[i] = sc[p.team]; });
        ctx.end({ win: w, title: name(w) + ' wins ' + sc[w] + ' - ' + sc[1 - w] + (C.score === 'tennis' ? ' in games' : ''), lines: ['Longest rally: ' + st.longest + ' hits'], score });
      }
      function updHud() {
        const h = S.hud; h.l = name(0); h.r = name(1);
        if (C.score === 'tennis') { const nm = ['0', '15', '30', '40']; h.ls = st.games[0]; h.rs = st.games[1]; h.mid = st.over ? 'FINAL' : (st.pts[0] === 3 && st.pts[1] === 3 ? 'DEUCE' : nm[Math.min(3, st.pts[0])] + '-' + nm[Math.min(3, st.pts[1])]); }
        else { h.ls = st.score[0]; h.rs = st.score[1]; h.mid = st.over ? 'FINAL' : 'TO ' + C.to; }
        S.x.sv = st.srv; VN.drawScore(ctx.sp.n.toUpperCase(), h.ls, h.rs, h.l, h.r, h.mid);
      }
      /* ---------- step ---------- */
      function sim(dt) {
        st.t += dt;
        if (st.phase === 'serve') {
          st.serveT += dt; placeBallOnServer(); const srv = st.srv;
          ball.y = Y0 + (C.tt ? 0.25 : 1.0) + Math.abs(Math.sin(st.serveT * 2.2)) * 0.15;
          S.P[srv].a = 'ready';
          if (!ctx.isHuman(srv) && st.serveT > 1.1 + ctx.rng() * 0.02) aiServe(srv);
          if (ctx.isHuman(srv) && st.serveT > 12) aiServe(srv, true); // never stuck: auto serve after 12 s
        } else if (st.phase === 'rally') stepBall(dt);
        else if (st.phase === 'dead') { st.deadT += dt; Ph.step(ball, dt, C.g, C.k); if (ball.y < Y0 + C.r) { ball.y = Y0 + C.r; ball.vy = Math.abs(ball.vy) * 0.4; ball.vx *= 0.7; ball.vz *= 0.7; } if (st.deadT > 1.7) setupServe(); }
        S.P.forEach((p, i) => movePlayer(i, dt));
      }
      function stepBall(dt) {
        const pz = ball.z; Ph.step(ball, dt, C.g, C.k);
        // net
        if ((pz > 0) !== (ball.z > 0) && !ball.netted) { if (ball.y < NT + C.r && ball.y > Y0 - 0.05 && Math.abs(ball.x) < C.netW) { ball.netted = true; ball.z = pz > 0 ? C.r + 0.01 : -C.r - 0.01; ball.vz *= -0.15; ball.vx *= 0.3; ball.vy = Math.min(ball.vy, 0.5); ctx.ev({ t: 'fx', k: 'net' }); } }
        // surface
        const onTable = !C.tt || (Math.abs(ball.x) <= HW + 0.01 && Math.abs(ball.z) <= HL + 0.01);
        if (ball.y <= Y0 + C.r && ball.vy < 0 && onTable) {
          const sideT = ball.z >= 0 ? 0 : 1, lt = ball.lastTeam;
          if (C.noBounce) { const inn = inCourt(ball.x, ball.z, sideT) && (ball.hits > 1 || sideT !== lt); ball.y = Y0 + C.r; return point(inn && sideT !== lt ? lt : 1 - lt, inn ? (sideT !== lt ? 'It landed in!' : '') : 'OUT!'); }
          ball.y = Y0 + C.r; ball.vy = -ball.vy * C.e; ball.vx *= C.fr; ball.vz *= C.fr; ctx.ev({ t: 'fx', k: C.tt ? 'ping' : 'bounce', a: 0.4 });
          if (ball.netted) return point(1 - lt, 'Into the net');
          if (ball.bounces === 0) {
            const serveBall = ball.hits === 1 && !C.tt && !C.noBounce;
            const ok = sideT !== lt && (serveBall ? (Math.abs(ball.z) <= C.svc + C.r && Math.sign(ball.x) === st.svTgt && Math.abs(ball.x) <= C.HW1 + C.r) : inCourt(ball.x, ball.z, sideT));
            if (!ok) { if (ball.hits === 1 && !C.tt && st.faults === 0) { st.faults = 1; ctx.ev({ t: 'msg', b: 'FAULT', s: 'Second serve', d: 1100 }); st.phase = 'dead'; st.deadT = 0.6; ball.live = false; st.refault = true; return; } st.faults = 0; return point(1 - lt, sideT === lt ? 'Bounced on your own side' : 'OUT!'); }
            st.faults = 0; ball.bounces = 1;
          } else return point(lt, 'Two bounces');
        }
        if (C.tt && ball.y < Y0 - 0.3) { const lt = ball.lastTeam; return point(ball.bounces >= 1 && !ball.netted ? lt : 1 - lt, ball.bounces >= 1 ? 'Missed it!' : 'OUT!'); }
        if (!C.tt && (Math.abs(ball.z) > HL + 14 || Math.abs(ball.x) > HW + 14)) { const lt = ball.lastTeam; return point(ball.bounces >= 1 ? lt : 1 - lt, ball.bounces >= 1 ? 'WINNER!' : 'OUT!'); }
        if (C.tt && (Math.abs(ball.z) > HL + 4 || Math.abs(ball.x) > 4)) { const lt = ball.lastTeam; return point(ball.bounces >= 1 ? lt : 1 - lt, ball.bounces >= 1 ? 'WINNER!' : 'OUT!'); }
        // humans: buffered swipes fire when in reach; CPU decides
        for (let i = 0; i < S.P.length; i++) {
          const p = S.P[i];
          if (ctx.isHuman(i)) { if (p.buf) { p.buf.t += dt; if (canHit(i) && distB(i) <= reachOf(i) && ball.y < C.over + 0.3) { humanHit(i, p.buf); p.buf = null; } else if (p.buf.t > (ctx.assist(i) ? 0.75 : 0.45)) p.buf = null; } }
          else aiHit(i);
        }
      }
      /* ---------- human ---------- */
      function humanHit(i, b) {
        const p = S.P[i], d = distB(i), reach = reachOf(i), as = ctx.assist(i);
        const q = U.clamp(1 - Math.max(0, d - reach * 0.45) / (reach * 0.6), 0, 1) * (b.t > 0.3 ? 0.85 : 1);
        const inSpd = Math.hypot(ball.vx, ball.vy, ball.vz) / C.drive, scale = C.tt ? 0.25 : C.noBounce ? 0.6 : 1;
        let err = ((1 - q) * (as ? 0.6 : 1.1) + 0.2 + Math.max(0, inSpd - 0.6) * 0.5 + (d > reach * 0.8 ? 0.35 : 0)) * scale;
        if (ctx.rng() < (0.03 + Math.max(0, inSpd - 0.7) * 0.12 + (d > reach * 0.8 ? 0.08 : 0)) * (as ? 0.7 : 1)) { const k = ctx.rng(); hit(i, b.type === 'smash' ? 'smash' : 'drive', k < 0.5 ? Math.sign(b.aim || 1) * 1.3 : b.aim || 0, k < 0.5 ? 0.6 : 1.2, b.pow || 0.6, err, k < 0.25); return; }
        let type = b.type, aim = b.aim, depth = b.depth, pow = b.pow;
        const high = ball.y - Y0 > (C.tt ? 0.35 : C.noBounce ? 2.0 : 2.1);
        if (type === 'auto') { const o = smartAim(i); aim = o.aim * 0.7; depth = o.depth * 0.9; pow = 0.55; type = high && Math.abs(ball.z) < HL * 0.75 ? 'smash' : 'drive'; if (as) err *= 0.6; }
        if (type === 'smash' && (!high || Math.abs(ball.z) > HL * 0.8)) type = 'drive';
        if (as) { aim = U.clamp(aim, -0.85, 0.85); depth = U.clamp(depth, 0.15, 0.88); }
        hit(i, type, aim, depth, pow, err, false);
        if (q > 0.85) ctx.ev({ t: 'hint', b: '⭐ PERFECT TIMING!', d: 700 });
      }
      function smartAim(i) { const p = S.P[i], opp = S.P.filter((q) => q.team !== p.team); const ox = opp.reduce((a, q) => a + q.x, 0) / Math.max(1, opp.length); return { aim: U.clamp(-Math.sign(ox || (ctx.rng() - 0.5)) * (0.45 + ctx.rng() * 0.4), -1, 1), depth: 0.55 + ctx.rng() * 0.35 }; }
      function input(i, ev) {
        const p = S.P[i]; if (!p) return;
        if (ev.k === 'assist') { ctx.cfg.assist = ctx.cfg.assist || {}; ctx.cfg.assist[i] = !!ev.on; return; }
        if (ev.k === 'move') { p.mx = U.clamp(+ev.x || 0, -1, 1); p.mz = U.clamp(+ev.z || 0, -1, 1); return; }
        if (ev.k !== 'swipe' && ev.k !== 'tap') return;
        if (st.phase === 'serve' && st.srv === i) {
          if (ev.k === 'tap') return hit(i, 'serve', (ctx.rng() - 0.5) * 0.6, 0.6, 0.65, 0.12, false);
          const aim = U.clamp((+ev.x || 0) * 1.6, -1, 1), pow = U.clamp(+ev.power || 0.5, 0.1, 1);
          return hit(i, 'serve', aim, U.clamp(0.25 + pow * 0.7, 0, 1), pow, (ctx.assist(i) ? 0.12 : 0.28) + (C.tt ? -0.1 : 0) + (pow > 0.92 ? 0.35 : 0), false);
        }
        if (st.phase !== 'rally') return;
        if (ev.k === 'tap') { p.buf = { type: 'auto', t: 0 }; return; }
        const fw = -side(p.team), wx = +ev.x || 0, wz = +ev.z || 0, up = wz * fw; // forward component in world
        const pow = U.clamp(+ev.power || 0.5, 0.05, 1), len = +ev.len || 0.2;
        let type = 'drive';
        if (up < -0.35) type = 'smash';           // swipe down
        else if (pow < 0.24 || len < 0.09) type = 'drop';
        else if ((+ev.spd || 0) < 650 && len > 0.28) type = 'lob';
        else if (pow > 0.88) type = 'smash';
        p.buf = { type, aim: U.clamp(wx * 1.7, -1, 1), depth: U.clamp(0.2 + pow * 0.8, 0, 1), pow, t: 0 };
      }
      /* ---------- CPU ---------- */
      function aiServe(i, auto) { const dd = diffOf(i), r = ctx.rng(); const bad = !auto && r < dd.err * 0.5; hit(i, 'serve', (ctx.rng() - 0.5) * 1.2 * dd.smart + (ctx.rng() - 0.5) * 0.4, 0.5 + ctx.rng() * 0.4, dd.power * (0.7 + ctx.rng() * 0.3), dd.aim * 0.35 + (bad ? HW * 0.5 : 0), false); }
      function aiHit(i) {
        const p = S.P[i]; if (!canHit(i)) return; const d = distB(i), reach = reachOf(i); if (d > reach) return;
        // wait for a good height unless the ball is leaving
        const hy = ball.y - Y0, leaving = (d > reach * 0.7) || (C.noBounce && hy < 0.9) || (C.tt ? hy < 0.12 && ball.vy < 0 : hy < 0.35 && ball.vy < 0);
        const nice = C.tt ? hy > 0.15 : C.noBounce ? hy < 2.4 : hy < 1.5 && hy > 0.35;
        if (!nice && !leaving && ball.vy > -0.5 && hy < C.over - 0.2) return;
        const dd = diffOf(i), r = ctx.rng(), high = hy > (C.tt ? 0.35 : C.noBounce ? 2.0 : 1.9);
        const incoming = ball.shot === 'smash' ? 0.1 : ball.shot === 'drive' ? 0.03 : 0;
        const stretch = d > reach * 0.75 ? 0.07 : 0;
        const mistake = r < dd.err + incoming * (1 - dd.grab) + stretch * (1 - dd.grab);
        let aim, depth, type = 'drive', pow = dd.power * (0.75 + ctx.rng() * 0.25);
        const o = smartAim(i); aim = U.lerp((ctx.rng() - 0.5) * 1.4, o.aim * (0.8 + dd.smart * 0.35), dd.smart); depth = 0.45 + ctx.rng() * 0.3 + dd.smart * 0.2; pow = U.clamp(pow + dd.smart * 0.15, 0, 1);
        if (high && Math.abs(ball.z) < HL * 0.8 && ctx.rng() < 0.4 + dd.smart * 0.5) type = 'smash';
        else { const rr = ctx.rng(); if (rr < 0.12 + (C.noBounce ? 0.15 : 0)) type = 'drop'; else if (rr < 0.2 + (C.noBounce ? 0.15 : 0)) type = 'lob'; }
        let err = dd.aim * (C.tt ? 0.22 : C.noBounce ? 0.6 : 1), net = false;
        if (mistake) { const k = ctx.rng(); if (k < 0.4) net = true; else if (k < 0.7) { depth = 1.25; } else aim = Math.sign(aim || 1) * 1.35; err += 0.2; }
        hit(i, type, aim, depth, pow, err, net);
      }
      /* ---------- movement ---------- */
      function movePlayer(i, dt) {
        const p = S.P[i], hum = ctx.isHuman(i), sp = C.spd * (hum ? (ctx.assist(i) && Math.abs(p.mx) + Math.abs(p.mz) < 0.08 ? 0.92 : 1) : diffOf(i).speed);
        if (p.a !== 'ready' && p.a !== 'idle' && p.at > (p.a === 'cheer' || p.a === 'sad' ? 1.6 : 0.45)) { p.a = 'ready'; p.at = 0; }
        if (st.phase === 'serve' || st.phase === 'over') { faceNet(p, dt); return; }
        if (st.phase === 'dead') { return; }
        let tx = null, tz = null;
        const incoming = ball.live && ball.lastTeam !== p.team && !ball.netted;
        if (hum && (Math.abs(p.mx) > 0.08 || Math.abs(p.mz) > 0.08)) { p.x += p.mx * sp * dt; p.z += p.mz * sp * dt; p.ai.plan = null; }
        else if (hum && !ctx.assist(i)) { /* manual: stand still */ }
        else {
          // CPU or assisted human: run to the interception point (or back home)
          if (incoming && responsible(i)) {
            if (p.ai.react > 0 && (!hum || p.ai.react > 0.3)) p.ai.react -= dt;
            else { p.ai.cool -= dt; if (!p.ai.plan || p.ai.cool <= 0) { p.ai.plan = plan(i); p.ai.cool = 0.25; } }
            const q = p.ai.plan; if (q) { const off = (q.x > p.x ? -1 : 1) * Math.min(0.45, reachOf(i) * 0.3); tx = q.x + (C.tt ? 0 : off); tz = q.z + side(p.team) * (C.tt ? 0.25 : 0.35); }
          } else if (!incoming || !responsible(i)) { tx = homeX(p) + (incoming ? 0 : ball.x * 0.3); tz = homeZ(p); if (dbl && !C.tt && ball.live && ball.lastTeam === p.team && p.k === (st.lastWin === p.team ? 0 : 1)) tz = side(p.team) * HL * 0.45; }
          if (tx != null) Ph.moveTo(p, tx, tz, sp, dt);
        }
        // court limits (own side, not past the net)
        const s = side(p.team);
        p.z = s > 0 ? U.clamp(p.z, C.tt ? HL + 0.25 : 0.6, HL + (C.tt ? 2.2 : 5)) : U.clamp(p.z, -HL - (C.tt ? 2.2 : 5), C.tt ? -HL - 0.25 : -0.6);
        p.x = U.clamp(p.x, -HW - (C.tt ? 1.2 : 3), HW + (C.tt ? 1.2 : 3));
        if (dbl) S.P.forEach((q, j) => { if (j === i || q.team !== p.team) return; const dx = p.x - q.x, dz = p.z - q.z, dd = Math.hypot(dx, dz); if (dd < 0.9 && dd > 1e-3) { p.x += dx / dd * (0.9 - dd) * 0.5; p.z += dz / dd * (0.9 - dd) * 0.5; } });
        if (p.a === 'ready' || p.a === 'idle') faceNet(p, dt);
      }
      function faceNet(p, dt) { p.ry = U.lerpAng(p.ry, p.team === 0 ? Math.PI : 0, Math.min(1, dt * 8)); }
      function responsible(i) { const p = S.P[i], ms = mates(p.team); if (ms.length < 2) return true; const q = landing(); const lx = q ? q.x : ball.x, lz = q ? q.z : ball.z; let best = ms[0], bd = 1e9; ms.forEach((j) => { const dd = Math.hypot(S.P[j].x - lx, S.P[j].z - lz); if (dd < bd) { bd = dd; best = j; } }); return best === i; }

      /* ---------- view ---------- */
      let ballM, shadow, ring, trail = [];
      function build() {
        venue(sid, HW, HL, dbl);
        E.makeModels(ctx.sp.tool, { tagDy: 2.35 });
        ballM = M.sportBall(C.ball, C.ball === 'shuttle' ? 0.05 : C.r * (C.tt ? 1.6 : 1.5)); ballM.traverse((m) => { if (m.isMesh) m.castShadow = true; }); V.world.add(ballM);
        shadow = new T.Mesh(new T.CircleGeometry(C.r * 2.4, 16), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; V.world.add(shadow);
        ring = new T.Mesh(new T.RingGeometry(C.tt ? 0.06 : 0.28, C.tt ? 0.09 : 0.4, 28), new T.MeshBasicMaterial({ color: '#ffe14d', transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.visible = false; V.world.add(ring);
        for (let k = 0; k < 8; k++) { const m = new T.Mesh(new T.SphereGeometry(C.r * 1.3 * (1 - k / 10), 8, 6), new T.MeshBasicMaterial({ color: '#fff9c4', transparent: true, opacity: 0.3 * (1 - k / 8), depthWrite: false })); m.visible = false; V.world.add(m); trail.push(m); }
        V.env(sid === 'tennis' ? VN.ENV.day : VN.ENV.indoor);
        setupServe();
      }
      const tp = [];
      function view(dt) {
        E.syncModels(dt);
        ballM.position.set(ball.x, ball.y, ball.z);
        if (C.ball === 'shuttle') { const v = Math.hypot(ball.vx, ball.vy, ball.vz); if (v > 0.5) { ballM.lookAt(ball.x - ball.vx, ball.y - ball.vy, ball.z - ball.vz); ballM.rotateX(-Math.PI / 2); } }
        else { ballM.rotation.x += dt * 12; ballM.rotation.z += dt * 5; }
        const sy = C.tt && (Math.abs(ball.x) > HW || Math.abs(ball.z) > HL) ? 0.01 : Y0 + 0.012; shadow.position.set(ball.x, sy, ball.z); shadow.material.opacity = 0.35 * U.clamp(1 - (ball.y - sy) / 4, 0.2, 1);
        tp.unshift([ball.x, ball.y, ball.z]); if (tp.length > 18) tp.length = 18; const fast = Math.hypot(ball.vx, ball.vy, ball.vz) > C.drive * 0.6;
        trail.forEach((m, k) => { const q = tp[k * 2 + 1]; m.visible = !!(q && fast); if (q) m.position.set(q[0], q[1], q[2]); });
        // landing ring for the local player (assist)
        const me = ctx.me; ring.visible = false;
        if (me >= 0 && ctx.assist(me) && ball.live && S.P[me] && ball.lastTeam !== S.P[me].team && (ctx.host || true)) { const q = landing(); if (q) { ring.visible = true; ring.position.set(q.x, (C.tt && (Math.abs(q.x) > HW || Math.abs(q.z) > HL) ? 0.02 : Y0 + 0.015), q.z); ring.scale.setScalar(1 + Math.sin(V.t * 10) * 0.08); } }
      }
      function cam(dt, snap) {
        const me = ctx.me >= 0 ? ctx.me : 0, p = S.P[me] || S.P[0], s = side(p.team);
        E.fov(C.tt ? 55 : 56);
        if (C.tt) E.camLook(p.x * 0.3 + s * 1.3, 4.6, s * (HL + 5.2), p.x * 0.1, Y0 - 0.4, -s * 0.8, dt, 5, snap);
        else if (C.noBounce) E.camLook(p.x * 0.35, 6.2, s * (HL + 6.2), p.x * 0.15, 0.6, -s * 1.8, dt, 4, snap);
        else E.camLook(p.x * 0.35, 6.6, s * (HL + 9.5), p.x * 0.15, 0.4, -s * 3.0, dt, 4, snap);
      }
      return { S, build, sim, input, view, cam, joy: true, st, ball, hitNow: hit, canHit, plan, C, HW, HL, setupServe };
    };
    return make;
  };
  /* ---------- venues ---------- */
  function net(w, h, y0, z, col) {
    const b = new M.B(); const n = Math.round(w * (M.low ? 5 : 9)), m = Math.max(4, Math.round(h * (M.low ? 7 : 12)));
    for (let i = 0; i <= n; i++) b.box(0.012, h, 0.012, 0, '#1f2937', -w / 2 + i * w / n, y0 + h / 2, z);
    for (let j = 0; j <= m; j++) b.box(w, 0.012, 0.012, 0, '#1f2937', 0, y0 + j * h / m, z);
    b.box(w + 0.04, 0.06, 0.03, 0.01, '#ffffff', 0, y0 + h, z);
    return b;
  }
  function venue(sid, HW, HL, dbl) {
    const b = new M.B();
    if (sid === 'tennis') {
      VN.ground(400, '#4fbf55', '#3aa548', -0.06);
      VN.field(HW * 2 + 12, HL * 2 + 14, '#15803d', { th: 0.05 }); VN.field(HW * 2 + 2.4, HL * 2 + 4.0, '#1d4ed8', { y: 0.01, th: 0.03 });
      const sw = 4.115, dw = 5.485, segs = VN.rect(-dw, -HL, dw, HL).concat([[-sw, -HL, -sw, HL], [sw, -HL, sw, HL], [-sw, -6.4, sw, -6.4], [-sw, 6.4, sw, 6.4], [0, -6.4, 0, 6.4], [0, -HL, 0, -HL + 0.2], [0, HL, 0, HL - 0.2]]);
      VN.lines(segs, 0.06, '#ffffff', 0.012);
      [-1, 1].forEach((k) => { b.cyl(0.05, 0.05, 1.07, '#e5e7eb', k * 6.4, 0.53, 0, 0, 0, 0, 'gloss', 10); });
      V.world.add(net(12.8, 0.95, 0.05, 0).group(false)); VN.add(b.group(true));
      VN.bowl(HW * 2 + 10, HL * 2 + 12, { gap: 2.5, rows: M.low ? 5 : 7, seats: ['#16a34a', '#facc15'], wall: '#14532d' });
      chair(7.6, 0, -Math.PI / 2); VN.jumbo(0, 9, -HL - 12.5, 0, 8, 3.6); VN.jumbo(0, 9, HL + 12.5, Math.PI, 8, 3.6);
      [[-15, -20], [15, -20], [-15, 20], [15, 20]].forEach((p) => VN.tower(p[0], p[1], 18, Math.atan2(-p[0], -p[1])));
      VN.clouds(M.low ? 5 : 10, 180, 55);
    } else if (sid === 'badminton') {
      VN.arena(36, 40, 13, { wall: '#0e7490', trim: '#facc15', floor: '#475569' });
      VN.field(HW * 2 + 4, HL * 2 + 4, '#c2410c', { planks: true, th: 0.04, gloss: true }); VN.field(6.1 + 0.2, 13.4 + 0.2, '#15803d', { y: 0.01, th: 0.02 });
      const segs = VN.rect(-3.05, -6.7, 3.05, 6.7).concat([[-2.59, -6.7, -2.59, 6.7], [2.59, -6.7, 2.59, 6.7], [-3.05, -1.98, 3.05, -1.98], [-3.05, 1.98, 3.05, 1.98], [0, -6.7, 0, -1.98], [0, 1.98, 0, 6.7], [-3.05, -5.94, 3.05, -5.94], [-3.05, 5.94, 3.05, 5.94]]);
      VN.lines(segs, 0.04, '#ffffff', 0.012);
      [-1, 1].forEach((k) => b.cyl(0.04, 0.05, 1.55, '#e5e7eb', k * 3.1, 0.78, 0, 0, 0, 0, 'gloss', 10));
      V.world.add(net(6.2, 0.76, 0.79, 0).group(false)); VN.add(b.group(true));
      VN.stand({ x: -8.5, z: 0, ry: -Math.PI / 2, len: 26, rows: M.low ? 4 : 6, seats: ['#0891b2', '#facc15'], wall: '#164e63', seed: 31 });
      VN.stand({ x: 8.5, z: 0, ry: Math.PI / 2, len: 26, rows: M.low ? 4 : 6, seats: ['#0891b2', '#facc15'], wall: '#164e63', seed: 32 });
      VN.stand({ x: 0, z: -10.2, ry: Math.PI, len: 15, rows: M.low ? 4 : 6, seats: ['#0891b2', '#facc15'], wall: '#164e63', seed: 33 });
      VN.stand({ x: 0, z: 10.2, ry: 0, len: 15, rows: M.low ? 3 : 5, seats: ['#0891b2', '#facc15'], wall: '#164e63', seed: 34 });
      adBoards(7.4, 8.4, ['#facc15', '#0891b2', '#f97316', '#22c55e'], ['GROK', 'SMASH!', 'SHUTTLE', 'GO!']);
      chair(3.9, 0, -Math.PI / 2);
      VN.jumbo(0, 7.5, -16.5, 0, 7, 3.4);
    } else {
      VN.arena(26, 30, 10, { wall: '#7f1d1d', trim: '#facc15', floor: '#1e3a8a' });
      VN.field(10, 16, '#2563eb', { planks: false, th: 0.03, y: 0.0 });
      // table: top, white lines, legs, net
      b.box(1.525, 0.04, 2.74, 0.01, '#1e40af', 0, 0.74, 0, 0, 0, 0, 'gloss');
      [[-0.7425, -1.37, -0.7425, 1.37], [0.7425, -1.37, 0.7425, 1.37], [-0.7625, -1.35, 0.7625, -1.35], [-0.7625, 1.35, 0.7625, 1.35], [0, -1.37, 0, 1.37]].forEach((s) => { const L = Math.hypot(s[2] - s[0], s[3] - s[1]); b.box(s[0] === s[2] ? 0.02 : L, 0.004, s[0] === s[2] ? L : 0.02, 0, '#ffffff', (s[0] + s[2]) / 2, 0.762, (s[1] + s[3]) / 2); });
      [[-0.6, -1.1], [0.6, -1.1], [-0.6, 1.1], [0.6, 1.1]].forEach((p) => b.box(0.06, 0.72, 0.06, 0.02, '#111827', p[0], 0.36, p[1]));
      b.box(1.3, 0.05, 0.05, 0.02, '#111827', 0, 0.3, -1.1); b.box(1.3, 0.05, 0.05, 0.02, '#111827', 0, 0.3, 1.1);
      [-1, 1].forEach((k) => b.box(0.04, 0.17, 0.06, 0.01, '#9ca3af', k * 0.86, 0.84, 0));
      V.world.add(net(1.72, 0.1525, 0.76, 0).group(false));
      // barriers
      for (let i = -4; i <= 4; i++) [-7, 7].forEach((z) => b.box(1.9, 0.7, 0.06, 0.03, i % 2 ? '#e11d48' : '#1e3a8a', i * 2, 0.35, z));
      for (let i = -3; i <= 3; i++) [-4.5, 4.5].forEach((x) => b.box(0.06, 0.7, 1.9, 0.03, i % 2 ? '#e11d48' : '#1e3a8a', x, 0.35, i * 2));
      VN.add(b.group(true));
      VN.stand({ x: -7.5, z: 0, ry: -Math.PI / 2, len: 18, rows: M.low ? 3 : 5, seats: ['#dc2626', '#f8fafc'], wall: '#7f1d1d', seed: 41 });
      VN.stand({ x: 7.5, z: 0, ry: Math.PI / 2, len: 18, rows: M.low ? 3 : 5, seats: ['#dc2626', '#f8fafc'], wall: '#7f1d1d', seed: 42 });
      VN.stand({ x: 0, z: -9.0, ry: Math.PI, len: 12, rows: M.low ? 3 : 5, seats: ['#dc2626', '#f8fafc'], wall: '#7f1d1d', seed: 43 });
      const u = new M.B(); u.box(1.2, 0.75, 0.6, 0.06, '#1e3a8a', 2.6, 0.38, 0); u.box(1.3, 0.05, 0.7, 0.02, '#f8fafc', 2.6, 0.77, 0); u.box(0.3, 0.3, 0.02, 0.02, '#111827', 2.6, 0.95, 0.15, -0.3, 0, 0);
      [-1, 1].forEach((k) => { u.box(0.4, 0.5, 0.4, 0.08, '#475569', -1.6, 0.25, k * 2.6); u.box(0.36, 0.06, 0.3, 0.03, '#f8fafc', -1.6, 0.52, k * 2.6); });
      for (let i = 0; i < 6; i++) u.box(0.6, 1.2, 0.06, 0.03, ['#facc15', '#e11d48', '#3b82f6'][i % 3], -6 + i * 2.4, 6.5, -14.8, 0, 0, 0, 'glow');
      VN.add(u.group(true)); chair(2.6, -0.5, -Math.PI / 2);
      adSigns(7, 4.5);
      VN.jumbo(0, 5.5, -11.5, 0, 6, 3);
    }
  }
  // printed ad boards around a court (two long sides + ends)
  function adBoards(hx, hz, cols, words) {
    let k = 0; for (let i = -2; i <= 2; i++) [-hz, hz].forEach((z) => { const g = V.sign(words[k % words.length], 2.6, 0.7, cols[k % cols.length], '#ffffff'); g.position.set(i * 2.8, 0.35, z + (z > 0 ? 0.02 : -0.02) * 0); g.rotation.y = z > 0 ? Math.PI : 0; V.world.add(g); k++; });
    for (let i = -2; i <= 2; i++) [-hx, hx].forEach((x) => { const g = V.sign(words[k % words.length], 2.6, 0.7, cols[k % cols.length], '#ffffff'); g.position.set(x, 0.35, i * 2.9); g.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; V.world.add(g); k++; });
  }
  function adSigns(hz, hx) { for (let i = -3; i <= 3; i += 2) [-hz + 0.04, hz - 0.04].forEach((z) => { const g = V.sign(i % 4 === 1 ? 'GROK PING' : 'TOP SPIN!', 1.8, 0.6, i % 4 === 1 ? '#1e3a8a' : '#e11d48', '#ffffff'); g.position.set(i * 2, 0.35, z); g.rotation.y = z > 0 ? Math.PI : 0; V.world.add(g); }); void hx; }
  function chair(x, z, ry) { const b = new M.B(); [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach((p) => b.cyl(0.04, 0.04, 2, '#e5e7eb', p[0], 1, p[1], 0, 0, 0, null, 6)); b.box(1, 0.1, 1, 0.03, '#15803d', 0, 2, 0); b.box(1, 0.8, 0.1, 0.03, '#15803d', 0, 2.4, 0.45); b.box(0.9, 0.8, 0.06, 0.02, '#14532d', 0, 2.4, -0.48); const g = b.group(true); g.position.set(x, 0, z); g.rotation.y = ry; VN.add(g); const ump = M.athlete(Object.assign(D.aiLook(77), { tool: 'none', hat: 'visor', shirt: '#f8fafc' })); ump.position.set(x, 1.15, z); ump.rotation.y = ry + Math.PI; ump.scale.setScalar(0.95); M.outline(ump); VN.add(ump); }
  SP.Sports.tennis = SP.NetGame('tennis'); SP.Sports.tennis.rec = { singles: { n: 'Games won' }, doubles: { n: 'Games won' } };
  SP.Sports.badminton = SP.NetGame('badminton'); SP.Sports.badminton.rec = { singles: { n: 'Points' }, doubles: { n: 'Points' } };
  SP.Sports.tabletennis = SP.NetGame('tabletennis'); SP.Sports.tabletennis.rec = { singles: { n: 'Points' }, doubles: { n: 'Points' } };
})();

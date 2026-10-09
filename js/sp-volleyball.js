/* Grok Sports Command - Beach Volleyball 2v2: bump-set-spike, 3 touches, blocks, digs, rally scoring to 11 (win by 2) */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, E = SP.E, Ph = SP.Ph, T = THREE;
  const HW = 4, HL = 8, NH = 2.3, BR = 0.105, G = 9.8;
  SP.Sports.volleyball = function (ctx) {
    const S = { P: [], O: [], hud: {}, x: {} }, R = ctx.rng, n = ctx.players.length;
    const ball = { x: 0, y: 2, z: 0, vx: 0, vy: 0, vz: 0, v: true }; S.O.push(ball);
    const st = { phase: 'serve', t: 0, score: [0, 0], srvTeam: 0, server: -1, touches: 0, team: -1, last: -1, over: false, want: null, kind: '', crossed: false };
    ctx.players.forEach((pl) => S.P.push({ x: 0, y: 0, z: 0, ry: 0, a: 'ready', at: 0, sd: 1, team: pl.team, mx: 0, mz: 0, jump: 0, tx: 0, tz: 0 }));
    const mateOfHuman = (i) => ctx.players.some((q, j) => j !== i && q.team === ctx.players[i].team && ctx.isHuman(j));
    const dOf = (i) => mateOfHuman(i) ? D.DIFF.normal : ctx.D;
    const P = S.P, side = (t) => t === 0 ? 1 : -1, team = (t) => P.map((p, i) => i).filter((i) => P[i].team === t);
    const srvIdx = [0, 0];
    function setupServe() {
      st.phase = 'serve'; st.t = 0; st.touches = 0; st.team = st.srvTeam; st.last = -1; st.want = null; st.crossed = false;
      const tm = team(st.srvTeam); st.server = tm[srvIdx[st.srvTeam] % tm.length];
      P.forEach((p, i) => { const s = side(p.team), k = team(p.team).indexOf(i); p.x = (k ? 1.6 : -1.6); p.z = s * 4.5; p.ry = s > 0 ? Math.PI : 0; p.a = 'ready'; p.jump = 0; p.y = 0; });
      const sv = P[st.server], s = side(sv.team); sv.x = 0.8; sv.z = s * (HL + 0.6);
      ball.x = sv.x + 0.25; ball.z = sv.z - s * 0.3; ball.y = 1.1; ball.vx = ball.vy = ball.vz = 0;
      upd(); if (st.server === ctx.me) ctx.ev({ t: 'hint', b: 'SWIPE UP to serve!', d: 1300 });
    }
    function upd() { const h = S.hud; h.l = E.teamName(0); h.r = E.teamName(1); h.ls = st.score[0]; h.rs = st.score[1]; h.mid = 'TO 11'; const me = ctx.me;
      h.tip = st.phase === 'serve' && st.server === me ? 'SWIPE UP to serve' : st.want && st.want.i === me ? (st.want.kind === 'spike' ? 'SWIPE DOWN to SPIKE!' : 'TAP to ' + st.want.kind.toUpperCase() + '!') : '';
      VN.drawScore('BEACH VOLLEY', h.ls, h.rs, h.l, h.r, 'Rally to 11'); }
    /* ---- touches ---- */
    // send the ball from where it is to (tx, ty, tz) in time t
    function send(tx, ty, tz, t) { const v = Ph.solve([ball.x, ball.y, ball.z], [tx, ty, tz], t, G, 0); ball.vx = v[0]; ball.vy = v[1]; ball.vz = v[2]; }
    function serve(i, aim, pow) {
      const p = P[i], s = side(p.team); st.phase = 'rally'; st.team = p.team; st.touches = 0; st.last = i; st.crossed = false; st.kind = 'serve';
      ball.y = 2.6; ball.x = p.x; ball.z = p.z - s * 0.2; E.act(p, 'serve'); ctx.ev({ t: 'fx', k: 'thud', a: 0.6 });
      const depth = U.clamp(pow, 0, 1.3), tx = U.clamp(aim, -1.3, 1.3) * HW * 0.7, tz = -s * (2 + depth * 5.6);
      send(tx, BR, tz, 1.45 - depth * 0.25); assign();
    }
    // the receiving team decides who plays the next touch and where
    function assign() { st.want = null; }
    function contactPoint(h) { // when/where the ball descends through height h on its current path
      const a = -0.5 * G, b = ball.vy, c = ball.y - h, disc = b * b - 4 * a * c; if (disc < 0) return null; const t = (-b - Math.sqrt(disc)) / (2 * a); if (t < 0) return null;
      return { t, x: ball.x + ball.vx * t, z: ball.z + ball.vz * t };
    }
    function plan() {
      const land = contactPoint(1.0); if (!land) return null;
      const tt = land.z > 0 ? 0 : 1, next = tt === st.team ? st.touches + 1 : 1;
      if (next > 3) return null;
      const kind = next === 1 ? 'bump' : next === 2 ? 'set' : 'spike', h = kind === 'spike' ? 2.75 : kind === 'set' ? 1.9 : 0.85;
      const cp = contactPoint(h); if (!cp || (cp.z > 0 ? 0 : 1) !== tt) return null;
      const tm = team(tt); let i = tm[0];
      if (next === 1) { let bd = 1e9; tm.forEach((j) => { const d = Math.hypot(P[j].x - cp.x, P[j].z - cp.z); if (d < bd) { bd = d; i = j; } }); }
      else { const others = tm.filter((j) => j !== st.last); i = others.length ? others[0] : tm[0]; }
      return { i, kind, h, t: cp.t, x: cp.x, z: cp.z, team: tt, n: next, at: st.t + cp.t };
    }
    function touch(i, q, aim, power, kind0) {
      const w = st.want, p = P[i], s = side(p.team), mate = team(p.team).find((j) => j !== i);
      let kind = kind0 || (w ? w.kind : 'bump'); if (kind === 'spike' && Math.abs(p.z) > 3.2) kind = 'free';
      const err = (1 - q) * 1.6;
      st.touches = st.team === p.team ? st.touches + 1 : 1; st.team = p.team; st.last = i; st.crossed = false; st.kind = kind; st.want = null;
      if (st.touches > 3) { return fault(p.team, 'Four touches!'); }
      if (kind === 'bump') { E.act(p, 'bump'); ctx.ev({ t: 'fx', k: 'thud', a: 0.5 }); const sx = 0.5 * (P[mate] ? Math.sign(P[mate].x || 1) : 1); send(sx + Ph.gauss(R) * err * 0.6, 1.9, s * 1.6 + Ph.gauss(R) * err * 0.5, 1.45); }
      else if (kind === 'set') { E.act(p, 'set'); ctx.ev({ t: 'fx', k: 'catch', a: 0.4 }); const ax = P[mate] ? U.clamp(P[mate].x, -2.4, 2.4) : 1.5; send(ax + Ph.gauss(R) * err * 0.5, 2.75, s * 1.1 + Ph.gauss(R) * err * 0.3, 1.25); }
      else if (kind === 'spike') {
        p.jump = 0.6; E.act(p, 'spike'); ctx.ev({ t: 'fx', k: 'smash' }); ctx.ev({ t: 'shake', k: 0.12 });
        const tx = U.clamp(aim, -1.2, 1.2) * HW * 0.8 + Ph.gauss(R) * err * 0.9, tz = -s * (2.2 + U.clamp(power, 0, 1) * 4.6) + Ph.gauss(R) * err;
        ball.y = Math.max(ball.y, 2.85);
        let t = 0.72 + (1 - power) * 0.3 - (ctx.isHuman(i) ? 0 : ctx.D.power * 0.1); send(tx, BR, tz, t);
        // make sure it clears the tape unless the touch was bad
        const tc = Math.abs(ball.z) / Math.abs(ball.vz), yc = ball.y + ball.vy * tc - 0.5 * G * tc * tc; if (yc < NH + 0.1 && q > 0.35) { send(tx, BR, tz * 1.15, t + 0.2); }
        blockTry(p.team, tx);
      } else { E.act(p, 'set'); ctx.ev({ t: 'fx', k: 'thud', a: 0.4 }); send(U.clamp(aim, -1, 1) * HW * 0.6 + Ph.gauss(R) * err, BR, -s * (4 + U.clamp(power, 0, 1) * 3) + Ph.gauss(R) * err, 1.6); }
    }
    function blockTry(t, tx) {
      const def = team(1 - t), s = side(1 - t); let best = -1, bd = 9; def.forEach((j) => { const q = P[j]; if (Math.abs(q.z) < 2.2) { const d = Math.abs(q.x - ball.x); if (d < bd) { bd = d; best = j; } } });
      if (best < 0 || bd > 1.3) return; const q = P[best]; const hum = ctx.isHuman(best);
      if (hum) { st.blockWin = { i: best, until: st.t + 0.35 }; return; }
      if (R() < 0.12 + ctx.D.grab * 0.3) doBlock(best); void s; void tx;
    }
    function doBlock(j) { const q = P[j]; q.jump = 0.6; E.act(q, 'block'); ball.vz = side(1 - q.team) * Math.abs(ball.vz) * 0.35; ball.vy = 1.5; ball.vx *= 0.5; st.team = q.team; st.touches = 0; st.last = j; st.kind = 'block'; st.crossed = false; ctx.ev({ t: 'msg', b: 'BLOCKED!', s: ctx.players[j].name, d: 1000 }); ctx.ev({ t: 'fx', k: 'thud' }); VN.roar(0.7); if (ctx.isHuman(j)) ctx.stat(j, 'block'); }
    function fault(t, why) { point(1 - t, why); }
    function point(t, why) {
      if (st.phase !== 'rally') return; (st.log = st.log || []).push(t + ':' + why + ':' + st.kind + ':' + st.last + ':' + st.touches + (st.wantLog ? ':' + st.wantLog : '')); st.wantLog = ''; st.phase = 'dead'; st.t = 0; st.score[t]++; st.want = null;
      ctx.ev({ t: 'msg', b: t === ctx.myTeam ? 'POINT!' : 'POINT ' + E.teamName(t).toUpperCase(), s: why, d: 1300 }); ctx.ev({ t: 'roar', k: t === ctx.myTeam ? 0.8 : 0.4 }); ctx.ev({ t: 'fx', k: t === ctx.myTeam ? 'win' : 'lose' });
      team(t).forEach((j) => E.act(P[j], 'cheer')); if (st.srvTeam !== t) { st.srvTeam = t; srvIdx[t]++; }
      const a = st.score[0], b = st.score[1]; if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2 || a >= 15 || b >= 15) st.over = true; upd();
    }
    /* ---- input ---- */
    function input(i, ev) {
      const p = P[i]; if (!p) return;
      if (ev.k === 'assist') { ctx.cfg.assist = ctx.cfg.assist || {}; ctx.cfg.assist[i] = !!ev.on; return; }
      if (ev.k === 'move') { p.mx = U.clamp(+ev.x || 0, -1, 1); p.mz = U.clamp(+ev.z || 0, -1, 1); return; }
      if (st.phase === 'serve' && st.server === i && ev.k === 'swipe') { const up = -(ev.uy == null ? -1 : ev.uy); if (up > 0.3) serve(i, (ev.ux || 0) / up, (ev.power == null ? 0.6 : ev.power) * (ctx.assist(i) ? 0.75 : 1) + (ctx.assist(i) ? 0.12 : 0)); return; }
      if (st.phase === 'serve' && st.server === i && ev.k === 'tap' && ctx.assist(i)) { serve(i, (R() - 0.5), 0.6); return; }
      if (st.phase !== 'rally') return;
      if (st.blockWin && st.blockWin.i === i && st.t < st.blockWin.until && (ev.k === 'tap' || ev.k === 'swipe')) { st.blockWin = null; if (R() < 0.55) doBlock(i); else { p.jump = 0.6; E.act(p, 'block'); } return; }
      const w = st.want; if (!w || w.i !== i) { if (ev.k === 'tap' && Math.abs(p.z) < 2) { p.jump = 0.6; E.act(p, 'block'); } return; }
      const dtc = st.t - w.at, win = ctx.assist(i) ? [-0.42, 0.3] : [-0.28, 0.18], d = Math.hypot(p.x - ball.x, p.z - ball.z);
      if (dtc < win[0] - 0.25) return; // way too early: ignore
      if (dtc < win[0] || d > 1.6) { st.whiff = i; E.act(p, w.kind === 'bump' ? 'bump' : 'set'); ctx.ev({ t: 'hint', b: dtc < win[0] ? 'Too early!' : 'Too far!', d: 600 }); w.miss = true; st.wantLog = 'whiff' + dtc.toFixed(2) + '/' + d.toFixed(1); return; }
      const q = U.clamp(1 - Math.abs(dtc + 0.05) / 0.45, 0.2, 1) * (ctx.assist(i) ? 1 : 0.95);
      if (w.kind === 'spike') { if (ev.k === 'swipe') { const dn = ev.uy == null ? 1 : ev.uy; touch(i, q, (ev.ux || 0) * 1.3, U.clamp(ev.power == null ? 0.7 : ev.power, 0.2, 1), dn > -0.2 ? 'spike' : 'free'); } else touch(i, q, (R() - 0.5) * 1.2, 0.6, 'free'); }
      else touch(i, q, ev.ux || 0, ev.power || 0.6);
      if (ctx.isHuman(i) && q > 0.85) ctx.ev({ t: 'hint', b: 'PERFECT ' + w.kind.toUpperCase() + '!', d: 600 });
    }
    /* ---- sim ---- */
    function sim(dt) {
      if (st.over && st.phase !== 'rally') { if (st.phase !== 'over') { st.phase = 'over'; finish(); } return; }
      st.t += dt; P.forEach((p) => { p.jump = Math.max(0, p.jump - dt); p.y = p.jump > 0 ? Math.sin((1 - p.jump / 0.6) * Math.PI) * 0.65 : 0; if (p.a !== 'ready' && p.at > 0.8 && p.a !== 'cheer') { p.a = 'ready'; p.at = 0; } });
      if (st.phase === 'serve') { const sv = P[st.server]; ball.x = sv.x + 0.25; ball.y = 1.1 + Math.abs(Math.sin(st.t * 3)) * 0.3; ball.z = sv.z - side(sv.team) * 0.3; if (!ctx.isHuman(st.server) && st.t > 1.3) serve(st.server, (R() - 0.5) * 1.6, 0.35 + R() * 0.55 * ctx.D.power + (R() < ctx.D.err * 0.6 ? 0.55 : 0)); if (ctx.isHuman(st.server) && st.t > 12) serve(st.server, 0, 0.6); moveAll(dt); upd(); return; }
      if (st.phase === 'dead') { if (ball.y > BR) { Ph.step(ball, dt, G, 0); if (ball.y < BR) { ball.y = BR; ball.vx = ball.vy = ball.vz = 0; } } if (st.t > 1.8) setupServe(); return; }
      const pz = ball.z; Ph.step(ball, dt, G, 0.0);
      // net
      if (Math.sign(pz) !== Math.sign(ball.z) && pz !== 0) {
        if (ball.y < NH + BR && Math.abs(ball.x) < HW + 0.5) { ball.z = pz > 0 ? BR : -BR; ball.vz *= -0.25; ball.vx *= 0.5; ctx.ev({ t: 'fx', k: 'net' }); if (st.kind === 'serve') return fault(st.team, 'Serve into the net'); }
        else { st.crossed = true; if (Math.sign(ball.z) === side(st.team)) {} else { st.team = 1 - st.team; st.touches = 0; } st.want = null; }
      }
      // need a new plan?
      if (!st.want && st.phase === 'rally' && st.t > (st.noPlan || 0)) { const pl = plan(); if (pl) st.want = pl; else st.noPlan = st.t + 0.1; }
      const w = st.want;
      if (w && !w.miss) {
        // contact moment
        if (st.t >= w.at - 0.02) {
          const p = P[w.i], d = Math.hypot(p.x - ball.x, p.z - ball.z), hum = ctx.isHuman(w.i);
          if (!hum) { const dd = dOf(w.i), reach = 1.0 + dd.reach * 0.25; const fast = Math.hypot(ball.vx, ball.vz) > 14; const okC = d < reach && R() > (fast ? (1 - dd.grab * 0.68) : dd.err * 0.8);
            if (okC) { if (w.kind === 'spike') { const def = team(1 - p.team); const open = def.reduce((s, j) => s + P[j].x, 0) / def.length > 0 ? -1 : 1; const smart = R() < dd.smart; touch(w.i, 0.55 + dd.smart * 0.4 + (mateOfHuman(w.i) ? 0 : dd.power * 0.1), smart ? open * (0.6 + R() * 0.4) : (R() - 0.5) * 1.6, 0.55 + dd.power * 0.4, R() < 0.85 ? 'spike' : 'free'); } else touch(w.i, 0.45 + dd.smart * 0.5 - (fast ? 0.2 : 0), 0, 0.6); }
            else { w.miss = true; st.wantLog = 'cpu-miss' + (d < reach ? '' : '-far' + d.toFixed(1)); } }
          else if (ctx.assist(w.i) && w.kind !== 'spike' && st.t >= w.at + 0.06 && d < 1.7) touch(w.i, 0.55, 0, 0.6);   // assist helps with bump + set
          else if (ctx.assist(w.i) && w.kind === 'spike' && st.t >= w.at + 0.14 && d < 1.7) touch(w.i, 0.6, (R() - 0.5) * 1.2, 0.5, 'free');
          else if (st.t > w.at + 0.32) { w.miss = true; st.wantLog = 'hum-miss' + d.toFixed(1); }
        }
      }
      // landing
      if (ball.y <= BR) {
        const s = ball.z > 0 ? 0 : 1, inC = Math.abs(ball.x) <= HW + BR && Math.abs(ball.z) <= HL + BR;
        ctx.ev({ t: 'burst', x: ball.x, y: 0.05, z: ball.z, c: '#fde68a', n: 12, sp: 2.5 }); ctx.ev({ t: 'fx', k: 'thud', a: 0.4 });
        if (inC) point(1 - s, s === st.team && st.touches > 0 && !st.crossed ? 'Dropped it!' : 'Kill!');
        else { const lastT = st.last >= 0 ? P[st.last].team : st.team; point(1 - lastT, 'Out!'); }
        if (ctx.isHuman(st.last) && inC && s !== P[st.last].team) ctx.stat(st.last, 'kill');
        return;
      }
      if (Math.abs(ball.x) > HW + 6 || Math.abs(ball.z) > HL + 6) { const lastT = st.last >= 0 ? P[st.last].team : st.team; point(1 - lastT, 'Out!'); return; }
      moveAll(dt); upd();
    }
    function moveAll(dt) {
      const w = st.want;
      P.forEach((p, i) => {
        const s = side(p.team), hum = ctx.isHuman(i), sp = 5.4 * (hum ? 1 : ctx.D.speed);
        if (hum && (Math.abs(p.mx) > 0.08 || Math.abs(p.mz) > 0.08)) { p.x += p.mx * sp * dt; p.z += p.mz * sp * dt; p.ry = U.lerpAng(p.ry, Math.atan2(p.mx, p.mz), Math.min(1, dt * 12)); clampP(p); return; }
        if (hum && !ctx.assist(i)) return;
        if (st.phase === 'serve' && i === st.server) return;
        let tx, tz;
        if (w && w.i === i) { tx = w.x; tz = w.z + s * 0.25; }
        else if (w && w.team === p.team) { // partner: setter goes to the net, others cover
          if (w.n === 1) { tx = 0.5; tz = s * 1.4; } else if (w.n === 2) { tx = U.clamp(p.x, -2.4, 2.4) || 1.5; tz = s * 1.6; } else { tx = -w.x * 0.3; tz = s * 4.5; } }
        else if (st.team === p.team && st.crossed === false && st.phase === 'rally') { tx = team(p.team).indexOf(i) ? 1.6 : -1.6; tz = s * 4.5; }
        else { const k = team(p.team).indexOf(i); const atNet = k === 0 && st.touches >= 1 && st.team !== p.team; tx = atNet ? ball.x * 0.6 : (k ? 1.6 : -1.6) * 0.8 + ball.x * 0.3; tz = atNet ? s * 0.9 : s * 4.8; }
        Ph.moveTo(p, tx, tz, sp * (hum ? 0.9 : 1), dt); Ph.face(p, ball.x, ball.z, dt * 8); clampP(p);
      });
    }
    function clampP(p) { const s = side(p.team); p.x = U.clamp(p.x, -HW - 2, HW + 2); p.z = s > 0 ? U.clamp(p.z, 0.4, HL + 2) : U.clamp(p.z, -HL - 2, -0.4); }
    function finish() { const w = st.score[0] > st.score[1] ? 0 : 1; ctx.ev({ t: 'roar', k: 1 }); ctx.ev({ t: 'party', x: 0, y: 3, z: side(w) * 4, n: 70 });
      const score = {}; P.forEach((p, i) => { score[i] = st.score[p.team]; });
      ctx.end({ win: w, title: E.wins(w) + ' ' + st.score[w] + '-' + st.score[1 - w], lines: ['Rally scoring to 11, win by 2'], score }); }
    /* ---- view ---- */
    let bm, sh, ring, mark;
    function build() {
      V.env(VN.ENV.beach);
      VN.ground(400, '#ecc37c', '#d9a95e', -0.04);
      const sea = new T.Mesh(new T.PlaneGeometry(400, 160), new T.MeshLambertMaterial({ color: '#0b84c4' })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.02, -110); V.world.add(sea);
      const shallow = new T.Mesh(new T.PlaneGeometry(400, 10), new T.MeshLambertMaterial({ color: '#37c6e0' })); shallow.rotation.x = -Math.PI / 2; shallow.position.set(0, -0.015, -35); V.world.add(shallow);
      const foam = new M.B(); for (let i = -30; i <= 30; i++) foam.box(4, 0.02, 0.6, 0.02, '#f0fdff', i * 4 + Math.sin(i) * 1.2, -0.01, -30.3 + Math.sin(i * 1.7) * 0.6); VN.add(foam.group(false));
      VN.lines(VN.rect(-HW, -HL, HW, HL).concat([[-HW, 0, HW, 0]]), 0.08, '#2563eb', 0.006);
      const b = new M.B();
      [-1, 1].forEach((k) => { b.cyl(0.07, 0.07, NH + 0.3, '#f8fafc', k * (HW + 0.6), (NH + 0.3) / 2, 0, 0, 0, 0, 'gloss', 10); b.cyl(0.015, 0.015, 3.2, '#e5e7eb', k * (HW + 1.6), 1.3, 0, 0, 0, k * 0.75, null, 4); });
      for (let i = 0; i <= 44; i++) b.box(0.012, 0.9, 0.012, 0, '#111827', -HW - 0.5 + i * (HW * 2 + 1) / 44, NH - 0.45, 0); for (let j = 0; j <= 9; j++) b.box(HW * 2 + 1, 0.012, 0.012, 0, '#111827', 0, NH - 0.9 + j * 0.1, 0);
      b.box(HW * 2 + 1.1, 0.07, 0.03, 0.01, '#f8fafc', 0, NH, 0); b.box(HW * 2 + 1.1, 0.05, 0.03, 0.01, '#f8fafc', 0, NH - 0.92, 0);
      [-1, 1].forEach((k) => b.cyl(0.012, 0.012, 1.0, '#ef4444', k * HW, NH + 0.4, 0, 0, 0, 0, null, 6));
      // beach props: umbrellas, towels, coolers, lifeguard tower, surf boards, flags
      const ucol = [['#ef4444', '#ffffff'], ['#facc15', '#2563eb'], ['#22c55e', '#ffffff'], ['#a855f7', '#facc15']];
      [[-9, -6], [9.5, -3], [-10, 6], [10, 7], [-14, 0], [14, -9]].forEach((p, i) => { const c = ucol[i % 4]; b.cyl(0.04, 0.04, 2.4, '#e5e7eb', p[0], 1.2, p[1], 0, 0, 0, null, 6); for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2; b.add(new T.ConeGeometry(1.4, 0.5, 2, 1, true, a, Math.PI / 4), c[q % 2], null, p[0], 2.45, p[1]); }
        b.box(0.9, 0.02, 1.8, 0.01, c[0], p[0] + 1.1, 0.01, p[1] + 0.4, 0, 0.3, 0); b.box(0.5, 0.35, 0.35, 0.06, '#38bdf8', p[0] - 0.9, 0.18, p[1] + 0.6); });
      b.box(1.6, 0.12, 1.6, 0.04, '#ef4444', 13, 2.4, 3); [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach((q) => b.cyl(0.07, 0.07, 2.4, '#f8fafc', 13 + q[0], 1.2, 3 + q[1], 0, 0, 0, null, 6)); b.box(1.6, 1.0, 0.08, 0.04, '#ef4444', 13, 2.95, 3.8); b.box(1.7, 0.1, 1.7, 0.04, '#f8fafc', 13, 3.6, 3);
      for (let q = 0; q < 4; q++) b.sph(1, ['#f97316', '#22d3ee', '#f472b6', '#facc15'][q], -15 + q * 0.7, 1.0, -10, 0.25, 1.1, 0.06, 0, 0, 0.18, 'gloss');
      VN.add(b.group(true));
      [[-18, -14], [-12, -18], [16, -16], [20, -8], [-20, 4], [19, 10], [-17, 14], [8, -20]].forEach((p, i) => VN.palm(p[0], p[1], 1 + (i % 3) * 0.15));
      VN.stand({ x: 0, z: HL + 5, ry: 0, len: 16, rows: M.low ? 3 : 5, seats: ['#f59e0b', '#0ea5e9'], wall: '#0369a1', seed: 51 });
      VN.stand({ x: -HW - 5, z: 0, ry: -Math.PI / 2, len: 14, rows: M.low ? 3 : 4, seats: ['#f59e0b', '#0ea5e9'], wall: '#0369a1', seed: 52 });
      VN.flags([[-HW - 2.5, -HL - 1.5], [HW + 2.5, -HL - 1.5], [-HW - 2.5, HL + 1.5], [HW + 2.5, HL + 1.5]], 4);
      VN.jumbo(HW + 6, 4.5, -4, -Math.PI / 2 + 0.35, 6, 3);
      VN.clouds(M.low ? 5 : 9, 170, 50);
      E.makeModels('none', { teamShirts: ['#0ea5e9', '#f97316'] });
      bm = M.sportBall('volley', BR); V.world.add(bm); bm.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      sh = new T.Mesh(new T.CircleGeometry(0.2, 16), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false })); sh.rotation.x = -Math.PI / 2; V.world.add(sh);
      ring = new T.Mesh(new T.RingGeometry(0.45, 0.6, 28), new T.MeshBasicMaterial({ color: '#ffe14d', transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; V.world.add(ring);
      mark = new T.Mesh(new T.ConeGeometry(0.2, 0.36, 4), new T.MeshBasicMaterial({ color: '#ffe14d' })); mark.rotation.x = Math.PI; V.world.add(mark);
      setupServe();
    }
    function view(dt) {
      E.syncModels(dt); bm.position.set(ball.x, ball.y, ball.z); bm.rotation.x += dt * 5; sh.position.set(ball.x, 0.02, ball.z);
      const w = st.want; ring.visible = !!(w && ctx.isHuman(w.i) && w.i === ctx.me && st.phase === 'rally'); if (ring.visible) { const k = U.clamp((w.at - st.t) / 1.2, 0, 1); ring.position.set(w.x, 0.03, w.z); ring.scale.setScalar(0.6 + k * 1.6); ring.material.color.set(k < 0.25 ? '#4ade80' : '#ffe14d'); }
      const me = ctx.me; mark.visible = me >= 0 && !!P[me]; if (mark.visible) mark.position.set(P[me].x, P[me].y + 2.7 + Math.sin(V.t * 5) * 0.08, P[me].z);
    }
    function cam(dt, snap) { const s = side(ctx.myTeam || 0); E.fov(56); E.camLook(ball.x * 0.25, 7.2, s * (HL + 8.5), ball.x * 0.15, 0.8, -s * 1.5, dt, 3, snap); }
    return { S, build, sim, input, view, cam, st, ball, touch, serve };
  };
  SP.Sports.volleyball.rec = { '2v2': { n: 'Points in a match' } };
})();

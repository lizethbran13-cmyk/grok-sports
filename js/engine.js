/* Grok Sports Command - sport runner: match setup (players, teams, CPU fill), fixed-step sim, models, HUD, events,
   host-authoritative snapshots for online play, results + progression */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, T = THREE;
  const E = SP.E = { sport: null, ctx: null, S: null, running: false, acc: 0, H: 1 / 60, evq: [], snapT: 0, simT: 0 };
  SP.Sports = SP.Sports || {};
  const $ = (id) => document.getElementById(id);

  /* ---------- who plays where ---------- */
  // humans: [{pid,name,look}] (look = save look). o: { team:'coop'|'versus', cpus, teamUp }
  E.plan = function (sportId, modeId, humans, o) {
    const sp = D.sport(sportId); let mode = sp.modes.find((m) => m.id === modeId) || sp.modes[0]; o = o || {};
    const n = humans.length, players = []; let ai = 0;
    const cpu = (team, i) => { const seed = (o.seed || 7) + i * 31 + team * 7; return { ctrl: 'ai', name: D.AI_NAMES[(seed + ai++ * 5) % D.AI_NAMES.length], look: D.aiLook(seed, null), team }; };
    if (mode.turns) {
      humans.forEach((h, i) => players.push({ ctrl: 'human', pid: h.pid, name: h.name, look: h.look, team: o.teamUp ? 0 : i }));
      const c = U.clamp(o.cpus == null ? (n === 1 ? 1 : 0) : o.cpus, n === 1 ? 1 : 0, 4 - n);
      for (let i = 0; i < c; i++) { const p = cpu(o.teamUp ? 1 : players.length, i); players.push(p); }
      return { mode, players, desc: o.teamUp && c ? 'Team Up: friends vs ' + c + ' CPU' : players.length + ' players take turns' };
    }
    if (mode.team === 1 && n > 2) { const dbl = sp.modes.find((m) => m.team === 2); if (dbl) mode = dbl; }
    const size = mode.team, teams = [[], []];
    humans.forEach((h, i) => { let t = o.team === 'versus' ? i % 2 : (i < size ? 0 : 1); if (teams[t].length >= size) t = 1 - t; teams[t].push({ ctrl: 'human', pid: h.pid, name: h.name, look: h.look, team: t }); });
    for (let t = 0; t < 2; t++) while (teams[t].length < size) teams[t].push(cpu(t, teams[t].length));
    teams[0].concat(teams[1]).forEach((p) => players.push(p));
    const hb = teams[0].filter((p) => p.ctrl === 'human').length, hr = teams[1].filter((p) => p.ctrl === 'human').length;
    return { mode, players, desc: (hb ? hb + ' friend' + (hb > 1 ? 's' : '') : 'CPU') + ' on BLUE vs ' + (hr ? hr + ' friend' + (hr > 1 ? 's' : '') : 'CPU') + ' on RED' + (size > 1 ? ' (CPU fills the rest)' : '') };
  };

  /* ---------- start ---------- */
  // cfg: { sport, mode, diff, players, me, online, guest, seed, assist:{slot:bool}, teamUp }
  E.start = function (cfg) {
    E.stop(true);
    const sp = D.sport(cfg.sport), mode = sp.modes.find((m) => m.id === cfg.mode) || sp.modes[0];
    V.clearWorld(); VN.reset(); SP.Input.reset();
    const players = cfg.players.map((p, i) => Object.assign({ slot: i }, p));
    const ctx = E.ctx = {
      cfg, sp, mode, players, me: cfg.me == null ? 0 : cfg.me, host: !cfg.guest, guest: !!cfg.guest, online: !!cfg.online, rng: U.rng(cfg.seed || 1),
      diffName: cfg.diff || 'normal', D: D.DIFF[cfg.diff] || D.DIFF.normal,
      assist: (i) => { const p = players[i]; return !!(p && p.ctrl === 'human' && (cfg.assist ? cfg.assist[i] !== false : true)); },
      isHuman: (i) => players[i] && players[i].ctrl === 'human',
      ev: (e) => E.ev(e), stat: (slot, k, n) => E.ev({ t: 'stat', slot, k, n: n == null ? 1 : n }),
      end: (res) => E.finish(res), models: []
    };
    ctx.myTeam = players[ctx.me] ? players[ctx.me].team : 0;
    const make = SP.Sports[sp.id]; if (!make) throw new Error('missing sport ' + sp.id);
    const sport = E.sport = make(ctx); E.S = sport.S;
    E.S.P = E.S.P || []; E.S.O = E.S.O || []; E.S.hud = E.S.hud || {}; E.S.x = E.S.x || {};
    sport.build();
    E.running = true; E.acc = 0; E.simT = 0; E.evq = []; E.over = false; E.lastHud = ''; E.netT = []; E.paused = false;
    E.statsMine = {};
    SP.Input.joyAll = false; SP.Input.setJoy(sport.joy !== false); SP.Input.h = E.inputHandler; SP.Input.enabled = true;
    SP.Snd.setMusic(sp.music || 'arena');
    SP.UI.hud(true, sp, sport); E.syncHud(true);
    if (!ctx.guest && sport.how !== false && !cfg.noHow && !cfg.online && SP.G.save.seenHow && !SP.G.save.seenHow[sp.id]) { SP.G.save.seenHow[sp.id] = 1; SP.G.persist(); SP.UI.how(sp, true); }
    E.camInit = true;
    return sport;
  };
  E.stop = function (silent) { E.running = false; E.sport = null; E.S = null; SP.Input.h = null; if (!silent) SP.UI.hud(false); };

  /* ---------- players' 3D models ---------- */
  // tool: sport tool, ring: team ring colour at feet, tag: show name tags
  E.makeModels = function (tool, o) {
    o = o || {}; const ctx = E.ctx;
    ctx.models = ctx.players.map((p, i) => {
      const lk = p.ctrl === 'human' && p.look && p.look.shirt && p.look.shirt.indexOf('shirt_') === 0 ? D.lookOf(p.look) : Object.assign({}, p.look);
      if (o.teamShirts) lk.shirt = o.teamShirts[p.team] || lk.shirt;
      lk.tool = tool; const m = M.athlete(lk);
      const me = i === ctx.me, col = me ? '#ffe14d' : (o.ringCol ? o.ringCol(p) : D.TEAM_COL[p.team % 3]);
      if (o.ring !== false) { const rg = new T.Mesh(new T.RingGeometry(me ? 0.4 : 0.36, me ? 0.52 : 0.46, 28), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide })); rg.rotation.x = -Math.PI / 2; rg.position.y = 0.03; rg.userData.glow = true; m.add(rg); m.userData.ring = rg; }
      m.traverse((q) => { if (q.isMesh) q.castShadow = !M.low && !q.userData.glow; });
      if (!M.low) M.outline(m);
      V.world.add(m); m.userData.prev = null;
      if (o.tags !== false) m.userData.tagEl = V.tag(m, (me ? '⭐ ' : '') + p.name, me ? 'me' : 'team' + (p.team % 2), o.tagDy);
      return m;
    });
    return ctx.models;
  };
  // copy S.P -> models (position, facing, pose). Speed is derived from movement so guests animate too.
  E.syncModels = function (dt) {
    const S = E.S, ms = E.ctx.models;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i], p = S.P[i]; if (!m || !p) continue;
      m.visible = !p.hid; const pv = m.userData.prev;
      const sp = pv && dt > 0 ? Math.hypot(p.x - pv[0], p.z - pv[1]) / dt : 0; m.userData.spd = U.lerp(m.userData.spd || 0, Math.min(sp, 9), 0.25); m.userData.prev = [p.x, p.z];
      m.position.set(p.x, p.y || 0, p.z); m.rotation.y = U.lerpAng(m.rotation.y, p.ry || 0, Math.min(1, dt * 14));
      SP.Pose.apply(m, dt, { a: p.a, at: p.at, sd: p.sd, sp: m.userData.spd, pw: p.pw }, V.t + i);
      if (m.userData.tagEl) m.userData.tagEl.hide = !!p.hid || !!p.notag;
    }
  };
  E.act = function (p, a, sd) { p.a = a; p.at = 0; if (sd != null) p.sd = sd; };

  /* ---------- events (local + sent to guests) ---------- */
  E.ev = function (e) { if (E.ctx && E.ctx.host && E.ctx.online) E.evq.push(e); E.play(e); };
  E.play = function (e) {
    const ctx = E.ctx; if (!ctx) return;
    switch (e.t) {
      case 'fx': SP.Snd.fx(e.k, e.a); break;
      case 'msg': SP.UI.msg(e.b, e.s, e.d); break;
      case 'hint': SP.UI.hint(e.b, e.d); break;
      case 'roar': VN.roar(e.k); break;
      case 'party': V.party(e.x || 0, e.y || 3, e.z || 0, e.n); SP.Snd.fx('win'); break;
      case 'burst': V.burst(e.x, e.y, e.z, e.c, e.n, e.sp); break;
      case 'shake': V.shake(e.k || 0.3, e.d || 0.3); break;
      case 'say': SP.Snd.say(e.text); break;
      case 'stat': if (e.slot === ctx.me) E.statsMine[e.k] = (E.statsMine[e.k] || 0) + (e.n || 1); break;
      case 'end': if (ctx.guest) E.finish(e.res); break;
      default: if (E.sport && E.sport.onEv) E.sport.onEv(e);
    }
  };

  /* ---------- input: screen gestures -> world directions (camera relative) ---------- */
  const _d = new T.Vector3();
  E.camBasis = function () { V.cam.getWorldDirection(_d); let fx = _d.x, fz = _d.z; const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l; return { fx, fz, rx: -fz, rz: fx }; };
  E.inputHandler = {
    move: (e) => { const b = E.camBasis(); E.input({ k: 'move', x: b.rx * e.x - b.fx * e.y, z: b.rz * e.x - b.fz * e.y, jx: e.x, jy: e.y }); },
    tap: (e) => { const b = E.camBasis(); E.input({ k: 'tap', sx: e.sx, sy: e.sy, key: !!e.key, fx: b.fx, fz: b.fz }); },
    swipe: (e) => { const b = E.camBasis(), l = Math.max(1, e.len); const ux = e.dx / l, uy = e.dy / l; E.input({ k: 'swipe', x: b.rx * ux - b.fx * uy, z: b.rz * ux - b.fz * uy, dx: e.dx, dy: e.dy, len: e.len / innerHeight, power: e.power, curve: e.curve, spd: e.spd, sx: e.sx, sy: e.sy, sx0: e.sx0, sy0: e.sy0, fx: b.fx, fz: b.fz, ux, uy }); },
    down: (e) => E.input({ k: 'down', sx: e.sx, sy: e.sy }),
    drag: (e) => E.input({ k: 'drag', sx: e.sx, sy: e.sy, dx: e.dx / innerHeight, dy: e.dy / innerHeight }),
    up: (e) => E.input({ k: 'up', sx: e.sx, sy: e.sy, dx: e.dx / innerHeight, dy: e.dy / innerHeight, len: e.len / innerHeight, dur: e.dur }),
    pause: () => SP.UI.pause()
  };
  E.input = function (ev) {
    const ctx = E.ctx; if (!E.running || !ctx || E.over || E.paused) return;
    if (ctx.guest) { SP.Net.sendInput(ev); if (E.sport.localInput) E.sport.localInput(ev); return; }
    if (ctx.me >= 0) E.sport.input(ctx.me, ev);
  };
  E.remoteInput = function (slot, ev) { if (!E.running || E.over || !E.sport || slot < 0) return; if (!ev || typeof ev.k !== 'string') return; E.sport.input(slot, ev); };

  /* ---------- loop ---------- */
  E.update = function (dt) {
    if (!E.running || !E.sport) return;
    const ctx = E.ctx, S = E.S;
    if (ctx.host) {
      if (!E.paused || ctx.online) { E.acc += Math.min(dt, 0.1); let n = 0; while (E.acc >= E.H && n < 6) { E.tickAt(E.H); E.sport.sim(E.H); E.simT += E.H; E.acc -= E.H; n++; if (!E.running) return; } }
      if (ctx.online) { E.snapT -= dt; if (E.snapT <= 0) { E.snapT = 1 / 15; SP.Net.sendSnap(E.snap()); } }
    } else E.interp(dt);
    if (!ctx.host) for (const p of S.P) p.at = (p.at || 0) + dt;
    E.sport.view(dt); E.sport.cam(dt, E.camInit); E.camInit = false; E.syncHud();
  };
  E.tickAt = function (h) { const P = E.S.P; for (let i = 0; i < P.length; i++) P[i].at = (P[i].at || 0) + h; };
  // fast-forward for tests (no rendering)
  E.simFor = function (sec) { const n = Math.round(sec / E.H); for (let i = 0; i < n && E.running && E.sport; i++) { E.tickAt(E.H); E.sport.sim(E.H); E.simT += E.H; } if (E.sport) { E.sport.view(E.H); E.syncHud(); } };

  /* ---------- HUD (score board + meter) ---------- */
  E.syncHud = function (force) { if (!E.S) return; const h = E.S.hud, k = JSON.stringify(h); if (!force && k === E.lastHud) return; E.lastHud = k; SP.UI.setHud(h); };

  /* ---------- snapshots (host -> guests) ---------- */
  const r2 = (v) => Math.round((v || 0) * 100) / 100;
  E.snap = function () {
    const S = E.S, A = SP.Pose.idx;
    const d = { t: 's', P: S.P.map((p) => [r2(p.x), r2(p.y), r2(p.z), r2(p.ry), A[p.a] | 0, r2(p.at), p.sd < 0 ? -1 : 1, (p.hid ? 1 : 0) | (p.notag ? 2 : 0), r2(p.pw)]), O: S.O.map((o) => [r2(o.x), r2(o.y), r2(o.z), r2(o.rx), r2(o.ry), r2(o.rz), o.v === false ? 0 : 1, r2(o.vx), r2(o.vy), r2(o.vz)]) };
    const hk = JSON.stringify(S.hud); if (hk !== E._sh) { E._sh = hk; d.h = S.hud; }
    const xk = JSON.stringify(S.x); if (xk !== E._sx || (E._sxT = (E._sxT || 0) + 1) % 30 === 0) { E._sx = xk; d.x = S.x; }
    if (E.evq.length) { d.e = E.evq.slice(0, 40); E.evq = []; }
    return d;
  };
  E.applySnap = function (d) {
    const S = E.S; if (!S || !E.running) return; const A = SP.Pose.ACTS;
    E.netT = E.netT || []; E.netAt = performance.now();
    (d.P || []).forEach((q, i) => { let p = S.P[i]; if (!p) p = S.P[i] = { x: 0, y: 0, z: 0, ry: 0 }; if (!Array.isArray(q)) return; p.tx = +q[0] || 0; p.ty = +q[1] || 0; p.tz = +q[2] || 0; p.try = +q[3] || 0; const a = A[q[4] | 0] || 'idle'; if (a !== p.a || +q[5] < (p.at || 0) - 0.2) { p.a = a; p.at = +q[5] || 0; } p.sd = q[6] < 0 ? -1 : 1; p.hid = !!(q[7] & 1); p.notag = !!(q[7] & 2); p.pw = +q[8] || 0; if (p.x == null || p._init == null) { p.x = p.tx; p.y = p.ty; p.z = p.tz; p.ry = p.try; p._init = 1; } });
    (d.O || []).forEach((q, i) => { let o = S.O[i]; if (!o) o = S.O[i] = {}; if (!Array.isArray(q)) return; o.tx = +q[0] || 0; o.ty = +q[1] || 0; o.tz = +q[2] || 0; o.rx = +q[3] || 0; o.ry = +q[4] || 0; o.rz = +q[5] || 0; o.v = !!q[6]; o.vx = +q[7] || 0; o.vy = +q[8] || 0; o.vz = +q[9] || 0; o.age = 0; const jump = o.x == null || Math.hypot(o.tx - o.x, o.ty - o.y, o.tz - o.z) > 4; if (jump) { o.x = o.tx; o.y = o.ty; o.z = o.tz; } });
    if (d.h && typeof d.h === 'object') S.hud = d.h;
    if (d.x && typeof d.x === 'object') { S.x = d.x; if (E.sport.onX) E.sport.onX(d.x); }
    (Array.isArray(d.e) ? d.e : []).forEach((e) => { if (e && typeof e.t === 'string') E.play(e); });
  };
  E.interp = function (dt) {
    const S = E.S, k = 1 - Math.exp(-dt * 14);
    S.P.forEach((p) => { if (p.tx == null) return; p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.z += (p.tz - p.z) * k; p.ry = U.lerpAng(p.ry, p.try, k); });
    S.O.forEach((o) => { if (o.tx == null) return; o.age = (o.age || 0) + dt; const a = Math.min(o.age, 0.12); const ex = o.tx + o.vx * a, ey = o.ty + o.vy * a, ez = o.tz + o.vz * a; const kk = 1 - Math.exp(-dt * 22); o.x += (ex - o.x) * kk; o.y += (ey - o.y) * kk; o.z += (ez - o.z) * kk; });
  };

  /* ---------- finish + progression ---------- */
  // res: { win: team | -1, title, lines:[], score:{slot:number}, scoreLabel, vsCpu }
  E.finish = function (res) {
    if (E.over) return; E.over = true; const ctx = E.ctx; if (!ctx) return;
    if (ctx.host && ctx.online) { E.evq.push({ t: 'end', res }); SP.Net.sendSnap(E.snap()); }
    const me = ctx.players[ctx.me], myTeam = me ? me.team : -9, win = res.win === myTeam, draw = res.win === -1;
    const vsCpu = ctx.players.some((p) => p.ctrl === 'ai' && p.team !== myTeam);
    const award = SP.G.award(ctx.sp.id, ctx.mode.id, { win, draw, vsCpu, diff: ctx.diffName, score: res.score ? res.score[ctx.me] : null, stats: E.statsMine, spectator: !me });
    setTimeout(() => { if (E.ctx === ctx) SP.UI.results(res, award, win, draw); }, 1600);
  };
  E.teamName = function (t) { const ctx = E.ctx, ps = ctx.players.filter((p) => p.team === t); if (ps.length === 1) return ps[0].name; const h = ps.filter((p) => p.ctrl === 'human'); return h.length ? h.map((p) => p.name).join(' + ') : D.TEAM_NAME[t] + ' CPU'; };

  /* ---------- shared physics helpers ---------- */
  const Ph = SP.Ph = {};
  // linear-drag ballistic: position after time t
  Ph.at = function (p0, v0, g, k, t) { if (k < 1e-4) return [p0[0] + v0[0] * t, p0[1] + v0[1] * t - 0.5 * g * t * t, p0[2] + v0[2] * t]; const e = (1 - Math.exp(-k * t)) / k; return [p0[0] + v0[0] * e, p0[1] + (v0[1] + g / k) * e - g * t / k, p0[2] + v0[2] * e]; };
  // velocity to go from p0 to p1 in time t
  Ph.solve = function (p0, p1, t, g, k) { if (k < 1e-4) return [(p1[0] - p0[0]) / t, (p1[1] - p0[1] + 0.5 * g * t * t) / t, (p1[2] - p0[2]) / t]; const e = (1 - Math.exp(-k * t)) / k; return [(p1[0] - p0[0]) / e, (p1[1] - p0[1] + g * t / k) / e - g / k, (p1[2] - p0[2]) / e]; };
  Ph.step = function (b, dt, g, k) { b.vy -= g * dt; if (k) { const f = Math.exp(-k * dt); b.vx *= f; b.vy *= f; b.vz *= f; } b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; };
  // move a player toward (tx,tz) at speed sp (m/s); returns distance left
  Ph.moveTo = function (p, tx, tz, sp, dt) { const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d < 0.02) return 0; const s = Math.min(d, sp * dt); p.x += dx / d * s; p.z += dz / d * s; p.ry = U.lerpAng(p.ry, Math.atan2(dx, dz), Math.min(1, dt * 10)); return d - s; };
  Ph.face = (p, x, z, k) => { p.ry = U.lerpAng(p.ry, Math.atan2(x - p.x, z - p.z), k == null ? 1 : k); };
  Ph.gauss = (r) => { let u = 0; for (let i = 0; i < 4; i++) u += r(); return (u - 2) / 0.577; };
  // camera: smooth follow toward pos + look target
  const _cp = new T.Vector3(), _ct = new T.Vector3();
  E.camLook = function (px, py, pz, tx, ty, tz, dt, k, snap) { _cp.set(px, py, pz); _ct.set(tx, ty, tz); const kk = snap ? 1 : 1 - Math.exp(-dt * (k || 5)); V.cam.position.lerp(_cp, kk); E._lt = E._lt || new T.Vector3(); if (snap) E._lt.copy(_ct); else E._lt.lerp(_ct, kk); V.cam.lookAt(E._lt); };
  E.fov = function (f) { if (Math.abs(V.cam.fov - f) > 0.1) { V.cam.fov = f; V.cam.updateProjectionMatrix(); } };
})();

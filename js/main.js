/* Grok Sports Command - app state (title / plaza / match), saves, progression, loop */
(function () {
  'use strict';
  const SP = window.SP, D = SP.D, U = SP.U, V = SP.V, E = SP.E, UI = SP.UI;
  const $ = (id) => document.getElementById(id);
  const G = SP.G = { state: 'title', save: null, ready: false, last: null };
  G.persist = () => SP.Save.store(G.save);
  G.myName = () => GrokNet.cleanName(G.save.name || 'Player');
  G.myLook = () => Object.assign({}, G.save.look);
  G.myColor = () => (D.item(G.save.look.shirt) || {}).col || '#2563eb';
  G.init = function () {
    G.save = SP.Save.load(); G.save.seenHow = G.save.seenHow || {}; G.checkDaily();
    V.init($('c')); SP.Input.init(); V.setQuality(G.save.opts.gfx);
    $('nameIn').value = G.save.name || ''; $('coinT').textContent = G.save.coins;
    $('nameIn').addEventListener('change', () => { G.save.name = GrokNet.cleanName($('nameIn').value); $('nameIn').value = G.save.name; G.persist(); });
    $('bPlay').addEventListener('click', () => { SP.Snd.unlock(); G.saveName(); G.toHub(); });
    $('bQuick').addEventListener('click', () => { SP.Snd.unlock(); G.saveName(); G.toHub(); setTimeout(() => UI.menu(), 50); });
    $('bOnline').addEventListener('click', () => { SP.Snd.unlock(); G.saveName(); G.toHub(); setTimeout(() => SP.Net.lobby(), 50); });
    $('bPause').addEventListener('click', () => UI.pause());
    $('bMenu').addEventListener('click', () => UI.menu());
    $('bFriends').addEventListener('click', () => SP.Net.lobby());
    $('bDaily').addEventListener('click', () => UI.daily());
    $('bSettings').addEventListener('click', () => UI.settings());
    $('doorBtn').addEventListener('click', () => SP.Hub.useDoor());
    document.addEventListener('visibilitychange', () => { if (document.hidden && E.running && !E.ctx.online) UI.pause(); });
    // title backdrop: the plaza
    SP.Hub.build(); G.state = 'title';
    const prm = GrokNet.params(); if (prm) { G.toHub(); SP.Net.fromParams(prm); }
    let last = performance.now();
    const loop = (now) => { requestAnimationFrame(loop); let dt = (now - last) / 1000; last = now; if (dt > 0.1) dt = 0.1; G.frame(dt); };
    requestAnimationFrame(loop);
    G.ready = true;
    window.__sp = { G, E, SP, sim: (s) => E.simFor(s), ready: true };
  };
  G.saveName = () => { const n = $('nameIn').value.trim(); if (n) { G.save.name = GrokNet.cleanName(n); G.persist(); } };
  G.frame = function (dt) {
    SP.Snd.tick(dt);
    if (G.state === 'match' && E.running) E.update(dt); else SP.Hub.update(dt, G.state === 'title');
    V.update(dt); SP.Venue.tick(dt, V.t); V.render(dt);
    if (G.state !== 'title') V.watchFps(dt, () => { G.setGfx('low'); UI.toast('Switched to LOW graphics to keep things smooth (change it in ⚙️)', 'gold'); });
    G.fps = V.fpsAvg;
  };
  G.toTitle = function () { if (E.running) E.stop(); SP.Net.leave(); G.state = 'title'; SP.Hub.build(); UI.show('hud', false); UI.show('hubHud', false); UI.show('scrTitle', true); $('coinT').textContent = G.save.coins; };
  G.toHub = function (spot) { if (E.running) E.stop(); UI.show('scrTitle', false); UI.show('hud', false); G.state = 'hub'; SP.Hub.enter(spot); G.refreshHub(); };
  G.refreshHub = function () { $('coinN').textContent = G.save.coins; let tot = 0; D.SPORTS.forEach((s) => { tot += G.save.xp[s.id] || 0; }); const best = D.SPORTS.reduce((a, s) => Math.max(a, D.rankOf(G.save.xp[s.id] || 0).i), 0); $('hubRank').textContent = D.RANKS[best].icon + ' ' + D.RANKS[best].n + ' · ' + tot + ' XP'; };
  G.lookChanged = function () { SP.Hub.rebuildAvatar(); };
  G.setAssist = function (v) { G.save.opts.assist = !!v; G.persist(); if (E.running && E.ctx) { const c = E.ctx.cfg; c.assist = c.assist || {}; if (E.ctx.host) c.assist[E.ctx.me] = !!v; else SP.Net.sendInput({ k: 'assist', on: !!v }); $('assistTag').classList.toggle('off', !v); $('assistTag').textContent = v ? '🛟 ASSIST ON' : '🛟 ASSIST OFF'; } };
  G.setGfx = function (q, user) { G.save.opts.gfx = q; G.persist(); V.setQuality(q); if (user) V.autoStepped = true; if (G.state === 'hub' || G.state === 'title') SP.Hub.build(true); };

  /* ---------- matches ---------- */
  G.playSolo = function (sid, mode, diff, cpus) {
    const me = { pid: 'local', name: G.myName(), look: G.myLook() };
    const plan = E.plan(sid, mode, [me], { team: 'coop', cpus, seed: (Math.random() * 1e6) | 0 });
    const cfg = { sport: sid, mode: plan.mode.id, diff, players: plan.players, me: 0, seed: (Math.random() * 1e9) | 0, assist: { 0: G.save.opts.assist } };
    G.startMatch(cfg);
  };
  G.startMatch = function (cfg) {
    G.last = cfg; UI.show('scrTitle', false); UI.show('hubHud', false); $('fade').classList.add('on');
    setTimeout(() => { try { G.state = 'match'; E.start(cfg); } catch (e) { console.error(e); UI.toast('Oops, that sport failed to start', true); G.toHub(); } $('fade').classList.remove('on'); }, 260);
  };
  G.rematch = function () { if (SP.Net.room && SP.Net.room.opened) { if (SP.Net.room.isHost) SP.Net.restart(); return; } const c = Object.assign({}, G.last, { seed: (Math.random() * 1e9) | 0 }); G.startMatch(c); };
  G.quitMatch = function () { const sid = E.ctx && E.ctx.sp.id; E.stop(); if (SP.Net.room && SP.Net.room.opened) { SP.Net.backToLobby(); G.toHub(sid); SP.Net.roomPanel(); return; } G.toHub(sid); };

  /* ---------- progression ---------- */
  G.checkDaily = function () { const s = G.save, day = D.today(); if (s.daily.day !== day) { s.daily = { day, list: D.dailyFor(day), prog: {}, done: [] }; s.sportsToday = []; G.persist(); } };
  G.award = function (sid, mode, o) {
    const s = G.save; if (o.spectator) return { spectator: true };
    G.checkDaily();
    const dB = { easy: 0, normal: 10, hard: 22, pro: 36 }[o.diff] || 0;
    let xp = 18 + (o.win ? 30 + (o.vsCpu ? dB : 10) : o.draw ? 12 : 0), coins = o.win ? 28 + (o.vsCpu ? dB : 8) : o.draw ? 16 : 12;
    const before = D.rankOf(s.xp[sid] || 0).i; s.xp[sid] = (s.xp[sid] || 0) + xp; const after = D.rankOf(s.xp[sid]).i;
    s.played[sid] = (s.played[sid] || 0) + 1; s.stats.matches++; if (o.win) { s.wins[sid] = (s.wins[sid] || 0) + 1; s.stats.wins++; }
    let trophy = false; const order = D.DIFF_ORDER;
    if (o.win && o.vsCpu && (!s.trophies[sid] || order.indexOf(o.diff) > order.indexOf(s.trophies[sid]))) { s.trophies[sid] = o.diff; trophy = true; }
    // records
    let record = false; const sp = D.sport(sid), md = sp.modes.find((m) => m.id === mode), rk = SP.Sports[sid] && SP.Sports[sid].rec && SP.Sports[sid].rec[mode];
    if (rk && o.score != null && isFinite(o.score)) { s.best[sid] = s.best[sid] || {}; const k = rk.n + (md ? ' (' + md.n + ')' : ''), cur = s.best[sid][k]; if (cur == null || (rk.low ? o.score < cur : o.score > cur)) { s.best[sid][k] = o.score; record = cur != null || true; } }
    // daily challenges
    const st = Object.assign({}, o.stats || {}); if (o.win) { st.win = (st.win || 0) + 1; if (o.vsCpu && (o.diff === 'hard' || o.diff === 'pro')) st.winhard = 1; }
    if (s.sportsToday.indexOf(sid) < 0) s.sportsToday.push(sid); st.variety_abs = s.sportsToday.length;
    const daily = [];
    s.daily.list.forEach((id) => { const c = D.DAILY.find((x) => x.id === id); if (!c || s.daily.done.indexOf(id) >= 0) return; if (c.sport && c.sport !== sid) return;
      if (c.stat === 'variety') s.daily.prog[id] = st.variety_abs; else if (st[c.stat]) s.daily.prog[id] = (s.daily.prog[id] || 0) + st[c.stat];
      if ((s.daily.prog[id] || 0) >= c.n) { s.daily.done.push(id); coins += c.reward; daily.push(c); } });
    s.coins += coins; G.persist();
    if (after > before) setTimeout(() => { UI.toast(D.RANKS[after].icon + ' RANK UP! ' + sp.n + ': ' + D.RANKS[after].n, 'gold'); SP.Snd.fx('perfect'); }, 1800);
    return { xp, coins, xpTotal: s.xp[sid], rankUp: after > before, trophy, record, daily };
  };
})();

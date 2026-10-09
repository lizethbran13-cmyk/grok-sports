/* Grok Sports Command - online play on GrokNet (PeerJS): host-authoritative, 5-letter codes, up to 3 players.
   The host runs every sport; guests send touch input and render the host's snapshots. CPUs fill empty spots. */
(function () {
  'use strict';
  const SP = window.SP, GN = window.GrokNet, U = SP.U, D = SP.D, UI = SP.UI, E = SP.E;
  const $ = (id) => document.getElementById(id);
  const N = SP.Net = { room: null, looks: {}, assist: {}, cfg: { sport: 'tennis', mode: 'doubles', team: 'coop', diff: 'normal', cpus: 1, teamUp: false } };
  const G = () => SP.G;
  function status(t, ok) { const m = $('onlineMsg'); if (m) { m.textContent = t; m.style.color = ok ? '#15803d' : '#be123c'; } N.lastStatus = t; }
  N.lobby = function () {
    if (N.room && N.room.opened) return N.roomPanel();
    UI.panel('<h2>🤝 PLAY WITH FRIENDS</h2><p class="sub">Up to 3 players online in every sport. One friend hosts and shares the 5-letter code. CPUs fill the empty spots.</p>' +
      '<div class="btnrow"><button class="btn primary big" id="bHost">🏠 HOST A GAME</button></div><h3>OR JOIN WITH A CODE</h3>' +
      '<div class="row"><input id="codeIn" maxlength="5" placeholder="ABCDE" autocomplete="off" autocapitalize="characters" style="width:150px;text-align:center;letter-spacing:6px;font-size:24px" /><button class="btn pink" id="bJoin">JOIN</button></div>' +
      '<p class="sub" id="onlineMsg" style="margin-top:8px"></p><div class="btnrow"><button class="btn alt" data-close>BACK</button></div>', (c) => {
      c.querySelector('#bHost').addEventListener('click', () => N.host());
      c.querySelector('#bJoin').addEventListener('click', () => { const code = GN.normalizeCode(c.querySelector('#codeIn').value); if (!GN.validCode(code)) return status('Codes are 5 letters, like KDXPQ'); N.join(code); });
    }, { name: 'lobby', onClose: () => { if (N.room && !N.room.opened) N.leave(); } });
  };
  N.roomPanel = function () {
    const room = N.room; if (!room) return; const ps = room.players(), host = room.isHost, c = N.cfg, sp = D.sport(c.sport) || D.SPORTS[0];
    if (!sp.modes.find((m) => m.id === c.mode)) c.mode = sp.modes[0].id; const mode = sp.modes.find((m) => m.id === c.mode);
    const list = ps.map((p) => '<div class="item"><div class="ic"><span class="sw" style="background:' + GN.cleanColor(p.color) + '"></span></div><div class="grow"><b>' + U.esc(p.name) + '</b><small>' + (p.slot === 0 ? 'Host' : 'Player ' + (p.slot + 1)) + (p.pid === room.pid ? ' (you)' : '') + '</small></div></div>').join('');
    const plan = E.plan(c.sport, c.mode, ps.map((p) => ({ pid: p.pid, name: p.name, look: {} })), { team: c.team, cpus: c.cpus, teamUp: c.teamUp });
    UI.panel('<h2>🤝 ROOM <span style="letter-spacing:4px;color:#7c3aed">' + room.code + '</span></h2><p class="sub">Friends join with code <b>' + room.code + '</b> (' + ps.length + '/3)</p><div class="list">' + list + '</div>' +
      (host ? '<h3>SPORT</h3><div class="sportGrid">' + D.SPORTS.map((s) => '<button class="btn small' + (s.id === c.sport ? ' gold' : ' alt') + '" data-sp="' + s.id + '">' + s.icon + ' ' + s.n + '</button>').join('') + '</div>' +
        '<h3>MODE</h3>' + UI.segH('nMode', sp.modes.map((m) => [m.id, m.n])) +
        (mode.turns ? '<h3>CPU PLAYERS</h3>' + UI.segH('nCpu', [['0', '0'], ['1', '1'], ['2', '2']]) + '<div class="opt"><div>🤝 Team Up<small>Friends add their scores together vs the CPUs</small></div>' + UI.tog('tTeam', c.teamUp) + '</div>'
          : '<h3>TEAMS</h3>' + UI.segH('nTeam', [['coop', '🤝 TEAM UP vs CPU'], ['versus', '⚔️ VERSUS']])) +
        '<p class="sub" id="nPlan">' + U.esc(plan.desc) + '</p><h3>CPU LEVEL</h3>' + UI.segH('nDiff', D.DIFF_ORDER.map((k) => [k, D.DIFF[k].n])) +
        '<div class="btnrow"><button class="btn alt" id="bLeave">LEAVE</button><button class="btn primary big" id="bStart"' + (ps.length < 2 ? ' disabled' : '') + '>START!</button></div>' + (ps.length < 2 ? '<p class="sub">Waiting for a friend to join…</p>' : '')
        : '<p class="sub">Waiting for the host to pick a sport and start… 🏟️</p><div class="btnrow"><button class="btn alt" id="bLeave">LEAVE</button></div>'), (cc) => {
      cc.querySelector('#bLeave').addEventListener('click', () => { N.leave(); UI.close(); });
      if (!host) return;
      cc.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => { c.sport = b.dataset.sp; c.mode = D.sport(c.sport).modes[0].id; N.roomPanel(); }));
      UI.seg(cc, 'nMode', c.mode, (v) => { c.mode = v; N.roomPanel(); });
      if (cc.querySelector('#nTeam')) UI.seg(cc, 'nTeam', c.team, (v) => { c.team = v; N.roomPanel(); });
      if (cc.querySelector('#nCpu')) UI.seg(cc, 'nCpu', String(c.cpus), (v) => { c.cpus = +v; N.roomPanel(); });
      if (cc.querySelector('#tTeam')) UI.togBind(cc, 'tTeam', (v) => { c.teamUp = v; N.roomPanel(); });
      UI.seg(cc, 'nDiff', c.diff, (v) => { c.diff = v; });
      cc.querySelector('#bStart').addEventListener('click', () => N.start());
    }, { name: 'room' });
  };
  function bind(room) {
    N.room = room;
    room.on('status', (t) => status(t, true));
    room.on('open', () => { status('Connected!', true); SP.Snd.fx('coin'); room.send({ t: 'look', name: G().myName(), look: G().myLook(), as: G().save.opts.assist }); if (room.isHost) { N.looks[room.pid] = { name: G().myName(), look: G().myLook() }; N.assist[room.pid] = G().save.opts.assist; } N.roomPanel(); UI.toast(room.isHost ? 'Room ' + room.code + ' is open! 🤝' : 'Joined room ' + room.code + '! 🤝'); });
    room.on('join', (p) => { if (p.pid !== room.pid) { UI.toast('👋 ' + p.name + ' joined!'); SP.Snd.fx('coin'); } if (UI.open === 'room') N.roomPanel(); });
    room.on('leave', (p) => { UI.toast(p.name + ' left', true); if (UI.open === 'room') N.roomPanel(); if (room.isHost && E.running && E.ctx && E.ctx.online) E.ctx.players.forEach((pl) => { if (pl.pid === p.pid && pl.ctrl === 'human') { pl.ctrl = 'ai'; UI.toast('A CPU takes over for ' + p.name); } }); });
    room.on('message', (d, from) => onMsg(d, from));
    room.on('reconnecting', () => UI.toast('Lost the host - reconnecting…', true));
    room.on('error', (e) => { status(e.title + ': ' + e.message); const was = E.running && E.ctx && E.ctx.online; N.room = null; if (was || UI.open === 'room') { UI.toast(e.title + ' - back to the plaza', true); UI.close(); G().toHub(); } });
    room.start();
  }
  N.host = function (code) { status('Opening a room…', true); N.looks = {}; N.assist = {}; bind(GN.createRoom({ role: 'host', code: code || undefined, name: G().myName(), color: G().myColor(), max: 3, rejoin: !!code })); };
  N.join = function (code) { status('Joining ' + code + '…', true); bind(GN.createRoom({ role: 'join', code, name: G().myName(), color: G().myColor(), rejoin: !!N.fromHub })); };
  N.fromParams = function (prm) { N.fromHub = true; G().save.name = prm.name; G().persist(); N.lobby(); if (prm.mode === 'host') N.host(prm.code); else N.join(prm.code); };
  N.leave = function () { if (!N.room) return; try { N.room.leave(); } catch (e) {} N.room = null; };
  /* ---------- start (host) ---------- */
  N.start = function () {
    const room = N.room; if (!room || !room.isHost) return; const ps = room.players(); if (ps.length < 2) return; const c = N.cfg;
    const humans = ps.map((p) => ({ pid: p.pid, name: (N.looks[p.pid] && N.looks[p.pid].name) || p.name, look: (N.looks[p.pid] && N.looks[p.pid].look) || {} }));
    const plan = E.plan(c.sport, c.mode, humans, { team: c.team, cpus: c.cpus, teamUp: c.teamUp, seed: (Math.random() * 1e6) | 0 });
    const assist = {}; plan.players.forEach((p, i) => { if (p.ctrl === 'human') assist[i] = N.assist[p.pid] !== false; });
    const cfg = { sport: c.sport, mode: plan.mode.id, diff: c.diff, players: plan.players, seed: (Math.random() * 1e9) | 0, assist, online: true, teamUp: c.teamUp };
    N.lastCfg = cfg; room.broadcast({ t: 'start', cfg });
    N.begin(cfg, true);
  };
  N.restart = function () { if (N.lastCfg) { N.lastCfg.seed = (Math.random() * 1e9) | 0; N.room.broadcast({ t: 'start', cfg: N.lastCfg }); N.begin(N.lastCfg, true); } };
  N.begin = function (cfg, host) {
    const room = N.room; UI.close();
    const me = cfg.players.findIndex((p) => p.pid === room.pid);
    const c = Object.assign({}, cfg, { me, guest: !host, online: true }); G().startMatch(c);
  };
  N.sendInput = function (ev) { if (N.room) N.room.send({ t: 'in', ev }); };
  N.sendSnap = function (d) { if (N.room && N.room.isHost) N.room.broadcast(d); };
  function sanitize(cfg) {
    if (!cfg || typeof cfg !== 'object' || !D.sport(cfg.sport)) return null;
    const sp = D.sport(cfg.sport); if (!sp.modes.find((m) => m.id === cfg.mode)) cfg.mode = sp.modes[0].id; if (!D.DIFF[cfg.diff]) cfg.diff = 'normal';
    cfg.players = (Array.isArray(cfg.players) ? cfg.players : []).slice(0, 6).map((p) => ({ ctrl: p && p.ctrl === 'human' ? 'human' : 'ai', pid: p && p.pid ? String(p.pid).slice(0, 20) : null, name: GN.cleanName(p && p.name), look: p && typeof p.look === 'object' ? p.look : {}, team: U.clamp((p && p.team) | 0, 0, 3) }));
    cfg.seed = (+cfg.seed) | 0; cfg.assist = cfg.assist && typeof cfg.assist === 'object' ? cfg.assist : {};
    return cfg;
  }
  function onMsg(d, from) {
    const room = N.room; if (!d || typeof d !== 'object' || !room) return;
    if (room.isHost) {
      if (d.t === 'look' && from) { N.looks[from] = { name: GN.cleanName(d.name), look: d.look && typeof d.look === 'object' ? d.look : {} }; N.assist[from] = d.as !== false; return; }
      if (d.t === 'in' && from && from !== room.pid && E.running && E.ctx && E.ctx.online) { const slot = E.ctx.players.findIndex((p) => p.pid === from && p.ctrl === 'human'); if (slot >= 0) { if (d.ev && d.ev.k === 'assist') { E.ctx.cfg.assist[slot] = !!d.ev.on; } E.remoteInput(slot, d.ev); } }
      return;
    }
    if (d.t === 'start') { const cfg = sanitize(d.cfg); if (cfg) N.begin(cfg, false); }
    else if (d.t === 's') { if (E.running && E.ctx && E.ctx.guest) E.applySnap(d); }
    else if (d.t === 'lobby') { if (E.running) { E.stop(); G().toHub(); } N.roomPanel(); }
  }
  N.backToLobby = function () { if (N.room && N.room.isHost) N.room.broadcast({ t: 'lobby' }); };
})();

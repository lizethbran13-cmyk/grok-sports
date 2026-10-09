/* Grok Sports Command - menus, panels, HUD, how-to cards, results, locker, trophies, records, daily challenges, settings */
(function () {
  'use strict';
  const SP = window.SP, D = SP.D, U = SP.U;
  const $ = (id) => document.getElementById(id);
  const UI = SP.UI = {};
  const G = () => SP.G;
  const esc = U.esc;
  UI.$ = $;
  UI.toast = function (t, cls) { const d = document.createElement('div'); d.className = 'toast' + (cls === true ? ' bad' : cls ? ' ' + cls : ''); d.textContent = t; $('toasts').appendChild(d); UI.lastToast = t; setTimeout(() => d.remove(), 2800); while ($('toasts').children.length > 3) $('toasts').firstChild.remove(); };
  let msgT = 0, hintT = 0;
  UI.msg = function (big, small, dur) { const m = $('msg'); m.innerHTML = esc(big) + (small ? '<small>' + esc(small) + '</small>' : ''); m.classList.remove('show'); void m.offsetWidth; m.classList.add('show'); clearTimeout(msgT); msgT = setTimeout(() => m.classList.remove('show'), dur || 1500); UI.lastMsg = big + (small ? ' | ' + small : ''); };
  UI.hint = function (t, dur) { const h = $('hint'); h.textContent = t; h.classList.add('show'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove('show'), dur || 1800); UI.lastHint = t; };
  UI.show = (id, on) => $(id).classList.toggle('hidden', !on);
  UI.panel = function (html, bind, opts) {
    const p = $('pnl'), c = $('pnlCard'); c.className = 'card' + (opts && opts.cls ? ' ' + opts.cls : ''); p.className = 'screen top' + (opts && opts.locker ? ' lockerMode' : '');
    c.innerHTML = html; p.classList.remove('hidden'); UI.open = opts && opts.name || 'panel';
    c.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { UI.close(); if (opts && opts.onClose) opts.onClose(); }));
    c.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => SP.Snd.fx('ui')));
    if (bind) bind(c); c.scrollTop = 0; SP.Input.enabled = false; SP.Input.reset();
  };
  UI.close = function () { $('pnl').classList.add('hidden'); UI.open = null; SP.Input.enabled = true; const f = UI.onClose; UI.onClose = null; if (f) f(); };
  UI.seg = function (c, id, val, cb) { const el = c.querySelector('#' + id); el.querySelectorAll('button').forEach((b) => { b.classList.toggle('on', b.dataset.v === String(val)); b.addEventListener('click', () => { if (b.classList.contains('lock')) { cb(b.dataset.v, true); return; } el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); cb(b.dataset.v); }); }); };
  const segH = (id, items) => '<div class="seg" id="' + id + '">' + items.map((i) => '<button type="button" data-v="' + i[0] + '"' + (i[2] ? ' class="lock"' : '') + '>' + i[1] + '</button>').join('') + '</div>';
  UI.segH = segH;
  const tog = (id, on) => '<button type="button" class="tog' + (on ? ' on' : '') + '" id="' + id + '" aria-label="toggle"></button>';
  UI.tog = tog;
  UI.togBind = (c, id, cb) => { const b = c.querySelector('#' + id); b.addEventListener('click', () => { b.classList.toggle('on'); cb(b.classList.contains('on')); }); };

  /* ---------- HUD ---------- */
  UI.hud = function (on, sp) {
    UI.show('hud', on); UI.show('hubHud', false);
    if (!on) { UI.show('meter', false); UI.show('card', false); document.body.classList.remove('card'); return; }
    $('assistTag').classList.toggle('off', !G().save.opts.assist); $('assistTag').textContent = G().save.opts.assist ? '🛟 ASSIST ON' : '🛟 ASSIST OFF';
    $('msg').classList.remove('show'); $('hint').classList.remove('show');
  };
  UI.setHud = function (h) {
    $('nm0').textContent = h.l == null ? '' : h.l; $('sc0').textContent = h.ls == null ? '' : h.ls;
    $('nm1').textContent = h.r == null ? '' : h.r; $('sc1').textContent = h.rs == null ? '' : h.rs;
    $('mid').textContent = h.mid || ''; $('board').classList.toggle('solo', !!h.solo);
    $('tip').textContent = h.tip || ''; $('wind').textContent = h.wind || ''; $('big').textContent = h.big || '';
    const tt = $('turnTag'); tt.classList.toggle('hidden', !h.turn); tt.textContent = h.turn || '';
    const m = h.meter; UI.show('meter', !!m);
    if (m) { $('meterZone').style.bottom = (m.lo * 100) + '%'; $('meterZone').style.height = ((m.hi - m.lo) * 100) + '%'; $('meterFill').style.height = (U.clamp(m.v, 0, 1) * 100) + '%'; $('meterMark').style.bottom = (U.clamp(m.v, 0, 1) * 100) + '%'; $('meterZone').style.display = m.hi > m.lo ? '' : 'none'; }
    UI.show('joyHint', !!h.joy);
    const cd = $('card'); UI.show('card', !!h.card); document.body.classList.toggle('card', !!h.card);
    if (h.card) { const key = JSON.stringify(h.card); if (cd._k !== key) { cd._k = key; const c = h.card; cd.classList.toggle('full', c.n > 5);
      let html = '<table><tr><td class="nm">FRAME</td>' + Array.from({ length: c.n }, (_, f) => '<td' + (f === c.f ? ' class="cur"' : '') + '>' + (f + 1) + '</td>').join('') + '<td class="tot">TOT</td></tr>';
      c.rows.forEach((r, ri) => { html += '<tr' + (ri === c.on ? ' class="on"' : '') + '><td class="nm">' + U.esc(r.name) + '</td>' + Array.from({ length: c.n }, (_, f) => '<td' + (ri === c.on && f === c.f ? ' class="cur"' : '') + '><span class="mk">' + U.esc((r.m[f] || []).join(' ') || '\u00a0') + '</span><span class="cm">' + (r.c[f] != null ? r.c[f] : '\u00a0') + '</span></td>').join('') + '<td class="tot">' + r.t + '</td></tr>'; });
      cd.innerHTML = html + '</table>'; document.body.style.setProperty('--cardH', (cd.offsetHeight + 6) + 'px'); } }
  };

  /* ---------- how to play ---------- */
  UI.how = function (sp, first, after) {
    UI.panel('<div class="howcard"><div class="icon">' + sp.icon + '</div><h2>HOW TO PLAY ' + esc(sp.n.toUpperCase()) + '</h2><ol>' + sp.how.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ol>' +
      '<p class="sub">🛟 <b>Assist Mode</b> ' + (G().save.opts.assist ? 'is ON: extra help with moving, aiming and timing.' : 'is OFF: full manual control.') + ' Change it in ⚙️ Settings or the pause menu.</p>' +
      '<div class="btnrow"><button class="btn primary big" data-close>' + (first ? "LET'S PLAY!" : 'GOT IT') + '</button></div></div>', null, { name: 'how', onClose: after });
  };

  /* ---------- pause ---------- */
  UI.pause = function () {
    const E = SP.E; if (!E.running || E.over) return; if (UI.open) return;
    E.paused = true; const sp = E.ctx.sp, o = G().save.opts;
    UI.panel('<h2>⏸️ PAUSED</h2><p class="sub">' + sp.icon + ' ' + esc(sp.n) + ' · ' + esc(E.ctx.mode.n) + (E.ctx.online ? ' · online (the game keeps going!)' : '') + '</p>' +
      '<div class="opt"><div>🛟 Assist Mode<small>Help with moving, aiming and timing.</small></div>' + tog('tAssistP', o.assist) + '</div>' +
      '<div class="opt"><div>✨ Graphics</div>' + segH('sGfxP', [['high', 'HIGH'], ['low', 'LOW']]) + '</div>' +
      '<div class="btnrow"><button class="btn blue" id="bHowP">❓ HOW TO PLAY</button></div>' +
      '<div class="btnrow"><button class="btn red" id="bQuit">🚪 QUIT TO PLAZA</button><button class="btn primary big" id="bResume">▶ RESUME</button></div>', (c) => {
      UI.togBind(c, 'tAssistP', (v) => G().setAssist(v));
      UI.seg(c, 'sGfxP', G().save.opts.gfx, (v) => G().setGfx(v, true));
      c.querySelector('#bHowP').addEventListener('click', () => UI.how(sp, false, () => UI.pause()));
      c.querySelector('#bQuit').addEventListener('click', () => { E.paused = false; UI.close(); G().quitMatch(); });
      c.querySelector('#bResume').addEventListener('click', () => { E.paused = false; UI.close(); });
    }, { name: 'pause' });
  };

  /* ---------- results ---------- */
  UI.results = function (res, aw, win, draw) {
    const E = SP.E, ctx = E.ctx; if (!ctx) return; const sp = ctx.sp;
    const head = aw && aw.spectator ? 'GAME OVER' : draw ? "IT'S A DRAW!" : win ? 'YOU WIN! 🏆' : 'GOOD GAME!';
    let h = '<div class="res"><div class="icon" style="font-size:46px">' + sp.icon + '</div><div class="big1 ' + (draw ? '' : win ? 'win' : 'lose') + '">' + head + '</div>' +
      '<p class="sub">' + esc(res.title || '') + '</p>' + (res.lines || []).map((l) => '<p class="sub" style="margin:2px 0">' + esc(l) + '</p>').join('');
    if (res.table) h += res.table;
    if (aw && !aw.spectator) {
      const rk = D.rankOf(aw.xpTotal);
      h += '<h3>' + rk.rank.icon + ' ' + esc(sp.n) + ' rank: ' + rk.rank.n + (rk.pro ? ' · ' + rk.pro + ' pts' : '') + '</h3><div class="rankBar"><i style="width:' + Math.round(rk.prog * 100) + '%"></i></div>' +
        '<p class="sub">+' + aw.xp + ' XP · +' + aw.coins + ' 🪙' + (aw.rankUp ? ' · <b style="color:#16a34a">RANK UP!</b>' : '') + (aw.record ? ' · <b style="color:#c2410c">NEW RECORD!</b>' : '') + (aw.trophy ? ' · 🏆 new trophy!' : '') + '</p>';
      if (aw.daily && aw.daily.length) h += aw.daily.map((d) => '<div class="chal done">✅ <span class="grow">' + esc(d.text) + '</span><b>+' + d.reward + ' 🪙</b></div>').join('');
    }
    const host = !ctx.online || ctx.host;
    h += '<div class="btnrow"><button class="btn alt" id="bHub">🏟️ PLAZA</button>' + (host ? '<button class="btn primary big" id="bAgain">🔁 PLAY AGAIN</button>' : '<button class="btn primary" disabled>Host picks next…</button>') + '</div></div>';
    UI.panel(h, (c) => {
      c.querySelector('#bHub').addEventListener('click', () => { UI.close(); G().quitMatch(); });
      const a = c.querySelector('#bAgain'); if (a) a.addEventListener('click', () => { UI.close(); G().rematch(); });
    }, { name: 'results' });
  };

  /* ---------- sport setup (when you walk into a venue) ---------- */
  UI.setup = function (sid) {
    const sp = D.sport(sid), s = G().save, rk = D.rankOf(s.xp[sid] || 0); let mode = (s.lastMode && s.lastMode[sid]) || sp.modes[0].id, diff = s.opts.diff, cpus = 1;
    const best = s.best[sid] || {};
    const html = () => {
      const m = sp.modes.find((x) => x.id === mode) || sp.modes[0];
      return '<div class="icon" style="font-size:44px">' + sp.icon + '</div><h2>' + esc(sp.n.toUpperCase()) + (sp.bonus ? ' <span class="badge">BONUS</span>' : '') + '</h2>' +
        '<p class="sub">' + rk.rank.icon + ' ' + rk.rank.n + (rk.next ? ' · ' + (s.xp[sid] || 0) + '/' + rk.next.xp + ' XP' : ' · ' + rk.pro + ' pro pts') + (s.trophies[sid] ? ' · 🏆 ' + D.DIFF[s.trophies[sid]].n + ' beaten' : '') + '</p>' +
        '<div class="rankBar"><i style="width:' + Math.round(rk.prog * 100) + '%"></i></div>' +
        '<h3>MODE</h3>' + segH('sMode', sp.modes.map((x) => [x.id, x.n])) + '<p class="sub">' + esc(m.desc) + '</p>' +
        '<h3>CPU LEVEL</h3>' + segH('sDiff', D.DIFF_ORDER.map((k) => [k, D.DIFF[k].n])) +
        (m.turns ? '<h3>CPU PLAYERS</h3>' + segH('sCpu', [['1', '1'], ['2', '2'], ['3', '3']]) : '') +
        (Object.keys(best).length ? '<p class="sub">📋 Your best: ' + Object.keys(best).map((k) => esc(k) + ' ' + best[k]).join(' · ') + '</p>' : '') +
        '<div class="btnrow"><button class="btn blue small" id="bHowS">❓ HOW TO PLAY</button></div>' +
        '<div class="btnrow"><button class="btn alt" id="bBack">⬅ PLAZA</button><button class="btn primary big" id="bGo">▶ PLAY!</button></div>';
    };
    const bind = (c) => {
      UI.seg(c, 'sMode', mode, (v) => { mode = v; UI.panel(html(), bind, { name: 'setup' }); });
      UI.seg(c, 'sDiff', diff, (v) => { diff = v; s.opts.diff = v; G().persist(); });
      if (c.querySelector('#sCpu')) UI.seg(c, 'sCpu', String(cpus), (v) => { cpus = +v; });
      c.querySelector('#bHowS').addEventListener('click', () => UI.how(sp, false, () => UI.panel(html(), bind, { name: 'setup' })));
      c.querySelector('#bBack').addEventListener('click', () => { UI.close(); G().toHub(); });
      c.querySelector('#bGo').addEventListener('click', () => { UI.close(); s.lastMode = s.lastMode || {}; s.lastMode[sid] = mode; G().persist(); G().playSolo(sid, mode, diff, cpus); });
    };
    UI.panel(html(), bind, { name: 'setup' });
  };

  /* ---------- locker room ---------- */
  UI.locker = function () {
    const g = G(), s = g.save; let cat = UI._lcat || 'shirt';
    const html = () => {
      let list = '';
      if (cat === 'body') {
        list = '<h3>SKIN</h3><div class="swatches" id="skinRow">' + D.SKINS.map((c, i) => '<button type="button" data-i="' + i + '" style="background:' + c + '" class="' + (s.look.skin === i ? 'on' : '') + '"></button>').join('') + '</div>' +
          '<h3>HAIR COLOUR</h3><div class="swatches" id="hairRow">' + D.HAIRS.map((c, i) => '<button type="button" data-i="' + i + '" style="background:' + c + '" class="' + (s.look.hair === i ? 'on' : '') + '"></button>').join('') + '</div>' +
          '<h3>HAIR STYLE</h3>' + segH('sStyle', [['short', 'Short'], ['long', 'Long'], ['pony', 'Pony'], ['bun', 'Bun']]) +
          '<h3>HAT COLOUR</h3><div class="swatches" id="hatRow">' + ['#ffffff', '#111827', '#e11d48', '#2563eb', '#facc15', '#16a34a', '#a855f7'].map((c) => '<button type="button" data-c="' + c + '" style="background:' + c + '" class="' + (s.look.hatCol === c ? 'on' : '') + '"></button>').join('') + '</div>';
      } else {
        list = '<div class="list">' + D.SHOP.filter((i) => i.cat === cat).map((i) => {
          const own = s.owned.indexOf(i.id) >= 0, on = cat === 'extra' ? !!s.look.glasses : s.look[cat] === i.id;
          return '<div class="item' + (on ? ' on' : '') + (own ? '' : ' lock') + '"><div class="ic">' + (i.col ? '<span class="sw" style="background:' + i.col + '"></span>' : cat === 'hat' ? '🧢' : '🕶️') + '</div><div class="grow"><b>' + esc(i.n) + '</b><small>' + (i.desc ? esc(i.desc) : own ? (on ? 'Wearing' : 'Owned') : '🪙 ' + i.price) + '</small></div>' +
            '<button class="btn ' + (own ? 'blue' : 'gold') + ' small" data-id="' + i.id + '">' + (own ? (cat === 'extra' ? (on ? 'TAKE OFF' : 'WEAR') : on ? '✔' : 'WEAR') : 'BUY ' + i.price) + '</button></div>';
        }).join('') + '</div>';
      }
      return '<h2>🧥 LOCKER ROOM</h2><div class="coins">🪙 <b>' + s.coins + '</b></div><div class="tabs">' + D.CATS.map((c) => '<button type="button" data-cat="' + c[0] + '" class="' + (c[0] === cat ? 'on' : '') + '">' + c[1] + '</button>').join('') + '</div>' + list + '<div class="btnrow"><button class="btn primary" data-close>DONE</button></div>';
    };
    const bind = (c) => {
      c.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { cat = UI._lcat = b.dataset.cat; UI.panel(html(), bind, { name: 'locker', cls: 'locker', locker: true }); }));
      c.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => {
        const it = D.item(b.dataset.id); if (!it) return;
        if (s.owned.indexOf(it.id) < 0) { if (s.coins < it.price) { UI.toast('Not enough coins yet - play some matches! 🪙', true); SP.Snd.fx('bad'); return; } s.coins -= it.price; s.owned.push(it.id); SP.Snd.fx('buy'); UI.toast('Unlocked ' + it.n + '! 🎉', 'gold'); }
        if (it.cat === 'extra') s.look.glasses = !s.look.glasses; else s.look[it.cat] = it.id;
        g.persist(); g.lookChanged(); UI.panel(html(), bind, { name: 'locker', cls: 'locker', locker: true });
      }));
      const sw = (id, f) => { const r = c.querySelector('#' + id); if (r) r.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { f(b); g.persist(); g.lookChanged(); UI.panel(html(), bind, { name: 'locker', cls: 'locker', locker: true }); })); };
      sw('skinRow', (b) => { s.look.skin = +b.dataset.i; }); sw('hairRow', (b) => { s.look.hair = +b.dataset.i; }); sw('hatRow', (b) => { s.look.hatCol = b.dataset.c; });
      if (c.querySelector('#sStyle')) UI.seg(c, 'sStyle', s.look.style, (v) => { s.look.style = v; g.persist(); g.lookChanged(); });
    };
    UI.panel(html(), bind, { name: 'locker', cls: 'locker', locker: true });
  };

  /* ---------- trophies + records ---------- */
  UI.trophies = function () {
    const s = G().save;
    const rows = D.SPORTS.map((sp) => { const rk = D.rankOf(s.xp[sp.id] || 0), tr = s.trophies[sp.id]; return '<tr><td>' + sp.icon + ' ' + esc(sp.n) + '</td><td>' + rk.rank.icon + ' ' + rk.rank.n + '</td><td>' + (tr ? '🏆 ' + D.DIFF[tr].n : '<span style="opacity:.5">-</span>') + '</td><td>' + (s.wins[sp.id] || 0) + '/' + (s.played[sp.id] || 0) + '</td></tr>'; }).join('');
    UI.panel('<h2>🏆 TROPHY HALL</h2><p class="sub">Beat the CPU to win trophies: Easy = bronze, Normal = silver, Hard = gold, Pro = diamond.</p><table class="tbl"><tr><th>SPORT</th><th>RANK</th><th>TROPHY</th><th>WINS</th></tr>' + rows + '</table><div class="btnrow"><button class="btn primary" data-close>DONE</button></div>', null, { name: 'trophies' });
  };
  UI.records = function () {
    const s = G().save; let rows = '';
    D.SPORTS.forEach((sp) => { const b = s.best[sp.id] || {}; const ks = Object.keys(b); rows += '<tr><td>' + sp.icon + ' ' + esc(sp.n) + '</td><td>' + (ks.length ? ks.map((k) => esc(k) + ': <b>' + b[k] + '</b>').join('<br>') : '<span style="opacity:.5">no record yet</span>') + '</td></tr>'; });
    UI.panel('<h2>📋 RECORDS BOARD</h2><table class="tbl"><tr><th>SPORT</th><th>YOUR BEST</th></tr>' + rows + '</table><p class="sub">Matches played: ' + s.stats.matches + ' · wins: ' + s.stats.wins + '</p><div class="btnrow"><button class="btn primary" data-close>DONE</button></div>', null, { name: 'records' });
  };
  UI.daily = function () {
    const g = G(), s = g.save; g.checkDaily();
    const list = s.daily.list.map((id) => { const c = D.DAILY.find((x) => x.id === id); if (!c) return ''; const done = s.daily.done.indexOf(id) >= 0, p = Math.min(c.n, s.daily.prog[id] || 0); return '<div class="chal' + (done ? ' done' : '') + '">' + (done ? '✅' : '🎯') + '<span class="grow">' + esc(c.text) + '<br><small>' + p + ' / ' + c.n + '</small></span><b>+' + c.reward + ' 🪙</b></div>'; }).join('');
    UI.panel('<h2>📅 DAILY CHALLENGES</h2><p class="sub">New challenges every day!</p>' + list + '<div class="btnrow"><button class="btn primary" data-close>DONE</button></div>', null, { name: 'daily' });
  };
  UI.settings = function () {
    const g = G(), o = g.save.opts, S = SP.Snd;
    UI.panel('<h2>⚙️ SETTINGS</h2>' +
      '<div class="opt"><div>🛟 Assist Mode<small>Auto-move, aim help, bigger timing windows, landing spots.</small></div>' + tog('tAssist', o.assist) + '</div>' +
      '<div class="opt"><div>✨ Graphics<small>High looks best (default). Low runs smoother on older phones.</small></div>' + segH('sGfx', [['high', 'HIGH'], ['low', 'LOW']]) + '</div>' +
      '<div class="opt"><div>🔊 Sound</div>' + tog('tSnd', S.on) + '</div><div class="opt"><div>🎵 Music</div>' + tog('tMus', S.music) + '</div>' +
      '<div class="opt"><div>📳 Camera shake</div>' + tog('tShake', o.shake !== false) + '</div>' +
      '<div class="btnrow"><button class="btn red small" id="bReset">RESET SAVE</button><button class="btn primary" data-close>DONE</button></div>', (c) => {
      UI.togBind(c, 'tAssist', (v) => g.setAssist(v));
      UI.seg(c, 'sGfx', o.gfx, (v) => g.setGfx(v, true));
      UI.togBind(c, 'tSnd', (v) => { S.on = v; S.save(); }); UI.togBind(c, 'tMus', (v) => { S.music = v; S.save(); }); UI.togBind(c, 'tShake', (v) => { o.shake = v; g.persist(); });
      c.querySelector('#bReset').addEventListener('click', () => { if (confirm('Erase all coins, ranks and outfits?')) { localStorage.removeItem('grokSports.save'); location.reload(); } });
    }, { name: 'settings' });
  };
  UI.menu = function () {
    UI.panel('<h2>🏟️ SPORTS COMMAND</h2><p class="sub">Walk into any building, or jump straight in:</p><div class="sportGrid">' + D.SPORTS.map((sp) => '<button class="btn" style="background:linear-gradient(180deg,' + SP.M.lighter(sp.col, 0.12) + ',' + SP.M.darker(sp.col, 0.12) + ')" data-s="' + sp.id + '">' + sp.icon + ' ' + esc(sp.n) + '</button>').join('') + '</div>' +
      '<div class="grid2"><button class="btn purple" id="mLock">🧥 LOCKER</button><button class="btn gold" id="mTro">🏆 TROPHIES</button><button class="btn blue" id="mRec">📋 RECORDS</button><button class="btn pink" id="mFr">🤝 FRIENDS</button><button class="btn green" id="mFc">⚽ GROK FC</button><button class="btn green" id="mPb">🥒 PICKLEBALL</button></div>' +
      '<div class="btnrow"><button class="btn alt" id="mTitle">🏠 TITLE</button><button class="btn primary" data-close>CLOSE</button></div>', (c) => {
      c.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => UI.setup(b.dataset.s)));
      c.querySelector('#mLock').addEventListener('click', () => { UI.close(); SP.Hub.goto('locker'); });
      c.querySelector('#mTro').addEventListener('click', () => { UI.close(); SP.Hub.goto('trophy'); });
      c.querySelector('#mRec').addEventListener('click', () => UI.records());
      c.querySelector('#mFr').addEventListener('click', () => SP.Net.lobby());
      c.querySelector('#mFc').addEventListener('click', () => SP.Hub.portal('fc'));
      c.querySelector('#mPb').addEventListener('click', () => SP.Hub.portal('pickle'));
      c.querySelector('#mTitle').addEventListener('click', () => { UI.close(); G().toTitle(); });
    }, { name: 'menu' });
  };
})();

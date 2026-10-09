/* Grok Sports Command - constants, sports list, difficulty, shop, ranks, daily challenges, save */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U;
  const D = SP.D = {};
  D.SKINS = ['#ffd7b5', '#f1c095', '#d9a066', '#a8704a', '#7a4b2e'];
  D.HAIRS = ['#2d1b0e', '#5b3a1e', '#a0522d', '#f6c344', '#111827', '#c2410c', '#ff4fd8', '#3b82f6'];
  // shared CPU skill levels. react = seconds before moving, speed = run multiplier, aim = aim error (m),
  // err = chance of a mistake per shot, power = shot power, smart = picks good targets, grab = catch/save/dig chance
  D.DIFF = {
    easy:   { n: 'Easy',   react: 0.45, speed: 0.74, aim: 1.1,  err: 0.24,  power: 0.78, smart: 0.25, grab: 0.35, reach: 0.95 },
    normal: { n: 'Normal', react: 0.3,  speed: 0.88, aim: 0.65, err: 0.1,   power: 0.88, smart: 0.5,  grab: 0.55, reach: 1.0 },
    hard:   { n: 'Hard',   react: 0.22, speed: 0.96, aim: 0.42, err: 0.065, power: 0.95, smart: 0.72, grab: 0.7,  reach: 1.04 },
    pro:    { n: 'Pro',    react: 0.17, speed: 1.02, aim: 0.3,  err: 0.05,  power: 1.0,  smart: 0.88, grab: 0.82, reach: 1.08 }
  };
  D.DIFF_ORDER = ['easy', 'normal', 'hard', 'pro'];
  D.AI_NAMES = ['Ace Ava', 'Bounce Bo', 'Captain Kip', 'Dash Dee', 'Fast Fiona', 'Goal Gus', 'Hoops Hana', 'Jumpy Jay', 'Kicker Kai', 'Lucky Lou', 'Max Power', 'Nifty Nia', 'Pinball Pat', 'Rally Rae', 'Slam Sam', 'Zippy Zoe'];
  D.TEAM_COL = ['#2563eb', '#e11d48', '#16a34a'];
  D.TEAM_NAME = ['BLUE', 'RED'];

  // sports: building = hub plaza venue; modes: id, n, size = players per team (or 'turns' for take-turn sports)
  D.SPORTS = [
    { id: 'soccer', n: 'Soccer', icon: '⚽', col: '#16a34a', tool: 'none', music: 'soccer',
      modes: [{ id: '3v3', n: '3 vs 3 Match', team: 3, desc: '3-minute arena match. Most goals wins (golden goal if tied).' }, { id: 'shootout', n: 'Shootout', turns: true, desc: '5 penalty kicks each vs the CPU keeper. Swipe to shoot, curve it into the corners!' }],
      how: ['Joystick to run. You keep the ball when you touch it.', 'SWIPE toward the goal to shoot. Long fast swipe = hard shot.', 'TAP to pass to a teammate.', 'No ball? TAP to tackle when you are close.', 'The arena has walls, so the ball never goes out!'] },
    { id: 'basketball', n: 'Basketball', icon: '🏀', col: '#f97316', tool: 'none', music: 'arena',
      modes: [{ id: '3pt', n: '3-Point Contest', turns: true, desc: '60 seconds, 5 racks. Rainbow money ball = 2 points.' }, { id: '2v2', n: '2 vs 2', team: 2, desc: 'Half court to 11. Inside = 1, behind the arc = 2.' }],
      how: ['SWIPE UP to shoot. Stop your finger in the GREEN part of the power bar.', 'A straight swipe goes straight. Swipe up, not sideways!', '2v2: joystick to move, TAP to pass, SWIPE UP to shoot.', 'Defense: TAP near the ball to steal, SWIPE UP to jump and block.', 'Makes are 1 point inside the arc and 2 from behind it.'] },
    { id: 'tennis', n: 'Tennis', icon: '🎾', col: '#84cc16', tool: 'racket', music: 'park',
      modes: [{ id: 'singles', n: 'Singles', team: 1, desc: 'First to 3 games (no-ad scoring).' }, { id: 'doubles', n: 'Doubles', team: 2, desc: '2 vs 2, first to 3 games.' }],
      how: ['Your player runs to the ball for you in Assist Mode, or use the joystick.', 'SWIPE UP when the ball comes to hit it. Swipe left or right to aim.', 'Short swipe = soft, long fast swipe = hard. TAP = auto shot.', 'Serve: SWIPE UP. It must land in the box across from you.', 'Points go 0, 15, 30, 40, game. At 40-40 the next point wins!'] },
    { id: 'bowling', n: 'Bowling', icon: '🎳', col: '#a855f7', tool: 'none', music: 'night',
      modes: [{ id: 'quick', n: 'Quick (5 frames)', turns: true, desc: '5 frames with strikes and spares.' }, { id: 'full', n: 'Full Game (10 frames)', turns: true, desc: 'A real 10-frame game.' }],
      how: ['Drag left/right on the lane to pick where you stand.', 'SWIPE UP to roll. Where your finger goes is where the ball goes.', 'Curve your swipe at the end to add SPIN and hook into the pins.', 'Strike = all 10 pins with one ball. Spare = all 10 with two.', 'Strikes and spares give bonus points from your next balls.'] },
    { id: 'volleyball', n: 'Volleyball', icon: '🏐', col: '#f59e0b', tool: 'none', music: 'beach',
      modes: [{ id: '2v2', n: 'Beach 2 vs 2', team: 2, desc: 'Rally to 11, win by 2.' }],
      how: ['Your team gets 3 touches: bump, set, spike!', 'TAP when the ball comes to you to bump or set it.', 'At the net: SWIPE DOWN to spike. Swipe left/right to aim.', 'Serve: SWIPE UP. Don\u2019t let the ball land on your side!', 'Every rally is a point. First to 11, win by 2.'] },
    { id: 'golf', n: 'Mini Golf', icon: '⛳', col: '#22c55e', tool: 'putter', music: 'park',
      modes: [{ id: '9', n: '9 Holes', turns: true, desc: 'Grok Putt Park, par 23.' }, { id: '3', n: 'Quick 3 Holes', turns: true, desc: 'The first 3 holes (par 7).' }],
      how: ['Pull BACK from anywhere on the screen like a slingshot.', 'Longer pull = harder putt. Let go to putt.', 'The dotted line shows where you aim (Assist shows the bounces).', 'Watch out for the windmill, bumpers, slopes and water!', 'Fewest strokes wins. Max 6 strokes per hole.'] },
    { id: 'badminton', n: 'Badminton', icon: '🏸', col: '#06b6d4', tool: 'badminton', music: 'arena',
      modes: [{ id: 'singles', n: 'Singles', team: 1, desc: 'Rally to 11, win by 2.' }, { id: 'doubles', n: 'Doubles', team: 2, desc: '2 vs 2, rally to 11.' }],
      how: ['The shuttle floats and slows down fast. Be patient!', 'SWIPE UP to hit. Swipe DOWN when it is high to SMASH.', 'Short swipe = drop shot near the net. Long = clear to the back.', 'Never let it touch the floor on your side.', 'Every rally is a point. First to 11, win by 2.'] },
    { id: 'dodgeball', n: 'Dodgeball', icon: '🔴', col: '#ef4444', tool: 'none', music: 'arena',
      modes: [{ id: '3v3', n: '3 vs 3', team: 3, desc: 'Best of 3 rounds. Get the whole other team out!' }],
      how: ['Run over a ball to pick it up.', 'SWIPE toward someone to throw. It locks on to the closest player.', 'Got hit before the ball bounced? You\u2019re OUT.', 'TAP right when a ball reaches you to CATCH it: the thrower is out and a teammate comes back!', 'TAP with no ball coming to dodge-hop.'] },
    { id: 'archery', n: 'Archery', icon: '🏹', col: '#eab308', tool: 'bow', music: 'park', bonus: true,
      modes: [{ id: 'match', n: 'Target Match', turns: true, desc: '3 ends x 3 arrows at 18 m, 30 m and 50 m.' }],
      how: ['Put your finger down and PULL DOWN to draw the bow.', 'While holding, slide to aim. The sight wobbles a little!', 'Let go to shoot.', 'Watch the wind flag. Aim a little into the wind.', 'Bullseye = 10 points. Most points wins.'] },
    { id: 'tabletennis', n: 'Table Tennis', icon: '🏓', col: '#e11d48', tool: 'tt', music: 'arena', bonus: true,
      modes: [{ id: 'singles', n: 'Singles', team: 1, desc: 'First to 11, win by 2.' }, { id: 'doubles', n: 'Doubles', team: 2, desc: '2 vs 2, first to 11.' }],
      how: ['Fast and twitchy! You slide left and right automatically in Assist.', 'SWIPE UP to hit. Swipe left/right to aim.', 'The ball must bounce once on the other side.', 'Swipe hard for a fast drive, short for a soft push.', 'First to 11, win by 2.'] }
  ];
  D.sport = (id) => D.SPORTS.find((s) => s.id === id);

  D.RANKS = [
    { n: 'Rookie', xp: 0, col: '#94a3b8', icon: '🥾' }, { n: 'Bronze', xp: 120, col: '#cd7f32', icon: '🥉' }, { n: 'Silver', xp: 320, col: '#cbd5e1', icon: '🥈' },
    { n: 'Gold', xp: 650, col: '#facc15', icon: '🥇' }, { n: 'Platinum', xp: 1100, col: '#67e8f9', icon: '💎' }, { n: 'Pro League', xp: 1700, col: '#f472b6', icon: '👑' }
  ];
  D.rankOf = function (xp) { let r = 0; for (let i = 0; i < D.RANKS.length; i++) if (xp >= D.RANKS[i].xp) r = i; const nx = D.RANKS[r + 1]; return { i: r, rank: D.RANKS[r], next: nx, prog: nx ? (xp - D.RANKS[r].xp) / (nx.xp - D.RANKS[r].xp) : 1, pro: r === D.RANKS.length - 1 ? Math.floor((xp - D.RANKS[r].xp) / 10) : 0 }; };

  // locker: outfits + gear (coins)
  D.SHOP = [
    { id: 'shirt_blue', cat: 'shirt', n: 'Blue Jersey', col: '#2563eb', price: 0 }, { id: 'shirt_red', cat: 'shirt', n: 'Red Jersey', col: '#e11d48', price: 0 },
    { id: 'shirt_green', cat: 'shirt', n: 'Green Jersey', col: '#16a34a', price: 0 }, { id: 'shirt_orange', cat: 'shirt', n: 'Orange Jersey', col: '#f97316', price: 60 },
    { id: 'shirt_purple', cat: 'shirt', n: 'Purple Jersey', col: '#7c3aed', price: 60 }, { id: 'shirt_pink', cat: 'shirt', n: 'Pink Jersey', col: '#ec4899', price: 60 },
    { id: 'shirt_teal', cat: 'shirt', n: 'Teal Jersey', col: '#0d9488', price: 80 }, { id: 'shirt_gold', cat: 'shirt', n: 'Golden Jersey', col: '#eab308', price: 250 },
    { id: 'shirt_black', cat: 'shirt', n: 'Midnight Jersey', col: '#1f2937', price: 150 },
    { id: 'shorts_navy', cat: 'shorts', n: 'Navy Shorts', col: '#1e293b', price: 0 }, { id: 'shorts_white', cat: 'shorts', n: 'White Shorts', col: '#f1f5f9', price: 40 },
    { id: 'shorts_red', cat: 'shorts', n: 'Red Shorts', col: '#b91c1c', price: 40 }, { id: 'shorts_lime', cat: 'shorts', n: 'Lime Shorts', col: '#65a30d', price: 60 },
    { id: 'hat_none', cat: 'hat', n: 'No Hat', hat: null, price: 0 }, { id: 'hat_cap', cat: 'hat', n: 'Team Cap', hat: 'cap', price: 0 },
    { id: 'hat_headband', cat: 'hat', n: 'Sweatband', hat: 'headband', price: 50 }, { id: 'hat_visor', cat: 'hat', n: 'Sun Visor', hat: 'visor', price: 80 },
    { id: 'hat_bucket', cat: 'hat', n: 'Bucket Hat', hat: 'bucket', price: 120 }, { id: 'hat_crown', cat: 'hat', n: 'Champion Crown', hat: 'crown', price: 600 },
    { id: 'shoes_white', cat: 'shoes', n: 'Classic Kicks', col: '#ffffff', price: 0 }, { id: 'shoes_black', cat: 'shoes', n: 'Shadow Kicks', col: '#111827', price: 50 },
    { id: 'shoes_neon', cat: 'shoes', n: 'Neon Kicks', col: '#a3e635', price: 120 }, { id: 'shoes_gold', cat: 'shoes', n: 'Gold Kicks', col: '#facc15', price: 300 },
    { id: 'glasses', cat: 'extra', n: 'Sport Glasses', price: 90 },
    { id: 'gear_red', cat: 'gear', n: 'Red Gear', col: '#e11d48', price: 0, desc: 'Racket, paddle, bow and putter colour' }, { id: 'gear_blue', cat: 'gear', n: 'Blue Gear', col: '#2563eb', price: 70 },
    { id: 'gear_lime', cat: 'gear', n: 'Lime Gear', col: '#84cc16', price: 70 }, { id: 'gear_purple', cat: 'gear', n: 'Galaxy Gear', col: '#7c3aed', price: 140 }, { id: 'gear_gold', cat: 'gear', n: 'Golden Gear', col: '#f59e0b', price: 350 }
  ];
  D.item = (id) => D.SHOP.find((i) => i.id === id);
  D.CATS = [['shirt', '👕 Jersey'], ['shorts', '🩳 Shorts'], ['hat', '🧢 Hat'], ['shoes', '👟 Shoes'], ['extra', '🕶️ Extras'], ['gear', '🎾 Gear'], ['body', '🙂 Me']];

  // daily challenges: picked from the date. stat is counted by the sports (see Engine.stat)
  D.DAILY = [
    { id: 'win_any', text: 'Win any 2 matches', stat: 'win', n: 2, reward: 60 }, { id: 'goal3', text: 'Score 3 goals in Soccer', stat: 'goal', sport: 'soccer', n: 3, reward: 50 },
    { id: 'three5', text: 'Make 5 three-pointers', stat: 'three', sport: 'basketball', n: 5, reward: 50 }, { id: 'ace', text: 'Win 5 points in Tennis', stat: 'point', sport: 'tennis', n: 5, reward: 40 },
    { id: 'strike', text: 'Bowl a STRIKE', stat: 'strike', sport: 'bowling', n: 1, reward: 50 }, { id: 'spike', text: 'Score 3 spikes in Volleyball', stat: 'spike', sport: 'volleyball', n: 3, reward: 50 },
    { id: 'par', text: 'Make par or better on 3 golf holes', stat: 'par', sport: 'golf', n: 3, reward: 50 }, { id: 'smash', text: 'Win 4 points in Badminton', stat: 'point', sport: 'badminton', n: 4, reward: 40 },
    { id: 'outs', text: 'Get 4 players out in Dodgeball', stat: 'hit', sport: 'dodgeball', n: 4, reward: 50 }, { id: 'bulls', text: 'Hit 3 arrows in the gold (9 or 10)', stat: 'gold', sport: 'archery', n: 3, reward: 50 },
    { id: 'tt', text: 'Win 5 points in Table Tennis', stat: 'point', sport: 'tabletennis', n: 5, reward: 40 }, { id: 'play3', text: 'Play 3 different sports', stat: 'variety', n: 3, reward: 70 },
    { id: 'hard', text: 'Beat a Hard or Pro CPU', stat: 'winhard', n: 1, reward: 90 }, { id: 'catch', text: 'Catch 2 balls in Dodgeball', stat: 'catch', sport: 'dodgeball', n: 2, reward: 50 }
  ];
  D.today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  D.dailyFor = function (day) { let h = 0; for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0; const r = U.rng(h), pool = D.DAILY.slice(), out = []; while (out.length < 3) { const i = Math.floor(r() * pool.length); out.push(pool.splice(i, 1)[0].id); } return out; };

  /* ---------- save ---------- */
  const KEY = 'grokSports.save';
  const Save = SP.Save = {};
  Save.fresh = () => ({ v: 1, name: '', coins: 100, owned: D.SHOP.filter((i) => !i.price).map((i) => i.id),
    look: { shirt: 'shirt_blue', shorts: 'shorts_navy', hat: 'hat_cap', shoes: 'shoes_white', gear: 'gear_red', glasses: false, skin: 1, hair: 1, style: 'short', hatCol: '#ffffff' },
    xp: {}, best: {}, wins: {}, played: {}, trophies: {}, daily: { day: '', list: [], prog: {}, done: [] }, sportsToday: [],
    opts: { assist: true, gfx: 'high', diff: 'normal', shake: true }, stats: { matches: 0, wins: 0 } });
  Save.load = function () {
    let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    const f = Save.fresh(); if (!s || typeof s !== 'object') return f;
    for (const k in f) if (s[k] == null || typeof s[k] !== typeof f[k]) s[k] = f[k];
    for (const k in f.look) if (s.look[k] == null) s.look[k] = f.look[k];
    for (const k in f.opts) if (s.opts[k] == null) s.opts[k] = f.opts[k];
    if (!Array.isArray(s.owned)) s.owned = f.owned; f.owned.forEach((id) => { if (s.owned.indexOf(id) < 0) s.owned.push(id); });
    s.coins = Math.max(0, s.coins | 0);
    return s;
  };
  Save.store = function (s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } };
  // look in a save -> athlete model options
  D.lookOf = function (l) {
    const it = (id, d) => D.item(id) || D.item(d);
    const hat = it(l.hat, 'hat_none');
    return { shirt: it(l.shirt, 'shirt_blue').col, shorts: it(l.shorts, 'shorts_navy').col, shoes: it(l.shoes, 'shoes_white').col, hat: hat.hat || null, hatCol: l.hatCol || '#ffffff',
      skin: U.clamp(l.skin | 0, 0, 4), hair: D.HAIRS[U.clamp(l.hair | 0, 0, D.HAIRS.length - 1)], long: l.style === 'long', pony: l.style === 'pony', bun: l.style === 'bun', glasses: !!l.glasses, toolCol: it(l.gear, 'gear_red').col };
  };
  // random CPU look (team colour shirt)
  D.aiLook = function (seed, teamCol) {
    const r = U.rng(seed * 977 + 13), st = ['short', 'long', 'pony', 'bun', 'short'][Math.floor(r() * 5)];
    return { shirt: teamCol || U.pick(['#f97316', '#0ea5e9', '#a855f7', '#22c55e', '#e11d48'], r()), shorts: U.pick(['#1e293b', '#f1f5f9', '#334155'], r()), shoes: U.pick(['#ffffff', '#111827', '#facc15'], r()),
      hat: U.pick([null, null, 'cap', 'headband', 'visor'], r()), hatCol: U.pick(['#ffffff', '#facc15', '#111827'], r()), skin: Math.floor(r() * 5), hair: U.pick(D.HAIRS.slice(0, 6), r()), long: st === 'long', pony: st === 'pony', bun: st === 'bun', glasses: r() < 0.15, toolCol: U.pick(['#e11d48', '#2563eb', '#84cc16', '#7c3aed'], r()) };
  };
})();

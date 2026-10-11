/* Grok Sports Command - DLC: Ratita Stadium Night (issue #39). Sports list + ownership. The arcade sets
   localStorage['grokDLC.sports.you_choose'] when the player unlocks it at the DLC Machine. */
(function () {
  'use strict';
  const SP = window.SP, D = SP.D;
  const KEY = D.DLC_KEY = 'grokDLC.sports.you_choose';
  D.dlcOwned = function () {
    try {
      if (localStorage.getItem(KEY)) return true;
      const l = JSON.parse(localStorage.getItem('grokDLC.owned') || '[]');
      if (Array.isArray(l) && l.indexOf(KEY) >= 0) return true;
    } catch (e) { /* private mode */ }
    return /\/(previews|archive)\//.test(location.pathname);   // Time Jumper previews + Save Vault betas
  };
  D.DLC_SPORTS = [
    { id: 'hockey', n: 'Ice Hockey', icon: '🏒', col: '#38bdf8', tool: 'stick', music: 'arena', dlc: true,
      modes: [{ id: '2v2', n: '2 vs 2', team: 2, desc: '2:30 on the stadium ice, CPU goalies in the nets. Most goals wins (golden goal if tied).' }, { id: '3v3', n: '3 vs 3', team: 3, desc: '3 skaters a side + goalies. 2:30, golden goal if tied.' }],
      how: ['Joystick to skate. You glide on the ice, so steer early!', 'You keep the puck when you skate into it.', 'SWIPE toward the net to shoot. Long fast swipe = slap shot.', 'TAP to pass to a teammate.', 'No puck? TAP near the carrier to poke-check it away.'] },
    { id: 'glowgolf', n: 'Glow Mini-Golf', icon: '🌟', col: '#a855f7', tool: 'putter', music: 'night', dlc: true,
      modes: [{ id: '6', n: '6 Glow Holes', turns: true, desc: 'The Ratita Glow Course under the stadium lights, par 15.' }, { id: '3', n: 'Quick 3 Holes', turns: true, desc: 'The first 3 glow holes (par 7).' }],
      how: ['Pull BACK from anywhere on the screen like a slingshot.', 'Longer pull = harder putt. Let go to putt.', 'Neon bumpers bounce you around, the cheese ramp pushes you sideways.', 'Squeeze through the Mouse Hole in the cheese wall!', 'Fewest strokes wins. Max 6 strokes per hole.'] },
    { id: 'curling', n: 'Cheese Curling', icon: '🧀', col: '#facc15', tool: 'broom', music: 'night', dlc: true, defCpus: 1,
      modes: [{ id: '4', n: '4 Ends', turns: true, desc: '3 cheese wheels each per end. Closest to the button scores.' }, { id: '2', n: 'Quick 2 Ends', turns: true, desc: 'A short 2-end game.' }],
      how: ['SWIPE UP to slide your cheese wheel. Longer swipe = faster.', 'Curve the end of your swipe to make it CURL left or right.', 'TAP TAP TAP while it slides to SWEEP: it goes further and straighter.', 'Stop it in the rings (the house). The middle is the button.', 'After each end, every wheel closer than the other side\u2019s best scores 1 point.'] },
    { id: 'mascot', n: 'Mascot Race', icon: '🐭', col: '#f472b6', tool: 'none', music: 'soccer', dlc: true, defCpus: 3,
      modes: [{ id: '2lap', n: '2-Lap Race', turns: true, desc: 'Race the stadium track in giant mascot suits. Jump the cheese hurdles!' }, { id: 'sprint', n: '1-Lap Sprint', turns: true, desc: 'One quick lap of the track.' }],
      how: ['TAP TAP TAP fast to run. Keep a steady rhythm for top speed!', 'SWIPE UP to jump over the cheese hurdles.', 'Hit a hurdle and you wobble and slow down.', 'Grab the glowing cheese bites for a speed burst.', 'Assist Mode jumps the hurdles for you.'] }
  ];
  const base = D.sport;
  D.sport = (id) => base(id) || D.DLC_SPORTS.find((s) => s.id === id);
  D.lobbySports = () => (D.dlcOwned() ? D.SPORTS.concat(D.DLC_SPORTS) : D.SPORTS);
  // the Ratita Cup tournament: 4 events vs the CPU
  D.CUP = [['hockey', '2v2', 0], ['curling', '2', 1], ['glowgolf', '3', 1], ['mascot', 'sprint', 3]];
  D.CUP_TIERS = { easy: ['Bronze', '#cd7f32'], normal: ['Silver', '#e5e7eb'], hard: ['Gold', '#facc15'], pro: ['Diamond', '#67e8f9'] };
})();

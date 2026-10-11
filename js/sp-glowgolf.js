/* Grok Sports Command - DLC Ratita Stadium Night: Glow Mini-Golf. 6 neon holes under the stadium lights,
   built on the Mini Golf engine (same putting, physics and online sync) */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, M = SP.M, V = SP.V, VN = SP.Venue, ST = SP.Stadium, T = THREE;
  const GLOW = [
    { n: 'Neon Warm Up', par: 2, poly: [[-1, 0.5], [1, 0.5], [1, -8], [-1, -8]], tee: [0, 0], cup: [0.3, -7.2], bump: [[-0.45, -3.6, 0.22], [0.45, -4.8, 0.22]] },
    { n: 'Cheese Wall', par: 3, poly: [[-1.5, 0.5], [1.5, 0.5], [1.5, -9.5], [-1.5, -9.5]], tee: [0, 0], cup: [0.9, -8.8], walls: [[-1.5, -5, -0.26, -5], [0.26, -5, 1.5, -5]], bump: [[-0.8, -7.4, 0.25]], wall: true },
    { n: 'Moon Bend', par: 2, poly: [[-0.8, 0.5], [0.8, 0.5], [0.8, -6.4], [-4.6, -6.4], [-4.6, -4.4], [-0.8, -4.4]], tee: [0, 0], cup: [-3.9, -5.4], walls: [[-2.3, -4.4, -2.3, -5.1]] },
    { n: 'Pinball Lights', par: 3, poly: [[-1.6, 0.5], [1.6, 0.5], [1.6, -10], [-1.6, -10]], tee: [0, 0], cup: [-0.6, -9.2], bump: [[0, -2.6, 0.3], [-0.9, -4.4, 0.25], [0.9, -4.4, 0.25], [0, -6.2, 0.3], [-0.8, -7.8, 0.22], [0.8, -7.8, 0.22]] },
    { n: 'Cheese Ramp', par: 3, poly: [[-2, 0.5], [2, 0.5], [2, -9], [-2, -9]], tee: [-1.1, 0], cup: [1.2, -8.2], slope: [[-2, -6.2, 2, -2.2, 1.3, 0]], water: [[0.9, -5.8, 2, -3.4]], ramp: true },
    { n: 'Ratita Finale', par: 2, poly: [[-2, 0.5], [2, 0.5], [2, -8.5], [-2, -8.5]], tee: [0, 0], cup: [0, -6], mound: { x: 0, z: -6, r: 1.5, k: 1.15 }, bump: [[-1.2, -2.8, 0.25], [1.2, -2.8, 0.25]], ratita: true }
  ].map((h) => SP.Golf.prep(h));
  const PAL = { felt: '#3b0764', base: '#0f172a', wall: '#22d3ee', rail: '#f0abfc', bump: '#f472b6', bump2: '#fde047', glow: true };
  SP.GlowGolf = { HOLES: GLOW };
  function decor() {
    V.env(ST.ENV); VN.ground(400, '#0b1033', '#141a4a', -0.06);
    const g = ST.venue(22, 30, { gap: 2.5, rows: M.low ? 5 : 8, jumbo: [0, 10, -38, 0], floor: '#10153f' }); g.position.set(0, 0, -8);
    // neon floor tiles around the course + glowing cheese moons + the Ratita statue watching the last hole
    const b = new M.B(); for (let i = 0; i < 30; i++) { const x = (U.hash(i, 2) - 0.5) * 20, z = -8 + (U.hash(i, 5) - 0.5) * 28; if (Math.abs(x) < 5 && z > -19 && z < 2) continue; b.geo(new T.TorusGeometry(0.35 + U.hash(i, 7) * 0.4, 0.045, 5, 28), ['#f472b6', '#22d3ee', '#a3e635', '#c084fc'][i % 4], x, 0.04, z, Math.PI / 2, 0, 0, 1, 1, 1, 'glow'); }
    [[-11, -20], [11, -12], [-11, -2]].forEach((q, i) => { b.sph(0.9 + i * 0.2, '#fde047', q[0], 4.6 + i, q[1], 1, 1, 1, 0, 0, 0, 'glow', 18, 12); [[0.3, 0.3], [-0.35, 0.1], [0.05, -0.4]].forEach((c) => b.sph(0.2, '#d97706', q[0] + c[0], 4.6 + i + c[1], q[1] + 0.85 + i * 0.15, 1, 1, 0.3)); });
    VN.add(b.group(false));
    const rat = ST.ratitaStatue(0.9); rat.position.set(5.5, 0, -16); rat.rotation.y = -0.6; VN.add(rat); V.anim((dt, t) => { rat.userData.head.rotation.z = Math.sin(t * 1.8) * 0.15; });
    const sg = V.sign('🌟 RATITA GLOW GOLF', 4.6, 1.0, '#3b0764', '#fde047'); sg.position.set(-5, 2.6, -24); V.world.add(sg);
    const p2 = new M.B(); p2.cyl(0.08, 0.08, 2.2, '#22d3ee', -7.1, 1.1, -24.1, 0, 0, 0, 'glow', 6); p2.cyl(0.08, 0.08, 2.2, '#22d3ee', -2.9, 1.1, -24.1, 0, 0, 0, 'glow', 6); VN.add(p2.group(false));
  }
  // per-hole neon: glowing posts on every wall corner, a cheese wall with a mouse hole, a cheese ramp
  function holeDeco(G, h) {
    const b = new M.B(), segs = SP.Golf.segs(h), cols = ['#f472b6', '#22d3ee', '#a3e635', '#fde047'];
    segs.forEach((s, i) => b.sph(0.09, cols[i % 4], s[0], 0.26, s[1], 1, 1, 1, 0, 0, 0, 'glow', 10, 8));
    if (h.wall) { const z = h.walls[0][1]; [-1, 1].forEach((k) => { b.box(2.2, 0.75, 0.22, 0.08, '#facc15', k * 1.585, 0.38, z, 0, 0, 0, 'gloss'); [[0.4, 0.45], [0.9, 0.2], [1.6, 0.5]].forEach((q) => b.sph(0.1, '#d97706', k * (q[0] + 0.55), q[1], z + 0.17, 1, 1, 0.3)); }); b.tor(0.47, 0.08, '#facc15', 0, 0.02, z, 0, 0, 0, 'gloss', Math.PI); b.box(0.9, 0.04, 0.1, 0, '#111827', 0, 0.012, z); }
    if (h.ramp) (h.slope || []).forEach((s) => { const n = 6; for (let i = 0; i < n; i++) b.geo(new T.ConeGeometry(0.14, 0.32, 3), '#fde047', U.lerp(s[0] + 0.4, s[2] - 0.4, (i + 0.5) / n), 0.03, (s[1] + s[3]) / 2, Math.PI / 2, -Math.PI / 2, 0, 1, 0.12, 1, 'glow'); });
    if (h.ratita) { const r = ST.mascotHead('ratita', 1.2); r.position.set(h.mound.x - 3.6, 0.6, h.mound.z - 1.6); r.rotation.y = 0.6; G.add(r); }
    G.add(b.group(false));
    // the cup glows so you can find it in the dark
    const ring = new T.Mesh(new T.TorusGeometry(0.34, 0.03, 8, 30), new T.MeshBasicMaterial({ color: '#fde047' })); ring.rotation.x = -Math.PI / 2; ring.position.set(h.cup[0], 0.03, h.cup[1]); G.add(ring);
  }
  SP.Sports.glowgolf = function (ctx) { return SP.Sports.golf(ctx, { holes: GLOW, nh: (m) => (m === '3' ? 3 : 6), pal: PAL, decor, holeDeco }); };
  SP.Sports.glowgolf.rec = { '6': { n: 'Best 6-hole score', low: true }, '3': { n: 'Best 3-hole score', low: true } };
})();

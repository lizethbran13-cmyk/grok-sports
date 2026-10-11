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
  const PAL = { felt: '#3b0764', base: '#0f172a', wall: '#312e81', rail: '#c026d3', bump: '#db2777', bump2: '#fde047', glow: true };
  SP.GlowGolf = { HOLES: GLOW };
  const NEON = ['#ec4899', '#06b6d4', '#84cc16', '#a855f7', '#f59e0b'];
  // one shared canvas texture: dark navy floor with a neon grid + star dust
  let floorTex = null, feltTex = null;
  function tex(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), R = U.rng(kind === 'floor' ? 5 : 9);
    if (kind === 'floor') { x.fillStyle = '#0a0d2e'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(34,211,238,0.55)'; x.lineWidth = 3; x.strokeRect(0, 0, 256, 256); x.strokeStyle = 'rgba(217,70,239,0.28)'; x.lineWidth = 2; x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }
    else x.clearRect(0, 0, 256, 256);
    for (let i = 0; i < (kind === 'floor' ? 70 : 40); i++) { x.fillStyle = ['#ffffff', '#f0abfc', '#67e8f9', '#fde68a'][i % 4]; x.globalAlpha = 0.35 + R() * 0.5; x.beginPath(); x.arc(R() * 256, R() * 256, 0.8 + R() * 1.6, 0, Math.PI * 2); x.fill(); }
    x.globalAlpha = 1; const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  }
  function decor() {
    V.env(ST.ENV); VN.ground(400, '#070a24', '#0d1238', -0.06);
    const g = ST.venue(22, 30, { gap: 2.5, rows: M.low ? 5 : 8, jumbo: [0, 10, -38, 0], floor: '#0a0d2e' }); g.position.set(0, 0, -8);
    // neon-grid floor under the whole course
    floorTex = floorTex || tex('floor'); const ft = floorTex.clone(); ft.needsUpdate = true; ft.repeat.set(11, 15);
    const fl = new T.Mesh(new T.PlaneGeometry(22, 30), new T.MeshBasicMaterial({ map: ft, color: '#c7c9ff' })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, -0.03, -8); VN.add(fl);
    const b = new M.B(), R = U.rng(31), free = (x, z) => !(Math.abs(x) < 8.4 && z > -11.6) && z < 3;
    // glowing mushrooms
    for (let i = 0, n = 0; i < 80 && n < 18; i++) { const x = (R() - 0.5) * 19, z = -8 + (R() - 0.5) * 27; if (!free(x, z)) continue; n++; const h = 0.35 + R() * 0.9, r = 0.3 + R() * 0.45, col = NEON[n % NEON.length];
      b.cyl(r * 0.22, r * 0.3, h, '#e9d5ff', x, h / 2, z, 0, 0, 0, null, 8);
      b.geo(new T.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), col, x, h - 0.02, z, 0, 0, 0, 1, 0.75, 1, 'glow');
      for (let k = 0; k < 4; k++) { const a = k * 1.7 + n, rr = r * 0.55; b.sph(r * 0.12, '#ffffff', x + Math.cos(a) * rr, h + r * 0.45, z + Math.sin(a) * rr, 1, 0.5, 1, 0, 0, 0, null, 6, 4); }
      if (n % 3 === 0) { b.cyl(r * 0.12, r * 0.16, h * 0.6, '#e9d5ff', x + r * 1.1, h * 0.3, z + 0.2, 0, 0, 0, null, 6); b.geo(new T.SphereGeometry(r * 0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), NEON[(n + 2) % 5], x + r * 1.1, h * 0.6 - 0.02, z + 0.2, 0, 0, 0, 1, 0.75, 1, 'glow'); } }
    // planets with rings + a cheese moon
    [[-9.5, 7.5, -21, 1.4, '#7c3aed', '#22d3ee'], [10, 9, -19, 1.1, '#0e7490', '#f472b6'], [-10.5, 6, -4, 0.8, '#be185d', '#fde047'], [10.5, 6.5, -2, 0.7, '#4d7c0f', '#a855f7']].forEach((q) => {
      b.sph(q[3], q[4], q[0], q[1], q[2], 1, 1, 1, 0, 0, 0, 'gloss', 18, 12); b.sph(q[3] * 0.35, M.lighter ? M.lighter(q[4], 0.2) : q[4], q[0] + q[3] * 0.5, q[1] + q[3] * 0.55, q[2] + q[3] * 0.55, 1, 0.5, 1, 0, 0, 0, null, 8, 6);
      b.geo(new T.TorusGeometry(q[3] * 1.65, q[3] * 0.08, 4, 36), q[5], q[0], q[1], q[2], Math.PI / 2 + 0.35, 0.3, 0, 1, 1, 1, 'glow'); });
    b.sph(1.0, '#fde047', 0, 11, -26, 1, 1, 1, 0, 0, 0, 'glow', 18, 12); [[0.35, 0.3], [-0.4, 0.05], [0.05, -0.45]].forEach((c) => b.sph(0.22, '#b45309', c[0], 11 + c[1], -25.1, 1, 1, 0.35));
    // 3D star crystals in the sky over the stands
    const starG = new T.OctahedronGeometry(1, 0);
    for (let i = 0, n = 0; i < 400 && n < 110; i++) { const x = (R() - 0.5) * 34, y = 7 + R() * 11, z = -8 + (R() - 0.5) * 36, sz = 0.06 + R() * 0.1; if (z > -14 && Math.abs(x) < 11) continue; n++; b.geo(starG.clone(), ['#ffffff', '#fde68a', '#a5f3fc', '#f5d0fe'][n % 4], x, y, z, R(), R(), 0, sz, sz * 1.6, sz, 'glow'); }
    // neon rope + light posts with string lights along both sides of the course, fans standing behind them
    const spots = [];
    [-1, 1].forEach((sd) => { const x = sd * 6.4; for (let i = 0; i <= 6; i++) { const z = 1.2 - i * 2; b.cyl(0.05, 0.06, 2.4, '#1e1b4b', x, 1.2, z, 0, 0, 0, null, 6); b.sph(0.13, NEON[(i + (sd > 0 ? 2 : 0)) % 5], x, 2.45, z, 1, 1, 1, 0, 0, 0, 'glow', 8, 6); b.cyl(0.035, 0.035, 0.9, '#94a3b8', x - sd * 0.5, 0.45, z, 0, 0, 0, null, 6);
        if (i < 6) { b.box(0.05, 0.05, 2, 0, NEON[i % 5], x - sd * 0.5, 0.85, z - 1, 0, 0, 0, 'glow'); for (let k = 1; k < 5; k++) { const t = k / 5, zz = z - t * 2, yy = 2.35 - Math.sin(t * Math.PI) * 0.35; b.sph(0.06, NEON[(i + k) % 5], x, yy, zz, 1, 1, 1, 0, 0, 0, 'glow', 6, 4); } } }
      for (let i = 0; i < 9; i++) spots.push({ x: x + sd * (0.6 + (i % 2) * 0.7), y: 0, z: 0.6 - i * 1.35, ry: sd > 0 ? -Math.PI / 2 : Math.PI / 2, stand: true }); });
    VN.add(b.group(false));
    const cr = M.crowd(spots, 12, 2, true); VN.add(cr); (cr.userData.groups || []).forEach((x, i) => VN.crowdGroups && VN.crowdGroups.push({ g: x, ph: i * 1.3 + 7 }));
    const rat = ST.ratitaStatue(0.9); rat.position.set(-8, 0, -13); rat.rotation.y = 0.9; VN.add(rat); V.anim((dt, t) => { rat.userData.head.rotation.z = Math.sin(t * 1.8) * 0.15; });
    const sg = V.sign('🌟 RATITA GLOW GOLF', 4.6, 1.0, '#3b0764', '#fde047'); sg.position.set(-5, 2.6, -24); V.world.add(sg);
    const p2 = new M.B(); p2.cyl(0.08, 0.08, 2.2, '#22d3ee', -7.1, 1.1, -24.1, 0, 0, 0, 'glow', 6); p2.cyl(0.08, 0.08, 2.2, '#22d3ee', -2.9, 1.1, -24.1, 0, 0, 0, 'glow', 6); VN.add(p2.group(false));
  }
  // a neon arch of 3 nested half-rings over the course at z, spanning x0..x1
  function arch(b, x0, x1, z, k) { const cx = (x0 + x1) / 2, r0 = (x1 - x0) / 2 + 0.25; for (let i = 0; i < 3; i++) { const r = r0 + i * 0.16; b.geo(new T.TorusGeometry(r, 0.045, 6, 28, Math.PI), NEON[(k + i) % 5], cx, 0, z - i * 0.12, 0, 0, 0, 1, 1, 1, 'glow'); } [-1, 1].forEach((sd) => b.cyl(0.12, 0.14, 0.12, '#1e1b4b', cx + sd * (r0 + 0.16), 0.06, z - 0.12, 0, 0, 0, null, 10)); }
  // per hole: raised bumper rails with neon tubes, cheese-wall blocks, a real cheese ramp, neon arches, the glowing cup
  function holeDeco(G, h, hi) {
    const b = new M.B(), segs = SP.Golf.segs(h);
    segs.forEach((s, i) => { const dx = s[2] - s[0], dz = s[3] - s[1], L = Math.hypot(dx, dz), a = Math.atan2(dx, dz), mx = (s[0] + s[2]) / 2, mz = (s[1] + s[3]) / 2, col = NEON[(i + hi) % 5];
      b.box(0.16, 0.3, L + 0.02, 0.03, '#1e1b4b', mx, 0.15, mz, 0, a, 0, 'gloss');
      b.geo(new T.CylinderGeometry(0.04, 0.04, L, 6, 1), col, mx, 0.33, mz, Math.PI / 2, a, 0, 1, 1, 1, 'glow');
      b.box(0.17, 0.035, L, 0, col, mx, 0.06, mz, 0, a, 0, 'glow');
      b.cyl(0.07, 0.08, 0.42, '#312e81', s[0], 0.21, s[1], 0, 0, 0, null, 8); b.sph(0.085, col, s[0], 0.45, s[1], 1, 1, 1, 0, 0, 0, 'glow', 8, 6); });
    (h.bump || []).forEach((c, i) => b.geo(new T.TorusGeometry(c[2] + 0.02, 0.03, 6, 24), NEON[(i + 1) % 5], c[0], 0.17, c[1], Math.PI / 2, 0, 0, 1, 1, 1, 'glow'));
    // cheese walls: chunky blocks with real dents on both faces
    (h.walls || []).forEach((w, wi) => { const dx = w[2] - w[0], dz = w[3] - w[1], L = Math.hypot(dx, dz), a = Math.atan2(dx, dz), mx = (w[0] + w[2]) / 2, mz = (w[1] + w[3]) / 2, ca = Math.cos(a), sa = Math.sin(a);
      b.box(0.3, 0.6, L + 0.06, 0.08, '#facc15', mx, 0.3, mz, 0, a, 0, 'gloss'); b.box(0.31, 0.06, L + 0.07, 0, '#f59e0b', mx, 0.6, mz, 0, a, 0);
      const n = Math.max(1, Math.round(L * 1.6)); for (let k = 0; k < n; k++) { const t = (k + 0.5) / n - 0.5, px = mx + sa * t * L, pz = mz + ca * t * L, yy = 0.18 + ((k * 37 + wi * 11) % 7) / 7 * 0.32, rr = 0.06 + ((k * 13) % 5) * 0.012;
        [-1, 1].forEach((sd) => b.cyl(rr, rr, 0.06, '#a16207', px + ca * sd * 0.14, yy, pz - sa * sd * 0.14, Math.PI / 2, a + Math.PI / 2, 0, null, 10)); } });
    if (h.wall) { const z = h.walls[0][1]; b.geo(new T.TorusGeometry(0.4, 0.07, 8, 20, Math.PI), '#fde047', 0, 0.02, z, 0, 0, 0, 1, 1, 1, 'glow'); }
    // the cheese ramp: a tilted cheese slab with visible thickness, glowing chevrons showing which way it rolls
    if (h.ramp) (h.slope || []).forEach((s) => { const x0 = s[0], x1 = s[2], z0 = Math.min(s[1], s[3]), z1 = Math.max(s[1], s[3]), dir = Math.sign(s[4]) || 1, hi0 = 0.05, lo = 0.016;
      const sh = new T.Shape(); const yl = dir > 0 ? hi0 : lo, yr = dir > 0 ? lo : hi0; sh.moveTo(x0, 0); sh.lineTo(x1, 0); sh.lineTo(x1, yr); sh.lineTo(x0, yl); sh.lineTo(x0, 0);
      const eg = new T.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false }); eg.translate(0, 0.004, z0); b.geo(eg, '#fbbf24', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'gloss');
      for (let k = 0; k < 9; k++) { const x = U.lerp(x0 + 0.3, x1 - 0.3, ((k * 0.618) % 1)), z = U.lerp(z0 + 0.3, z1 - 0.3, ((k * 0.377 + 0.2) % 1)), y = U.lerp(yl, yr, (x - x0) / (x1 - x0)) + 0.006; b.cyl(0.08 + (k % 3) * 0.03, 0.08 + (k % 3) * 0.03, 0.004, '#b45309', x, y, z, 0, 0, 0, null, 10); }
      for (let k = 0; k < 3; k++) { const x = U.lerp(x0, x1, 0.25 + k * 0.25), y = U.lerp(yl, yr, 0.25 + k * 0.25) + 0.012; [-1, 1].forEach((q) => b.box(0.06, 0.012, 0.7, 0, '#f97316', x - dir * 0.18, y, (z0 + z1) / 2 + q * 0.3, 0, q * dir * 0.6, 0, 'glow')); } });
    // neon arches: one over the tee, one halfway on the straight holes
    const xs = h.poly.map((p) => p[0]); arch(b, Math.min(xs[0], xs[1]), Math.max(xs[0], xs[1]), h.tee[1] - 0.8, hi);
    if (h.poly.length === 4) arch(b, Math.min(...xs), Math.max(...xs), (h.tee[1] + h.cup[1]) / 2 + 0.4, hi + 2);
    // glowing cup: lit rim, inner light and a soft light column you can spot from the tee
    b.geo(new T.TorusGeometry(0.155, 0.018, 8, 28), '#fde047', h.cup[0], 0.022, h.cup[1], Math.PI / 2, 0, 0, 1, 1, 1, 'glow');
    b.geo(new T.CylinderGeometry(0.14, 0.14, 0.012, 20), '#f59e0b', h.cup[0], 0.016, h.cup[1], 0, 0, 0, 1, 1, 1, 'glow');
    if (h.ratita) { const r = ST.mascotHead('ratita', 1.2); r.position.set(h.mound.x - 3.6, 0.6, h.mound.z - 1.6); r.rotation.y = 0.6; G.add(r); }
    G.add(b.group(false));
    // star-dust overlay on the felt
    feltTex = feltTex || tex('felt'); const sh = new T.Shape(); h.poly.forEach((p, i) => (i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1])));
    const sg = new T.ShapeGeometry(sh); sg.rotateX(-Math.PI / 2); const fm = feltTex.clone(); fm.needsUpdate = true; fm.repeat.set(0.45, 0.45);
    const ov = new T.Mesh(sg, new T.MeshBasicMaterial({ map: fm, transparent: true, depthWrite: false })); ov.position.y = 0.0135; G.add(ov);
    const halo = new T.Mesh(new T.RingGeometry(0.17, 0.5, 28), new T.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.32, blending: T.AdditiveBlending, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.set(h.cup[0], 0.02, h.cup[1]); G.add(halo);
    const col = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 1.6, 16, 1, true), new T.MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.14, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    col.position.set(h.cup[0], 0.8, h.cup[1]); G.add(col);
    V.anim((dt, t) => { const k = 0.5 + Math.sin(t * 3) * 0.5; halo.material.opacity = 0.2 + k * 0.25; col.material.opacity = 0.08 + k * 0.1; halo.scale.setScalar(1 + k * 0.15); });
  }
  SP.Sports.glowgolf = function (ctx) { return SP.Sports.golf(ctx, { holes: GLOW, nh: (m) => (m === '3' ? 3 : 6), pal: PAL, decor, holeDeco }); };
  SP.Sports.glowgolf.rec = { '6': { n: 'Best 6-hole score', low: true }, '3': { n: 'Best 3-hole score', low: true } };
})();

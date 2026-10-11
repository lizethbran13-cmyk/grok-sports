/* Grok Sports Command - DLC Ratita Stadium Night: shared night-stadium kit (stands + crowd, floodlight towers with
   light beams, jumbotron, fireworks), mascot heads/suits, the Ratita statue, cheese cups, extra tools */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, M = SP.M, V = SP.V, VN = SP.Venue, T = THREE;
  const ST = SP.Stadium = {};
  const B = () => new M.B();
  ST.ENV = { sky: ['#040827', '#101b55', '#3a2470'], hemi: ['#d2dcff', '#2b3358', 0.8], sun: ['#f6f8ff', 1.05, 10, 46, 18], fog: ['#0d1440', 110, 360], stars: 1, fill: 0.42, shadow: 40 };
  const SEATS = ['#facc15', '#f472b6', '#7c3aed', '#38bdf8'];
  // the stadium bowl around a w x l floor. o: { rows, gap, parent (group to move it into), jumbo:[x,y,z,ry], fireworks }
  ST.venue = function (w, l, o) {
    o = o || {}; const gap = o.gap || 3, rows = o.rows || (M.low ? 6 : 10), g = new T.Group();
    const keep = (obj) => { if (obj) g.add(obj); return obj; };
    // grass apron + running track ring around the floor
    const ap = B(); ap.box(w + gap * 2 + 2, 0.04, l + gap * 2 + 2, 0, o.floor || '#1f5f3a', 0, -0.06, 0);
    for (let i = 0; i < 4; i++) ap.box(w + gap * 2 + 2 - i * 0.02, 0.012, 0.08, 0, '#ffffff', 0, -0.035, (i % 2 ? 1 : -1) * (l / 2 + gap * 0.5 + (i > 1 ? 0.6 : 0)));
    const apm = ap.group(false); apm.traverse((m) => { if (m.isMesh) m.receiveShadow = true; }); g.add(apm);
    const n0 = V.world.children.length;
    const dens = o.density || Math.min(0.8, 750 / Math.max(1, (w + l) * 2 * rows / 0.72)), lite = true;
    VN.bowl(w, l, { gap, rows, seats: SEATS, wall: '#1e1b4b', density: dens, lite });
    // corner stands so the bowl reads as one big stadium
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach((c, i) => VN.stand({ x: c[0] * (w / 2 + gap + 2.2), z: c[1] * (l / 2 + gap + 2.2), ry: Math.atan2(c[0], c[1]), len: gap * 2.6 + 4, rows, seats: SEATS, wall: '#1e1b4b', seed: 40 + i, density: dens, lite }));
    V.world.children.slice(n0).forEach((m) => g.add(m));
    // floodlight towers + 3D light beams
    const beamM = new T.MeshBasicMaterial({ color: '#fff7d6', transparent: true, opacity: 0.075, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
    const tx = w / 2 + gap + rows * 0.85 + 3, tz = l / 2 + gap + rows * 0.85 + 3, th = 18 + rows * 0.9;
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach((c) => {
      const x = c[0] * tx, z = c[1] * tz; keep(VN.tower(x, z, th, Math.atan2(-x, -z)));
      const dx = -x * 0.55, dz = -z * 0.55, dy = -th, L = Math.hypot(dx, dy, dz);
      const cg = new T.CylinderGeometry(1.4, 9, L, 18, 1, true); cg.translate(0, -L / 2, 0);
      const beam = new T.Mesh(cg, beamM); beam.position.set(x, th + 0.6, z); beam.lookAt(x + dx, th + 0.6 + dy, z + dz); beam.rotateX(-Math.PI / 2); g.add(beam);
    });
    // jumbotron
    if (o.jumbo !== false) { const j = o.jumbo || [0, 13, -(l / 2 + gap + rows * 0.85 + 1.5), 0]; const scr = VN.jumbo(j[0], j[1], j[2], j[3], 10, 4.6); g.add(scr.parent); g.userData.jumbo = scr; }
    // stadium roof rim with string lights
    const rim = B(), rr = Math.hypot(w / 2 + gap + rows * 0.85, l / 2 + gap + rows * 0.85) + 1;
    const rimG = new T.TorusGeometry(1, 0.012, 6, 64); rimG.rotateX(Math.PI / 2); rimG.scale(tx + 0.5, 1, tz + 0.5); rim.geo(rimG, '#94a3b8', 0, rows * 0.5 + 3.6, 0);
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; rim.sph(0.22, SEATS[i % 4], Math.sin(a) * (tx + 0.5), rows * 0.5 + 3.5, Math.cos(a) * (tz + 0.5), 1, 1, 1, 0, 0, 0, 'glow', 8, 6); }
    void rr; g.add(rim.group(false));
    if (o.fireworks !== false) ST.fireworks(g, Math.max(w, l));
    if (o.parent) o.parent.add(g); else V.world.add(g);
    return g;
  };
  // 3D fireworks (sphere sparks) popping over the stadium every few seconds
  ST.fireworks = function (g, span) {
    let t0 = 1.5; const cols = ['#ff4fd8', '#ffe14d', '#3ff0ff', '#4ade80', '#ff7a3d', '#a78bfa'];
    V.anim((dt) => { if (!g.parent) return; t0 -= dt; if (t0 > 0) return; t0 = 2.2 + Math.random() * 2.5; const p = new T.Vector3(); g.getWorldPosition(p); V.burst(p.x + (Math.random() - 0.5) * span, 26 + Math.random() * 10, p.z + (Math.random() - 0.5) * span * 0.6, cols[(Math.random() * cols.length) | 0], 26, 9); });
  };
  /* ---------- mascots ---------- */
  ST.MASCOTS = {
    ratita: { n: 'Ratita', fur: '#a1a1aa', ear: '#f9a8d4', nose: '#f472b6', shirt: '#facc15' },
    kitty: { n: 'Taco Cat', fur: '#fb923c', ear: '#fed7aa', nose: '#f472b6', shirt: '#22c55e' },
    pup: { n: 'Grok Pup', fur: '#a16207', ear: '#78350f', nose: '#1f2937', shirt: '#3b82f6' },
    frog: { n: 'Hop Frog', fur: '#4ade80', ear: '#16a34a', nose: '#166534', shirt: '#e11d48' }
  };
  ST.mascotHead = function (kind, s) {
    const k = ST.MASCOTS[kind] || ST.MASCOTS.ratita, b = B(); s = s || 1;
    b.sph(0.36 * s, k.fur, 0, 0.12 * s, 0, 1, 0.95, 1, 0, 0, 0, null, 20, 16);                 // big round head
    if (kind === 'ratita') {
      [-1, 1].forEach((q) => { b.sph(0.2 * s, k.fur, q * 0.3 * s, 0.42 * s, -0.02 * s, 1, 1, 0.35, 0, 0, q * 0.3, null, 16, 12); b.sph(0.14 * s, k.ear, q * 0.3 * s, 0.42 * s, 0.04 * s, 1, 1, 0.25, 0, 0, q * 0.3, null, 14, 10); });
      b.sph(0.17 * s, '#e4e4e7', 0, 0.02 * s, 0.3 * s, 1, 0.8, 1.15, 0, 0, 0, null, 14, 10); b.sph(0.055 * s, k.nose, 0, 0.05 * s, 0.48 * s, 1, 1, 1, 0, 0, 0, 'gloss');
      b.box(0.09 * s, 0.07 * s, 0.03 * s, 0.01, '#ffffff', 0, -0.07 * s, 0.43 * s);
      [-1, 1].forEach((q) => { for (let w = -1; w <= 1; w++) b.cyl(0.004 * s, 0.004 * s, 0.32 * s, '#3f3f46', q * 0.2 * s, 0.03 * s + w * 0.03 * s, 0.4 * s, 0, 0, Math.PI / 2 + w * 0.15 * q); });
    } else if (kind === 'kitty') {
      [-1, 1].forEach((q) => { b.cone(0.13 * s, 0.24 * s, k.fur, q * 0.2 * s, 0.46 * s, 0, 0, 0, -q * 0.35, null, 4); b.cone(0.08 * s, 0.15 * s, k.ear, q * 0.2 * s, 0.45 * s, 0.03 * s, 0, 0, -q * 0.35, null, 4); });
      b.sph(0.14 * s, '#fff7ed', 0, -0.02 * s, 0.28 * s, 1.2, 0.8, 1, 0, 0, 0, null, 12, 10); b.sph(0.045 * s, k.nose, 0, 0.04 * s, 0.4 * s);
      for (let i = 0; i < 3; i++) b.box(0.05 * s, 0.03 * s, 0.24 * s, 0.01, '#c2410c', (i - 1) * 0.12 * s, 0.4 * s, -0.05 * s, 0.3, 0, 0);   // tabby stripes
    } else if (kind === 'pup') {
      [-1, 1].forEach((q) => b.sph(0.12 * s, k.ear, q * 0.33 * s, 0.1 * s, 0, 0.6, 1.6, 0.8, 0, 0, q * 0.4));
      b.sph(0.16 * s, '#d6b48a', 0, -0.03 * s, 0.3 * s, 1, 0.8, 1.2); b.sph(0.065 * s, k.nose, 0, 0.03 * s, 0.47 * s, 1, 0.8, 1, 0, 0, 0, 'gloss'); b.sph(0.06 * s, '#f472b6', 0, -0.15 * s, 0.38 * s, 1, 0.5, 1.2);
    } else {
      [-1, 1].forEach((q) => b.sph(0.13 * s, k.fur, q * 0.17 * s, 0.38 * s, 0.12 * s));
      b.tor(0.2 * s, 0.025 * s, k.nose, 0, -0.05 * s, 0.25 * s, 0.3, 0, Math.PI, null, Math.PI);
    }
    // eyes (all mascots): big friendly cartoon eyes
    const ey = kind === 'frog' ? 0.42 : 0.2, ez = kind === 'frog' ? 0.22 : 0.27, ex = kind === 'frog' ? 0.17 : 0.13;
    [-1, 1].forEach((q) => { b.sph(0.085 * s, '#ffffff', q * ex * s, ey * s, ez * s, 1, 1.15, 0.7, 0, 0, 0, 'gloss', 12, 10); b.sph(0.045 * s, '#111827', q * ex * s, ey * s, (ez + 0.05) * s, 1, 1.2, 0.6, 0, 0, 0, 'gloss', 10, 8); b.sph(0.014 * s, '#ffffff', q * ex * s + 0.012 * s, (ey + 0.025) * s, (ez + 0.075) * s); });
    return b.group(true);
  };
  // dress an athlete model up as a mascot (head + tail + shirt colour)
  ST.dress = function (m, kind) {
    const u = m.userData; if (!u.head) return m; const k = ST.MASCOTS[kind] || ST.MASCOTS.ratita;
    u.head.children.slice().forEach((c) => { if (c.isMesh) c.visible = false; });
    const h = ST.mascotHead(kind, 1.05); h.position.y = 0.02; u.head.add(h);
    const tb = B();
    if (kind === 'ratita') { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new T.Vector3(Math.sin(t * 4) * 0.12, 0.1 + Math.sin(t * Math.PI) * 0.35 - t * 0.2, -0.18 - t * 0.6)); } tb.geo(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, 0.035, 6), k.ear); }
    else if (kind === 'kitty') { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new T.Vector3(0, 0.05 + t * 0.55, -0.2 - Math.sin(t * 2.2) * 0.3)); } tb.geo(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, 0.05, 6), k.fur); }
    else if (kind === 'pup') tb.cap(0.05, 0.22, k.fur, 0, 0.12, -0.25, -0.8, 0, 0);
    if (tb.parts.main.length) u.hips.add(tb.group(true));
    return m;
  };
  // the giant Ratita statue / balloon
  ST.ratitaStatue = function (s) {
    const g = new T.Group(), b = B(), k = ST.MASCOTS.ratita; s = s || 1;
    b.sph(0.9 * s, '#facc15', 0, 1.2 * s, 0, 1, 1.15, 0.9, 0, 0, 0, null, 20, 16);               // jersey body
    b.cyl(0.42 * s, 0.42 * s, 0.03 * s, '#7c3aed', 0, 1.45 * s, 0.8 * s, Math.PI / 2 - 0.2, 0, 0);   // chest badge
    [-1, 1].forEach((q) => { b.cap(0.2 * s, 0.6 * s, k.fur, q * 0.42 * s, 0.25 * s, 0.1 * s); b.sph(0.26 * s, k.fur, q * 0.45 * s, 0.05 * s, 0.25 * s, 1, 0.6, 1.4); b.cap(0.17 * s, 0.6 * s, k.fur, q * 1.0 * s, 1.75 * s, 0, 0, 0, q * 2.4); b.sph(0.2 * s, k.fur, q * 1.3 * s, 2.15 * s, 0); });
    const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new T.Vector3(Math.sin(t * 5) * 0.3 * s, (0.5 + Math.sin(t * Math.PI) * 1.4) * s, (-0.7 - t * 1.6) * s)); }
    b.geo(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 28, 0.09 * s, 8), k.ear);
    g.add(b.group(true)); const h = ST.mascotHead('ratita', 2.6 * s); h.position.y = 2.7 * s; g.add(h); g.userData.head = h;
    return g;
  };
  // a cheese cup trophy: golden cup with a cheese wedge on top
  ST.cheeseCup = function (col, s) {
    const g = M.trophy(col, s); const b = B(); s = s || 1;
    const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0.34 * s, 0); sh.lineTo(0, 0.22 * s); sh.lineTo(0, 0);
    const wg = new T.ExtrudeGeometry(sh, { depth: 0.2 * s, bevelEnabled: false }); wg.translate(-0.12 * s, 0, -0.1 * s); b.geo(wg, '#fbbf24', 0, 1.18 * s, 0);
    [[0.03, 0.06], [0.12, 0.03], [0.06, 0.12]].forEach((q) => b.sph(0.03 * s, '#d97706', q[0] * s - 0.05 * s, 1.18 * s + q[1] * s, 0.1 * s, 1, 1, 0.3));
    g.add(b.group(true)); return g;
  };
  // extra sport tools: hockey stick + curling broom
  const baseTool = M.tool;
  M.tool = function (kind, col) {
    if (kind === 'stick') { const b = B(); b.cyl(0.02, 0.02, 1.25, '#f8fafc', 0, -0.45, 0, 0, 0, 0, null, 8); b.cyl(0.024, 0.024, 0.25, '#1f2937', 0, 0.08, 0, 0, 0, 0, null, 8); b.box(0.32, 0.09, 0.04, 0.02, col || '#e11d48', 0.13, -1.06, 0, 0, 0, 0.12, 'gloss'); b.box(0.2, 0.02, 0.045, 0, '#111827', 0.12, -1.02, 0, 0, 0, 0.12); return b.group(); }
    if (kind === 'broom') { const b = B(); b.cyl(0.018, 0.018, 1.3, '#a16207', 0, -0.5, 0, 0, 0, 0, null, 8); b.box(0.36, 0.08, 0.12, 0.03, col || '#e11d48', 0, -1.16, 0, 0, 0, 0, 'gloss'); b.box(0.34, 0.06, 0.1, 0.02, '#fde68a', 0, -1.22, 0); return b.group(); }
    return baseTool(kind, col);
  };
})();

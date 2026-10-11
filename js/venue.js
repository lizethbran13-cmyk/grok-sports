/* Grok Sports Command - shared 3D venue kit: ground, fields, lines, stands + crowds, floodlights, jumbotron, arena shell, trees, clouds */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, M = SP.M, V = SP.V, T = THREE;
  const VN = SP.Venue = { cheer: 0, crowdGroups: [] };
  const B = () => new M.B();
  VN.add = (o) => { V.world.add(o); return o; };
  VN.reset = function () { VN.cheer = 0; VN.crowdGroups = []; VN.boards = []; };
  // big ground with gentle colour noise (vertex colours, real geometry)
  VN.ground = function (size, col, col2, y) {
    const g = new T.PlaneGeometry(size, size, 48, 48); g.rotateX(-Math.PI / 2); const n = g.attributes.position.count, c = new Float32Array(n * 3), a = new T.Color(col), b = new T.Color(col2 || col), cc = new T.Color();
    for (let i = 0; i < n; i++) { const x = g.attributes.position.getX(i), z = g.attributes.position.getZ(i); const k = U.clamp(0.5 + U.fbm(x * 0.05, z * 0.05, 3) * 0.9, 0, 1); cc.copy(a).lerp(b, k); c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b; }
    g.setAttribute('color', new T.BufferAttribute(c, 3)); const m = new T.Mesh(g, M.mat); m.position.y = y || -0.02; m.receiveShadow = true; return VN.add(m);
  };
  // playing surface: slab with optional mowing stripes / wood planks
  VN.field = function (w, l, col, o) {
    o = o || {}; const b = B(), th = o.th || 0.06, y = (o.y || 0) - th / 2;
    if (o.stripes) { const n = o.stripes, sl = l / n; for (let i = 0; i < n; i++) b.box(w, th, sl, 0, i % 2 ? col : M.lighter(col, 0.06), 0, y, -l / 2 + sl * (i + 0.5)); }
    else if (o.planks) { const n = Math.round(w / 0.5); for (let i = 0; i < n; i++) b.box(w / n - 0.004, th, l, 0, M.shift(col, 0, 0, (U.hash(i, 3) - 0.5) * 0.06), -w / 2 + (i + 0.5) * w / n, y, 0); }
    else b.box(w, th, l, 0, col, 0, y, 0);
    const g = b.group(false); g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; }); if (o.gloss) g.children.forEach((m) => { m.material = M.matGloss; }); return VN.add(g);
  };
  // lines: list of [x1,z1,x2,z2] segments, width w
  VN.lines = function (segs, w, col, y) {
    const b = B(); segs.forEach((s) => { const dx = s[2] - s[0], dz = s[3] - s[1], L = Math.hypot(dx, dz); b.box(w, 0.012, L + w, 0, col || '#ffffff', (s[0] + s[2]) / 2, (y || 0) + 0.006, (s[1] + s[3]) / 2, 0, Math.atan2(dx, dz), 0); });
    const g = b.group(false); g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; }); return VN.add(g);
  };
  VN.rect = (x0, z0, x1, z1) => [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]];
  VN.arc = function (cx, cz, r, a0, a1, n) { const s = []; n = n || 24; for (let i = 0; i < n; i++) { const p = a0 + (a1 - a0) * i / n, q = a0 + (a1 - a0) * (i + 1) / n; s.push([cx + Math.sin(p) * r, cz + Math.cos(p) * r, cx + Math.sin(q) * r, cz + Math.cos(q) * r]); } return s; };
  // tiered stands along one side. side: center (x,z), facing angle ry (fans look toward -z in local), length len, rows
  VN.stand = function (o) {
    const b = B(), rows = o.rows || 6, len = o.len, rise = o.rise || 0.5, depth = o.depth || 0.85, base = o.base || 0.4, seatCols = o.seats || ['#2563eb', '#e11d48'], spots = [];
    const rnd = U.rng(o.seed || 11), dens = (o.density == null ? 0.72 : o.density) * (M.low ? 0.45 : 1), every = M.low ? 0.95 : 0.72;
    for (let r = 0; r < rows; r++) {
      const top = base + (r + 1) * rise, z = r * depth;
      b.box(len, top, depth, 0.02, r % 2 ? '#cbd5e1' : '#e2e8f0', 0, top / 2, z + depth / 2);
      const n = Math.floor(len / every);
      for (let i = 0; i < n; i++) {
        const x = -len / 2 + (i + 0.5) * len / n, sc = seatCols[(Math.floor(i / 4) + r) % seatCols.length];
        if (!M.low || i % 2 === 0) b.box(0.5, 0.1, 0.42, o.lite ? 0 : 0.04, sc, x, top + 0.05, z + depth * 0.45);
        if (!M.low) b.box(0.5, 0.36, 0.08, o.lite ? 0 : 0.035, M.darker(sc, 0.08), x, top + 0.24, z + depth * 0.72);
        if (rnd() < dens) spots.push({ x, y: top + 0.05, z: z + depth * 0.45, ry: Math.PI });
      }
    }
    // back wall + railing
    b.box(len + 0.2, rows * rise + base + 1.2, 0.3, 0.05, o.wall || '#1e3a8a', 0, (rows * rise + base + 1.2) / 2, rows * depth + 0.15);
    b.box(len, 0.08, 0.08, 0.03, '#f8fafc', 0, base + 0.95, -0.05);
    for (let i = 0; i <= Math.floor(len / 3); i++) b.cyl(0.035, 0.035, 0.95, '#f8fafc', -len / 2 + i * len / Math.floor(len / 3), base + 0.48, -0.05, 0, 0, 0, null, 6);
    const g = new T.Group(); b.meshes(true).forEach((m) => { m.receiveShadow = true; g.add(m); });
    if (o.crowd !== false && spots.length) { const cr = M.crowd(spots, o.seed || 3, 3, o.lite); g.add(cr); cr.userData.groups.forEach((x, i) => VN.crowdGroups.push({ g: x, ph: i * 1.7 + (o.seed || 0) })); }
    g.position.set(o.x, o.y || 0, o.z); g.rotation.y = o.ry || 0; return VN.add(g);
  };
  // four stands around a w x l field (gap = distance from field edge)
  VN.bowl = function (w, l, o) {
    o = o || {}; const gap = o.gap || 3, rows = o.rows || 6, sides = o.sides || ['n', 's', 'e', 'w'];
    if (sides.indexOf('s') >= 0) VN.stand(Object.assign({}, o, { x: 0, z: l / 2 + gap, ry: 0, len: w + gap * 1.2, rows, seed: 21 }));
    if (sides.indexOf('n') >= 0) VN.stand(Object.assign({}, o, { x: 0, z: -l / 2 - gap, ry: Math.PI, len: w + gap * 1.2, rows, seed: 22 }));
    if (sides.indexOf('e') >= 0) VN.stand(Object.assign({}, o, { x: w / 2 + gap, z: 0, ry: Math.PI / 2, len: l + gap * 1.2, rows, seed: 23 }));
    if (sides.indexOf('w') >= 0) VN.stand(Object.assign({}, o, { x: -w / 2 - gap, z: 0, ry: -Math.PI / 2, len: l + gap * 1.2, rows, seed: 24 }));
  };
  VN.tick = function (dt, t) {
    VN.cheer = Math.max(0, VN.cheer - dt * 0.35);
    const k = 0.02 + VN.cheer * 0.16;
    VN.crowdGroups.forEach((c) => { c.g.position.y = Math.abs(Math.sin(t * (4 + VN.cheer * 4) + c.ph)) * k; });
  };
  VN.roar = function (k) { VN.cheer = Math.max(VN.cheer, k == null ? 1 : k); if (SP.Snd) SP.Snd.crowd(0.25 + 0.3 * (k == null ? 1 : k), 2.2); };
  // floodlight tower
  VN.tower = function (x, z, h, ry) {
    const b = B(); b.cyl(0.18, 0.28, h, '#94a3b8', 0, h / 2, 0, 0, 0, 0, 'gloss', 10); b.box(3.2, 1.6, 0.3, 0.06, '#334155', 0, h + 0.6, 0);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) b.cyl(0.3, 0.32, 0.12, '#fffbe6', -1.2 + i * 0.8, h + 0.25 + j * 0.7, 0.18, Math.PI / 2, 0, 0, 'glow', 14);
    const g = b.group(true); g.position.set(x, 0, z); g.rotation.y = ry || 0; return VN.add(g);
  };
  // jumbotron with live canvas screen. returns screen mesh (use .userData.draw)
  VN.jumbo = function (x, y, z, ry, w, h) {
    w = w || 8; h = h || 4; const b = B(); b.box(w + 0.6, h + 0.6, 0.5, 0.15, '#1f2937', 0, 0, 0); b.cyl(0.25, 0.25, y, '#64748b', -w / 3, -y / 2, -0.2, 0, 0, 0, null, 10); b.cyl(0.25, 0.25, y, '#64748b', w / 3, -y / 2, -0.2, 0, 0, 0, null, 10);
    b.box(w + 0.8, 0.5, 0.6, 0.12, '#facc15', 0, h / 2 + 0.55, 0, 0, 0, 0, 'gloss');
    const g = b.group(true); const scr = V.board(w, h, 512); scr.position.z = 0.26; g.add(scr); g.position.set(x, y, z); g.rotation.y = ry || 0; VN.add(g); (VN.boards = VN.boards || []).push(scr); return scr;
  };
  VN.drawScore = function (title, a, b, na, nb, sub) {
    (VN.boards || []).forEach((scr) => scr.userData.draw([title, a, b, na, nb, sub].join('|'), (x, W, H) => {
      const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b1230'); gr.addColorStop(1, '#1e1b4b'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffe14d'; x.font = '900 34px Arial'; x.fillText(title, W / 2, 30);
      x.fillStyle = '#2563eb'; x.fillRect(16, 56, W / 2 - 24, H - 110); x.fillStyle = '#e11d48'; x.fillRect(W / 2 + 8, 56, W / 2 - 24, H - 110);
      x.fillStyle = '#fff'; x.font = '900 22px Arial'; x.fillText(String(na).slice(0, 16), W / 4, 76); x.fillText(String(nb).slice(0, 16), W * 3 / 4, 76);
      x.font = '900 86px Arial'; x.fillText(String(a), W / 4, 138); x.fillText(String(b), W * 3 / 4, 138);
      x.fillStyle = '#a5f3fc'; x.font = '800 24px Arial'; x.fillText(sub || '', W / 2, H - 26);
    }));
  };
  // indoor arena shell: walls, ceiling trusses, hanging lights, banners
  VN.arena = function (w, l, h, o) {
    o = o || {}; const b = B(), wc = o.wall || '#3b2f7a', fc = o.floor || '#475569';
    b.box(w, 0.1, l, 0, fc, 0, -0.08, 0);
    [[0, -l / 2, w, 0], [0, l / 2, w, 0], [-w / 2, 0, l, Math.PI / 2], [w / 2, 0, l, Math.PI / 2]].forEach((s, i) => { b.box(s[2], h, 0.4, 0.05, wc, s[0], h / 2, s[1], 0, s[3], 0); b.box(s[2], 0.5, 0.42, 0.05, o.trim || '#facc15', s[0], h - 1.2, s[1], 0, s[3], 0); });
    b.box(w, 0.3, l, 0, M.darker(wc, 0.15), 0, h, 0);
    for (let i = -3; i <= 3; i++) b.box(0.25, 0.6, l, 0.04, '#94a3b8', i * w / 8, h - 0.5, 0);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { b.cyl(0.04, 0.04, 1.2, '#64748b', i * w / 6, h - 1.1, j * l / 6, 0, 0, 0, null, 5); b.cyl(0.5, 0.3, 0.4, '#334155', i * w / 6, h - 1.8, j * l / 6, 0, 0, 0, null, 12); b.cyl(0.42, 0.42, 0.04, '#fffbe6', i * w / 6, h - 2.01, j * l / 6, 0, 0, 0, 'glow', 14); }
    const g = b.group(false); g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; }); VN.add(g);
    // pennant banners hanging from the ceiling
    const bb = B(), cols = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316'];
    for (let i = 0; i < 12; i++) { const x = -w / 2 + 2 + i * (w - 4) / 11, z = (i % 2 ? -1 : 1) * (l / 2 - 1.5); const sh = new T.Shape(); sh.moveTo(-0.6, 0); sh.lineTo(0.6, 0); sh.lineTo(0, -1.6); sh.lineTo(-0.6, 0); bb.geo(new T.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }), cols[i % 6], x, h - 2.4, z); }
    VN.add(bb.group(false));
    return g;
  };
  VN.tree = function (x, z, s, b0) { const b = b0 || B(); s = s || 1; b.cyl(0.18 * s, 0.26 * s, 2.2 * s, '#8b5a2b', x, 1.1 * s, z, 0, 0, 0, null, 8); const c = ['#22c55e', '#16a34a', '#4ade80']; for (let i = 0; i < 4; i++) b.sph((1.1 - i * 0.12) * s, c[i % 3], x + Math.sin(i * 2.2) * 0.5 * s, (2.6 + i * 0.45) * s, z + Math.cos(i * 2.2) * 0.5 * s, 1, 0.9, 1, 0, 0, 0, null, 10, 8); if (!b0) return VN.add(b.group(true)); return b; };
  VN.palm = function (x, z, s, b0) { const b = b0 || B(); s = s || 1; for (let i = 0; i < 7; i++) b.cyl(0.2 * s - i * 0.01, 0.22 * s - i * 0.01, 0.75 * s, i % 2 ? '#a16207' : '#ca8a04', x + Math.sin(i * 0.3) * 0.15 * i * s * 0.2, 0.37 * s + i * 0.7 * s, z, 0, 0, 0.05 * i, null, 8); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; b.sph(0.9 * s, i % 2 ? '#16a34a' : '#22c55e', x + Math.sin(a) * 1.0 * s + 0.4 * s, 5.0 * s, z + Math.cos(a) * 1.0 * s, 1.4, 0.18, 0.45, 0.3, a, 0, null, 10, 6); } b.sph(0.18 * s, '#7c2d12', x + 0.35 * s, 4.8 * s, z, 1, 1, 1); if (!b0) return VN.add(b.group(true)); return b; };
  VN.clouds = function (n, r, y) { const b = B(); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.3, d = r * (0.8 + U.hash(i, 9) * 0.4), cx = Math.sin(a) * d, cz = Math.cos(a) * d, cy = y + U.hash(i, 4) * 12; for (let k = 0; k < 5; k++) b.sph(4 + U.hash(i, k) * 3, '#ffffff', cx + (k - 2) * 4, cy + Math.sin(k) * 1.5, cz + Math.cos(k * 2) * 2, 1.3, 0.8, 1, 0, 0, 0, null, 10, 7); } const g = b.group(false); g.children.forEach((m) => { m.material = new T.MeshBasicMaterial({ vertexColors: true, fog: false }); }); return VN.add(g); };
  VN.flags = function (pts, h) { const b = B(), cols = ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#a855f7']; pts.forEach((p, i) => { b.cyl(0.05, 0.05, h, '#e5e7eb', p[0], h / 2, p[1], 0, 0, 0, null, 6); b.box(0.9, 0.55, 0.02, 0, cols[i % 5], p[0] + 0.47, h - 0.35, p[1]); }); return VN.add(b.group(true)); };
  // standard sunny / indoor / night environments
  VN.ENV = {
    day: { sky: ['#1f7cff', '#7cc4ff', '#ffeec2'], hemi: ['#e3f2ff', '#5f8f45', 0.62], sun: ['#fff3dc', 1.05, 30, 50, 22], fog: ['#bfe3ff', 90, 330], shadow: 34 },
    beach: { sky: ['#0b8cff', '#6fd3ff', '#ffe2a8'], hemi: ['#e8f7ff', '#e9c98a', 0.66], sun: ['#fff1d6', 1.05, -25, 45, 30], fog: ['#c8ecff', 90, 330], shadow: 30 },
    indoor: { sky: ['#1b1440', '#2c2366', '#3b2f7a'], hemi: ['#fff6e6', '#5b4a7a', 0.78], sun: ['#ffffff', 0.65, 8, 40, 12], fog: null, fill: 0.35, shadow: 24 },
    night: { sky: ['#050a24', '#141f55', '#3a2a6b'], hemi: ['#b9c7ff', '#2a2250', 0.6], sun: ['#e9edff', 0.8, 12, 40, 18], fog: ['#141a3d', 80, 300], stars: 1, fill: 0.3, shadow: 30 },
    sunset: { sky: ['#3b5bdb', '#ff9e7a', '#ffd38a'], hemi: ['#ffe6d1', '#6b8f45', 0.62], sun: ['#ffd7a8', 1.0, -30, 30, -20], fog: ['#ffc9a8', 90, 330], shadow: 34 }
  };
})();

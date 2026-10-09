/* Grok Sports Command - procedural rounded 3D models (vertex coloured, merged per part) */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, T = THREE;
  const M = SP.M = {};
  M.low = false;
  const seg = (n) => M.low ? Math.max(6, Math.round(n * 0.6)) : n;
  M.mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.02 });
  M.matGloss = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.05 });
  M.matGlow = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: '#ffffff', emissiveIntensity: 0.55 });
  M.winMat = new T.MeshStandardMaterial({ color: '#bfe6ff', roughness: 0.15, metalness: 0.1, emissive: '#ffcf6b', emissiveIntensity: 0.0 });
  M.lampMat = new T.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcf6b', emissiveIntensity: 0.2, roughness: 0.4 });
  M.glassMat = new T.MeshStandardMaterial({ color: '#d6f3ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 });
  const solid = {};
  M.solid = function (c, o) { const k = c + JSON.stringify(o || {}); if (!solid[k]) solid[k] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55 }, o || {})); return solid[k]; };

  /* ---------- builder: collects painted geometry into buckets ---------- */
  function B() { this.parts = { main: [], gloss: [], glow: [] }; }
  B.prototype.add = function (g, col, b, x, y, z, rx, ry, rz, sx, sy, sz) { U.xf(g, x, y, z, rx, ry, rz, sx, sy, sz); (this.parts[b || 'main']).push(U.paint(g, col)); return this; };
  B.prototype.sph = function (r, col, x, y, z, sx, sy, sz, rx, ry, rz, b, s1, s2) { return this.add(new T.SphereGeometry(r, seg(s1 || 12), seg(s2 || 9)), col, b, x, y, z, rx, ry, rz, sx, sy, sz); };
  B.prototype.cyl = function (r1, r2, h, col, x, y, z, rx, ry, rz, b, n) { return this.add(new T.CylinderGeometry(r1, r2, h, seg(n || 14), 1), col, b, x, y, z, rx, ry, rz); };
  B.prototype.cone = function (r, h, col, x, y, z, rx, ry, rz, b, n) { return this.add(new T.ConeGeometry(r, h, seg(n || 14), 1), col, b, x, y, z, rx, ry, rz); };
  B.prototype.tor = function (r, t, col, x, y, z, rx, ry, rz, b, arc) { return this.add(new T.TorusGeometry(r, t, seg(8), seg(20), arc || Math.PI * 2), col, b, x, y, z, rx, ry, rz); };
  B.prototype.box = function (w, h, d, r, col, x, y, z, rx, ry, rz, b) { if (r == null || r < 0.025 || Math.min(w, h, d) < 0.05) return this.add(new T.BoxGeometry(w, h, d), col, b, x, y, z, rx, ry, rz); return this.add(U.rbox(w, h, d, r, M.low ? 1 : 2), col, b, x, y, z, rx, ry, rz); };
  B.prototype.capLo = function (r, len, col, x, y, z, rx, ry, rz, b) { return this.add(capsule(r, len, 7), col, b, x, y, z, rx, ry, rz); };
  B.prototype.cap = function (r, len, col, x, y, z, rx, ry, rz, b) { return this.add(capsule(r, len), col, b, x, y, z, rx, ry, rz); };
  B.prototype.geo = function (g, col, x, y, z, rx, ry, rz, sx, sy, sz, b) { return this.add(g, col, b, x, y, z, rx, ry, rz, sx, sy, sz); };
  B.prototype.meshes = function (castShadow) {
    const out = [];
    if (this.parts.main.length) out.push(new T.Mesh(U.merge(this.parts.main), M.mat));
    if (this.parts.gloss.length) out.push(new T.Mesh(U.merge(this.parts.gloss), M.matGloss));
    if (this.parts.glow.length) { const m = new T.Mesh(U.merge(this.parts.glow), M.matGlow); m.userData.glow = true; out.push(m); }
    out.forEach((m) => { m.castShadow = castShadow !== false; m.receiveShadow = false; });
    return out;
  };
  B.prototype.group = function (castShadow) { const g = new T.Group(); this.meshes(castShadow).forEach((m) => g.add(m)); return g; };
  B.prototype.geometry = function () { return U.merge(this.parts.main.concat(this.parts.gloss)); };
  M.B = B;
  const capCache = {};
  function capsule(r, len, rad) {
    const k = r.toFixed(3) + ',' + len.toFixed(3) + (M.low ? 'l' : '') + (rad || '');
    if (!capCache[k]) { const pts = [], n = rad ? 3 : seg(5); for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI / 2; pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r - len / 2)); } for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r + len / 2)); } capCache[k] = new T.LatheGeometry(pts, rad || seg(14)); }
    return capCache[k].clone();
  }
  M.capsule = capsule;
  M.outlineMat = new T.ShaderMaterial({ side: T.BackSide, uniforms: { th: { value: 0.022 }, col: { value: new T.Color('#3a1f3a') } },
    vertexShader: 'uniform float th; void main(){ vec3 p = position + normalize(normal) * th; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform vec3 col; void main(){ gl_FragColor = vec4(col, 1.0); }' });
  M.outline = function (root, skip) { const add = []; root.traverse((m) => { if (!m.isMesh || m.userData.outline) return; let q = m; while (q) { if (q === skip) return; q = q.parent; } if (m.userData.glow) return; add.push(m); }); add.forEach((m) => { const o = new T.Mesh(m.geometry, M.outlineMat); o.userData.outline = true; o.castShadow = false; o.receiveShadow = false; o.raycast = () => {}; m.add(o); }); };
  function pivot(parent, x, y, z) { const p = new T.Group(); p.position.set(x, y, z); parent.add(p); return p; }
  function attach(p, b, shadow) { b.meshes(shadow).forEach((m) => p.add(m)); return p; }
  M.pivot = pivot; M.attach = attach;
  const _h = { h: 0, s: 0, l: 0 };
  M.shift = function (hex, dh, ds, dl) { const c = new T.Color(hex); c.getHSL(_h); c.setHSL((_h.h + (dh || 0) + 1) % 1, U.clamp(_h.s + (ds || 0), 0, 1), U.clamp(_h.l + (dl || 0), 0, 1)); return '#' + c.getHexString(); };
  M.darker = (hex, k) => M.shift(hex, 0, 0, -(k || 0.15));
  M.lighter = (hex, k) => M.shift(hex, 0, 0, (k || 0.15));
  const V2 = (a) => a.map((p) => new T.Vector2(p[0], p[1]));

  /* ---------- paddle ---------- */
  M.paddle = function (pd) {
    pd = pd || { a: '#e11d48', b: '#1f2937' };
    const b = new B(), face = U.rrShape(0.2, 0.25, 0.07);
    const fg = new T.ExtrudeGeometry(face, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 2, curveSegments: M.low ? 4 : 8 });
    fg.translate(0, 0, -0.006);
    if (pd.pickle) { // a pickle-shaped paddle: bumpy green face
      b.sph(0.13, pd.a, 0, 0.29, 0, 0.82, 1.15, 0.12, 0, 0, 0, 'gloss', 16, 12);
      for (let i = 0; i < 7; i++) b.sph(0.016, M.lighter(pd.a, 0.12), Math.sin(i * 2.4) * 0.07, 0.2 + (i / 7) * 0.2, 0.016, 1, 1, 0.5);
    } else {
      b.geo(fg, pd.a, 0, 0.29, 0, 0, 0, 0, 1, 1, 1, pd.gloss ? 'gloss' : 'main');
      // stripe + logo dot on both faces
      [-1, 1].forEach((s) => { b.box(0.17, 0.035, 0.004, 0.0015, pd.b, 0, 0.33, s * 0.013); b.cyl(0.03, 0.03, 0.004, pd.glow ? pd.glow : '#ffffff', 0, 0.24, s * 0.013, Math.PI / 2, 0, 0, pd.glow ? 'glow' : 'main', 16); });
      // edge guard
      const eg = new T.ExtrudeGeometry(U.rrShape(0.21, 0.26, 0.075), { depth: 0.02, bevelEnabled: false, curveSegments: M.low ? 4 : 8 }); eg.translate(0, 0, -0.01);
      const hole = U.rrShape(0.196, 0.246, 0.068); const sh = U.rrShape(0.214, 0.264, 0.077); sh.holes.push(hole);
      const eg2 = new T.ExtrudeGeometry(sh, { depth: 0.024, bevelEnabled: false, curveSegments: M.low ? 4 : 8 }); eg2.translate(0, 0, -0.012); void eg;
      b.geo(eg2, pd.b, 0, 0.29, 0);
    }
    // handle with grip wrap
    b.cyl(0.016, 0.018, 0.13, '#222831', 0, 0.105, 0, 0, 0, 0, null, 10);
    for (let i = 0; i < 4; i++) b.tor(0.018, 0.004, pd.b, 0, 0.06 + i * 0.03, 0, Math.PI / 2, 0, 0.2);
    b.cyl(0.021, 0.021, 0.012, pd.b, 0, 0.035, 0, 0, 0, 0, null, 10);
    const g = b.group(); g.userData.pd = pd; return g;
  };

  /* ---------- athlete ---------- */
  // o: { shirt, shorts, skin, hair, hat, hatCol, glasses, paddle, shoes, long, scale }
  M.athlete = function (o) {
    o = o || {};
    const D = SP.D, skin = typeof o.skin === 'number' ? D.SKINS[o.skin % D.SKINS.length] : (o.skin || D.SKINS[0]);
    const shirt = o.shirt || '#3b82f6', shorts = o.shorts || '#1f2937', hair = o.hair || '#5b3a1e', shoes = o.shoes || '#ffffff';
    const root = new T.Group(), hips = pivot(root, 0, 0.92, 0), torso = pivot(hips, 0, 0, 0);
    const b = new B();
    // rounded torso (jersey) with collar
    const tor = new T.LatheGeometry(V2([[0, -0.08], [0.19, -0.075], [0.215, 0.02], [0.225, 0.16], [0.245, 0.32], [0.24, 0.42], [0.2, 0.5], [0.12, 0.55], [0, 0.56]]), seg(24)); tor.scale(1, 1, 0.78); b.geo(tor, shirt);
    b.tor(0.095, 0.02, M.darker(shirt, 0.2), 0, 0.535, 0.01, Math.PI / 2 - 0.25, 0, 0);
    [-1, 1].forEach((s2) => { b.box(0.03, 0.42, 0.12, 0.012, M.lighter(shirt, 0.28), s2 * 0.228, 0.2, 0, 0, 0, s2 * -0.06); b.box(0.06, 0.012, 0.02, 0.005, M.lighter(shirt, 0.3), s2 * 0.045, 0.49, 0.15, 0, s2 * 0.5, s2 * 0.6); });
    b.cyl(0.05, 0.05, 0.012, M.lighter(shirt, 0.35), 0.1, 0.36, 0.185, Math.PI / 2, 0, 0);                     // chest logo
    b.sph(0.022, '#e6ff3b', 0.1, 0.36, 0.193, 1, 1, 0.4);
    b.cyl(0.07, 0.08, 0.1, skin, 0, 0.6, 0, 0, 0, 0, null, 12);                         // neck
    // shorts (hips)
    const hb = new B();
    hb.geo(new T.LatheGeometry(V2([[0, -0.2], [0.17, -0.2], [0.23, -0.12], [0.235, 0.0], [0.21, 0.06], [0, 0.07]]), seg(18)), shorts);
    hb.tor(0.215, 0.018, M.lighter(shorts, 0.2), 0, 0.03, 0, Math.PI / 2, 0, 0);
    attach(hips, hb); attach(torso, b);
    // head: big friendly cartoon head with real eyes (sclera, iris, pupil, highlight), brows, nose, smile
    const head = pivot(torso, 0, 0.86, 0), hd = new B(), HR = 0.235;
    hd.sph(HR, skin, 0, 0, 0, 1, 1.03, 0.98, 0, 0, 0, null, 26, 20);
    hd.sph(0.11, skin, 0, -0.1, 0.07, 1.25, 0.8, 1.0, 0, 0, 0, null, 16, 12);            // cheeks/jaw
    [-1, 1].forEach((s2) => { hd.sph(0.055, skin, s2 * 0.232, -0.01, 0, 0.55, 1, 0.9); hd.sph(0.03, M.darker(skin, 0.08), s2 * 0.245, -0.01, 0.01, 0.4, 0.7, 0.6); });
    hd.sph(0.03, M.darker(skin, 0.05), 0, -0.035, 0.235, 1, 0.85, 1);                  // nose
    [-1, 1].forEach((s2) => {
      const ex = s2 * 0.085, ey = 0.035, ez = 0.198;
      hd.sph(0.052, '#ffffff', ex, ey, ez, 0.9, 1.12, 0.55, 0, 0, 0, 'gloss', 16, 12);
      hd.sph(0.034, o.eyes || '#3b2a1a', ex, ey - 0.004, ez + 0.022, 0.9, 1.1, 0.5, 0, 0, 0, 'gloss', 12, 10);
      hd.sph(0.018, '#0b0b14', ex, ey - 0.004, ez + 0.034, 1, 1, 0.5, 0, 0, 0, 'gloss', 10, 8);
      hd.sph(0.01, '#ffffff', ex + 0.012, ey + 0.014, ez + 0.042, 1, 1, 0.6, 0, 0, 0, 'gloss', 6, 5);
      hd.box(0.075, 0.016, 0.02, 0.008, M.darker(hair, 0.1), ex, ey + 0.08, ez + 0.012, 0, 0, -s2 * 0.12);   // brow
      hd.sph(0.04, '#ff9fb3', s2 * 0.14, -0.06, 0.18, 1, 0.6, 0.4);                                         // blush
    });
    hd.tor(0.045, 0.012, '#9b2c3a', 0, -0.095, 0.21, 0.25, 0, Math.PI, null, Math.PI);                       // smile
    hd.sph(0.03, '#ffffff', 0, -0.108, 0.212, 1.3, 0.45, 0.5);                                                 // teeth
    if (!o.bald) {
      hd.sph(HR + 0.012, hair, 0, 0.055, -0.03, 1.02, 0.9, 1.02, -0.45, 0, 0, null, 24, 18);
      hd.sph(0.09, hair, -0.09, 0.15, 0.15, 1.4, 0.6, 0.8, 0.4, 0, 0.3); hd.sph(0.08, hair, 0.07, 0.17, 0.15, 1.3, 0.55, 0.8, 0.4, 0, -0.3); // bangs
      if (o.long) hd.cap(0.15, 0.24, hair, 0, -0.16, -0.14, 0.25, 0, 0);
      if (o.bun) hd.sph(0.09, hair, 0, 0.24, -0.16);
      if (o.pony) { hd.sph(0.05, o.hatCol || '#ff4fd8', 0, 0.06, -0.24); hd.cap(0.06, 0.22, hair, 0, -0.08, -0.29, 0.6, 0, 0); }
    }
    if (o.beard) hd.sph(0.16, o.beard, 0, -0.13, 0.1, 1, 1.05, 0.6);
    const hc = o.hatCol || shirt, hy = 0.11;
    if (o.hat === 'cap') { hd.sph(HR + 0.02, hc, 0, hy, -0.02, 1.01, 0.62, 1.02, -0.1, 0, 0, null, 22, 14); hd.geo(new T.CylinderGeometry(0.19, 0.2, 0.016, seg(18), 1, false, -Math.PI / 2, Math.PI), M.darker(hc, 0.12), 0, hy + 0.035, 0.15, 0.18, 0, 0); hd.sph(0.025, M.lighter(hc, 0.3), 0, hy + 0.15, -0.02); }
    else if (o.hat === 'visor') { hd.tor(HR + 0.005, 0.025, hc, 0, hy, 0, Math.PI / 2 + 0.12, 0, 0); hd.geo(new T.CylinderGeometry(0.19, 0.21, 0.014, seg(18), 1, false, -Math.PI / 2, Math.PI), hc, 0, hy + 0.01, 0.15, 0.15, 0, 0); }
    else if (o.hat === 'bucket') { hd.sph(HR + 0.02, hc, 0, hy + 0.04, 0, 1, 0.7, 1); hd.cyl(0.33, 0.36, 0.03, M.darker(hc, 0.08), 0, hy - 0.01, 0, 0.05, 0, 0); }
    else if (o.hat === 'headband') hd.tor(HR - 0.005, 0.03, hc, 0, hy + 0.02, 0, Math.PI / 2 - 0.1, 0, 0);
    else if (o.hat === 'crown') { hd.cyl(0.17, 0.16, 0.1, '#ffd23f', 0, 0.27, 0, 0, 0, 0, 'gloss', 16); for (let i = 0; i < 6; i++) { const a2 = i / 6 * Math.PI * 2; hd.cone(0.035, 0.08, '#ffd23f', Math.sin(a2) * 0.165, 0.35, Math.cos(a2) * 0.165, 0, 0, 0, 'gloss', 8); hd.sph(0.018, ['#ef4444', '#3b82f6', '#22c55e'][i % 3], Math.sin(a2) * 0.172, 0.27, Math.cos(a2) * 0.172, 1, 1, 1, 0, 0, 0, 'gloss'); } }
    else if (o.hat === 'pickle') { hd.cap(0.12, 0.24, '#65a30d', 0, 0.33, 0, 0, 0, 0.35); for (let i = 0; i < 6; i++) hd.sph(0.02, '#84cc16', Math.sin(i * 2.1) * 0.11 + 0.03, 0.25 + i * 0.04, Math.cos(i * 2.1) * 0.11); hd.sph(0.03, '#1b1530', 0.06, 0.38, 0.1); hd.sph(0.03, '#1b1530', -0.02, 0.4, 0.11); }
    if (o.glasses) { [-1, 1].forEach((s2) => hd.tor(0.05, 0.01, '#111827', s2 * 0.085, 0.035, 0.235)); hd.box(0.05, 0.01, 0.01, 0.004, '#111827', 0, 0.04, 0.24); }
    attach(head, hd);
    // limbs on pivots: sleeves, elbows, hands; shorts legs, knees, socks, chunky sneakers
    const legs = [], arms = [], fore = [];
    [-1, 1].forEach((s2) => {
      const lp = pivot(hips, s2 * 0.11, -0.1, 0), lb = new B(); lb.cap(0.088, 0.26, skin, 0, -0.25, 0); lb.cap(0.112, 0.13, shorts, 0, -0.09, 0); lb.tor(0.108, 0.012, M.lighter(shorts, 0.25), 0, -0.2, 0, Math.PI / 2, 0, 0); attach(lp, lb);
      const kn = pivot(lp, 0, -0.42, 0), kb = new B(); kb.sph(0.078, skin, 0, 0, 0); kb.cap(0.072, 0.22, skin, 0, -0.15, 0);
      kb.cyl(0.075, 0.07, 0.12, '#ffffff', 0, -0.3, 0, 0, 0, 0, null, 12); kb.tor(0.074, 0.01, o.shoeAccent || shirt, 0, -0.26, 0, Math.PI / 2, 0, 0);
      kb.sph(0.1, shoes, 0, -0.37, 0.05, 1, 0.66, 1.6, 0, 0, 0, null, 16, 12); kb.box(0.19, 0.04, 0.32, 0.018, o.shoeAccent || shirt, 0, -0.415, 0.05); kb.sph(0.04, M.lighter(o.shoeAccent || shirt, 0.2), s2 * 0.085, -0.37, 0.04, 0.4, 1, 1.4);
      attach(kn, kb); legs.push({ hip: lp, knee: kn });
      const ap = pivot(torso, s2 * 0.29, 0.44, 0), ab = new B(); ab.sph(0.095, shirt, 0, 0, 0); ab.cap(0.088, 0.08, shirt, 0, -0.08, 0); ab.cap(0.06, 0.16, skin, 0, -0.17, 0); attach(ap, ab);
      const el = pivot(ap, 0, -0.29, 0), eb = new B(); eb.sph(0.058, skin, 0, 0, 0); eb.cap(0.054, 0.15, skin, 0, -0.12, 0); eb.cyl(0.062, 0.062, 0.05, o.band || '#ffffff', 0, -0.2, 0, 0, 0, 0, null, 12);
      eb.sph(0.066, skin, 0, -0.27, 0.01, 0.9, 1.05, 0.85); eb.sph(0.025, skin, -s2 * 0.05, -0.25, 0.04, 1, 1.4, 1); attach(el, eb);
      arms.push(ap); fore.push(el); ap.rotation.z = s2 * 0.15;
    });
    // paddle in right hand
    const pp = pivot(fore[1], 0, -0.28, 0.03); const pad = M.tool(o.tool, o.toolCol); pp.add(pad); pp.rotation.x = Math.PI / 2 - 0.4; pad.position.y = -0.02;
    const ppL = pivot(fore[0], 0, -0.28, 0.03); if (o.tool === 'bow') { pp.remove(pad); ppL.add(pad); ppL.rotation.set(0, 0, 0); }
    root.userData = { hips, torso, head, legs, arms, fore, paddle: pp, paddleL: ppL, padMesh: pad, tool: o.tool, kind: 'athlete', walk: 0, look: o };
    root.scale.setScalar(o.scale || 1.06);
    return root;
  };
  M.tool = function (kind, col) {
    col = col || '#e11d48'; const b = new B(), g = new T.Group();
    if (!kind || kind === 'none') return g;
    if (kind === 'tt') return M.paddle({ a: col, b: '#1f2937' });
    if (kind === 'racket' || kind === 'badminton') {
      const bad = kind === 'badminton', hr = bad ? 0.11 : 0.15, hl = bad ? 0.14 : 0.19, sh = bad ? 0.3 : 0.2, cy = 0.13 + sh + hl;
            // oval frame: torus scaled into an ellipse
      const tg = new T.TorusGeometry(1, bad ? 0.06 : 0.085, seg(8), seg(28)); tg.scale(hr, hl, hr); b.geo(tg, col, 0, cy, 0, 0, 0, 0, 1, 1, 1, 'gloss');
      for (let i = -3; i <= 3; i++) { const w = Math.sqrt(Math.max(0, 1 - (i / 3.6) * (i / 3.6))); b.box(0.006, hl * 2 * w, 0.004, 0, '#f8fafc', i * hr / 3.6, cy, 0); b.box(hr * 2 * w, 0.006, 0.004, 0, '#f8fafc', 0, cy + i * hl / 3.6, 0); }
      b.cyl(bad ? 0.008 : 0.014, bad ? 0.008 : 0.018, sh, bad ? '#e5e7eb' : M.darker(col, 0.2), 0, 0.13 + sh / 2, 0, 0, 0, 0, null, 8);
      if (!bad) { b.cyl(0.012, 0.012, 0.14, M.darker(col, 0.2), -0.05, 0.13 + sh - 0.02, 0, 0, 0, 0.45, null, 6); b.cyl(0.012, 0.012, 0.14, M.darker(col, 0.2), 0.05, 0.13 + sh - 0.02, 0, 0, 0, -0.45, null, 6); }
      b.cyl(0.02, 0.022, 0.16, '#1f2937', 0, 0.06, 0, 0, 0, 0, null, 10); b.cyl(0.024, 0.024, 0.015, col, 0, -0.02, 0, 0, 0, 0, null, 10);
      return b.group();
    }
    if (kind === 'putter') {
      b.cyl(0.012, 0.012, 0.8, '#cbd5e1', 0, -0.3, 0, 0, 0, 0, 'gloss', 8); b.cyl(0.022, 0.02, 0.2, '#1f2937', 0, 0.05, 0, 0, 0, 0, null, 10);
      b.box(0.2, 0.05, 0.07, 0.02, col, 0.06, -0.72, 0, 0, 0, 0, 'gloss'); return b.group();
    }
    if (kind === 'bow') {
      const pts = []; for (let i = 0; i <= 16; i++) { const t2 = i / 16 * 2 - 1; pts.push(new T.Vector3(-0.12 * (1 - t2 * t2) + 0.02 * t2 * t2 * t2 * t2, t2 * 0.62, 0)); }
      b.geo(new T.TubeGeometry(new T.CatmullRomCurve3(pts), seg(24), 0.018, seg(6)), col, 0, 0, 0, 0, 0, 0, 1, 1, 1, 'gloss');
      b.box(0.05, 0.16, 0.05, 0.02, '#7c2d12', -0.12, 0, 0);
      b.cyl(0.003, 0.003, 1.22, '#f8fafc', 0.0, 0, 0, 0, 0, 0, null, 4);
      const gg = b.group(); gg.rotation.set(0, Math.PI / 2, 0); g.add(gg); g.userData.string = gg; return g;
    }
    return g;
  };

  // pose: st = { spd, swingT, swingType, swingSide, ready, celeb, celebT, t, serveHold }
  const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  M.pose = function (m, dt, st) {
    const u = m.userData, t = st.t || 0; if (!u.legs) return;
    const spd = st.spd || 0; u.walk += dt * (3 + spd * 2.6);
    const run = Math.min(1, spd / 3.5), s = Math.sin(u.walk * 1.5), c = Math.cos(u.walk * 1.5);
    // base: athletic ready stance (knees bent) blended with running
    const crouch = st.ready ? 0.07 : 0.03;
    u.hips.position.y = 0.95 - crouch + Math.abs(c) * 0.05 * run + (spd < 0.1 ? Math.sin(t * 3) * 0.008 : 0);
    u.torso.rotation.x = 0.12 + run * 0.18; u.torso.rotation.y = 0; u.torso.rotation.z = 0; u.hips.rotation.y = 0; u.hips.rotation.z = 0; u.hips.rotation.x = 0;
    u.legs[0].hip.rotation.x = s * 0.85 * run - crouch * 2.2; u.legs[1].hip.rotation.x = -s * 0.85 * run - crouch * 2.2;
    u.legs[0].knee.rotation.x = (0.25 + Math.max(0, -s) * 1.0) * run + crouch * 4; u.legs[1].knee.rotation.x = (0.25 + Math.max(0, s) * 1.0) * run + crouch * 4;
    u.legs[0].hip.rotation.z = 0.06; u.legs[1].hip.rotation.z = -0.06;
    // arms: left swings with the run, right holds the paddle up in front (ready position)
    u.arms[0].rotation.set(-s * 0.7 * run - 0.35, 0, 0.35); u.fore[0].rotation.set(-0.8 - run * 0.4, 0, 0);
    u.arms[1].rotation.set(-0.35 + s * 0.3 * run, 0, -0.8); u.fore[1].rotation.set(-1.15, 0, 0); u.paddle.rotation.set(Math.PI / 2 - 0.15, 0, 0.75);
    u.head.rotation.set(-0.1, 0, 0);
    // swing animation
    const st2 = st.swingT == null ? 9 : st.swingT, ty = st.swingType;
    if (st.serveHold) { // holding the ball, paddle back low
      u.arms[1].rotation.set(0.6, 0.1, -0.15); u.fore[1].rotation.set(-0.3, 0, 0); u.arms[0].rotation.set(-1.0, 0, 0.3); u.fore[0].rotation.set(-0.6, 0, 0);
    }
    if (st2 < 0.55) {
      const k = ease(st2 / 0.32), back = 1 - ease(st2 / 0.12);
      if (ty === 'serve' || ty === 'lob' || (ty === 'dink' && !st.high)) { // underhand: paddle from low-back to forward-up
        const a = U.lerp(0.9, -1.4, k) + back * 0.3; u.arms[1].rotation.set(a, 0.1, -0.2); u.fore[1].rotation.set(U.lerp(-0.2, -0.6, k), 0, 0); u.paddle.rotation.set(Math.PI / 2 - 0.9, 0, 0.1);
        u.torso.rotation.y = U.lerp(0.35, -0.25, k) * (st.swingSide || 1); u.legs[0].hip.rotation.x -= 0.25; u.legs[1].hip.rotation.x += 0.15;
      } else if (ty === 'smash') { // overhead: up and over
        const a = U.lerp(-2.9, -0.4, k); u.arms[1].rotation.set(a, 0, -0.25); u.fore[1].rotation.set(U.lerp(-1.2, -0.1, k), 0, 0); u.paddle.rotation.set(Math.PI / 2 - 0.2, 0, 0);
        u.arms[0].rotation.set(-2.4 * (1 - k), 0, 0.4); u.torso.rotation.x = U.lerp(-0.15, 0.45, k); u.hips.position.y += Math.sin(Math.min(1, st2 / 0.45) * Math.PI) * 0.25;
      } else { // forehand / backhand groundstroke + volleys
        const side = st.swingSide || 1, a = U.lerp(-1.2, 1.2, k) * side;
        u.torso.rotation.y = -a * 0.45; u.arms[1].rotation.set(-1.25, side > 0 ? U.lerp(1.3, -0.9, k) : U.lerp(-1.4, 0.7, k), -0.2 - (side < 0 ? 0.6 : 0)); u.fore[1].rotation.set(-0.35, 0, 0);
        u.paddle.rotation.set(Math.PI / 2 - (ty === 'dink' ? 0.9 : 0.3), 0, side > 0 ? 0.4 : -0.6);
        u.legs[side > 0 ? 0 : 1].hip.rotation.x -= 0.35; u.legs[side > 0 ? 0 : 1].knee.rotation.x += 0.25;
      }
    }
    // celebrations
    if (st.celebT > 0) M.celebrate(m, st.celeb || 'fist', st.celebT, t);
  };
  M.celebrate = function (m, kind, ct, t) {
    const u = m.userData;
    if (kind === 'jump') { const j = Math.abs(Math.sin(t * 7)); u.hips.position.y += j * 0.35; u.arms[0].rotation.set(-2.9, 0, 0.4); u.arms[1].rotation.set(-2.9, 0, -0.4); u.fore[0].rotation.x = 0; u.fore[1].rotation.x = 0; u.legs[0].knee.rotation.x = j * 0.8; u.legs[1].knee.rotation.x = j * 0.8; }
    else if (kind === 'spin') { u.hips.rotation.y = t * 9; u.arms[1].rotation.set(-1.6, 0, -1.3); u.arms[0].rotation.set(-1.6, 0, 1.3); }
    else if (kind === 'dance') { const w = Math.sin(t * 9); u.hips.rotation.z = w * 0.18; u.hips.position.y -= 0.06 + Math.abs(w) * 0.05; u.torso.rotation.z = -w * 0.25; u.arms[0].rotation.set(-2.2 + w, 0, 0.6); u.arms[1].rotation.set(-2.2 - w, 0, -0.6); u.head.rotation.z = w * 0.2; }
    else if (kind === 'flip') { const k = (t * 1.6) % 1; u.hips.position.y += Math.sin(k * Math.PI) * 0.9; u.hips.rotation.x = -k * Math.PI * 2; u.legs[0].knee.rotation.x = 1.4 * Math.sin(k * Math.PI); u.legs[1].knee.rotation.x = 1.4 * Math.sin(k * Math.PI); }
    else if (kind === 'bow') { u.torso.rotation.x = 1.0; u.arms[1].rotation.set(-0.4, 0, -1.2); u.arms[0].rotation.set(0.2, 0, 0.4); }
    else if (kind === 'sad') { u.torso.rotation.x = 0.5; u.head.rotation.x = 0.5; u.arms[0].rotation.set(0.1, 0, 0.1); u.arms[1].rotation.set(0.1, 0, -0.1); }
    else { const k = Math.abs(Math.sin(t * 6)); u.arms[1].rotation.set(-2.6 - k * 0.3, 0, -0.3); u.fore[1].rotation.x = -1.2 * k; u.hips.position.y += k * 0.08; }
  };

  /* ---------- ball ---------- */
  M.ball = function () {
    const g = new T.Group(); const b = new B();
    b.sph(0.062, '#e6ff3b', 0, 0, 0, 1, 1, 1, 0, 0, 0, 'gloss', 18, 14);
    // holes (little dimples)
    for (let i = 0; i < 26; i++) { const y = 1 - (i + 0.5) / 13, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.4; b.sph(0.011, '#b7c91c', Math.cos(a) * r * 0.06, y * 0.06, Math.sin(a) * r * 0.06, 1, 1, 0.3, 0, 0, 0, null, 6, 4); }
    attach(g, b);
    return g;
  };

  /* ---------- seated / standing fans: merged crowd geometry ---------- */
  // spots: [{x,y,z,ry,stand}] -> group of a few merged meshes (for cheering groups)
  M.crowd = function (spots, seed, groups) {
    const rnd = U.rng(seed || 7), n = groups || 3, bs = []; for (let i = 0; i < n; i++) bs.push(new B());
    const shirts = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#ffffff', '#facc15', '#0ea5e9'];
    const hairs = ['#2d1b0e', '#5b3a1e', '#a0522d', '#f6c344', '#111827', '#9ca3af', '#c2410c'];
    const lowd = M.low;
    spots.forEach((s, i) => {
      const b = bs[i % n], skin = SP.D.SKINS[Math.floor(rnd() * 5)], sh = shirts[Math.floor(rnd() * shirts.length)], hr = hairs[Math.floor(rnd() * hairs.length)];
      const cs = Math.cos(s.ry || 0), sn = Math.sin(s.ry || 0), P = (lx, ly, lz) => [s.x + lx * cs + lz * sn, s.y + ly, s.z - lx * sn + lz * cs];
      const sc = 0.9 + rnd() * 0.2, by = s.stand ? 0.75 : 0.3;
      let p = P(0, by + 0.32 * sc, 0); b.capLo(0.2 * sc, 0.28 * sc, sh, p[0], p[1], p[2]);
      p = P(0, by + 0.75 * sc, 0); b.sph(0.17 * sc, skin, p[0], p[1], p[2], 1, 1, 1, 0, 0, 0, null, lowd ? 7 : 10, lowd ? 5 : 7);
      p = P(0, by + 0.8 * sc, -0.02); b.sph(0.175 * sc, hr, p[0], p[1], p[2], 1, 0.85, 1, -0.4, s.ry || 0, 0, null, lowd ? 7 : 10, lowd ? 5 : 6);
      if (!lowd) { [-1, 1].forEach((k) => { const e = P(k * 0.06 * sc, by + 0.77 * sc, 0.155 * sc); b.sph(0.025, '#1b1530', e[0], e[1], e[2], 1, 1, 1, 0, 0, 0, null, 5, 4); }); }
      if (rnd() < 0.3) { const hp = P(0, by + 0.9 * sc, 0); b.sph(0.18 * sc, shirts[Math.floor(rnd() * shirts.length)], hp[0], hp[1], hp[2], 1, 0.55, 1, 0, 0, 0, null, 9, 5); }
      // arms (some raised)
      const up = rnd() < 0.35; [-1, 1].forEach((k) => { const a = P(k * 0.22 * sc, by + (up ? 0.7 : 0.3) * sc, up ? 0 : 0.08); b.capLo(0.055 * sc, 0.25 * sc, sh, a[0], a[1], a[2], up ? 0 : 0.6, s.ry || 0, k * (up ? -0.25 : 0.1)); });
      if (s.stand) { [-1, 1].forEach((k) => { const l = P(k * 0.09, 0.38, 0); b.capLo(0.075, 0.5, '#334155', l[0], l[1], l[2]); }); }
      
      if (rnd() < 0.12) { const f = P(0.25, by + 1.05 * sc, 0.05); b.box(0.3, 0.2, 0.02, 0.01, ['#ff4fd8', '#22c55e', '#facc15'][Math.floor(rnd() * 3)], f[0], f[1], f[2], 0, s.ry || 0, 0, 'glow'); } // foam signs
    });
    const root = new T.Group(); root.userData.groups = [];
    bs.forEach((b) => { const g = b.group(false); root.add(g); root.userData.groups.push(g); });
    return root;
  };
})();
/* ---------- sports balls + props (real geometry) ---------- */
(function () {
  'use strict';
  const SP = window.SP, M = SP.M, T = THREE;
  M.sportBall = function (kind, r) {
    const b = new M.B(); r = r || 0.11;
    if (kind === 'soccer') { b.sph(r, '#ffffff', 0, 0, 0, 1, 1, 1, 0, 0, 0, 'gloss', 20, 14); const pts = [[0, 1, 0], [0, -1, 0], [0.89, 0.45, 0], [-0.89, 0.45, 0], [0.28, 0.45, 0.85], [-0.28, -0.45, -0.85], [0.72, -0.45, 0.52], [-0.72, -0.45, 0.52], [0.72, -0.45, -0.52], [-0.72, 0.45, -0.52], [0.28, 0.45, -0.85], [-0.28, -0.45, 0.85]]; pts.forEach((p) => { const l = Math.hypot(p[0], p[1], p[2]); b.sph(r * 0.36, '#111827', p[0] / l * r * 0.93, p[1] / l * r * 0.93, p[2] / l * r * 0.93, 1, 1, 1, 0, 0, 0, null, 7, 5); }); }
    else if (kind === 'basket') { b.sph(r, '#f97316', 0, 0, 0, 1, 1, 1, 0, 0, 0, null, 20, 14); b.tor(r * 1.003, r * 0.035, '#1f2937', 0, 0, 0, 0, 0, 0); b.tor(r * 1.003, r * 0.035, '#1f2937', 0, 0, 0, Math.PI / 2, 0, 0); b.tor(r * 0.8, r * 0.035, '#1f2937', 0, 0, r * 0.6, 0, 0, 0); b.tor(r * 0.8, r * 0.035, '#1f2937', 0, 0, -r * 0.6, 0, 0, 0); }
    else if (kind === 'tennis') { b.sph(r, '#d9f99d', 0, 0, 0, 1, 1, 1, 0, 0, 0, null, 16, 12); b.sph(r * 0.999, '#bef264', 0, 0, 0, 1, 1, 1, 0, 0, 0, null, 16, 12); b.tor(r * 0.98, r * 0.09, '#ffffff', 0, 0, 0, 0.5, 0, 0); }
    else if (kind === 'volley') { b.sph(r, '#ffffff', 0, 0, 0, 1, 1, 1, 0, 0, 0, null, 20, 14); b.tor(r * 1.002, r * 0.16, '#facc15', 0, 0, 0, 0, 0, 0); b.tor(r * 1.002, r * 0.16, '#2563eb', 0, 0, 0, Math.PI / 2, 0, 0); b.tor(r * 1.002, r * 0.16, '#facc15', 0, 0, 0, 0, Math.PI / 2, Math.PI / 2); }
    else if (kind === 'dodge') { b.sph(r, '#ef4444', 0, 0, 0, 1, 1, 1, 0, 0, 0, 'gloss', 18, 12); b.tor(r * 1.0, r * 0.05, '#fecaca', 0, 0, 0, Math.PI / 2, 0, 0); }
    else if (kind === 'golf') { b.sph(r, '#ffffff', 0, 0, 0, 1, 1, 1, 0, 0, 0, 'gloss', 14, 10); }
    else if (kind === 'pingpong') { b.sph(r, '#ff8a3d', 0, 0, 0, 1, 1, 1, 0, 0, 0, 'gloss', 12, 9); }
    else if (kind === 'bowl') { b.sph(r, '#7c3aed', 0, 0, 0, 1, 1, 1, 0, 0, 0, 'gloss', 22, 16); b.sph(r * 0.4, '#a78bfa', r * 0.3, r * 0.5, r * 0.55, 1, 1, 0.3, 0, 0, 0, 'gloss', 10, 8); [[0.18, 0.8], [-0.18, 0.8], [0, 0.5]].forEach((h) => b.cyl(r * 0.12, r * 0.12, r * 0.1, '#1e1b3a', h[0] * r, h[1] * r, Math.sqrt(Math.max(0, 1 - h[0] * h[0] - h[1] * h[1])) * r, Math.PI / 2 - 0.6, 0, 0, null, 8)); }
    else if (kind === 'shuttle') { b.sph(r * 0.45, '#ffffff', 0, 0, 0, 1, 1, 1, 0, 0, 0, null, 10, 8); b.cyl(r * 0.46, r * 0.46, r * 0.25, '#e11d48', 0, -r * 0.12, 0, 0, 0, 0, null, 10); b.add(new T.CylinderGeometry(r * 1.25, r * 0.48, r * 1.6, 12, 1, true), '#f8fafc', null, 0, -r * 1.05, 0, Math.PI, 0, 0); b.tor(r * 1.0, r * 0.05, '#cbd5e1', 0, -r * 1.4, 0, Math.PI / 2, 0, 0); b.tor(r * 0.75, r * 0.05, '#cbd5e1', 0, -r * 0.9, 0, Math.PI / 2, 0, 0); }
    return b.group();
  };
  M.pin = function () {
    const b = new M.B(), pts = [[0, 0], [0.026, 0], [0.04, 0.03], [0.058, 0.1], [0.06, 0.15], [0.05, 0.22], [0.03, 0.27], [0.024, 0.3], [0.03, 0.33], [0.032, 0.36], [0.022, 0.38], [0, 0.385]].map((p) => new T.Vector2(p[0], p[1]));
    b.geo(new T.LatheGeometry(pts, M.low ? 10 : 16), '#ffffff', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'gloss');
    b.tor(0.0262, 0.004, '#e11d48', 0, 0.282, 0, Math.PI / 2, 0, 0, 'gloss'); b.tor(0.0262, 0.004, '#e11d48', 0, 0.296, 0, Math.PI / 2, 0, 0, 'gloss');
    const g = b.group(true); g.scale.setScalar(1.0); return g;
  };
  M.trophy = function (col, s) {
    const b = new M.B(); s = s || 1; const pts = [[0, 0], [0.32, 0], [0.32, 0.1], [0.12, 0.16], [0.08, 0.3], [0.06, 0.55], [0.14, 0.62], [0.3, 0.75], [0.36, 1.05], [0.34, 1.1], [0, 1.1]].map((p) => new T.Vector2(p[0] * s, p[1] * s));
    b.geo(new T.LatheGeometry(pts, M.low ? 12 : 22), col, 0, 0, 0, 0, 0, 0, 1, 1, 1, 'gloss');
    [-1, 1].forEach((k) => b.tor(0.13 * s, 0.025 * s, col, k * 0.38 * s, 0.85 * s, 0, 0, 0, 0, 'gloss', Math.PI * 1.2));
    b.box(0.5 * s, 0.14 * s, 0.5 * s, 0.03 * s, '#1f2937', 0, -0.07 * s, 0); b.sph(0.08 * s, '#ffffff', 0, 1.2 * s, 0, 1, 1, 1, 0, 0, 0, 'gloss');
    return b.group(true);
  };
})();

/* Grok Sports Command - the plaza hub: walkable sports-complex square with 10 enterable venues, a locker room,
   a trophy hall with the records board, and stadium gates to Grok FC and Grok Pickleball */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, T = THREE;
  const H = SP.Hub = { built: false, av: null, p: { x: 0, z: 8, ry: Math.PI, a: 'idle', at: 0 }, mv: { x: 0, z: 0 }, area: 'plaza', near: null, doors: [], cols: [], npcs: [] };
  const R = 33;
  H.URLS = { fc: 'https://lizethbran13-cmyk.github.io/grok-fc/', pickle: 'https://lizethbran13-cmyk.github.io/grok-pickleball/' };
  const LAYOUT = ['soccer', 'tennis', 'gate:pickle', 'basketball', 'volleyball', 'bowling', 'locker', 'trophy', 'golf', 'badminton', 'dodgeball', 'archery', 'tabletennis', 'gate:fc'];
  const ROOMS = { locker: { x: 300, z: 0, w: 16, d: 12 }, trophy: { x: -300, z: 0, w: 20, d: 14 } };
  const B = () => new M.B();
  const ang = (i) => Math.PI + i / LAYOUT.length * Math.PI * 2;   // index 0 = north (-z)

  H.build = function (force) {
    if (H.built && !force && H.q === V.quality) { H.show(); return; }
    V.clearWorld(); VN.reset(); H.doors = []; H.cols = []; H.npcs = []; H.q = V.quality; H.spin = [];
    V.env(VN.ENV.day);
    VN.ground(420, '#4fbf55', '#3aa548', -0.05);
    plaza(); LAYOUT.forEach((id, i) => building(id, i)); rooms(); props(); npcs();
    VN.clouds(M.low ? 6 : 12, 200, 60);
    H.board = VN.jumbo(0, 12.5, -9.5, 0, 7, 3.6); drawBoard();
    H.rebuildAvatar(); H.built = true;
    V.anim((dt, t) => { H.spin.forEach((s) => { s.rotation.y += dt * (s.userData.spd || 0.6); s.position.y = s.userData.y0 + Math.sin(t * 1.5 + s.userData.ph) * 0.25; }); });
  };
  H.show = function () { };
  function sh(g) { g.traverse((m) => { if (m.isMesh) { m.castShadow = !M.low; m.receiveShadow = true; } }); return g; }
  /* ---------- plaza floor, fountain, records jumbotron ---------- */
  function plaza() {
    const b = B(), cols = ['#f8e7c4', '#f1d7a6'];
    for (let r = 0; r < 8; r++) { const g = new T.RingGeometry(r * 5, r * 5 + 5, 64, 1); g.rotateX(-Math.PI / 2); b.geo(g, r % 2 ? cols[0] : cols[1], 0, 0.01 + r * 0.0005, 0); }
    // coloured inlay ring + spokes toward each door
    const rg = new T.RingGeometry(12, 13.2, 64); rg.rotateX(-Math.PI / 2); b.geo(rg, '#2563eb', 0, 0.02, 0);
    LAYOUT.forEach((id, i) => { const a = ang(i), s = D.sport(id), col = s ? s.col : id.indexOf('gate') === 0 ? '#16a34a' : '#a855f7'; const g = new T.PlaneGeometry(2.2, R - 18); g.rotateX(-Math.PI / 2); b.geo(g, col, Math.sin(a) * (13 + (R - 18) / 2), 0.025, Math.cos(a) * (13 + (R - 18) / 2), 0, a, 0); });
    const m = b.group(false); m.traverse((q) => { if (q.isMesh) q.receiveShadow = true; }); VN.add(m);
    // fountain with a giant spinning ball
    const f = B(); f.cyl(6, 6.3, 0.8, '#e2e8f0', 0, 0.4, 0, 0, 0, 0, null, 40); f.cyl(5.4, 5.4, 0.82, '#38bdf8', 0, 0.42, 0, 0, 0, 0, 'gloss', 40); f.cyl(1.2, 1.6, 2.4, '#cbd5e1', 0, 1.2, 0, 0, 0, 0, null, 20);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; f.sph(0.25, '#bae6fd', Math.sin(a) * 2.6, 1.2, Math.cos(a) * 2.6, 1, 1.6, 1, 0, 0, 0, 'gloss', 8, 6); }
    VN.add(sh(f.group(true))); H.cols.push({ x: 0, z: 0, r: 6.6 });
    const ball = M.sportBall('soccer', 1.6); ball.position.set(0, 4.4, 0); ball.userData.y0 = 4.4; ball.userData.ph = 0; ball.userData.spd = 0.5; VN.add(sh(ball)); H.spin.push(ball);
    // water jets (animated)
    const jets = []; const jg = new T.SphereGeometry(0.18, 8, 6), jm = new T.MeshStandardMaterial({ color: '#7dd3fc', roughness: 0.2, transparent: true, opacity: 0.8 });
    for (let i = 0; i < (M.low ? 12 : 28); i++) { const m2 = new T.Mesh(jg, jm); VN.add(m2); jets.push({ m: m2, ph: i / 28, a: i * 2.4 }); }
    V.anim((dt, t) => jets.forEach((j) => { const k = (t * 0.7 + j.ph) % 1, r = 1.4 + k * 3.4; j.m.position.set(Math.sin(j.a) * r, 2.4 + Math.sin(k * Math.PI) * 2.2, Math.cos(j.a) * r); }));
  }
  /* ---------- buildings ---------- */
  function building(id, i) {
    const a = ang(i), cx = Math.sin(a) * R, cz = Math.cos(a) * R, g = new T.Group(); g.position.set(cx, 0, cz); g.rotation.y = a + Math.PI; // local -z faces the plaza centre... (front = local +z after flip)
    g.rotation.y = a; // local +z points away from centre; the door is on local -z
    const sp = D.sport(id), b = B();
    let label, col, kind, door;
    if (id.indexOf('gate:') === 0) { gate(g, id.slice(5)); VN.add(g); return; }
    if (sp) { col = sp.col; label = sp.icon + ' ' + sp.n.toUpperCase(); kind = sp.id; }
    else if (id === 'locker') { col = '#a855f7'; label = '🧥 LOCKER ROOM'; kind = 'locker'; }
    else { col = '#eab308'; label = '🏆 TROPHY HALL'; kind = 'trophy'; }
    const W = 11, Dp = 9, Hh = id === 'trophy' ? 8 : 6.5, lite = M.lighter(col, 0.18), dark = M.darker(col, 0.18);
    // body: a stadium-style rounded hall with a curved roof
    b.box(W, Hh, Dp, 0.5, '#f8fafc', 0, Hh / 2, Dp / 2);
    b.box(W + 0.3, 1.0, Dp + 0.3, 0.3, col, 0, Hh - 0.3, Dp / 2);
    const roof = new T.CylinderGeometry(Dp / 2 + 0.2, Dp / 2 + 0.2, W + 0.2, M.low ? 12 : 24, 1, false, 0, Math.PI); roof.rotateZ(Math.PI / 2); roof.rotateX(-Math.PI / 2); roof.scale(1, 0.45, 1); b.geo(roof, lite, 0, Hh, Dp / 2);
    for (let k = -2; k <= 2; k++) b.box(0.25, Hh - 1.2, 0.25, 0.08, col, k * W / 5, (Hh - 1.2) / 2, -0.05);
    // windows with warm glow
    for (let k = -2; k <= 2; k++) if (k) b.box(1.3, 1.6, 0.1, 0.1, '#bfe6ff', k * W / 5 + (k > 0 ? -1 : 1) * 1.1, Hh * 0.62, -0.06, 0, 0, 0, 'glow');
    // doorway: big arch, sliding doors, steps, welcome mat
    b.box(4.6, 4.6, 0.6, 0.2, dark, 0, 2.3, -0.2); b.box(3.6, 3.7, 0.7, 0.05, '#1e1b4b', 0, 1.85, -0.2);
    b.tor(1.8, 0.3, col, 0, 3.7, -0.5, 0, 0, 0, 'gloss', Math.PI);
    b.box(5.6, 0.25, 2.2, 0.08, '#e2e8f0', 0, 0.12, -1.2); b.box(3.2, 0.03, 1.4, 0.02, col, 0, 0.26, -1.3);
    for (let k = -1; k <= 1; k += 2) { b.cyl(0.25, 0.3, 4.8, '#f8fafc', k * 2.6, 2.4, -0.6, 0, 0, 0, null, 12); b.sph(0.38, col, k * 2.6, 5.0, -0.6, 1, 1, 1, 0, 0, 0, 'gloss'); }
    sh(b.group(true)).children.forEach((m) => g.add(m));
    // interior glimpse: warm lit hall behind the doors
    const glow = new T.Mesh(new T.PlaneGeometry(3.4, 3.5), new T.MeshBasicMaterial({ color: '#fde68a' })); glow.position.set(0, 1.8, -0.57); glow.rotation.y = Math.PI; g.add(glow);
    const dl = B(), dr = B(); dl.box(1.7, 3.5, 0.12, 0.04, '#93c5fd', 0, 1.8, 0, 0, 0, 0, 'gloss'); dr.box(1.7, 3.5, 0.12, 0.04, '#93c5fd', 0, 1.8, 0, 0, 0, 0, 'gloss');
    dl.box(0.1, 0.6, 0.16, 0.03, '#f8fafc', 0.6, 1.6, 0); dr.box(0.1, 0.6, 0.16, 0.03, '#f8fafc', -0.6, 1.6, 0);
    const L = dl.group(true), Rr = dr.group(true); L.position.set(-0.86, 0, -0.62); Rr.position.set(0.86, 0, -0.62); g.add(L); g.add(Rr);
    // sign + roof icon
    const sg = V.sign(label, 7.2, 1.4, '#1e1b3a', '#ffe14d'); sg.position.set(0, Hh + 0.9, -0.62); sg.rotation.y = Math.PI; g.add(sg);
    const sgb = B(); sgb.box(7.6, 1.8, 0.3, 0.12, col, 0, Hh + 0.9, -0.4); sh(sgb.group(true)).children.forEach((m) => g.add(m));
    const icon = roofIcon(kind, col); if (icon) { icon.position.set(0, Hh + 3.6, Dp / 2); icon.userData.y0 = Hh + 3.6; icon.userData.ph = i; g.add(icon); H.spin.push(icon); }
    VN.add(g);
    // door trigger (world) + collider
    const fx = cx - Math.sin(a) * 1.6, fz = cz - Math.cos(a) * 1.6;
    H.doors.push({ id: kind, label, x: fx, z: fz, a, L, R: Rr, open: 0, sport: sp ? sp.id : null });
    H.cols.push({ x: cx + Math.sin(a) * Dp / 2, z: cz + Math.cos(a) * Dp / 2, r: Dp / 2 + 0.2 }, { x: cx + Math.sin(a) * Dp / 2 + Math.cos(a) * 3, z: cz + Math.cos(a) * Dp / 2 - Math.sin(a) * 3, r: Dp / 2 }, { x: cx + Math.sin(a) * Dp / 2 - Math.cos(a) * 3, z: cz + Math.cos(a) * Dp / 2 + Math.sin(a) * 3, r: Dp / 2 });
    V.tag(glow, label, 'door', 3.2).hide = true;
  }
  function roofIcon(kind, col) {
    const k = { soccer: 'soccer', basketball: 'basket', tennis: 'tennis', volleyball: 'volley', dodgeball: 'dodge', golf: 'golf', tabletennis: 'pingpong' }[kind];
    let g;
    if (k) { g = M.sportBall(k, 1.3); if (kind === 'golf') { const f = B(); f.cyl(0.08, 0.08, 4, '#f8fafc', 1.6, 0.6, 0); f.box(1.4, 0.9, 0.06, 0, '#e11d48', 2.3, 2.1, 0); g.add(f.group(true)); } if (kind === 'tabletennis') { const pd = M.tool('tt', '#e11d48'); pd.scale.setScalar(5); pd.position.set(1.6, -1.2, 0); g.add(pd); } }
    else if (kind === 'bowling') { g = new T.Group(); for (let i = 0; i < 3; i++) { const p = M.pin(); p.scale.setScalar(7); p.position.set((i - 1) * 1.0, -1.4, i === 1 ? -0.5 : 0); g.add(p); } }
    else if (kind === 'badminton') { g = M.sportBall('shuttle', 0.9); g.rotation.z = 0.4; }
    else if (kind === 'archery') { g = new T.Group(); const b = B(); ['#ffffff', '#111827', '#2563eb', '#e11d48', '#facc15'].forEach((c, i) => b.cyl(1.6 - i * 0.32, 1.6 - i * 0.32, 0.2 + i * 0.03, c, 0, 0, 0, Math.PI / 2, 0, 0, null, 28)); g.add(b.group(true)); }
    else if (kind === 'locker') { g = new T.Group(); const b = B(); const tor = new T.LatheGeometry([[0, -0.9], [0.8, -0.9], [0.85, 0.3], [0.95, 0.75], [0.5, 0.95], [0, 0.95]].map((p) => new T.Vector2(p[0], p[1])), 18); tor.scale(1, 1, 0.5); b.geo(tor, '#a855f7'); [-1, 1].forEach((s) => b.cap(0.28, 0.6, '#a855f7', s * 1.0, 0.45, 0, 0, 0, s * 0.9)); b.cyl(0.32, 0.32, 0.06, '#ffe14d', 0, 0.3, 0.42, Math.PI / 2, 0, 0); g.add(b.group(true)); g.userData.spd = 0.8; }
    else if (kind === 'trophy') { g = M.trophy('#facc15', 2.2); g.position.y -= 1; }
    if (g) sh(g); return g;
  }
  // stadium gate to a standalone game
  function gate(g, which) {
    const fc = which === 'fc', col = fc ? '#16a34a' : '#65a30d', col2 = fc ? '#1d4ed8' : '#facc15', title = fc ? '⚽ GROK FC' : '🥒 GROK PICKLEBALL', b = B();
    // two big stadium towers + arch + bowl wall behind
    [-1, 1].forEach((k) => { b.box(2.6, 9, 2.6, 0.5, '#e2e8f0', k * 4.6, 4.5, 0.8); b.box(2.9, 0.8, 2.9, 0.3, col, k * 4.6, 9.2, 0.8); b.cone(1.7, 2.4, col2, k * 4.6, 10.8, 0.8, 0, 0, 0, null, 4); for (let j = 0; j < 4; j++) b.box(0.5, 0.9, 0.1, 0.08, '#bfe6ff', k * 4.6, 2 + j * 1.8, -0.52, 0, 0, 0, 'glow'); });
    b.box(7, 1.4, 1.6, 0.4, col, 0, 8.0, 0.8); b.tor(3.4, 0.4, col2, 0, 4.4, -0.1, 0, 0, 0, 'gloss', Math.PI);
    const bowl = new T.CylinderGeometry(8, 7.4, 6.5, M.low ? 16 : 32, 1, true); b.geo(bowl, '#cbd5e1', 0, 3.25, 10.5);
    for (let j = 0; j < 3; j++) b.tor(7.9 - j * 0.2, 0.18, j % 2 ? col : col2, 0, 1.5 + j * 2, 10.5, Math.PI / 2, 0, 0, null, Math.PI * 2);
    b.box(10, 0.25, 3, 0.1, '#e2e8f0', 0, 0.12, -1.2);
    sh(b.group(true)).children.forEach((m) => g.add(m));
    // swirling portal
    const pm = new T.ShaderMaterial({ uniforms: { t: { value: 0 }, a: { value: new T.Color(col) }, b: { value: new T.Color(col2) } }, side: T.DoubleSide, transparent: true,
      vertexShader: 'varying vec2 vu; void main(){ vu = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float t; uniform vec3 a; uniform vec3 b; varying vec2 vu; void main(){ vec2 p = vu - 0.5; float r = length(p); float an = atan(p.y, p.x); float s = sin(an * 5.0 + r * 18.0 - t * 4.0); vec3 c = mix(a, b, 0.5 + 0.5 * s); c = mix(c, vec3(1.0), smoothstep(0.35, 0.0, r) * 0.6); gl_FragColor = vec4(c, 0.92); }' });
    const portal = new T.Mesh(new T.CircleGeometry(3.0, 40), pm); portal.position.set(0, 4.0, -0.1); portal.scale.y = 1.25; g.add(portal);
    V.anim((dt, t) => { pm.uniforms.t.value = t; });
    const sg = V.sign(title, 8.5, 1.5, col2 === '#facc15' ? '#14532d' : '#1e3a8a', '#ffffff'); sg.position.set(0, 8.0, -0.02); sg.rotation.y = Math.PI; g.add(sg);
    const sub = V.sign('STADIUM GATE · PLAY NOW', 6, 0.7, '#1e1b3a', '#ffe14d'); sub.position.set(0, 0.9 + 6.4, -0.02); sub.rotation.y = Math.PI; sub.visible = true; g.add(sub);
    const a = g.rotation.y, cx = g.position.x, cz = g.position.z;
    H.doors.push({ id: 'gate:' + which, gate: which, label: title, x: cx - Math.sin(a) * 1.4, z: cz - Math.cos(a) * 1.4, a, open: 0 });
    [-1, 1].forEach((k) => H.cols.push({ x: cx + Math.cos(a) * k * 4.6 + Math.sin(a) * 0.8, z: cz - Math.sin(a) * k * 4.6 + Math.cos(a) * 0.8, r: 1.9 }));
    H.cols.push({ x: cx + Math.sin(a) * 10.5, z: cz + Math.cos(a) * 10.5, r: 8 });
    V.tag(portal, title, 'door', 4.2).hide = true;
  }
  /* ---------- trees, benches, lamps, flower beds ---------- */
  function props() {
    const b = B();
    for (let i = 0; i < LAYOUT.length; i++) { const a = ang(i + 0.5), r = R - 3; const x = Math.sin(a) * r, z = Math.cos(a) * r; VN.tree(x, z, 0.9, b); H.cols.push({ x, z, r: 0.6 });
      const lx = Math.sin(a) * 19, lz = Math.cos(a) * 19; b.cyl(0.08, 0.1, 4, '#334155', lx, 2, lz, 0, 0, 0, null, 8); b.sph(0.35, '#fef3c7', lx, 4.1, lz, 1, 1, 1, 0, 0, 0, 'glow', 10, 8); H.cols.push({ x: lx, z: lz, r: 0.3 });
      // bench
      const bx = Math.sin(a) * 15.5, bz = Math.cos(a) * 15.5; b.box(2.2, 0.12, 0.6, 0.05, '#b45309', bx, 0.5, bz, 0, a, 0); b.box(2.2, 0.5, 0.1, 0.04, '#b45309', bx + Math.sin(a) * 0.3, 0.85, bz + Math.cos(a) * 0.3, 0, a, 0); b.box(0.12, 0.5, 0.5, 0.03, '#334155', bx, 0.25, bz, 0, a, 0);
      // flowers
      for (let f = 0; f < 6; f++) { const fa = a + (f - 2.5) * 0.02, fr = 21.5 + (f % 2) * 0.6; b.sph(0.22, ['#f472b6', '#facc15', '#f97316', '#a78bfa'][f % 4], Math.sin(fa) * fr, 0.3, Math.cos(fa) * fr, 1, 0.8, 1, 0, 0, 0, null, 8, 6); b.sph(0.28, '#16a34a', Math.sin(fa) * fr, 0.12, Math.cos(fa) * fr, 1.2, 0.5, 1.2, 0, 0, 0, null, 8, 5); }
    }
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 + 0.05, r = 58 + U.hash(i, 2) * 25; VN.tree(Math.sin(a) * r, Math.cos(a) * r, 1.2 + U.hash(i, 5) * 0.8, b); }
    VN.add(sh(b.group(true)));
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; VN.tower(Math.sin(a) * 50, Math.cos(a) * 50, 16, a); }
  }
  /* ---------- interiors: locker room + trophy hall ---------- */
  function room(o, wall, floor) {
    const b = B(), w = o.w, d = o.d, h = 5;
    b.box(w, 0.2, d, 0, floor, o.x, -0.1, o.z);
    b.box(w, h, 0.3, 0.05, wall, o.x, h / 2, o.z - d / 2); b.box(0.3, h, d, 0.05, wall, o.x - w / 2, h / 2, o.z); b.box(0.3, h, d, 0.05, wall, o.x + w / 2, h / 2, o.z);
    b.box(w / 2 - 1.5, h, 0.3, 0.05, wall, o.x - w / 4 - 0.75, h / 2, o.z + d / 2); b.box(w / 2 - 1.5, h, 0.3, 0.05, wall, o.x + w / 4 + 0.75, h / 2, o.z + d / 2); b.box(3, 1.2, 0.3, 0.05, wall, o.x, h - 0.6, o.z + d / 2);
    b.box(w, 0.2, d, 0, M.lighter(wall, 0.2), o.x, h, o.z);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j += 2) b.box(2.4, 0.08, 0.5, 0.03, '#fffbe6', o.x + i * w / 3.2, h - 0.15, o.z + j * d / 4, 0, 0, 0, 'glow');
    // exit door frame (glowing) on the +z wall
    b.box(3.2, 3.9, 0.35, 0.08, '#facc15', o.x, 1.95, o.z + d / 2 + 0.01); b.box(2.6, 3.5, 0.4, 0.05, '#bae6fd', o.x, 1.75, o.z + d / 2 + 0.02, 0, 0, 0, 'glow');
    const g = b.group(false); g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; }); VN.add(g);
    const ex = V.sign('EXIT TO PLAZA', 2.6, 0.5, '#16a34a', '#ffffff'); ex.position.set(o.x, 3.95, o.z + d / 2 - 0.2); ex.rotation.y = Math.PI; VN.add(ex);
    const pl = new T.PointLight('#fff3d6', 0.8, 30); pl.position.set(o.x, 4, o.z); VN.add(pl);
  }
  function rooms() {
    const L = ROOMS.locker, Tr = ROOMS.trophy;
    room(L, '#7c3aed', '#e2e8f0');
    const b = B();
    // floor stripes + lockers + benches + mirror + style kiosk + clothing racks
    for (let i = 0; i < 8; i++) b.box(L.w - 1, 0.01, 0.12, 0, i % 2 ? '#c4b5fd' : '#a78bfa', L.x, 0.006, L.z - L.d / 2 + 1.2 + i * 1.3);
    for (let i = 0; i < 10; i++) { const x = L.x - L.w / 2 + 1.0 + i * 1.0, cl = ['#2563eb', '#e11d48', '#16a34a', '#f97316', '#0ea5e9'][i % 5]; b.box(0.92, 2.6, 0.7, 0.06, cl, x, 1.3, L.z - L.d / 2 + 0.5); for (let v = 0; v < 3; v++) b.box(0.5, 0.05, 0.02, 0.01, M.darker(cl, 0.2), x, 2.3 - v * 0.12, L.z - L.d / 2 + 0.86); b.box(0.3, 0.18, 0.02, 0.02, '#f8fafc', x, 1.9, L.z - L.d / 2 + 0.86); b.cyl(0.04, 0.04, 0.03, '#cbd5e1', x + 0.3, 1.3, L.z - L.d / 2 + 0.87, Math.PI / 2, 0, 0); }
    [-1, 1].forEach((k) => { b.box(5, 0.14, 0.7, 0.05, '#b45309', L.x + k * 3.5, 0.5, L.z - 1.6); [-2, 0, 2].forEach((q) => b.box(0.12, 0.45, 0.5, 0.03, '#334155', L.x + k * 3.5 + q, 0.22, L.z - 1.6)); });
    b.box(3.2, 3.2, 0.2, 0.1, '#f8fafc', L.x + L.w / 2 - 0.2, 1.9, L.z + 1, 0, -Math.PI / 2, 0); b.box(2.8, 2.8, 0.05, 0.02, '#dbeafe', L.x + L.w / 2 - 0.32, 1.9, L.z + 1, 0, -Math.PI / 2, 0, 'gloss');
    // clothes rack with jerseys
    b.cyl(0.04, 0.04, 3, '#94a3b8', L.x - L.w / 2 + 1.2, 1.9, L.z + 1.5, Math.PI / 2, 0, 0); [-1, 1].forEach((k) => b.cyl(0.04, 0.04, 1.9, '#94a3b8', L.x - L.w / 2 + 1.2, 0.95, L.z + 1.5 + k * 1.5));
    D.SHOP.filter((i) => i.cat === 'shirt').slice(0, 6).forEach((it, i) => { const z = L.z + 0.4 + i * 0.45; b.box(0.08, 0.9, 0.7, 0.05, it.col, L.x - L.w / 2 + 1.2, 1.35, z); b.box(0.08, 0.3, 1.1, 0.05, it.col, L.x - L.w / 2 + 1.2, 1.7, z); });
    VN.add(sh(b.group(true)));
    const k1 = kiosk(L.x + L.w / 2 - 1.6, L.z + 1, -Math.PI / 2, '#a855f7', '🧥 STYLE MIRROR'); H.doors.push({ id: 'style', label: '🧥 CHANGE OUTFIT', x: L.x + L.w / 2 - 2.6, z: L.z + 1, kiosk: true, obj: k1 });
    H.doors.push({ id: 'exit', label: '🚪 BACK TO PLAZA', x: L.x, z: L.z + L.d / 2 - 0.9, exit: 'locker' });
    const sg = V.sign('🧥 LOCKER ROOM', 6, 1.1, '#1e1b3a', '#ffe14d'); sg.position.set(L.x, 3.9, L.z - L.d / 2 + 0.2); VN.add(sg);
    // trophy hall
    room(Tr, '#1e3a8a', '#fef3c7');
    const t = B(); t.box(Tr.w - 2, 0.02, Tr.d - 3, 0.01, '#b91c1c', Tr.x, 0.01, Tr.z + 0.5);
    VN.add(sh(t.group(true)));
    H.trophyGroup = new T.Group(); VN.add(H.trophyGroup); trophies();
    H.recBoard = V.board(9, 3.4, 768); H.recBoard.position.set(Tr.x, 2.9, Tr.z - Tr.d / 2 + 0.2); VN.add(H.recBoard);
    const fr = B(); fr.box(9.6, 4.0, 0.2, 0.1, '#facc15', Tr.x, 2.9, Tr.z - Tr.d / 2 + 0.1); VN.add(sh(fr.group(true)));
    drawRecords();
    H.doors.push({ id: 'records', label: '📋 RECORDS BOARD', x: Tr.x, z: Tr.z - Tr.d / 2 + 2.2, kiosk: true });
    const k2 = kiosk(Tr.x - Tr.w / 2 + 1.5, Tr.z + 3, Math.PI / 2, '#eab308', '🏆 TROPHIES'); H.doors.push({ id: 'trophies', label: '🏆 TROPHY LIST', x: Tr.x - Tr.w / 2 + 2.6, z: Tr.z + 3, kiosk: true, obj: k2 });
    H.doors.push({ id: 'exit', label: '🚪 BACK TO PLAZA', x: Tr.x, z: Tr.z + Tr.d / 2 - 0.9, exit: 'trophy' });
  }
  function kiosk(x, z, ry, col, text) { const b = B(); b.box(1.2, 1.3, 0.8, 0.15, col, 0, 0.65, 0); b.box(1.0, 0.7, 0.1, 0.05, '#0f172a', 0, 1.25, 0.3, -0.5, 0, 0, 'glow'); const g = sh(b.group(true)); g.position.set(x, 0, z); g.rotation.y = ry; VN.add(g); const s = V.sign(text, 1.6, 0.4, '#1e1b3a', '#ffe14d'); s.position.set(0, 1.95, 0); g.add(s); return g; }
  function trophies() {
    const Tr = ROOMS.trophy, s = SP.G.save; H.trophyGroup.clear();
    const tierCol = { easy: '#cd7f32', normal: '#e5e7eb', hard: '#facc15', pro: '#67e8f9' };
    D.SPORTS.forEach((sp, i) => {
      const row = i < 5 ? 0 : 1, k = i % 5, x = Tr.x - 7 + k * 3.5, z = Tr.z - 2.2 + row * 3.6;
      const b = B(); b.cyl(0.6, 0.7, 1.0, '#f8fafc', x, 0.5, z, 0, 0, 0, null, 20); b.cyl(0.66, 0.66, 0.08, sp.col, x, 1.02, z, 0, 0, 0, null, 20); H.trophyGroup.add(sh(b.group(true)));
      const tr = s.trophies[sp.id]; const tm = M.trophy(tr ? tierCol[tr] : '#1f2937', 0.75); tm.position.set(x, 1.1, z); if (!tr) tm.traverse((m) => { if (m.isMesh) { m.material = new T.MeshStandardMaterial({ color: '#111827', roughness: 0.9, transparent: true, opacity: 0.55 }); } });
      tm.userData.y0 = 1.1; tm.userData.ph = i; tm.userData.spd = tr ? 0.9 : 0.2; H.trophyGroup.add(tm); H.spin.push(tm);
      const lb = V.sign(sp.icon + ' ' + sp.n, 2.2, 0.42, tr ? '#14532d' : '#334155', '#ffffff'); lb.position.set(x, 0.6, z + 0.72); H.trophyGroup.add(lb);
      H.cols.push({ x, z, r: 0.85 });
    });
  }
  function drawRecords() {
    if (!H.recBoard) return; const s = SP.G.save;
    H.recBoard.userData.draw(JSON.stringify([s.best, s.trophies, s.xp]), (x, W, Hh) => {
      x.fillStyle = '#0b1230'; x.fillRect(0, 0, W, Hh); x.fillStyle = '#ffe14d'; x.font = '900 34px Arial'; x.textAlign = 'center'; x.fillText('📋 RECORDS BOARD', W / 2, 40);
      x.font = '700 19px Arial'; x.textAlign = 'left';
      D.SPORTS.forEach((sp, i) => { const col = i < 5 ? 0 : 1, row = i % 5, X = 20 + col * W / 2, Y = 82 + row * 52; const b = s.best[sp.id] || {}, ks = Object.keys(b), rk = D.rankOf(s.xp[sp.id] || 0);
        x.fillStyle = sp.col; x.fillRect(X, Y - 20, 8, 40); x.fillStyle = '#fff'; x.font = '900 20px Arial'; x.fillText(sp.icon + ' ' + sp.n + '  ' + rk.rank.icon + ' ' + rk.rank.n, X + 16, Y - 2);
        x.fillStyle = '#a5f3fc'; x.font = '700 16px Arial'; x.fillText(ks.length ? (ks[0] + ': ' + b[ks[0]]).slice(0, 38) : 'No record yet - go play!', X + 16, Y + 18); });
    });
  }
  function drawBoard() {
    const s = SP.G.save; SP.G.checkDaily();
    H.board.userData.draw(JSON.stringify([s.daily, s.coins]), (x, W, Hh) => {
      const gr = x.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#1e3a8a'); gr.addColorStop(1, '#0b1230'); x.fillStyle = gr; x.fillRect(0, 0, W, Hh);
      x.textAlign = 'center'; x.fillStyle = '#ffe14d'; x.font = '900 30px Arial'; x.fillText('GROK SPORTS COMMAND', W / 2, 36);
      x.fillStyle = '#fff'; x.font = '800 20px Arial'; x.fillText("📅 TODAY'S CHALLENGES", W / 2, 70);
      x.font = '700 18px Arial'; s.daily.list.forEach((id, i) => { const c = D.DAILY.find((q) => q.id === id); if (!c) return; const done = s.daily.done.indexOf(id) >= 0; x.fillStyle = done ? '#4ade80' : '#a5f3fc'; x.fillText((done ? '✅ ' : '🎯 ') + c.text + ' (+' + c.reward + ')', W / 2, 102 + i * 30); });
    });
  }
  /* ---------- wandering athletes ---------- */
  function npcs() {
    const n = M.low ? 3 : 6;
    for (let i = 0; i < n; i++) { const lk = D.aiLook(i * 13 + 5); lk.tool = ['racket', 'none', 'badminton', 'none', 'tt', 'none'][i % 6]; const m = M.athlete(lk); if (!M.low) M.outline(m); sh(m); VN.add(m); const a = i / n * Math.PI * 2; H.npcs.push({ m, x: Math.sin(a) * 17, z: Math.cos(a) * 17, tx: 0, tz: 0, ry: 0, wait: i, a: 'idle', at: 0 }); }
  }
  /* ---------- avatar ---------- */
  H.rebuildAvatar = function () {
    if (H.av) V.world.remove(H.av);
    const lk = D.lookOf(SP.G.save.look); lk.tool = 'none'; H.av = M.athlete(lk); if (!M.low) M.outline(H.av); sh(H.av);
    const rg = new T.Mesh(new T.RingGeometry(0.42, 0.55, 28), new T.MeshBasicMaterial({ color: '#ffe14d', transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide })); rg.rotation.x = -Math.PI / 2; rg.position.y = 0.04; H.av.add(rg);
    V.world.add(H.av); if (H.trophyGroup) trophies(); drawRecords(); if (H.board) drawBoard();
  };
  H.enter = function (spot) {
    SP.Snd.setMusic('hub'); H.build();
    if (!H.av || !H.av.parent) H.rebuildAvatar();
    V.env(VN.ENV.day);
    H.area = 'plaza'; const d = spot && H.doors.find((q) => q.id === spot || q.sport === spot);
    if (d && !d.kiosk && !d.exit) { H.p.x = d.x - Math.sin(d.a) * 2.5; H.p.z = d.z - Math.cos(d.a) * 2.5; H.p.ry = d.a + Math.PI; }
    else if (spot === 'locker' || spot === 'trophy') { H.goto(spot, true); }
    else { H.p.x = 0; H.p.z = -12; H.p.ry = Math.PI; }
    H.cooldown = 1.0; H.camSnap = true; drawBoard(); drawRecords(); trophies();
    SP.UI.show('hubHud', true); SP.Input.setJoy(true); SP.Input.joyAll = true; SP.Input.h = H.input; SP.Input.enabled = true;
    document.getElementById('where').textContent = 'Walk with the joystick · walk into a door to go inside';
  };
  H.goto = function (where, instant) {
    const go = () => {
      if (where === 'plaza') { const d = H.doors.find((q) => q.id === H.area && !q.kiosk); H.area = 'plaza'; if (d) { H.p.x = d.x - Math.sin(d.a) * 2.6; H.p.z = d.z - Math.cos(d.a) * 2.6; H.p.ry = d.a + Math.PI; } document.getElementById('where').textContent = 'Walk with the joystick · walk into a door to go inside'; }
      else { const r = ROOMS[where]; H.area = where; H.p.x = r.x; H.p.z = r.z + r.d / 2 - 2.2; H.p.ry = Math.PI; document.getElementById('where').textContent = where === 'locker' ? 'Walk to the 🧥 STYLE MIRROR to change your outfit' : 'Look at your trophies · walk to the 📋 board for records'; }
      H.cooldown = 0.8; H.camSnap = true; SP.Snd.fx('door');
    };
    if (instant) { go(); return; }
    const f = document.getElementById('fade'); f.classList.add('on'); setTimeout(() => { go(); f.classList.remove('on'); }, 250);
  };
  H.input = {
    move: (e) => { const b = SP.E.camBasis(); H.mv.x = b.rx * e.x - b.fx * e.y; H.mv.z = b.rz * e.x - b.fz * e.y; },
    tap: () => { if (H.near) H.useDoor(); }, swipe: () => {}, down: () => {}, drag: () => {}, up: () => {}, pause: () => SP.UI.menu()
  };
  H.useDoor = function () {
    const d = H.near; if (!d || SP.UI.open) return; SP.Snd.fx('door');
    if (d.exit) { H.goto('plaza'); return; }
    if (d.gate) { H.portal(d.gate); return; }
    if (d.id === 'locker' || d.id === 'trophy') { H.goto(d.id); return; }
    if (d.id === 'style') { SP.UI.locker(); return; }
    if (d.id === 'records') { SP.UI.records(); return; }
    if (d.id === 'trophies') { SP.UI.trophies(); return; }
    if (d.sport) { H.mv.x = 0; H.mv.z = 0; SP.UI.setup(d.sport); }
  };
  H.portal = function (which) {
    const url = H.URLS[which], nm = which === 'fc' ? '⚽ GROK FC' : '🥒 GROK PICKLEBALL';
    SP.UI.panel('<h2>' + nm + '</h2><p class="sub">This stadium gate takes you to the full ' + nm + ' game. Use its Arcade link (or your browser\u2019s back button) to come back to Sports Command.</p><div class="btnrow"><button class="btn alt" data-close>STAY HERE</button><button class="btn primary big" id="bGo">GO! 🏟️</button></div>', (c) => {
      c.querySelector('#bGo').addEventListener('click', () => { H.lastPortal = url; SP.UI.close(); H.navigate(url); });
    }, { name: 'portal' });
  };
  H.navigate = function (url) { location.href = url; };
  /* ---------- update ---------- */
  const _ct = new T.Vector3();
  H.update = function (dt, title) {
    if (!H.built) return; const p = H.p;
    H.doors.forEach((d) => { if (!d.L) return; const dist = Math.hypot(p.x - d.x, p.z - d.z), o = H.area === 'plaza' && dist < 6 ? 1 : 0; d.open += (o - d.open) * Math.min(1, dt * 5); d.L.position.x = -0.86 - d.open * 1.5; d.R.position.x = 0.86 + d.open * 1.5; });
    H.npcs.forEach((n, i) => { n.at += dt; if (n.wait > 0) { n.wait -= dt; n.a = Math.hypot(n.x - p.x, n.z - p.z) < 4 ? 'wave' : 'idle'; if (n.a === 'wave') n.ry = U.lerpAng(n.ry, Math.atan2(p.x - n.x, p.z - n.z), dt * 5); if (n.wait <= 0) { const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 10; n.tx = Math.sin(a) * r; n.tz = Math.cos(a) * r; } }
      else { const left = SP.Ph.moveTo(n, n.tx, n.tz, 2.2, dt); n.a = 'run'; if (left < 0.1) n.wait = 2 + Math.random() * 4; }
      n.m.position.set(n.x, 0, n.z); n.m.rotation.y = n.ry; SP.Pose.apply(n.m, dt, { a: n.a === 'run' ? 'idle' : n.a, at: n.at, sp: n.a === 'run' ? 2.2 : 0 }, V.t + i); });
    if (title) { const t = V.t * 0.08; E_cam(Math.sin(t) * 26, 13, Math.cos(t) * 26, 0, 3, 0, dt, true); H.av.position.set(0, -50, 0); return; }
    if (SP.UI.open) { H.mv.x = 0; H.mv.z = 0; }
    // walk
    const m = Math.hypot(H.mv.x, H.mv.z), spd = 6.2;
    if (m > 0.05) { p.x += H.mv.x * spd * dt; p.z += H.mv.z * spd * dt; p.ry = U.lerpAng(p.ry, Math.atan2(H.mv.x, H.mv.z), Math.min(1, dt * 12)); }
    if (H.area === 'plaza') { const r = Math.hypot(p.x, p.z); if (r > R + 2) { p.x *= (R + 2) / r; p.z *= (R + 2) / r; } const c = U.collide(null, p.x, p.z, 0.4, null, H.cols); p.x = c.x; p.z = c.z; }
    else { const rm = ROOMS[H.area]; p.x = U.clamp(p.x, rm.x - rm.w / 2 + 0.7, rm.x + rm.w / 2 - 0.7); p.z = U.clamp(p.z, rm.z - rm.d / 2 + 1.2, rm.z + rm.d / 2 - 0.6); const c = U.collide(null, p.x, p.z, 0.4, null, H.cols); p.x = c.x; p.z = c.z; }
    H.av.position.set(p.x, 0, p.z); H.av.rotation.y = p.ry; p.at += dt; SP.Pose.apply(H.av, dt, { a: 'idle', at: p.at, sp: m > 0.05 ? spd * m : 0 }, V.t);
    // nearest door / kiosk
    H.cooldown = Math.max(0, (H.cooldown || 0) - dt);
    let near = null, nd = 99; H.doors.forEach((d) => { const inRoom = d.kiosk || d.exit ? (d.exit ? d.exit === H.area : H.area !== 'plaza' && Math.abs(d.x - p.x) < 40) : H.area === 'plaza'; if (!inRoom) return; const dd = Math.hypot(p.x - d.x, p.z - d.z); if (dd < nd) { nd = dd; near = d; } });
    const lim = near && (near.kiosk ? 1.8 : near.exit ? 1.6 : 3.2);
    H.near = near && nd < lim ? near : null;
    const btn = document.getElementById('doorBtn');
    if (H.near) { btn.classList.remove('hidden'); btn.textContent = (H.near.sport || H.near.gate || H.near.id === 'locker' || H.near.id === 'trophy' ? 'ENTER ' : '') + H.near.label; } else btn.classList.add('hidden');
    // walking right into a doorway enters automatically
    if (H.near && !H.near.kiosk && nd < 1.3 && H.cooldown <= 0 && !SP.UI.open && m > 0.05) { H.cooldown = 2.5; H.useDoor(); }
    V.tags.forEach((t) => { if (t.el.className.indexOf('door') >= 0) { t.obj.getWorldPosition(_ct); t.hide = H.area !== 'plaza' || Math.hypot(_ct.x - p.x, _ct.z - p.z) > 16; } });
    // camera: behind the avatar, looking outward from the plaza centre (inside rooms: from the door side)
    let cx, cz, lx, lz;
    if (H.area === 'plaza') { const r = Math.hypot(p.x, p.z); let ox = r > 4 ? p.x / r : Math.sin(H.camA || 0), oz = r > 4 ? p.z / r : Math.cos(H.camA || Math.PI); if (r <= 4) { ox = 0; oz = -1; } H.camA = Math.atan2(ox, oz);
      cx = p.x - ox * 9.5; cz = p.z - oz * 9.5; lx = p.x + ox * 7; lz = p.z + oz * 7; E_cam(cx, 6.8, cz, lx, 2.2, lz, dt, H.camSnap); }
    else { const rm = ROOMS[H.area]; cx = U.clamp(p.x, rm.x - rm.w / 2 + 2, rm.x + rm.w / 2 - 2); cz = Math.min(p.z + 6, rm.z + rm.d / 2 - 0.4); E_cam(cx, 5.4, cz, p.x, 0.9, p.z - 4, dt, H.camSnap); }
    H.camSnap = false;
  };
  function E_cam(px, py, pz, tx, ty, tz, dt, snap) { SP.E.fov(58); SP.E.camLook(px, py, pz, tx, ty, tz, dt, 6, snap); }
})();

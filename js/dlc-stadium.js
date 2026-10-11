/* Grok Sports Command - DLC Ratita Stadium Night (issue #39): the night stadium area off the plaza (gate by the
   fountain), 4 sport stations, the Ratita Cup tournament desk + cup trophies, locked gate for players without the DLC */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, D = SP.D, M = SP.M, V = SP.V, VN = SP.Venue, ST = SP.Stadium, H = SP.Hub, UI = SP.UI, G = SP.G, E = SP.E, T = THREE;
  const esc = U.esc, $ = (id) => document.getElementById(id);
  const AREA = H.ROOMS.stadium = { x: 0, z: 600, w: 88, d: 66, outdoor: true };
  AREA.cam = (p, dt, snap, cam) => cam(p.x, 7.4, p.z + 10.5, p.x, 1.2, p.z - 5, dt, snap);
  const SZ = AREA.z, GATE_A = Math.PI / 2, GATE_R = 17;
  const ARCADE = 'https://lizethbran13-cmyk.github.io/grok-arcade/';
  const WHERE = 'Ratita Stadium Night · walk onto a glowing ring to play';
  const STATIONS = [
    { sport: 'hockey', x: -22, z: -12, col: '#38bdf8' }, { sport: 'curling', x: 22, z: -12, col: '#facc15' },
    { sport: 'glowgolf', x: -22, z: 13, col: '#a855f7' }, { sport: 'mascot', x: 22, z: 13, col: '#f472b6' }
  ];
  const B = () => new M.B();
  const sh = (g) => { g.traverse((m) => { if (m.isMesh) { m.castShadow = !M.low; m.receiveShadow = true; } }); return g; };

  /* ---------- plaza gate (east of the fountain) ---------- */
  function gate() {
    const g = new T.Group(), cx = Math.sin(GATE_A) * GATE_R, cz = Math.cos(GATE_A) * GATE_R, b = B(), own = D.dlcOwned();
    g.position.set(cx, 0, cz); g.rotation.y = GATE_A;
    [-1, 1].forEach((k) => { b.box(1.3, 6.2, 1.3, 0.3, '#1e1b4b', k * 2.7, 3.1, 0.3); b.box(1.5, 0.5, 1.5, 0.2, '#facc15', k * 2.7, 6.3, 0.3); b.cone(0.9, 1.3, '#7c3aed', k * 2.7, 7.2, 0.3, 0, 0, 0, null, 4);
      for (let j = 0; j < 3; j++) b.sph(0.18, ['#f472b6', '#38bdf8', '#facc15'][j], k * 2.7, 1.6 + j * 1.5, -0.37, 1, 1, 0.5, 0, 0, 0, 'glow', 10, 8); });
    b.box(6.6, 1.1, 1.0, 0.3, '#1e1b4b', 0, 5.6, 0.3); b.tor(2.3, 0.22, '#facc15', 0, 3.6, -0.15, 0, 0, 0, 'gloss', Math.PI);
    b.geo(new T.TorusGeometry(0.55, 0.2, 10, 24, Math.PI * 1.15), '#fef08a', 2.1, 8.2, 0.3, 0, 0, Math.PI * 0.42, 1, 1, 0.7, 'glow');   // crescent moon
    for (let i = 0; i < 6; i++) b.sph(0.12, '#ffffff', -2.4 + i * 0.8, 6.55 + (i % 2) * 0.3, -0.25, 1, 1, 1, 0, 0, 0, 'glow', 6, 4);
    b.box(7.2, 0.2, 2.6, 0.08, '#334155', 0, 0.1, -0.9);
    sh(b.group(true)).children.forEach((m) => g.add(m));
    // night portal: stars swirling in the archway
    const pm = new T.ShaderMaterial({ uniforms: { t: { value: 0 }, lock: { value: own ? 0 : 1 } }, side: T.DoubleSide, transparent: true,
      vertexShader: 'varying vec2 vu; void main(){ vu = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float t; uniform float lock; varying vec2 vu; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); } void main(){ vec2 p = vu - 0.5; float r = length(p); float an = atan(p.y, p.x); vec3 c = mix(vec3(0.02,0.04,0.16), vec3(0.25,0.1,0.45), 0.5 + 0.5 * sin(an * 3.0 + r * 14.0 - t * 2.0)); vec2 q = floor((vec2(an * 6.0, r * 30.0 - t * 3.0))); float s = step(0.93, h(q)); c += vec3(1.0, 0.95, 0.7) * s * (1.0 - r * 1.5); c = mix(c, vec3(0.2), lock * 0.55); gl_FragColor = vec4(c, 0.95); }' });
    const portal = new T.Mesh(new T.CircleGeometry(2.1, 40), pm); portal.position.set(0, 3.2, -0.05); portal.scale.y = 1.45; portal.rotation.y = Math.PI; g.add(portal);
    V.anim((dt, t) => { pm.uniforms.t.value = t; });
    const sg = V.sign('🌙 RATITA STADIUM NIGHT', 6.4, 1.0, '#1e1b4b', '#ffe14d'); sg.position.set(0, 5.6, -0.22); sg.rotation.y = Math.PI; g.add(sg);
    const sub = V.sign(own ? 'NIGHT GAMES · PLAY NOW' : '🔒 DLC · UNLOCK AT THE ARCADE', 4.6, 0.55, own ? '#7c3aed' : '#475569', '#ffffff'); sub.position.set(0, 4.75, -0.82); sub.rotation.y = Math.PI; g.add(sub);
    const rat = ST.ratitaStatue(0.55); rat.position.set(-3.9, 0, -1.4); rat.rotation.y = Math.PI - 0.5; g.add(sh(rat)); V.anim((dt, t) => { rat.userData.head.rotation.z = Math.sin(t * 2.2) * 0.18; });
    VN.add(g); g.updateMatrixWorld(true);
    const w = (x, z) => new T.Vector3(x, 0, z).applyMatrix4(g.matrixWorld);
    [-1, 1].forEach((k) => { const q = w(k * 2.7, 0.3); H.cols.push({ x: q.x, z: q.z, r: 1.0 }); }); const rq = w(-3.9, -1.4); H.cols.push({ x: rq.x, z: rq.z, r: 0.9 });
    H.doors.push({ id: 'stadium', label: '🌙 RATITA STADIUM', x: cx - Math.sin(GATE_A) * 1.3, z: cz - Math.cos(GATE_A) * 1.3, a: GATE_A, open: 0 });
    V.tag(portal, own ? '🌙 RATITA STADIUM' : '🔒 RATITA STADIUM', 'door', 3.4).hide = true;
  }

  /* ---------- the stadium area ---------- */
  let jumbo = null, cupGroup = null;
  function stadium(kit) {
    const root = new T.Group(); root.position.set(AREA.x, 0, SZ); VN.add(root); stRoot = root; farList = null;
    const v = ST.venue(AREA.w - 4, AREA.d - 4, { parent: root, gap: 3, rows: M.low ? 6 : 9, jumbo: [0, 14, -(AREA.d / 2 + 3 + (M.low ? 6 : 9) * 0.85 + 1.5), 0] }); jumbo = v.userData.jumbo;
    const b = B(), Wf = AREA.w - 4, Lf = AREA.d - 4;
    // field: striped grass, white lines, centre circle, Ratita cheese logo, the walkway from the exit gate
    for (let i = 0; i < 12; i++) b.box(Wf, 0.04, Lf / 12, 0, i % 2 ? '#166534' : '#15803d', 0, -0.02, -Lf / 2 + (i + 0.5) * Lf / 12);
    VN.rect(-Wf / 2 + 1, -Lf / 2 + 1, Wf / 2 - 1, Lf / 2 - 1).concat([[0, -Lf / 2 + 1, 0, Lf / 2 - 1]]).forEach((s2) => { const dx = s2[2] - s2[0], dz = s2[3] - s2[1], L = Math.hypot(dx, dz); b.box(0.14, 0.012, L, 0, '#f8fafc', (s2[0] + s2[2]) / 2, 0.006, (s2[1] + s2[3]) / 2, 0, Math.atan2(dx, dz), 0); });
    const cr = new T.RingGeometry(6.8, 7.0, 48); cr.rotateX(-Math.PI / 2); b.geo(cr, '#f8fafc', 0, 0.008, 0);
    b.box(4, 0.02, 14, 0, '#334155', 0, 0.004, Lf / 2 - 7);
    // station pads: glowing rings where you stand to play
    STATIONS.forEach((s2) => { const g2 = new T.TorusGeometry(1.5, 0.09, 8, 32); g2.rotateX(Math.PI / 2); b.geo(g2, s2.col, s2.x, 0.06, s2.z + 5.2, 0, 0, 0, 1, 1, 1, 'glow'); b.cyl(1.4, 1.4, 0.03, M.darker(s2.col, 0.3), s2.x, 0.02, s2.z + 5.2, 0, 0, 0, null, 28); });
    const g3 = new T.TorusGeometry(1.5, 0.09, 8, 32); g3.rotateX(Math.PI / 2); b.geo(g3, '#facc15', 0, 0.06, 1.6, 0, 0, 0, 1, 1, 1, 'glow');
    const m = b.group(false); m.traverse((q) => { if (q.isMesh) q.receiveShadow = true; }); root.add(m);
    STATIONS.forEach((s2) => station(root, s2));
    // Ratita Cup podium + giant cheese cup + the cup case
    const pb = B(); [[0, 1.2, '#e5e7eb'], [-2.2, 0.8, '#cbd5e1'], [2.2, 0.55, '#cd7f32']].forEach((q, i) => { pb.box(2.1, q[1], 2.1, 0.12, q[2], q[0], q[1] / 2, -4); pb.box(0.8, 0.02, 0.5, 0, '#1e1b4b', q[0], q[1] + 0.012, -2.94); void i; });
    pb.box(4.2, 1.1, 1.1, 0.15, '#7c3aed', 0, 0.55, -0.4); pb.box(4.0, 0.08, 1.0, 0.03, '#facc15', 0, 1.12, -0.4, 0, 0, 0, 'gloss');
    root.add(sh(pb.group(true)));
    const cup = ST.cheeseCup('#facc15', 1.6); cup.position.set(0, 1.25, -4); root.add(sh(cup)); H.spin.push(cup); cup.userData.y0 = 1.25; cup.userData.ph = 0; cup.userData.spd = 0.7;
    const cs = V.sign('🏆 RATITA CUP', 4.2, 0.8, '#1e1b4b', '#ffe14d'); cs.position.set(0, 1.05, 0.16); root.add(cs);
    cupGroup = new T.Group(); cupGroup.position.set(0, 0, -9); root.add(cupGroup); drawCups();
    const big = ST.ratitaStatue(2.2); big.position.set(0, 0, -Lf / 2 + 5); root.add(sh(big)); V.anim((dt, t) => { big.rotation.y = Math.sin(t * 0.5) * 0.4; big.userData.head.rotation.z = Math.sin(t * 1.6) * 0.1; });
    // exit gate (south)
    const eb = B(); [-1, 1].forEach((k) => { eb.box(0.8, 4.2, 0.8, 0.15, '#1e1b4b', k * 2.4, 2.1, Lf / 2 + 0.6); eb.sph(0.35, '#facc15', k * 2.4, 4.5, Lf / 2 + 0.6, 1, 1, 1, 0, 0, 0, 'glow'); }); eb.box(5.6, 0.7, 0.7, 0.15, '#7c3aed', 0, 4.2, Lf / 2 + 0.6);
    eb.box(3.8, 3.4, 0.2, 0.05, '#bae6fd', 0, 1.7, Lf / 2 + 0.9, 0, 0, 0, 'glow'); root.add(sh(eb.group(true)));
    const ex = V.sign('EXIT TO PLAZA', 3.4, 0.55, '#16a34a', '#ffffff'); ex.position.set(0, 4.2, Lf / 2 + 0.24); ex.rotation.y = Math.PI; root.add(ex);
    // dancing mascots on the sideline
    H.stadNpcs = []; ['kitty', 'pup', 'frog'].forEach((k, i) => { const lk = D.aiLook(90 + i, ST.MASCOTS[k].shirt); lk.tool = 'none'; const am = ST.dress(M.athlete(lk), k); if (!M.low) M.outline(am); sh(am); am.position.set(-10 + i * 10, 0, Lf / 2 - 12); am.rotation.y = Math.PI * 0.9; root.add(am); H.stadNpcs.push(am); });
    // colliders + doors (world coords)
    const wx = (x) => AREA.x + x, wz = (z) => SZ + z;
    STATIONS.forEach((s2) => { H.cols.push({ x: wx(s2.x), z: wz(s2.z), r: 4.2 }); const sp = D.sport(s2.sport); H.doors.push({ id: 'st_' + s2.sport, sport: s2.sport, label: sp.icon + ' ' + sp.n.toUpperCase(), x: wx(s2.x), z: wz(s2.z + 5.2), kiosk: true, r: 1.7, area: 'stadium' }); });
    H.cols.push({ x: wx(0), z: wz(-4), r: 3.0 }, { x: wx(0), z: wz(-Lf / 2 + 5), r: 3.5 }, { x: wx(-2.4), z: wz(Lf / 2 + 0.6), r: 0.6 }, { x: wx(2.4), z: wz(Lf / 2 + 0.6), r: 0.6 }, { x: wx(-3.6), z: wz(-9), r: 0.7 }, { x: wx(-1.2), z: wz(-9), r: 0.7 }, { x: wx(1.2), z: wz(-9), r: 0.7 }, { x: wx(3.6), z: wz(-9), r: 0.7 });
    H.doors.push({ id: 'cup', label: '🏆 RATITA CUP', x: wx(0), z: wz(1.6), kiosk: true, r: 1.7, area: 'stadium' });
    H.doors.push({ id: 'cupcase', label: '🏆 STADIUM TROPHIES', x: wx(0), z: wz(-7.2), kiosk: true, r: 1.4, area: 'stadium' });
    H.doors.push({ id: 'exit', label: '🚪 BACK TO PLAZA', x: wx(0), z: wz(AREA.d / 2 - 0.9), exit: 'stadium' });
    drawJumbo(); void kit;
    V.anim((dt, t) => { if (H.area !== 'stadium') return; H.stadNpcs.forEach((am, i) => SP.Pose.apply(am, dt, { a: 'dance', at: t, sp: 0 }, t + i)); });
  }
  // a little 3D model of each sport at its station
  function station(root, s2) {
    const g = new T.Group(), b = B(); g.position.set(s2.x, 0, s2.z); const sp = D.sport(s2.sport);
    b.box(9, 0.3, 7, 0.15, '#1e293b', 0, 0.15, 0); b.box(9.2, 0.08, 7.2, 0.05, s2.col, 0, 0.32, 0, 0, 0, 0, 'glow');
    if (s2.sport === 'hockey') { b.box(7.6, 0.06, 5.2, 0.3, '#eaf6ff', 0, 0.38, 0, 0, 0, 0, 'gloss'); [-1, 1].forEach((k) => { b.box(7.6, 0.45, 0.12, 0.04, '#f8fafc', 0, 0.6, k * 2.6); b.box(0.12, 0.45, 5.2, 0.04, '#f8fafc', k * 3.8, 0.6, 0); b.box(0.1, 0.02, 5.0, 0, k > 0 ? '#2563eb' : '#2563eb', k * 1.3, 0.42, 0); b.cyl(0.04, 0.04, 0.6, '#dc2626', k * 3.4, 0.7, -0.5, 0, 0, 0, null, 6); b.cyl(0.04, 0.04, 0.6, '#dc2626', k * 3.4, 0.7, 0.5, 0, 0, 0, null, 6); b.cyl(0.04, 0.04, 1.0, '#dc2626', k * 3.4, 1.0, 0, Math.PI / 2, 0, 0, null, 6); }); b.box(0.1, 0.02, 5.0, 0, '#dc2626', 0, 0.42, 0); b.cyl(0.16, 0.16, 0.06, '#111827', 0.6, 0.45, 0.4, 0, 0, 0, null, 14); }
    if (s2.sport === 'curling') { b.box(7.8, 0.06, 2.0, 0.1, '#eef7ff', 0, 0.38, 0, 0, 0, 0, 'gloss'); [[0.85, '#2563eb'], [0.57, '#f8fafc'], [0.3, '#f59e0b']].forEach((q, i) => { const cg = new T.CircleGeometry(q[0], 28); cg.rotateX(-Math.PI / 2); b.geo(cg, q[1], -2.6, 0.42 + i * 0.002, 0); }); [[-2.2, 0.3, '#facc15'], [-3.0, -0.4, '#fb923c'], [0.6, 0.1, '#facc15']].forEach((q) => { b.cyl(0.26, 0.25, 0.2, q[2], q[0], 0.52, q[1], 0, 0, 0, 'gloss', 20); b.cyl(0.03, 0.03, 0.12, '#1f2937', q[0], 0.68, q[1], 0, 0, 0, null, 8); }); }
    if (s2.sport === 'glowgolf') { [[-2.4, -1.2, 3.6, 1.6], [1.4, 0.6, 3.6, 1.6]].forEach((q, i) => { b.box(q[2], 0.08, q[3], 0.05, '#3b0764', q[0], 0.4, q[1], 0, i * 0.4, 0); b.box(q[2] + 0.2, 0.18, 0.1, 0.03, '#22d3ee', q[0], 0.48, q[1] + q[3] / 2, 0, i * 0.4, 0, 'glow'); b.box(q[2] + 0.2, 0.18, 0.1, 0.03, '#f0abfc', q[0], 0.48, q[1] - q[3] / 2, 0, i * 0.4, 0, 'glow'); }); [[-1.6, -1.2], [2.3, 0.9]].forEach((q) => { b.cyl(0.25, 0.25, 0.2, '#f472b6', q[0], 0.5, q[1], 0, 0, 0, 'glow', 14); }); b.cyl(0.03, 0.03, 1.4, '#f8fafc', 2.9, 1.1, 1.2, 0, 0, 0, null, 6); b.box(0.5, 0.32, 0.02, 0, '#fde047', 3.15, 1.6, 1.2, 0, 0, 0, 'glow'); }
    if (s2.sport === 'mascot') { for (let l = 0; l < 4; l++) b.box(7.8, 0.04, 1.0, 0, l % 2 ? '#c2410c' : '#b13b0b', 0, 0.38, -1.6 + l * 1.05); for (let l = 0; l < 5; l++) b.box(7.8, 0.045, 0.05, 0, '#fff7ed', 0, 0.39, -2.12 + l * 1.05); for (let k = 0; k < 8; k++) b.box(0.13, 0.05, 0.13, 0, k % 2 ? '#111827' : '#f8fafc', 3.2, 0.4, -2.0 + k * 0.53);
      [-1, 1].forEach((k) => { const sh2 = new T.Shape(); sh2.moveTo(-0.45, 0); sh2.lineTo(0.45, 0); sh2.lineTo(-0.45, 0.3); sh2.lineTo(-0.45, 0); b.geo(new T.ExtrudeGeometry(sh2, { depth: 0.18, bevelEnabled: false }), '#facc15', k * 1.3, 0.4, -0.6 + k * 0.6, 0, Math.PI / 2, 0, 1, 1, 1, 'gloss'); }); }
    // signboard on two posts
    [-1, 1].forEach((k) => b.cyl(0.09, 0.09, 3.6, '#94a3b8', k * 2.7, 1.8, -3.0, 0, 0, 0, null, 8)); b.box(6.0, 1.2, 0.2, 0.08, s2.col, 0, 3.6, -3.05, 0, 0, 0, 'gloss');
    sh(b.group(true)).children.forEach((q) => g.add(q));
    const sg = V.sign(sp.icon + ' ' + sp.n.toUpperCase(), 5.6, 0.95, '#0b1230', '#ffe14d'); sg.position.set(0, 3.6, -2.93); g.add(sg);
    if (s2.sport === 'mascot') ['ratita', 'kitty'].forEach((k, i) => { const hd = ST.mascotHead(k, 1.3); hd.position.set(-2.6 + i * 1.6, 1.4, 1.2); hd.rotation.y = 0.3; g.add(hd); H.spin.push(hd); hd.userData.y0 = 1.4; hd.userData.ph = i * 2; hd.userData.spd = 0.4; });
    if (s2.sport === 'hockey') { const st = M.tool('stick', '#e11d48'); st.position.set(-1.5, 1.6, 0.4); st.rotation.z = 0.9; st.scale.setScalar(1.4); g.add(st); }
    root.add(g);
  }
  function drawCups() {
    if (!cupGroup) return; cupGroup.clear(); const s = G.save, wins = s.cupWins || {};
    D.DIFF_ORDER.forEach((k, i) => { const x = -3.6 + i * 2.4, b = B(); b.cyl(0.55, 0.65, 1.0, '#f8fafc', x, 0.5, 0, 0, 0, 0, null, 20); b.cyl(0.6, 0.6, 0.08, D.CUP_TIERS[k][1], x, 1.02, 0, 0, 0, 0, null, 20); cupGroup.add(sh(b.group(true)));
      const c = ST.cheeseCup(wins[k] ? D.CUP_TIERS[k][1] : '#1f2937', 0.7); c.position.set(x, 1.1, 0); if (!wins[k]) c.traverse((q) => { if (q.isMesh) q.material = new T.MeshStandardMaterial({ color: '#111827', roughness: 0.9, transparent: true, opacity: 0.55 }); }); cupGroup.add(c);
      const lb = V.sign(D.CUP_TIERS[k][0], 1.6, 0.36, wins[k] ? '#14532d' : '#334155', '#ffffff'); lb.position.set(x, 0.55, 0.67); cupGroup.add(lb); });
  }
  function drawJumbo() {
    if (!jumbo) return; const s = G.save, c = s.cup || {};
    jumbo.userData.draw(JSON.stringify([c, s.cupWins]), (x, W, Hh) => {
      const gr = x.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#1e1b4b'); gr.addColorStop(1, '#3b0764'); x.fillStyle = gr; x.fillRect(0, 0, W, Hh);
      x.textAlign = 'center'; x.fillStyle = '#ffe14d'; x.font = '900 34px Arial'; x.fillText('🌙 RATITA STADIUM NIGHT', W / 2, 46);
      x.fillStyle = '#fff'; x.font = '800 22px Arial'; x.fillText('🏒 Hockey · 🧀 Cheese Curling · 🌟 Glow Golf · 🐭 Mascot Race', W / 2, 92);
      x.fillStyle = '#a5f3fc'; x.font = '800 24px Arial'; x.fillText(c.on ? '🏆 RATITA CUP · event ' + (c.i + 1) + '/4 · YOU ' + c.me + ' - ' + c.cpu + ' CPU' : '🏆 Win the RATITA CUP at the podium!', W / 2, 140);
      const won = D.DIFF_ORDER.filter((k) => (s.cupWins || {})[k]).map((k) => D.CUP_TIERS[k][0]); x.fillStyle = '#fde68a'; x.font = '700 20px Arial'; x.fillText(won.length ? 'Cups won: ' + won.join(', ') : 'No cups yet', W / 2, 180);
    });
  }
  /* ---------- hub hooks ---------- */
  H.ext = {
    slotA: GATE_A,
    build: function (kit) { gate(); stadium(kit); },
    enter: function (spot, d) {
      if (!(spot === 'stadium' || (d && d.area === 'stadium'))) return false;
      if (!D.dlcOwned()) return false;
      H.area = 'stadium'; if (d && d.area) { H.p.x = d.x; H.p.z = d.z + 2.6; } else { H.p.x = AREA.x; H.p.z = SZ + AREA.d / 2 - 2.2; } H.p.ry = Math.PI; area('stadium'); return true;
    },
    area: area,
    useDoor: function (d) {
      if (d.id === 'stadium') { if (D.dlcOwned()) H.goto('stadium'); else locked(); return true; }
      if (d.id === 'cup') { cupPanel(); return true; }
      if (d.id === 'cupcase') { casePanel(); return true; }
      if (d.sport && D.sport(d.sport).dlc && !D.dlcOwned()) { locked(); return true; }
      return false;
    }
  };
  // the plaza and the indoor rooms sit far away but still inside the camera frustum from the stadium:
  // hide them while you are in the stadium (and the stadium while you are not) to save draw calls
  let stRoot = null, farList = null;
  function cull(inSt) {
    if (!farList) { farList = []; const bx = new T.Box3(), c = new T.Vector3(); V.world.children.forEach((o) => { if (o === stRoot || o === H.av) return; let hasAv = false; o.traverse((q) => { if (q === H.av) hasAv = true; }); if (hasAv) return; bx.setFromObject(o); if (bx.isEmpty()) return; bx.getCenter(c); if (c.z < SZ - AREA.d) farList.push(o); }); }
    farList.forEach((o) => { if (inSt) { if (o.userData._vis == null) o.userData._vis = o.visible; o.visible = false; } else if (o.userData._vis != null) { o.visible = o.userData._vis; o.userData._vis = null; } });
    if (stRoot) stRoot.visible = inSt;
  }
  function area(a) {
    if (a === 'stadium' && !D.dlcOwned()) { setTimeout(() => { H.goto('plaza', true); locked(); }, 0); return; }
    cull(a === 'stadium');
    if (H.cloudG) H.cloudG.visible = a !== 'stadium';
    if (a === 'stadium') { if (H.p.z > SZ + AREA.d / 2 - 6) { H.p.x = AREA.x; H.p.z = SZ + AREA.d / 2 - 9; H.p.ry = Math.PI; H.camSnap = true; } V.env(ST.ENV); SP.Snd.setMusic('night'); $('where').textContent = WHERE; drawJumbo(); drawCups(); }
    else if (a === 'plaza') { V.env(VN.ENV.day); SP.Snd.setMusic('hub'); }
  }
  function locked() {
    UI.panel('<div class="icon" style="font-size:46px">🌙</div><h2>RATITA STADIUM NIGHT</h2><p class="sub"><b>DLC Expansion · 75 tickets</b></p>' +
      '<p class="sub">A huge night-lights stadium with 🏒 Ice Hockey, 🌟 Glow Mini-Golf, 🧀 Cheese Curling, the 🐭 Ratita Mascot Race and the 🏆 Ratita Cup tournament with 4 cheese cups to win.</p>' +
      '<p class="sub">Unlock it at the <b>DLC Machine 3000</b> in the Grok Arcade (Hall of Game Records). Friends who own it can also host you in its sports online!</p>' +
      '<div class="btnrow"><button class="btn alt" data-close>STAY HERE</button><button class="btn primary big" id="bArc">🎟️ GO TO THE ARCADE</button></div>', (c) => {
      c.querySelector('#bArc').addEventListener('click', () => { UI.close(); H.navigate(ARCADE); });
    }, { name: 'locked' });
  }
  /* ---------- Ratita Cup ---------- */
  const evName = (k) => { const e = D.CUP[k], sp = D.sport(e[0]); return sp.icon + ' ' + sp.n; };
  function cupPanel() {
    const s = G.save, c = s.cup; let diff = (c && c.diff) || s.opts.diff || 'normal';
    const html = () => '<div class="icon" style="font-size:46px">🏆</div><h2>THE RATITA CUP</h2><p class="sub">4 events vs the CPU: ' + D.CUP.map((e, i) => evName(i)).join(' · ') + '. Win = 3 pts, draw = 1. Most points takes home the cheese cup!</p>' +
      (c && c.on ? '<h3>EVENT ' + (c.i + 1) + ' / 4: ' + esc(evName(c.i)) + '</h3><p class="sub">' + D.DIFF[c.diff].n + ' Cup · <b>YOU ' + c.me + ' - ' + c.cpu + ' CPU</b>' + (c.log.length ? ' · ' + c.log.map((l) => l.r).join(' ') : '') + '</p>' +
        '<div class="btnrow"><button class="btn red small" id="bQuitCup">QUIT CUP</button><button class="btn primary big" id="bNext">▶ PLAY EVENT ' + (c.i + 1) + '</button></div>'
        : '<h3>CUP LEVEL</h3>' + UI.segH('sCupDiff', D.DIFF_ORDER.map((k) => [k, D.CUP_TIERS[k][0] + ' (' + D.DIFF[k].n + ')'])) + '<p class="sub">Cups won: ' + (D.DIFF_ORDER.filter((k) => (s.cupWins || {})[k]).map((k) => D.CUP_TIERS[k][0]).join(', ') || 'none yet') + '</p>' +
        '<div class="btnrow"><button class="btn alt" data-close>LATER</button><button class="btn primary big" id="bStartCup">🏆 START THE CUP</button></div>');
    UI.panel(html(), (el) => {
      if (el.querySelector('#sCupDiff')) UI.seg(el, 'sCupDiff', diff, (v) => { diff = v; });
      const st = el.querySelector('#bStartCup'); if (st) st.addEventListener('click', () => { s.cup = { on: true, diff, i: 0, me: 0, cpu: 0, log: [] }; G.persist(); UI.close(); G.playCup(); });
      const nx = el.querySelector('#bNext'); if (nx) nx.addEventListener('click', () => { UI.close(); G.playCup(); });
      const q = el.querySelector('#bQuitCup'); if (q) q.addEventListener('click', () => { s.cup.on = false; G.persist(); drawJumbo(); UI.close(); UI.toast('Cup cancelled'); });
    }, { name: 'cup' });
  }
  function casePanel() {
    const s = G.save, wins = s.cupWins || {};
    const rows = D.DLC_SPORTS.map((sp) => { const rk = D.rankOf(s.xp[sp.id] || 0), tr = s.trophies[sp.id], b = s.best[sp.id] || {}, ks = Object.keys(b); return '<tr><td>' + sp.icon + ' ' + esc(sp.n) + '</td><td>' + rk.rank.icon + ' ' + rk.rank.n + '</td><td>' + (tr ? '🏆 ' + D.DIFF[tr].n : '<span style="opacity:.5">-</span>') + '</td><td>' + (ks.length ? esc(ks[0]) + ': <b>' + b[ks[0]] + '</b>' : '<span style="opacity:.5">-</span>') + '</td></tr>'; }).join('');
    UI.panel('<h2>🏆 STADIUM TROPHIES</h2><p class="sub">Ratita Cups: ' + D.DIFF_ORDER.map((k) => (wins[k] ? '🏆 ' : '⬛ ') + D.CUP_TIERS[k][0]).join(' · ') + '</p><table class="tbl"><tr><th>SPORT</th><th>RANK</th><th>TROPHY</th><th>BEST</th></tr>' + rows + '</table><div class="btnrow"><button class="btn primary" data-close>DONE</button></div>', null, { name: 'cupcase' });
  }
  G.playCup = function () { const c = G.save.cup; if (!c || !c.on) return; const e = D.CUP[c.i]; G._cupNext = true; G.playSolo(e[0], e[1], c.diff, e[2] || 1); };
  const basePlay = G.playSolo;
  G.playSolo = function (sid, mode, diff, cpus) {
    const sp = D.sport(sid); G.cupMatch = !!G._cupNext; G._cupNext = false;
    if (sp && sp.dlc && !D.dlcOwned()) { G.cupMatch = false; locked(); return; }
    return basePlay(sid, mode, diff, cpus);
  };
  const baseStart = G.startMatch;
  G.startMatch = function (cfg) { if (cfg && cfg.online) G.cupMatch = false; return baseStart(cfg); };
  const baseAward = G.award;
  G.award = function (sid, mode, o) {
    const aw = baseAward(sid, mode, o), c = G.save.cup;
    if (G.cupMatch && c && c.on && !o.spectator && D.CUP[c.i] && D.CUP[c.i][0] === sid && !(E.ctx && E.ctx.online)) {
      const r = o.win ? 'W' : o.draw ? 'D' : 'L'; if (r === 'W') c.me += 3; else if (r === 'D') { c.me += 1; c.cpu += 1; } else c.cpu += 3;
      c.log.push({ sid, r }); c.i++; G.cupMatch = false; aw.cup = { r, i: c.i, me: c.me, cpu: c.cpu, diff: c.diff, done: c.i >= D.CUP.length };
      if (aw.cup.done) { c.on = false; aw.cup.champ = c.me > c.cpu; aw.cup.tie = c.me === c.cpu; if (aw.cup.champ) { G.save.cupWins = G.save.cupWins || {}; aw.cup.newCup = !G.save.cupWins[c.diff]; G.save.cupWins[c.diff] = true; G.save.coins += 150; } }
      G.persist();
    }
    return aw;
  };
  const baseResults = UI.results;
  UI.results = function (res, aw, win, draw) {
    baseResults(res, aw, win, draw); if (!aw || !aw.cup) return; const cu = aw.cup, card = $('pnlCard'); if (!card) return;
    const rows = card.querySelectorAll('.btnrow'), last = rows[rows.length - 1]; const box = document.createElement('div');
    const tier = D.CUP_TIERS[cu.diff];
    box.innerHTML = '<h3>🏆 RATITA CUP · ' + tier[0].toUpperCase() + '</h3><p class="sub">' + (cu.r === 'W' ? '+3 points!' : cu.r === 'D' ? '+1 point' : 'CPU takes 3 points') + ' · <b>YOU ' + cu.me + ' - ' + cu.cpu + ' CPU</b> after ' + cu.i + '/4 events</p>' +
      (cu.done ? (cu.champ ? '<div class="big1 win">🧀 ' + tier[0].toUpperCase() + ' CHEESE CUP CHAMPION! 🧀</div><p class="sub">+150 🪙 · your cup is in the stadium trophy case</p>' : cu.tie ? '<p class="sub"><b>A tie!</b> Play the cup again to break it.</p>' : '<p class="sub">The CPU wins this cup. Try again!</p>') : '<p class="sub">Next: <b>' + esc(evName(cu.i)) + '</b></p>');
    last.parentNode.insertBefore(box, last);
    last.innerHTML = '<button class="btn alt" id="bHubC">🌙 STADIUM</button>' + (cu.done ? '<button class="btn primary big" id="bCupAgain">🏆 NEW CUP</button>' : '<button class="btn primary big" id="bCupNext">▶ NEXT EVENT</button>');
    last.querySelector('#bHubC').addEventListener('click', () => { UI.close(); G.quitMatch(); });
    const nx = last.querySelector('#bCupNext'); if (nx) nx.addEventListener('click', () => { UI.close(); G.playCup(); });
    const ag = last.querySelector('#bCupAgain'); if (ag) ag.addEventListener('click', () => { UI.close(); G.quitMatch(); setTimeout(() => { H.near = H.doors.find((q) => q.id === 'cup'); cupPanel(); }, 400); });
    if (cu.done && cu.champ) { SP.Snd.fx('win'); V.party(0, 3, 0, 120); }
  };
  // online lobby can pick the stadium sports when the host owns the DLC
  SP.Stadium.drawJumbo = drawJumbo;
})();

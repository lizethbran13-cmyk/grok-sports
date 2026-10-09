/* Grok Sports Command - renderer, lights, sky, quality switch (High/Low + auto step-down), particles, labels */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, M = SP.M, T = THREE;
  const V = SP.V = { quality: 'high', t: 0, shakeT: 0, shakeK: 0, fpsAvg: 60, lowT: 0, autoStepped: false, tags: [] };
  V.init = function (canvas) {
    const R = V.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    R.outputEncoding = T.LinearEncoding; R.toneMapping = T.NoToneMapping; R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
    const sc = V.scene = new T.Scene();
    V.cam = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 900);
    V.hemi = new T.HemisphereLight('#dff1ff', '#5f8f45', 0.62); sc.add(V.hemi);
    const sun = V.sun = new T.DirectionalLight('#fff3dc', 1.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sc.add(sun); sc.add(sun.target);
    V.fill = new T.DirectionalLight('#c7d8ff', 0.25); V.fill.position.set(-20, 15, -10); sc.add(V.fill);
    V.world = new T.Group(); sc.add(V.world);
    // sky dome (gradient shader) - never washed out: saturated top, warm horizon
    V.skyMat = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new T.Color('#2f8cff') }, mid: { value: new T.Color('#8fd0ff') }, bot: { value: new T.Color('#fff1c9') }, stars: { value: 0 } },
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float stars; varying vec3 vp; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); } void main(){ float y = vp.y; vec3 c = y > 0.18 ? mix(mid, top, smoothstep(0.18, 0.75, y)) : mix(bot, mid, smoothstep(-0.05, 0.18, y)); if (stars > 0.0) { vec3 q = floor(vp * 220.0); float s = step(0.996, h(q)) * smoothstep(0.1, 0.4, y); c += vec3(s) * stars; } gl_FragColor = vec4(c, 1.0); }' });
    V.sky = new T.Mesh(new T.SphereGeometry(420, 32, 16), V.skyMat); V.sky.renderOrder = -1; sc.add(V.sky);
    // particles + confetti pools
    V.parts = []; const pg = new T.SphereGeometry(0.06, 6, 4);
    for (let i = 0; i < 80; i++) { const m = new T.Mesh(pg, new T.MeshBasicMaterial({ color: '#fff' })); m.visible = false; sc.add(m); V.parts.push({ m, life: 0, v: new T.Vector3() }); }
    V.confetti = []; const cg = new T.PlaneGeometry(0.16, 0.09);
    for (let i = 0; i < 140; i++) { const m = new T.Mesh(cg, new T.MeshBasicMaterial({ color: '#fff', side: T.DoubleSide })); m.visible = false; sc.add(m); V.confetti.push({ m, life: 0, v: new T.Vector3(), r: 0 }); }
    V.resize(); addEventListener('resize', V.resize);
  };
  V.resize = function () { const R = V.renderer; if (!R) return; R.setSize(innerWidth, innerHeight, false); V.cam.aspect = innerWidth / innerHeight; V.cam.updateProjectionMatrix(); };
  V.setQuality = function (q) {
    V.quality = q === 'low' ? 'low' : 'high'; M.low = V.quality === 'low';
    const R = V.renderer; R.setPixelRatio(M.low ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    R.shadowMap.enabled = !M.low; V.sun.castShadow = !M.low;
    V.scene.traverse((m) => { if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => { x.needsUpdate = true; }); });
    V.resize();
  };
  // environment preset: { sky:[top,mid,bot], hemi:[sky,ground,k], sun:[col,k,x,y,z], fog:[col,near,far], night, stars }
  V.env = function (e) {
    V.skyMat.uniforms.top.value.set(e.sky[0]); V.skyMat.uniforms.mid.value.set(e.sky[1]); V.skyMat.uniforms.bot.value.set(e.sky[2]); V.skyMat.uniforms.stars.value = e.stars || 0;
    V.hemi.color.set(e.hemi[0]); V.hemi.groundColor.set(e.hemi[1]); V.hemi.intensity = e.hemi[2];
    V.sun.color.set(e.sun[0]); V.sun.intensity = e.sun[1]; V.sun.position.set(e.sun[2], e.sun[3], e.sun[4]); V.sun.target.position.set(0, 0, 0);
    const sh = e.shadow || 30, c = V.sun.shadow.camera; c.left = -sh; c.right = sh; c.top = sh; c.bottom = -sh; c.near = 1; c.far = 220; c.updateProjectionMatrix();
    V.fill.intensity = e.fill == null ? 0.25 : e.fill;
    V.scene.fog = e.fog ? new T.Fog(e.fog[0], e.fog[1], e.fog[2]) : null;
  };
  V.clearWorld = function () {
    V.world.traverse((m) => { if (m.geometry && !m.userData.keepGeo) m.geometry.dispose(); });
    V.scene.remove(V.world); V.world = new T.Group(); V.scene.add(V.world); V.anims = []; V.clearTags();
    V.parts.forEach((p) => { p.life = 0; p.m.visible = false; }); V.confetti.forEach((p) => { p.life = 0; p.m.visible = false; });
  };
  V.anims = []; // per-frame callbacks for venue props: fn(dt, t)
  V.anim = (fn) => V.anims.push(fn);
  V.burst = function (x, y, z, col, n, sp) { let k = 0; for (const p of V.parts) { if (p.life > 0) continue; p.life = 0.5 + Math.random() * 0.4; p.m.visible = true; p.m.material.color.set(col || '#fff'); p.m.position.set(x, y, z); const s = sp || 4; p.v.set((Math.random() - 0.5) * s, Math.random() * s * 0.8 + 1, (Math.random() - 0.5) * s); if (++k >= (n || 14)) break; } };
  V.party = function (x, y, z, n) { const cols = ['#ff4fd8', '#3ff0ff', '#ffe14d', '#4ade80', '#ff7a3d', '#a78bfa', '#ffffff']; let k = 0; for (const p of V.confetti) { if (p.life > 0) continue; p.life = 2.5 + Math.random() * 1.5; p.m.visible = true; p.m.material.color.set(cols[k % cols.length]); p.m.position.set(x + (Math.random() - 0.5) * 6, y + Math.random() * 2, z + (Math.random() - 0.5) * 6); p.v.set((Math.random() - 0.5) * 5, 4 + Math.random() * 5, (Math.random() - 0.5) * 5); p.r = Math.random() * 10; if (++k >= (n || 90)) break; } };
  V.shake = (k, t) => { if (SP.G && SP.G.save && SP.G.save.opts.shake === false) return; V.shakeK = Math.max(V.shakeK, k); V.shakeT = Math.max(V.shakeT, t || 0.3); };
  V.update = function (dt) {
    V.t += dt;
    for (const p of V.parts) if (p.life > 0) { p.life -= dt; p.v.y -= 12 * dt; p.m.position.addScaledVector(p.v, dt); p.m.scale.setScalar(Math.max(0.1, p.life * 1.6)); if (p.life <= 0) p.m.visible = false; }
    for (const p of V.confetti) if (p.life > 0) { p.life -= dt; p.v.y = Math.max(-1.6, p.v.y - 9 * dt); p.v.x *= 0.98; p.v.z *= 0.98; p.m.position.addScaledVector(p.v, dt); p.m.rotation.set(p.r + V.t * 5, p.r * 2 + V.t * 3, 0); if (p.life <= 0) p.m.visible = false; }
    for (let i = 0; i < V.anims.length; i++) V.anims[i](dt, V.t);
    V.sky.position.copy(V.cam.position);
  };
  V.render = function (dt) {
    if (V.shakeT > 0) { V.shakeT -= dt; const k = V.shakeK * Math.max(0, V.shakeT) * 3; V.cam.position.x += (Math.random() - 0.5) * k; V.cam.position.y += (Math.random() - 0.5) * k; if (V.shakeT <= 0) V.shakeK = 0; }
    V.renderer.render(V.scene, V.cam); V.updateTags();
  };
  // FPS watchdog: High stays on unless the game is really struggling for a while (then it steps down once)
  V.watchFps = function (dt, cb) {
    if (dt <= 0 || dt > 0.5) return; const f = 1 / dt; V.fpsAvg += (f - V.fpsAvg) * 0.05;
    if (V.quality === 'high' && !V.autoStepped && V.fpsAvg < 24) { V.lowT += dt; if (V.lowT > 7) { V.autoStepped = true; V.lowT = 0; cb && cb(); } } else V.lowT = Math.max(0, V.lowT - dt * 2);
  };
  /* ---------- screen-space name tags ---------- */
  const _v = new T.Vector3();
  V.tag = function (obj, text, cls, dy) { const el = document.createElement('div'); el.className = 'tag ' + (cls || ''); el.textContent = text; document.getElementById('tags').appendChild(el); const t = { obj, el, dy: dy == null ? 2.3 : dy }; V.tags.push(t); return t; };
  V.clearTags = function () { V.tags.forEach((t) => t.el.remove()); V.tags = []; };
  V.updateTags = function () {
    const w = innerWidth, h = innerHeight;
    for (const t of V.tags) { if (!t.obj || !t.obj.visible || t.hide) { t.el.style.display = 'none'; continue; } t.obj.getWorldPosition(_v); _v.y += t.dy; _v.project(V.cam); if (_v.z > 1 || Math.abs(_v.x) > 1.2 || Math.abs(_v.y) > 1.2) { t.el.style.display = 'none'; continue; } t.el.style.display = ''; t.el.style.transform = 'translate(' + ((_v.x * 0.5 + 0.5) * w).toFixed(0) + 'px,' + ((-_v.y * 0.5 + 0.5) * h).toFixed(0) + 'px) translate(-50%,-100%)'; }
  };
  V.project = function (x, y, z) { _v.set(x, y, z).project(V.cam); return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight, behind: _v.z > 1 }; };
  // canvas-texture board (live scoreboards / signs: text only, the board itself is real 3D)
  V.board = function (w, h, px) {
    const cv = document.createElement('canvas'); cv.width = px || 512; cv.height = Math.round((px || 512) * h / w);
    const tex = new T.CanvasTexture(cv); tex.anisotropy = 4;
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.userData.cv = cv; m.userData.tex = tex; m.userData.last = '';
    m.userData.draw = function (key, fn) { if (key === m.userData.last) return; m.userData.last = key; const x = cv.getContext('2d'); fn(x, cv.width, cv.height); tex.needsUpdate = true; };
    return m;
  };
  V.sign = function (text, w, h, bg, fg, font) {
    const m = V.board(w, h, 512); m.userData.draw(text, (x, W, H) => { x.fillStyle = bg || '#1e1b3a'; x.fillRect(0, 0, W, H); x.fillStyle = fg || '#ffe14d'; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = Math.round(H * 0.62); x.font = '900 ' + fs + 'px ' + (font || 'Arial Black, Arial'); while (x.measureText(text).width > W * 0.92 && fs > 10) { fs -= 2; x.font = '900 ' + fs + 'px ' + (font || 'Arial Black, Arial'); } x.lineWidth = Math.max(2, fs * 0.08); x.strokeStyle = 'rgba(0,0,0,.55)'; x.strokeText(text, W / 2, H / 2 + 2); x.fillText(text, W / 2, H / 2 + 2); });
    return m;
  };
})();

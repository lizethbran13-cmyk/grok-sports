/* Grok Sports Command - WebAudio synth: the paddle "pock", bounces, net, crowd, whistle, music; plus voice score calls */
(function () {
  'use strict';
  const SP = window.SP;
  const S = SP.Snd = { on: true, music: true, voice: true };
  let ctx = null, master = null, mus = null, crowdG = null;
  try { const s = JSON.parse(localStorage.getItem('grokSports.snd') || 'null'); if (s) { S.on = s.on !== false; S.music = s.music !== false; S.voice = s.voice !== false; } } catch (e) {}
  S.save = () => { try { localStorage.setItem('grokSports.snd', JSON.stringify({ on: S.on, music: S.music, voice: S.voice })); } catch (e) {} };
  S.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination); mus = ctx.createGain(); mus.gain.value = 0.13; mus.connect(master); crowdG = ctx.createGain(); crowdG.gain.value = 0; crowdG.connect(master); startCrowd(); } catch (e) { ctx = null; }
  };
  function tone(f, d, type, vol, slide, when, dest) { if (!ctx) return; const t = ctx.currentTime + (when || 0); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + 0.02); }
  let nbuf = null; function noiseBuf() { if (nbuf) return nbuf; const n = ctx.sampleRate * 1.5; nbuf = ctx.createBuffer(1, n, ctx.sampleRate); const a = nbuf.getChannelData(0); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1; return nbuf; }
  function noise(d, vol, f, type, q, when) { if (!ctx) return; const t = ctx.currentTime + (when || 0); const s = ctx.createBufferSource(); s.buffer = noiseBuf(); const fl = ctx.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.value = f || 1200; fl.Q.value = q || 1; const g = ctx.createGain(); g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + d + 0.02); }
  function startCrowd() { const s = ctx.createBufferSource(); s.buffer = noiseBuf(); s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6; s.connect(f); f.connect(crowdG); s.start(); }
  S.crowd = function (level, dur) { if (!ctx || !S.on) return; const t = ctx.currentTime; crowdG.gain.cancelScheduledValues(t); crowdG.gain.setValueAtTime(crowdG.gain.value, t); crowdG.gain.linearRampToValueAtTime(level, t + 0.15); crowdG.gain.linearRampToValueAtTime(0.0, t + (dur || 1.6)); };
  const FX = {
    // the classic hollow "pock": short sine body + clicky bandpassed noise; pitch/volume rise with power
    kick: (p) => { p = p || 0.5; tone(120 + p * 60, 0.12, 'sine', 0.5 + p * 0.3, 0.5); noise(0.06, 0.3 + p * 0.3, 900, 'lowpass', 1); },
    thud: () => { tone(90, 0.14, 'sine', 0.45, 0.6); noise(0.06, 0.2, 500, 'lowpass', 1); },
    swish: () => { noise(0.35, 0.35, 3200, 'highpass', 0.6); },
    rim: () => { tone(420, 0.25, 'triangle', 0.25, 0.9); tone(840, 0.18, 'sine', 0.12, 0.95); },
    pins: (p) => { p = p || 1; for (let i = 0; i < 6; i++) { tone(700 + Math.random() * 900, 0.08, 'triangle', 0.12 * p, 0.7, i * 0.03); noise(0.05, 0.25 * p, 2500, 'bandpass', 2, i * 0.035); } },
    roll: () => { noise(0.6, 0.15, 220, 'lowpass', 0.8); },
    thunk: () => { tone(160, 0.1, 'square', 0.25, 0.5); noise(0.08, 0.4, 700, 'lowpass', 1.2); },
    twang: () => { tone(330, 0.22, 'triangle', 0.25, 0.7); noise(0.12, 0.25, 4000, 'highpass', 0.8); },
    buzzer: () => { tone(160, 0.6, 'sawtooth', 0.22, 1); tone(163, 0.6, 'square', 0.12, 1); },
    cup: () => { tone(900, 0.06, 'sine', 0.3); tone(600, 0.1, 'sine', 0.25, 1, 0.06); tone(1200, 0.2, 'triangle', 0.15, 1, 0.12); },
    catch: () => { tone(260, 0.08, 'sine', 0.4, 0.7); noise(0.05, 0.3, 1200, 'bandpass', 1.5); },
    shuttle: () => { tone(1500, 0.04, 'sine', 0.22, 0.6); noise(0.04, 0.2, 4200, 'bandpass', 3); },
    ping: () => { tone(1800, 0.04, 'sine', 0.25, 0.7); tone(2400, 0.03, 'triangle', 0.1, 0.7); },
    door: () => { noise(0.4, 0.25, 600, 'lowpass', 0.8); tone(220, 0.3, 'sine', 0.15, 1.3); },
    pock: (p) => { p = p || 0.5; tone(560 + p * 260, 0.07, 'sine', 0.35 + p * 0.25, 0.6); tone(1180 + p * 300, 0.04, 'triangle', 0.18, 0.5); noise(0.05, 0.35 + p * 0.3, 2200 + p * 900, 'bandpass', 2.5); },
    smash: () => { tone(700, 0.1, 'sine', 0.7, 0.5); noise(0.09, 0.8, 2600, 'bandpass', 1.6); noise(0.25, 0.25, 600, 'lowpass', 0.7, 0.02); },
    dink: () => { tone(620, 0.05, 'sine', 0.28, 0.7); noise(0.035, 0.22, 2400, 'bandpass', 3); },
    bounce: (p) => { tone(300 + (p || 0) * 120, 0.06, 'sine', 0.22, 0.6); noise(0.04, 0.16, 1400, 'bandpass', 2); },
    net: () => { noise(0.22, 0.45, 500, 'lowpass', 0.8); tone(140, 0.15, 'triangle', 0.2, 0.7); },
    cord: () => { tone(900, 0.06, 'square', 0.12, 0.6); noise(0.18, 0.35, 700, 'lowpass', 1); },
    whistle: () => { tone(2300, 0.32, 'sine', 0.22, 1.02); tone(2350, 0.32, 'sine', 0.12, 1.0); },
    point: () => [660, 880].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, 1, i * 0.09)),
    lose: () => [440, 330].forEach((f, i) => tone(f, 0.2, 'triangle', 0.16, 1, i * 0.12)),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.24, 'square', 0.12, 1, i * 0.12)),
    coin: () => { tone(988, 0.08, 'square', 0.12); tone(1319, 0.2, 'square', 0.12, 1, 0.08); },
    ui: () => tone(720, 0.05, 'sine', 0.16), swoosh: () => noise(0.16, 0.25, 1800, 'bandpass', 0.8), perfect: () => [1047, 1319, 1568].forEach((f, i) => tone(f, 0.12, 'sine', 0.15, 1, i * 0.05)),
    buy: () => [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, 1, i * 0.07)), bad: () => tone(200, 0.22, 'sawtooth', 0.14, 0.6), tick: () => tone(1500, 0.03, 'square', 0.08)
  };
  S.fx = function (k, a) { if (!S.on || !ctx) return; try { (FX[k] || FX.ui)(a); } catch (e) {} };
  // voice score calls (built-in speech; quietly skipped if unsupported)
  S.say = function (text) { if (!S.on || !S.voice || !window.speechSynthesis) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text).replace(/ - /g, ', ')); u.rate = 1.08; u.pitch = 1.1; u.volume = 0.9; speechSynthesis.speak(u); } catch (e) {} };
  // music: bouncy loop per court
  const SC = { soccer: [262, 330, 392, 440, 523, 587], hub: [262, 330, 392, 494, 523, 659], arena: [220, 277, 330, 370, 440, 494], beach: [294, 370, 440, 494, 587, 659], night: [196, 233, 294, 349, 392, 466], park: [262, 330, 392, 440, 523, 587], gym: [220, 277, 330, 370, 440, 494], beach: [294, 370, 440, 494, 587, 659], roof: [196, 233, 294, 349, 392, 466], vegas: [233, 277, 311, 370, 415, 466], menu: [262, 330, 392, 494, 523, 659] };
  let mt = 0, step = 0, cur = 'menu';
  S.setMusic = (k) => { cur = SC[k] ? k : 'menu'; };
  S.tick = function (dt) {
    if (!ctx || !S.on || !S.music) return; mt -= dt; if (mt > 0) return; mt = cur === 'arena' || cur === 'night' ? 0.2 : 0.24;
    const sc = SC[cur], pat = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 5, 3, 2, 1, 2]; const f = sc[pat[step % 16]];
    tone(f * (step % 32 < 16 ? 1 : 1.122), 0.18, cur === 'vegas' ? 'square' : 'triangle', 0.2, 1, 0, mus);
    if (step % 4 === 0) tone(sc[0] / 2, 0.35, 'sine', 0.4, 1, 0, mus);
    if (step % 4 === 2) { const t = ctx.currentTime; const s = ctx.createBufferSource(); s.buffer = noiseBuf(); const fl = ctx.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 6000; const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(fl); fl.connect(g); g.connect(mus); s.start(t); s.stop(t + 0.06); }
    step++;
  };
})();

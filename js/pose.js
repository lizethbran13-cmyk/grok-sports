/* Grok Sports Command - procedural athlete animation. p = { a: action, at: time in action, sd: side, sp: speed, y: jump } */
(function () {
  'use strict';
  const SP = window.SP, U = SP.U, M = SP.M;
  const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const P = SP.Pose = {};
  P.ACTS = ['idle', 'swing', 'over', 'serve', 'under', 'kick', 'shoot', 'throw', 'bump', 'set', 'spike', 'putt', 'draw', 'dive', 'catch', 'dribble', 'jump', 'cheer', 'sad', 'out', 'block', 'hold', 'bowl', 'tackle', 'aimputt', 'ready', 'dance', 'wave'];
  P.idx = {}; P.ACTS.forEach((a, i) => { P.idx[a] = i; });
  P.apply = function (m, dt, p, t) {
    const u = m.userData; if (!u.legs) return;
    const spd = p.sp || 0; u.walk += dt * (3 + spd * 2.6);
    const run = Math.min(1, spd / 4), s = Math.sin(u.walk * 1.5), c = Math.cos(u.walk * 1.5), a = p.a || 'idle', at = p.at || 0, sd = p.sd || 1;
    const crouch = a === 'ready' || a === 'bump' ? 0.09 : 0.03;
    u.hips.position.y = 0.95 - crouch + Math.abs(c) * 0.05 * run + (spd < 0.1 ? Math.sin(t * 3) * 0.008 : 0);
    u.hips.rotation.set(0, 0, 0); u.torso.rotation.set(0.1 + run * 0.2, 0, 0); u.head.rotation.set(-0.08, 0, 0);
    u.legs[0].hip.rotation.set(s * 0.9 * run - crouch * 2.2, 0, 0.06); u.legs[1].hip.rotation.set(-s * 0.9 * run - crouch * 2.2, 0, -0.06);
    u.legs[0].knee.rotation.set((0.25 + Math.max(0, -s) * 1.0) * run + crouch * 4, 0, 0); u.legs[1].knee.rotation.set((0.25 + Math.max(0, s) * 1.0) * run + crouch * 4, 0, 0);
    u.arms[0].rotation.set(-s * 0.8 * run - 0.15, 0, 0.25); u.fore[0].rotation.set(-0.5 - run * 0.5, 0, 0);
    u.arms[1].rotation.set(s * 0.8 * run - 0.15, 0, -0.25); u.fore[1].rotation.set(-0.5 - run * 0.5, 0, 0);
    if (u.tool && u.tool !== 'none' && u.tool !== 'bow') { u.arms[1].rotation.set(-0.45 + s * 0.3 * run, 0, -0.55); u.fore[1].rotation.set(-1.0, 0, 0); u.paddle.rotation.set(Math.PI / 2 - 0.2, 0, 0.6); }
    const k1 = ease(at / 0.3);
    switch (a) {
      case 'swing': { const k = ease(at / 0.3), sw = U.lerp(-1.3, 1.3, k) * sd; u.torso.rotation.y = -sw * 0.45; u.arms[1].rotation.set(-1.25, sd > 0 ? U.lerp(1.3, -0.9, k) : U.lerp(-1.4, 0.7, k), -0.2 - (sd < 0 ? 0.6 : 0)); u.fore[1].rotation.set(-0.35, 0, 0); u.paddle.rotation.set(Math.PI / 2 - 0.3, 0, sd > 0 ? 0.4 : -0.6); u.legs[sd > 0 ? 0 : 1].hip.rotation.x -= 0.35; break; }
      case 'over': case 'serve': case 'spike': { const k = ease((at - (a === 'serve' ? 0.25 : 0)) / 0.3); u.arms[1].rotation.set(U.lerp(-2.9, -0.4, k), 0, -0.25); u.fore[1].rotation.set(U.lerp(-1.2, -0.1, k), 0, 0); u.paddle.rotation.set(Math.PI / 2 - 0.2, 0, 0); u.arms[0].rotation.set(-2.5 * (1 - k * 0.7), 0, 0.3); u.torso.rotation.x = U.lerp(-0.2, 0.45, k); if (a === 'spike') u.hips.position.y += 0; break; }
      case 'under': case 'bowl': { const k = ease(at / 0.45), sw = a === 'bowl' ? U.lerp(1.2, -1.5, k) : U.lerp(0.9, -1.4, k); u.arms[1].rotation.set(sw, 0.1, -0.15); u.fore[1].rotation.set(-0.2, 0, 0); if (a === 'bowl') { u.torso.rotation.x = 0.55; u.legs[0].hip.rotation.x = -0.9; u.legs[0].knee.rotation.x = 1.0; u.legs[1].hip.rotation.x = 0.6; u.legs[1].hip.rotation.z = -0.5 * (1 - k * 0.3); u.arms[0].rotation.set(-0.3, 0, 1.2); } break; }
      case 'kick': { const k = ease(at / 0.22); const L = u.legs[sd > 0 ? 1 : 0]; L.hip.rotation.x = U.lerp(0.9, -1.4, k); L.knee.rotation.x = U.lerp(1.3, 0.1, k); u.legs[sd > 0 ? 0 : 1].hip.rotation.x = 0.1; u.arms[0].rotation.set(-0.3, 0, 0.9); u.arms[1].rotation.set(-0.3, 0, -0.9); u.torso.rotation.x = -0.1; break; }
      case 'tackle': { u.hips.position.y = 0.45; u.hips.rotation.x = -1.1; u.legs[0].hip.rotation.x = -0.4; u.legs[1].hip.rotation.x = -0.1; u.arms[0].rotation.set(-0.8, 0, 1.2); u.arms[1].rotation.set(-0.8, 0, -1.2); break; }
      case 'shoot': case 'block': { const k = ease(at / 0.35); u.arms[0].rotation.set(-2.9, 0, 0.15); u.arms[1].rotation.set(-2.9, 0, -0.15); u.fore[0].rotation.set(a === 'shoot' ? U.lerp(-1.6, -0.1, k) : 0, 0, 0); u.fore[1].rotation.set(a === 'shoot' ? U.lerp(-1.6, -0.1, k) : 0, 0, 0); u.legs[0].knee.rotation.x = 0.3; u.legs[1].knee.rotation.x = 0.3; break; }
      case 'throw': { const k = ease(at / 0.28); u.arms[1].rotation.set(U.lerp(-2.6, -0.6, k), 0, U.lerp(-0.9, -0.2, k)); u.fore[1].rotation.set(U.lerp(-1.6, -0.1, k), 0, 0); u.torso.rotation.y = U.lerp(0.6, -0.5, k); u.arms[0].rotation.set(-1.2, 0, 0.5); u.legs[0].hip.rotation.x = -0.4; break; }
      case 'hold': case 'dribble': { u.arms[0].rotation.set(-0.9, 0, 0.35); u.arms[1].rotation.set(-0.9, 0, -0.35); u.fore[0].rotation.set(-0.7, 0, 0); u.fore[1].rotation.set(-0.7, 0, 0); if (a === 'dribble') { const b = Math.abs(Math.sin(t * 7)); u.arms[1].rotation.set(-0.6 - b * 0.4, 0, -0.35); u.fore[1].rotation.set(-0.3, 0, 0); } break; }
      case 'bump': { u.arms[0].rotation.set(-1.2 + k1 * 0.4, 0, 0.45); u.arms[1].rotation.set(-1.2 + k1 * 0.4, 0, -0.45); u.fore[0].rotation.set(0, 0, 0); u.fore[1].rotation.set(0, 0, 0); u.torso.rotation.x = 0.35; break; }
      case 'set': { u.arms[0].rotation.set(-2.7, 0, 0.35); u.arms[1].rotation.set(-2.7, 0, -0.35); u.fore[0].rotation.set(-0.9 + k1 * 0.8, 0, 0); u.fore[1].rotation.set(-0.9 + k1 * 0.8, 0, 0); u.torso.rotation.x = -0.15; break; }
      case 'putt': case 'aimputt': { const k = a === 'putt' ? ease(at / 0.25) : 0, sw = a === 'putt' ? U.lerp(0.6, -0.5, k) : 0.3 * (p.pw || 0); u.torso.rotation.x = 0.55; u.arms[0].rotation.set(-0.5 + sw, 0, 0.2); u.arms[1].rotation.set(-0.5 + sw, 0, -0.2); u.fore[0].rotation.set(-0.1, 0, 0); u.fore[1].rotation.set(-0.1, 0, 0); u.paddle.rotation.set(0, 0, 0); u.legs[0].hip.rotation.x = -0.15; u.legs[1].hip.rotation.x = -0.15; u.legs[0].knee.rotation.x = 0.3; u.legs[1].knee.rotation.x = 0.3; u.head.rotation.x = 0.4; break; }
      case 'draw': { const d = U.clamp(p.pw == null ? 1 : p.pw, 0, 1); u.torso.rotation.y = 0; u.arms[0].rotation.set(-1.57, 0, 0); u.fore[0].rotation.set(0, 0, 0); u.paddleL.rotation.set(0, 0, 0); u.arms[1].rotation.set(-1.57, -0.2 - d * 0.5, 0); u.fore[1].rotation.set(0, -0.4 - d * 1.6, 0); u.head.rotation.set(0, 0, 0); break; }
      case 'dive': { const k = ease(at / 0.25); u.hips.rotation.z = -sd * 1.2 * k; u.arms[0].rotation.set(-2.6, 0, 0.3); u.arms[1].rotation.set(-2.6, 0, -0.3); u.hips.position.y += 0.2 * k; break; }
      case 'catch': { u.arms[0].rotation.set(-1.4, 0, 0.3); u.arms[1].rotation.set(-1.4, 0, -0.3); u.fore[0].rotation.set(-0.9, 0, 0); u.fore[1].rotation.set(-0.9, 0, 0); u.torso.rotation.x = 0.2; break; }
      case 'jump': { u.arms[0].rotation.set(-2.2, 0, 0.6); u.arms[1].rotation.set(-2.2, 0, -0.6); u.legs[0].knee.rotation.x = 0.8; u.legs[1].knee.rotation.x = 0.8; break; }
      case 'cheer': case 'dance': { const j = Math.abs(Math.sin(t * 7)); if (a === 'dance') { const w = Math.sin(t * 9); u.hips.rotation.z = w * 0.18; u.torso.rotation.z = -w * 0.25; u.arms[0].rotation.set(-2.2 + w, 0, 0.6); u.arms[1].rotation.set(-2.2 - w, 0, -0.6); } else { u.hips.position.y += j * 0.3; u.arms[0].rotation.set(-2.9, 0, 0.4); u.arms[1].rotation.set(-2.9, 0, -0.4); u.fore[0].rotation.x = 0; u.fore[1].rotation.x = 0; u.legs[0].knee.rotation.x = j * 0.8; u.legs[1].knee.rotation.x = j * 0.8; } break; }
      case 'wave': { u.arms[1].rotation.set(-2.6, 0, -0.4 + Math.sin(t * 8) * 0.4); u.fore[1].rotation.set(-0.4, 0, 0); break; }
      case 'sad': { u.torso.rotation.x = 0.5; u.head.rotation.x = 0.5; u.arms[0].rotation.set(0.1, 0, 0.1); u.arms[1].rotation.set(0.1, 0, -0.1); break; }
      case 'out': { u.hips.position.y = 0.45; u.legs[0].hip.rotation.x = -1.5; u.legs[1].hip.rotation.x = -1.5; u.legs[0].knee.rotation.x = 1.5; u.legs[1].knee.rotation.x = 1.5; u.torso.rotation.x = 0.25; u.arms[0].rotation.set(-0.4, 0, 0.2); u.arms[1].rotation.set(-0.4, 0, -0.2); u.head.rotation.x = 0.35; break; }
      default: break;
    }
  };
})();

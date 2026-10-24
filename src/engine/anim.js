/* 키프레임 애니메이션 (포즈 채널 보간) */
import { clamp } from '../core/config.js';

/* ---------- 포즈 채널 / 키프레임 ---------- */
export const CH = { bodyY:0, bodyRot:0, sx:1, sy:1, headRot:0, headY:0, armB:6, armF:20,
             legB:0, legF:0, legBlift:0, legFlift:0, spearAng:-60, spearX:0, dx:0, spin:0, lift:0 };
export const NEU = { armF:20, armB:6, spearAng:-60, spearX:0, bodyRot:0, sx:1, sy:1, dx:0, legF:0, legB:0, legFlift:0, legBlift:0, headRot:0, headY:0, bodyY:0, spin:0, lift:0 };
export const ANIMS = {
  idle: { dur:1.7, loop:true, keys:[
    { t:0 },
    { t:.5, sy:1.035, sx:.985, headRot:-2.5, armF:17, armB:3, spearAng:-57, bodyRot:1 }
  ]},
  walk: { dur:.5, loop:true, keys:[
    { t:0,   bodyY:-1.5, bodyRot:8, sy:.975, sx:1.02, armF:22, spearAng:-56 },
    { t:.25, bodyY:3,    bodyRot:3, sy:1.02,  sx:.99,  armF:18 },
    { t:.5,  bodyY:-1.5, bodyRot:-2,sy:.975, sx:1.02, armF:22 },
    { t:.75, bodyY:3,    bodyRot:3, sy:1.02,  sx:.99,  armF:18 }
  ]},
  run: { dur:.36, loop:true, keys:[
    { t:0,   bodyY:2,  bodyRot:16, sy:.98, sx:1.02, armF:48, spearAng:-38 },
    { t:.25, bodyY:10, sy:1.05, sx:.96, armF:50 },
    { t:.5,  bodyY:2,  sy:.98, sx:1.02, armF:48 },
    { t:.75, bodyY:10, sy:1.05, sx:.96, armF:50 }
  ]},
  attack_thrust: { dur:.32, loop:false, blendDur:.04, hitAt:.5, keys:[
    { t:0 },
    { t:.35, armF:55, spearAng:-8, spearX:-10, bodyRot:-6, dx:-3, e:'inOut' },
    { t:.5,  armF:95, spearAng:2,  spearX:16, bodyRot:10, dx:7, sx:.96, sy:1.03, e:'out' },
    { t:.75, e:'linear' },
    { t:1,   ...NEU, e:'inOut' }
  ]},
  dash: { dur:.3, loop:false, blendDur:.03, keys:[
    { t:0,  armF:95, spearAng:2, spearX:16, bodyRot:16, dx:8, sx:1.08, sy:.92 },
    { t:1,  armF:95, spearAng:2, spearX:16, bodyRot:16, dx:8, sx:1.08, sy:.92 }
  ]},
  attack_swing: { dur:.4, loop:false, blendDur:.05, hitAt:.4, keys:[
    { t:0 },
    { t:.3,  armF:150, spearAng:-130, bodyRot:-12, sx:1.04, sy:1.05, dx:-5, bodyY:1, e:'inOut' },
    { t:.44, armF:85,  spearAng:0,    bodyRot:22,  sx:.94,  sy:.95,  dx:10, bodyY:-2, e:'out' },
    { t:.64, e:'linear' },
    { t:1,   ...NEU, e:'inOut' }
  ]},
  sp_spin: { dur:.7, loop:false, blendDur:.06, atk:[[.14,.5],[.5,.88]], keys:[
    { t:0,   armF:90, spearAng:0, sx:1.1, sy:.88, bodyY:-3 },
    { t:.14, sx:1.14, sy:.84, bodyRot:-8, spin:0, lift:0, e:'out' },
    { t:.28, spin:136, lift:34, sx:.95, sy:1.04, bodyRot:0, bodyY:0, e:'linear' },
    { t:.72, spin:564, lift:34, e:'linear' },
    { t:.88, spin:720, lift:10, e:'linear' },
    { t:1,   ...NEU, spin:720, e:'inOut' }
  ]}
};
// 공격 판정 시점은 ANIMS[이름].hitAt

export const SLASH_LIFE = .2;
export const EASE = { linear:t => t, inOut:t => .5 - .5 * Math.cos(Math.PI * t), out:t => 1 - (1 - t) * (1 - t), in:t => t * t };
for (const a of Object.values(ANIMS)) {
  let prev = { ...CH };
  const ks = [];
  for (const k of a.keys) { const o = { ...prev }; for (const c in k) o[c] = k[c]; o.e = k.e; ks.push(o); prev = o; }
  if (a.loop) ks.push({ ...ks[0], t: 1, e: 'inOut' });
  a.keys = ks;
}
export function sample(a, tt, out) {
  const u = clamp(tt / a.dur, 0, 1), ks = a.keys;
  let i = 0;
  while (i < ks.length - 2 && u > ks[i + 1].t) i++;
  const A = ks[i], B = ks[i + 1];
  const p = EASE[B.e || 'inOut'](clamp((u - A.t) / (B.t - A.t), 0, 1));
  for (const c in CH) out[c] = A[c] + (B[c] - A[c]) * p;
  return out;
}
export class AnimPlayer {
  constructor() { this.name = 'idle'; this.t = 0; this.from = { ...CH }; this.blend = 1; this.blendDur = .1; this.pose = { ...CH }; this.buf = { ...CH }; this.u = 0; }
  play(name, restart) {
    if (this.name === name && !restart) return;
    Object.assign(this.from, this.pose);
    this.from.spin = ((this.from.spin + 180) % 360 + 360) % 360 - 180;
    this.name = name; this.t = 0; this.blend = 0;
    this.blendDur = ANIMS[name].blendDur ?? .1;
  }
  update(dt) {
    const a = ANIMS[this.name];
    this.t += dt;
    const tt = a.loop ? this.t % a.dur : Math.min(this.t, a.dur);
    this.u = clamp(tt / a.dur, 0, 1);
    const p = sample(a, tt, this.buf);
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / this.blendDur);
      const k = this.blend * this.blend * (3 - 2 * this.blend);
      for (const c in CH) p[c] = this.from[c] + (p[c] - this.from[c]) * k;
    }
    this.pose = p;
  }
}

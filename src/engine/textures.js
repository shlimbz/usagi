/* 코드로 그리는 텍스처(적·무기·아이템) — ASSETS 에 이미지를 지정하면 그 이미지가 우선 */
import { OUT, Q } from '../core/config.js';
import { ASSETS } from '../data/assets.js';

/* ---------- 코드로 그리는 텍스처 ---------- */
export class QG {
  constructor(g) { this.g = g; }
  rect(x, y, w, h) { this.g.fillRect(x * Q, y * Q, w * Q, h * Q); return this; }
  fill(c, a = 1) { this.g.fillStyle(c, a); return this; }
  line(w, c, a = 1) { this.g.lineStyle(w * Q, c, a); return this; }
  ell(x, y, w, h) { this.g.fillEllipse(x * Q, y * Q, w * Q, h * Q); return this; }
  sell(x, y, w, h) { this.g.strokeEllipse(x * Q, y * Q, w * Q, h * Q); return this; }
  circ(x, y, r) { this.g.fillCircle(x * Q, y * Q, r * Q); return this; }
  tri(a, b, c, d, e, f) { this.g.fillTriangle(a * Q, b * Q, c * Q, d * Q, e * Q, f * Q); return this; }
  seg(a, b, c, d) { this.g.lineBetween(a * Q, b * Q, c * Q, d * Q); return this; }
  rr(x, y, w, h, r) { this.g.fillRoundedRect(x * Q, y * Q, w * Q, h * Q, r * Q); return this; }
  srr(x, y, w, h, r) { this.g.strokeRoundedRect(x * Q, y * Q, w * Q, h * Q, r * Q); return this; }
}
export function makeTex(scene, key, wU, hU, fn) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  fn(new QG(g));
  g.generateTexture(key, Math.ceil(wU * Q), Math.ceil(hU * Q));
  g.destroy();
}
export const PAD = 4;
export const WEAPON_GEN = {
  rod(q, len, h, c) {
    const cy = h / 2;
    q.fill(c.color).rr(PAD, cy - 2.6, len, 5.2, 2.6);
    q.line(2.0, 0x3a2f2f).srr(PAD, cy - 2.6, len, 5.2, 2.6);
    q.fill(c.hi).rr(PAD + 5, cy - 1.0, len - 20, 1.8, .8);
  },
  systema(q, len, h, c) {
    const cy = h / 2, x0 = PAD, xe = PAD + len;
    q.fill(c.color).rr(x0, cy - 2.5, len - 23, 5, 2.5);
    q.line(2, OUT).srr(x0, cy - 2.5, len - 23, 5, 2.5);
    q.fill(c.color).tri(xe - 23, cy - 2.5, xe - 23, cy + 2.5, xe - 5, cy - 10);
    q.fill(c.color).tri(xe - 23, cy - 2.5, xe - 23, cy + 2.5, xe - 5, cy + 10);
    q.line(2.2, OUT)
      .seg(xe - 19, cy - 2, xe - 5, cy - 10).seg(xe - 5, cy - 10, xe, cy - 10)
      .seg(xe - 19, cy + 2, xe - 5, cy + 10).seg(xe - 5, cy + 10, xe, cy + 10);
    q.line(1.6, c.hi).seg(x0 + 6, cy - .8, xe - 29, cy - .8);
  }
};
export const WEAPON_GEN_H = { rod:18, systema:32 };
export function weaponMeta(scene, w) {
  const f = scene.textures.getFrame(w.key);
  if (w.img) return { buttX:w.img.buttX, tipX:w.img.tipX, axisY:w.img.axisY ?? f.height / 2, tw:f.width, th:f.height };
  if (w.gen) return { buttX:PAD * Q, tipX:(PAD + w.len) * Q, axisY:WEAPON_GEN_H[w.gen.type] / 2 * Q, tw:f.width, th:f.height };
  return { buttX:0, tipX:f.width, axisY:f.height / 2, tw:f.width, th:f.height };
}
export function ensureWeaponTexture(scene, w) {
  if (scene.textures.exists(w.key) || !w.gen) return;
  const h = WEAPON_GEN_H[w.gen.type];
  makeTex(scene, w.key, w.len + PAD * 2, h, q => WEAPON_GEN[w.gen.type](q, w.len, h, w.gen));
}
export const ENEMY_ORIGIN = { e_slime:[.5, 32 / 36], e_bat:[.5, 37 / 40], e_golem:[.5, 51 / 56] };
export function makeGameTextures(scene) {
  makeTex(scene, 'e_slime', 40, 36, q => {
    q.fill(0x000000, .22).ell(20, 32, 30, 7);
    q.fill(0xb48cff).ell(20, 21, 32, 24); q.line(2, OUT).sell(20, 21, 32, 24);
    q.fill(0xffffff, .55).ell(13, 15, 8, 4);
    q.fill(0x3a2f2f).circ(15, 21, 2.3).circ(25, 21, 2.3);
  });
  makeTex(scene, 'e_bat', 44, 40, q => {
    q.fill(0x000000, .2).ell(22, 37, 18, 5);
    q.fill(0x6b5a8a).tri(14, 14, 2, 6, 9, 22).tri(30, 14, 42, 6, 35, 22);
    q.fill(0x7d6aa0).ell(22, 16, 18, 16); q.line(2, OUT).sell(22, 16, 18, 16);
    q.fill(0xffe082).circ(18, 15, 2).circ(26, 15, 2);
  });
  makeTex(scene, 'e_golem', 60, 56, q => {
    q.fill(0x000000, .25).ell(30, 51, 46, 9);
    q.fill(0x9a8f86).rr(8, 8, 44, 42, 12); q.line(2.5, OUT).srr(8, 8, 44, 42, 12);
    q.fill(0x7f756d).rr(14, 34, 32, 8, 4);
    q.fill(0xff6b5a).circ(22, 24, 3).circ(38, 24, 3);
  });
  makeTex(scene, 'gem', 12, 16, q => {
    q.fill(0xffffff).tri(6, 0, 0, 8, 12, 8).tri(0, 8, 12, 8, 6, 16);
    q.fill(0xffffff, .6).tri(6, 2, 3, 8, 6, 8);
  });
  makeTex(scene, 'puff', 24, 24, q => q.fill(0xffffff).circ(12, 12, 11));
  makeTex(scene, 'food', 22, 22, q => {            // 주먹밥
    q.fill(0x000000, .2).ell(11, 20, 16, 4);
    q.fill(0xffffff).tri(11, 2, 2, 18, 20, 18).ell(11, 15, 18, 8); q.line(1.5, OUT).seg(11, 2, 2, 18).seg(11, 2, 20, 18).seg(2, 18, 20, 18);
    q.fill(0x2e3b2e).rr(7, 13, 8, 6, 1);
  });
  makeTex(scene, 'chest', 30, 26, q => {           // 보물상자
    q.fill(0x000000, .22).ell(15, 24, 26, 5);
    q.fill(0xb5733b).rr(3, 9, 24, 14, 2); q.line(1.5, OUT).srr(3, 9, 24, 14, 2);
    q.fill(0xcf8a4a).rr(3, 3, 24, 8, 3); q.line(1.5, OUT).srr(3, 3, 24, 8, 3);
    q.fill(0xffd54a).rr(13, 8, 4, 6, 1).rr(3, 10, 24, 2, 0);
  });
  if (!scene.textures.exists('grass')) {
    const g = scene.make.graphics({ x:0, y:0 }, false), T = 128;
    g.fillStyle(0x8ccf6f).fillRect(0, 0, T, T);
    g.fillStyle(0x7cc063);
    [[20, 30], [80, 18], [56, 70], [104, 96], [16, 104], [70, 118]].forEach(([x, y]) => g.fillEllipse(x, y, 22, 5));
    g.fillStyle(0x9bd97e);
    [[40, 50], [100, 60], [30, 86]].forEach(([x, y]) => g.fillEllipse(x, y, 14, 4));
    g.generateTexture('grass', T, T); g.destroy();
  }
}


/* 텍스처별 표시 배율·기준점: ASSETS(enemies/items)에 이미지가 지정되면 그 값, 아니면 코드로 그린 텍스처 기본값 */
export const TEX_ORIGIN = { ...ENEMY_ORIGIN, gem:[.5, .5], food:[.5, .9], chest:[.5, .9] };
export function texInfo(key) {
  const a = ASSETS.enemies[key] || ASSETS.items[key];
  if (a && a.src) return { scale:a.scale ?? 1, origin:a.origin ?? [.5, .9] };
  return { scale:1 / Q, origin:TEX_ORIGIN[key] || [.5, .5] };
}

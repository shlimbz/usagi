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
  poly(pts) { this.g.fillPoints(pts.map(([x, y]) => ({ x:x * Q, y:y * Q })), true); return this; }
  spoly(pts) { this.g.strokePoints(pts.map(([x, y]) => ({ x:x * Q, y:y * Q })), true); return this; }
  star(cx, cy, R, r, n = 5, rot = -Math.PI / 2) {          // 별 모양 꼭짓점
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r : R; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    return pts;
  }
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
export const ENEMY_ORIGIN = { e_slime:[.5, 32 / 36], e_bat:[.5, 37 / 40], e_golem:[.5, 51 / 56], e_spitter:[.5, 44 / 48], e_imp:[.5, 36 / 40],
  e_sphinx:[.5, 90 / 96], e_knight:[.5, 72 / 76], e_mage:[.5, 72 / 76], e_bird:[.5, 84 / 90], e_car:[.5, 70 / 76] };
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
  makeExtraTextures(scene);
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


/* ---------- 새 적·아이템·중립 캐릭터 임시 그림 (형태·크기 참고용 — 이미지를 주면 assets.js 에서 교체) ---------- */
function makeExtraTextures(scene) {
  // 기본 몹 · 중형 · 벌레3(원거리): 기본 대체 그림
  makeTex(scene, 'e_spitter', 48, 48, q => {
    q.fill(0x000000, .22).ell(24, 44, 30, 7);
    q.fill(0x5aa65a).tri(8, 40, 18, 30, 14, 44).tri(40, 40, 30, 30, 34, 44);
    q.fill(0x8bd46a).ell(24, 26, 30, 30); q.line(2, OUT).sell(24, 26, 30, 30);
    q.fill(0x3a2f2f).circ(24, 28, 7); q.fill(0xff6b8a).circ(24, 30, 3.5);
    q.fill(0x3a2f2f).circ(17, 18, 2).circ(31, 18, 2);
  });
  // 중간보스 · 소형 · 날쌘꼬마: 기본 대체 그림
  makeTex(scene, 'e_imp', 40, 40, q => {
    q.fill(0x000000, .22).ell(20, 36, 24, 6);
    q.fill(0xd9483b).tri(9, 12, 13, 2, 16, 12).tri(31, 12, 27, 2, 24, 12);
    q.fill(0xff6b5a).ell(20, 22, 26, 26); q.line(2, OUT).sell(20, 22, 26, 26);
    q.fill(0xffffff).circ(15, 20, 3.5).circ(25, 20, 3.5); q.fill(0x2a2230).circ(16, 20, 1.8).circ(26, 20, 1.8);
    q.line(1.6, OUT).seg(14, 28, 26, 28);
  });
  // 중간보스 · 대형 · 스핑크스: 엎드린 사자 몸 + 줄무늬 머리 장식
  makeTex(scene, 'e_sphinx', 120, 96, q => {
    q.fill(0x000000, .25).ell(60, 90, 100, 12);
    q.fill(0xd9b26f).rr(14, 50, 96, 36, 16); q.line(2.5, OUT).srr(14, 50, 96, 36, 16);
    q.fill(0xc79c56).rr(18, 76, 26, 12, 5).rr(78, 76, 26, 12, 5);
    q.fill(0x3d6fb6).poly([[20, 22], [52, 22], [58, 64], [14, 64]]);
    q.fill(0xf2cf4a).rr(20, 30, 32, 4, 1).rr(18, 40, 36, 4, 1).rr(16, 50, 40, 4, 1);
    q.fill(0xe8c486).ell(36, 34, 26, 30); q.line(2, OUT).sell(36, 34, 26, 30);
    q.fill(0x2a2230).circ(31, 32, 2.2).circ(41, 32, 2.2); q.fill(0xb38548).rr(33, 40, 6, 3, 1);
    q.fill(0x3d6fb6).rr(26, 14, 20, 8, 3);
  });
  // 보스 · 인간형 중형 · 검은기사: 기본 대체 그림
  makeTex(scene, 'e_knight', 56, 76, q => {
    q.fill(0x000000, .25).ell(28, 72, 34, 7);
    q.fill(0x2e3346).rr(18, 54, 8, 18, 3).rr(30, 54, 8, 18, 3);
    q.fill(0x41485f).rr(14, 28, 28, 30, 7); q.line(2, OUT).srr(14, 28, 28, 30, 7);
    q.fill(0xb8c0d0).rr(44, 8, 4, 46, 2); q.fill(0x6b5a5a).rr(40, 50, 12, 4, 2);
    q.fill(0x555d76).ell(28, 20, 24, 24); q.line(2, OUT).sell(28, 20, 24, 24);
    q.fill(0x1b1f2b).rr(19, 18, 18, 5, 2); q.fill(0xff4f4f).circ(24, 20, 1.6).circ(32, 20, 1.6);
    q.fill(0xd9483b).tri(26, 8, 34, 0, 32, 10);
  });
  // 보스 · 인간형 중형 · 점술사: 고깔 망토 + 수정구 지팡이
  makeTex(scene, 'e_mage', 52, 76, q => {
    q.fill(0x000000, .22).ell(26, 72, 32, 7);
    q.fill(0x6b4fa8).poly([[26, 22], [44, 72], [8, 72]]); q.line(2, OUT).spoly([[26, 22], [44, 72], [8, 72]]);
    q.fill(0xf3d9b8).ell(26, 26, 16, 16); q.line(1.6, OUT).sell(26, 26, 16, 16);
    q.fill(0x4b3780).poly([[26, 0], [38, 22], [14, 22]]);
    q.fill(0x2a2230).circ(23, 27, 1.6).circ(29, 27, 1.6);
    q.fill(0x8a6a4a).rr(44, 16, 3, 54, 1.5); q.fill(0x9fe8ff).circ(45.5, 14, 6); q.line(1.6, OUT).sell(45.5, 14, 12, 12);
  });
  // 보스 · 대형 · 큰 새: 날개 편 새 (그림자는 땅에)
  makeTex(scene, 'e_bird', 130, 90, q => {
    q.fill(0x000000, .18).ell(65, 84, 70, 10);
    q.fill(0x8b5e3c).poly([[52, 34], [4, 14], [14, 40], [50, 52]]).poly([[78, 34], [126, 14], [116, 40], [80, 52]]);
    q.fill(0xa8744a).ell(65, 42, 44, 34); q.line(2.5, OUT).sell(65, 42, 44, 34);
    q.fill(0xf2e2c4).ell(65, 50, 24, 18);
    q.fill(0xa8744a).ell(65, 18, 26, 24); q.line(2, OUT).sell(65, 18, 26, 24);
    q.fill(0xffc53d).tri(60, 20, 70, 20, 65, 32);
    q.fill(0x2a2230).circ(59, 14, 2.4).circ(71, 14, 2.4);
    q.fill(0xffc53d).rr(56, 58, 4, 10, 1).rr(70, 58, 4, 10, 1);
  });
  // 보스 · 대형 · 폭주자동차: 기본 대체 그림
  makeTex(scene, 'e_car', 130, 76, q => {
    q.fill(0x000000, .25).ell(65, 70, 118, 10);
    q.fill(0xd9483b).rr(6, 30, 118, 30, 10); q.line(2.5, OUT).srr(6, 30, 118, 30, 10);
    q.fill(0xc23a2e).rr(30, 12, 64, 24, 9); q.line(2.5, OUT).srr(30, 12, 64, 24, 9);
    q.fill(0x9fe8ff).rr(36, 16, 24, 14, 3).rr(64, 16, 24, 14, 3);
    q.fill(0xfff2a8).rr(112, 38, 10, 8, 3); q.fill(0x2a2230).circ(32, 62, 11).circ(98, 62, 11);
    q.fill(0x9a9a9a).circ(32, 62, 5).circ(98, 62, 5);
  });
  // ---- 맵 아이템 (바닥 빛·위아래 흔들림으로 경험치 구슬과 구분) ----
  makeTex(scene, 'it_magnet', 24, 24, q => {
    q.fill(0x000000, .2).ell(12, 22, 16, 4);
    q.line(6, 0xe53935).g.beginPath(); q.g.arc(12 * Q, 10 * Q, 6 * Q, Math.PI, 0, true); q.g.strokePath();
    q.fill(0xe53935).rr(3, 9, 6, 9, 1).rr(15, 9, 6, 9, 1);
    q.fill(0xe0e0e0).rr(3, 15, 6, 4, 1).rr(15, 15, 6, 4, 1);
  });
  makeTex(scene, 'it_coins', 24, 24, q => {
    q.fill(0x000000, .2).ell(12, 22, 16, 4);
    q.fill(0xd9a13b).ell(12, 15, 18, 14); q.line(1.6, OUT).sell(12, 15, 18, 14);
    q.fill(0xb5822b).rr(8, 4, 8, 6, 2); q.fill(0xffe082).circ(12, 15, 3.5);
  });
  makeTex(scene, 'it_candy', 26, 22, q => {
    q.fill(0x000000, .2).ell(13, 20, 16, 4);
    q.fill(0xff8ad8).tri(2, 5, 2, 17, 8, 11).tri(24, 5, 24, 17, 18, 11);
    q.fill(0xff5fc4).circ(13, 11, 6.5); q.line(1.4, OUT).g.strokeCircle(13 * Q, 11 * Q, 6.5 * Q);
    q.fill(0xffffff, .7).circ(11, 9, 2);
  });
  makeTex(scene, 'it_bomb', 24, 26, q => {
    q.fill(0x000000, .2).ell(12, 24, 16, 4);
    q.fill(0x2e2e3a).circ(12, 15, 8); q.line(1.4, 0x000000).g.strokeCircle(12 * Q, 15 * Q, 8 * Q);
    q.fill(0x8a6a4a).rr(13, 3, 2, 6, 1); q.fill(0xffb300).circ(14, 3, 2.4); q.fill(0xffffff, .5).circ(9, 12, 2);
  });
  makeTex(scene, 'it_freeze', 24, 24, q => {
    q.fill(0x000000, .2).ell(12, 22, 16, 4);
    q.fill(0x7fd6ff).circ(12, 12, 9); q.line(1.6, OUT).g.strokeCircle(12 * Q, 12 * Q, 9 * Q);
    q.fill(0xffffff).circ(12, 12, 6.5); q.line(1.6, 0x2a5a8a).seg(12, 12, 12, 7).seg(12, 12, 15, 13);
  });
  makeTex(scene, 'it_star', 24, 24, q => {
    q.fill(0x000000, .2).ell(12, 22, 16, 4);
    const pts = q.star(12, 11, 10, 4.5); q.fill(0xfff27a).poly(pts); q.line(1.4, 0xc79a00).spoly(pts);
  });
  makeTex(scene, 'orb_star', 18, 18, q => { const pts = q.star(9, 9, 8.5, 3.8); q.fill(0xffe066).poly(pts); q.line(1.2, 0xffffff).spoly(pts); });
  // 적 투사체: 진한 테두리 + 빨간 몸 + 흰 심 (보석(파랑·초록 마름모)·아이템(흔들리는 그림)과 확실히 다르게)
  makeTex(scene, 'e_shot', 16, 16, q => { q.fill(0x2a0010).circ(8, 8, 7.8); q.fill(0xff3b5c).circ(8, 8, 5.8); q.fill(0xffd0d8).circ(8, 8, 2.4); });
  // ---- 중립 캐릭터 ----
  const face = (q, cx, cy, eye = 0x2a2230) => { q.fill(eye).circ(cx - 4, cy, 1.8).circ(cx + 4, cy, 1.8); q.line(1.2, eye).seg(cx - 2, cy + 4, cx + 2, cy + 4); };
  makeTex(scene, 'n_ystar', 44, 46, q => {
    q.fill(0x000000, .2).ell(22, 42, 26, 6);
    const pts = q.star(22, 22, 20, 9.5); q.fill(0xffd54a).poly(pts); q.line(2, OUT).spoly(pts);
    face(q, 22, 23);
  });
  makeTex(scene, 'n_bstar', 44, 46, q => {
    q.fill(0x000000, .25).ell(22, 42, 26, 6);
    const pts = q.star(22, 22, 20, 9.5); q.fill(0x2a2438).poly(pts); q.line(2, 0xb36bff).spoly(pts);
    q.fill(0xff4f6b).circ(18, 22, 2.2).circ(26, 22, 2.2);
  });
  makeTex(scene, 'n_armor', 46, 52, q => {
    q.fill(0x000000, .22).ell(23, 48, 30, 7);
    q.fill(0x8f9bb0).rr(9, 20, 28, 26, 9); q.line(2, OUT).srr(9, 20, 28, 26, 9);
    q.fill(0xb7c4d6).ell(23, 17, 26, 22); q.line(2, OUT).sell(23, 17, 26, 22);
    q.fill(0x2a2230).rr(15, 14, 16, 5, 2); q.fill(0xffd54a).rr(19, 30, 8, 8, 2);
  });
}

/* 텍스처별 표시 배율·기준점: ASSETS(enemies/items)에 이미지가 지정되면 그 값, 아니면 코드로 그린 텍스처 기본값 */
export const TEX_ORIGIN = { ...ENEMY_ORIGIN, gem:[.5, .5], food:[.5, .9], chest:[.5, .9], it_magnet:[.5, .9], it_coins:[.5, .9], it_candy:[.5, .9],
  it_bomb:[.5, .9], it_freeze:[.5, .9], it_star:[.5, .9], orb_star:[.5, .5], e_shot:[.5, .5], n_ystar:[.5, .9], n_bstar:[.5, .9], n_armor:[.5, .92] };
export function texInfo(key) {
  const a = ASSETS.enemies[key] || ASSETS.items[key] || ASSETS.neutrals[key];
  if (a && a.src) return { scale:a.scale ?? 1, origin:a.origin ?? [.5, .9] };
  return { scale:1 / Q, origin:TEX_ORIGIN[key] || [.5, .5] };
}

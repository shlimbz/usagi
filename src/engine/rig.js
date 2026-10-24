/* 캐릭터 리그: 원본 그림 + 손에 든 무기 */
import { S, clamp, rad } from '../core/config.js';
import { PRESETS } from '../data/characters.js';
import { ensureWeaponTexture, weaponMeta } from './textures.js';
import { ANIMS, CH, sample } from './anim.js';

const POSE_FADE = .12;   // 대기↔이동 그림 전환 시간(초)

/* 공격 판정 순간의 '손 → 창끝' 변환을 미리 계산 (리그 변환과 같은 순서의 2D 행렬 곱)
 * 반환: { a, x } — 창 그림의 (손잡이부터 끝까지) 길이 t 일 때 창끝의 발밑 기준 앞쪽 거리 = a·t + x */
function hitTipTransform(P) {
  const A = ANIMS[P.anim], p = sample(A, A.dur * (A.hitAt ?? .4), { ...CH });
  const cfg = P.poses.idle, flip = (P.flipX ? -1 : 1) * (cfg.flipX ? -1 : 1), L = P.armReach ?? 8, ar = rad(p.armF), a0 = rad(20);
  const hx = (cfg.hand[0] - cfg.ax) * cfg.scale * flip + L * (Math.sin(ar) - Math.sin(a0));
  const hy = (cfg.hand[1] - cfg.ay) * cfg.scale - P.hipY - L * (Math.cos(a0) - Math.cos(ar));
  const mul = (A, B) => [A[0]*B[0]+A[2]*B[1], A[1]*B[0]+A[3]*B[1], A[0]*B[2]+A[2]*B[3], A[1]*B[2]+A[3]*B[3], A[0]*B[4]+A[2]*B[5]+A[4], A[1]*B[4]+A[3]*B[5]+A[5]];
  const T = (x, y, r = 0, sx = 1, sy = 1) => { const c = Math.cos(r), s = Math.sin(r); return [c*sx, s*sx, -s*sy, c*sy, x, y]; };
  let M = T(0, 0, 0, S, S);
  M = mul(M, T(p.dx, 0)); M = mul(M, T(0, P.hipY - p.bodyY, rad(p.bodyRot), p.sx, p.sy));
  M = mul(M, T(hx, hy)); M = mul(M, T(0, 0, rad(p.spearAng))); M = mul(M, T(p.spearX, 0));
  return { a:M[0], x:M[4] };
}

/* ---------- 플레이어 리그 ---------- */
export class Rig {
  constructor(scene, parent) {
    this.scene = scene;
    this.root = scene.make.container({ x: 0, y: 0 }, false);
    parent.add(this.root);
    this.flashT = 0; this.flashing = false;
  }
  build(id) {
    const s = this.scene, P = PRESETS[id], mc = (x, y) => s.make.container({ x, y }, false);
    this.id = id; this.P = P;
    this.runK = 0;
    this.hitTip = hitTipTransform(P);
    this.root.removeAll(true); this.weaponImg = null; this.flashT = 0; this.flashing = false;
    this.flip = P.flipX ? -1 : 1;
    this.hipY = P.hipY; this.spinCy = P.hipY;
    this.hip = mc(0, this.hipY);
    this.imgs = {}; this.anchors = {};
    for (const [pn, cfg] of Object.entries(P.poses)) {
      const im = s.make.image({ x: 0, y: -this.hipY, key: cfg.key }, false);
      im.setOrigin(cfg.ax / im.width, cfg.ay / im.height);
      im.baseScale = cfg.scale;
      im.flipSign = this.flip * (cfg.flipX ? -1 : 1);      // 캐릭터 반전 × 포즈별 반전 (그림마다 보는 방향이 달라도 됨)
      im.setScale(cfg.scale * im.flipSign, cfg.scale).setVisible(pn === 'idle');
      this.imgs[pn] = im;
      this.anchors[pn] = { x: (cfg.hand[0] - cfg.ax) * cfg.scale * im.flipSign, y: (cfg.hand[1] - cfg.ay) * cfg.scale - this.hipY };
      this.hip.add(im);
    }
    this.parts = Object.values(this.imgs);
    this.hand = mc(this.anchors.idle.x, this.anchors.idle.y);
    this.weaponHolder = mc(0, 0);
    this.hand.add(this.weaponHolder);
    this.hip.add(this.hand);
    this.root.add(this.hip);
    this.setWeapon(P.weapon);
  }
  setWeapon(w) {
    const s = this.scene;
    ensureWeaponTexture(s, w);
    if (this.weaponImg) this.weaponImg.destroy();
    this.weapon = w; this.weaponImg = null;
    if (!s.textures.exists(w.key)) return;
    const m = weaponMeta(s, w), img = s.make.image({ x: 0, y: 0, key: w.key }, false);
    img.setOrigin((m.buttX + (m.tipX - m.buttX) * w.grip) / m.tw, m.axisY / m.th);
    img.baseScale = w.len / (m.tipX - m.buttX);
    img.setScale(img.baseScale);
    this.weaponHolder.add(img);
    this.weaponImg = img;
    this.reachScale = 1;
  }
  /* 무기 길이를 타격 거리에 맞춤: 공격 판정 순간 창끝이 발밑에서 정확히 reach(판정 사거리) 앞에 오도록 그림 배율 조정.
   * 무기 그림을 바꿔도 weapon.len·grip 만 맞으면 그대로 동작. 사거리가 늘면 무기도 길어짐 */
  setReach(reach) {
    const img = this.weaponImg;
    if (!img || !(reach > 0)) return;
    const visible = (reach - this.hitTip.x) / this.hitTip.a;          // 손잡이~끝 보이는 길이
    const k = clamp(visible / ((1 - this.weapon.grip) * this.weapon.len), .2, 3);
    if (Math.abs(k - this.reachScale) < .005) return;
    this.reachScale = k;
    img.setScale(img.baseScale * k);
  }
  flash(d) { this.flashT = d; }
  apply(p, moving, speed, dt) {
    const sr = rad(p.spin), cy = this.spinCy, P = this.P;
    this.root.rotation = sr;
    this.root.x = p.dx + cy * Math.sin(sr);
    this.root.y = cy * (1 - Math.cos(sr)) - p.lift;
    // 대기 ↔ 이동 그림 전환: POSE_FADE 초 동안 이동 그림을 대기 그림 위에 서서히 겹쳐 그림 (한 프레임에 툭 바뀌지 않게)
    // 대기 그림은 아래에서 불투명 유지 → 반투명 '유령' 없이 자연스럽게 섞임. 손(무기) 위치도 같은 비율로 이동
    const hasRun = !!this.imgs.run, target = moving && hasRun ? 1 : 0;
    const step = dt / POSE_FADE;
    this.runK = hasRun ? clamp((this.runK ?? 0) + clamp(target - (this.runK ?? 0), -step, step), 0, 1) : 0;
    const k = this.runK;
    this.hip.setPosition(0, this.hipY - p.bodyY);
    this.hip.rotation = rad(p.bodyRot);
    this.hip.setScale(p.sx, p.sy);
    for (const pn in this.imgs) {
      const im = this.imgs[pn], w = pn === 'run' ? k : 1;
      im.visible = pn === 'run' ? k > 0 : k < 1;
      if (!im.visible) continue;
      im.setAlpha(w);
      im.setPosition(0, -this.hipY);
      im.setScale(im.baseScale * im.flipSign, im.baseScale);
      im.rotation = 0;
    }
    const Ai = this.anchors.idle, Ar = this.anchors.run || Ai;
    const A = { x:Ai.x + (Ar.x - Ai.x) * k, y:Ai.y + (Ar.y - Ai.y) * k }, L = P.armReach ?? 8, a = rad(p.armF), a0 = rad(20);
    this.hand.setPosition(A.x + L * (Math.sin(a) - Math.sin(a0)), A.y - L * (Math.cos(a0) - Math.cos(a)));
    this.weaponHolder.rotation = rad(p.spearAng);
    if (this.weaponImg) this.weaponImg.x = p.spearX;
    if (this.flashT > 0) {
      this.flashT -= dt;
      const on = Math.floor(this.flashT / .06) % 2 === 0;
      for (const im of this.parts) { if (on) im.setTintFill(0xff7b7b); else im.clearTint(); }
      this.flashing = true;
    } else if (this.flashing) {
      for (const im of this.parts) im.clearTint();
      this.flashing = false;
    }
  }
}

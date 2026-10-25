/* 캐릭터 리그: 원본 그림 + 손에 든 무기 */
import { S, clamp, rad } from '../core/config.js';
import { PRESETS } from '../data/characters.js';
import { ensureWeaponTexture, weaponMeta } from './textures.js';
import { ANIMS, CH, sample } from './anim.js';

const POSE_FADE = .12;   // 대기↔이동 그림 전환 시간(초)

/* 공격 판정 순간의 리그 변환을 미리 계산 (리그와 같은 순서의 2D 행렬 곱)
 * 좌표: 캐릭터가 오른쪽을 볼 때 기준(앞 = +x, 아래 = +y), 발밑 원점, 월드 픽셀
 * tip(rot, t): 무기를 rot(라디안)만큼 더 돌리고 보이는 길이가 t 일 때 창끝 위치. hx·hy: 손 위치          */
export function hitTipTransform(P) {
  const A = ANIMS[P.anim], p = sample(A, A.dur * (A.hitAt ?? .4), { ...CH });
  const cfg = P.poses.idle, flip = (P.flipX ? -1 : 1) * (cfg.flipX ? -1 : 1), L = P.armReach ?? 8, ar = rad(p.armF), a0 = rad(20);
  const hx = (cfg.hand[0] - cfg.ax) * cfg.scale * flip + L * (Math.sin(ar) - Math.sin(a0));
  const hy = (cfg.hand[1] - cfg.ay) * cfg.scale - P.hipY - L * (Math.cos(a0) - Math.cos(ar));
  const mul = (A, B) => [A[0]*B[0]+A[2]*B[1], A[1]*B[0]+A[3]*B[1], A[0]*B[2]+A[2]*B[3], A[1]*B[2]+A[3]*B[3], A[0]*B[4]+A[2]*B[5]+A[4], A[1]*B[4]+A[3]*B[5]+A[5]];
  const T = (x, y, r = 0, sx = 1, sy = 1) => { const c = Math.cos(r), s = Math.sin(r); return [c*sx, s*sx, -s*sy, c*sy, x, y]; };
  let M = T(0, 0, 0, S, S);
  M = mul(M, T(p.dx, 0)); M = mul(M, T(0, P.hipY - p.bodyY, rad(p.bodyRot), p.sx, p.sy));
  const H = mul(M, T(hx, hy));
  const tip = (rot, t) => { const m = mul(mul(H, T(0, 0, rad(p.spearAng) + rot)), T(p.spearX, 0)); return [m[4] + m[0] * t, m[5] + m[1] * t]; };
  const m0 = mul(mul(H, T(0, 0, rad(p.spearAng))), T(p.spearX, 0));
  return { a:m0[0], b:m0[1], x:m0[4], y:m0[5], hx:H[4], hy:H[5], tip };
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
    this.runK = 0; this.aimW = 0; this.aimRot = 0; this.aimLen = 1; this.lenNow = 1; this.reach = 0; this.aimKey = null;
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
    const h = this.hitTip, visible = (reach - h.x) / h.a;          // 손잡이~끝 보이는 길이 (정면 공격 기준)
    const k = clamp(visible / ((1 - this.weapon.grip) * this.weapon.len), .2, 3);
    if (Math.abs(k - this.reachScale) < .005 && reach === this.reach) return;
    this.reachScale = k; this.reach = reach; this.aimKey = null;
    img.setScale(img.baseScale * k); this.lenNow = 1;
  }
  /* 공격 방향 맞추기: 위·아래·대각선으로 공격할 때도 공격 순간 창끝이 판정 끝(발밑에서 사거리만큼 그 방향)에 오도록
   * 무기를 손 기준으로 더 돌리고(rot), 길이를 늘이거나 줄임(len). fx = 앞쪽 성분(바라보는 방향 기준), fy = 아래 성분
   * w = 0~1 (공격 동작 중에만 1 — 동작 시작·끝에서 부드럽게) */
  setAim(fx, fy, w) {
    this.aimW = w;
    if (!(w > 0) || !this.reach) return;
    const key = Math.round(fx * 200) * 1000 + Math.round(fy * 200);
    if (key === this.aimKey) return;
    this.aimKey = key;
    const h = this.hitTip, R = this.reach, t0 = (R - h.x) / h.a;
    const thy = h.y + h.b * t0;                                     // 정면 공격 때 창끝 높이 (판정 끝 바로 위, 손 높이)
    const tx = fx * R, ty = fy * R + thy;                           // 이번 방향의 판정 끝 (같은 높이 차이)
    let rot = 0, t = t0;                                            // 실제 리그 변환으로 몇 번 고쳐 가며 맞춤 (몸 눌림·늘어남까지 반영)
    for (let i = 0; i < 6; i++) {
      const [px, py] = h.tip(rot, t);
      let d = Math.atan2(ty - h.hy, tx - h.hx) - Math.atan2(py - h.hy, px - h.hx);
      d = Math.atan2(Math.sin(d), Math.cos(d));
      rot += d;
      const [qx, qy] = h.tip(rot, t), cur = Math.hypot(qx - h.hx, qy - h.hy), want = Math.hypot(tx - h.hx, ty - h.hy);
      const [zx, zy] = h.tip(rot, 0), base = Math.hypot(zx - h.hx, zy - h.hy);
      t = Math.max(t0 * .3, t + (want - cur) / Math.max(1e-3, (cur - base) / Math.max(1e-3, t)));
    }
    this.aimRot = rot; this.aimLen = clamp(t / t0, .3, 2.5);
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
    const aw = this.aimW || 0;
    this.weaponHolder.rotation = rad(p.spearAng) + (aw ? this.aimRot * aw : 0);
    if (this.weaponImg) {
      this.weaponImg.x = p.spearX;
      const ls = 1 + ((aw ? this.aimLen : 1) - 1) * aw;
      if (Math.abs(ls - (this.lenNow || 1)) > .002) { this.lenNow = ls; this.weaponImg.setScale(this.weaponImg.baseScale * this.reachScale * ls, this.weaponImg.baseScale * this.reachScale); }
      else if (this.lenNow === undefined) this.lenNow = 1;
    }
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

/* 캐릭터 리그: 원본 그림 + 손에 든 무기 */
import { clamp, rad } from '../core/config.js';
import { PRESETS } from '../data/characters.js';
import { ensureWeaponTexture, weaponMeta } from './textures.js';

/* ---------- 플레이어 리그 ---------- */
export class Rig {
  constructor(scene, parent) {
    this.scene = scene;
    this.root = scene.make.container({ x: 0, y: 0 }, false);
    parent.add(this.root);
    this.flashT = 0; this.flashing = false; this.poseClock = 0;
  }
  build(id) {
    const s = this.scene, P = PRESETS[id], mc = (x, y) => s.make.container({ x, y }, false);
    this.id = id; this.P = P;
    this.root.removeAll(true); this.weaponImg = null; this.flashT = 0; this.flashing = false;
    this.flip = P.flipX ? -1 : 1;
    this.hipY = P.hipY; this.spinCy = P.hipY;
    this.hip = mc(0, this.hipY);
    this.imgs = {}; this.anchors = {};
    for (const [pn, cfg] of Object.entries(P.poses)) {
      const im = s.make.image({ x: 0, y: -this.hipY, key: cfg.key }, false);
      im.setOrigin(cfg.ax / im.width, cfg.ay / im.height);
      im.baseScale = cfg.scale;
      im.setScale(cfg.scale * this.flip, cfg.scale).setVisible(pn === 'idle');
      this.imgs[pn] = im;
      this.anchors[pn] = { x: (cfg.hand[0] - cfg.ax) * cfg.scale * this.flip, y: (cfg.hand[1] - cfg.ay) * cfg.scale - this.hipY };
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
    img.setScale(w.len / (m.tipX - m.buttX));
    this.weaponHolder.add(img);
    this.weaponImg = img;
  }
  flash(d) { this.flashT = d; }
  apply(p, moving, speed, dt) {
    const sr = rad(p.spin), cy = this.spinCy, P = this.P;
    this.root.rotation = sr;
    this.root.x = p.dx + cy * Math.sin(sr);
    this.root.y = cy * (1 - Math.cos(sr)) - p.lift;
    const poseName = moving && this.imgs.run ? 'run' : 'idle', bodyImg = this.imgs[poseName];
    for (const pn in this.imgs) this.imgs[pn].visible = pn === poseName;
    if (moving && !this.imgs.run && P.bob) {
      this.poseClock += dt * (speed > 160 ? 15 : 10);
      const b = Math.sin(this.poseClock), bs = bodyImg.baseScale;
      this.hip.setPosition(0, this.hipY - p.bodyY * .72);
      this.hip.rotation = rad(clamp(p.bodyRot, -7, 7));
      this.hip.setScale(1 + (p.sx - 1) * .7, 1 + (p.sy - 1) * .7);
      bodyImg.setPosition(0, -this.hipY - Math.max(0, b) * 1.25);
      bodyImg.setScale(bs * (1 + P.bob.sx * b) * this.flip, bs * (1 - P.bob.sy * b));
      bodyImg.rotation = P.bob.rot * Math.sin(this.poseClock * .7);
    } else {
      this.hip.setPosition(0, this.hipY - p.bodyY);
      this.hip.rotation = rad(p.bodyRot);
      this.hip.setScale(p.sx, p.sy);
      bodyImg.setPosition(0, -this.hipY);
      bodyImg.setScale(bodyImg.baseScale * this.flip, bodyImg.baseScale);
      bodyImg.rotation = 0;
    }
    const A = this.anchors[poseName], L = P.armReach ?? 8, a = rad(p.armF), a0 = rad(20);
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

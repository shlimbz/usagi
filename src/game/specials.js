import { SFX } from '../audio/audio.js';
import { rad } from '../core/config.js';
import { PRESETS } from '../data/characters.js';
import { STUN_SPIN } from '../data/enemies.js';
import { TUNE } from '../data/tuning.js';
import { ANIMS } from '../engine/anim.js';
import { circleHitsCircle, fanHitsCircle, segDist } from '../engine/collision.js';
import { SceneCombat } from './combat.js';

/* 씬 5/9: 필살기 3종 · 충격파 · 분홍 충격 자국 */
export class SceneSpecials extends SceneCombat {
  /* ---- 필살기 ---- */
  startSpecial() {
    const P = this.P, id = this.rig.id;
    if (this.spin || this.dash || this.rush || P.gauge < this.specialCost()) return;
    P.gauge -= this.specialCost();
    this.spGained = 0;
    this.swing = null; this.extra.length = 0;
    if (this.has('band')) this.st.band = 5;
    const sid = ++this.atkId;
    if (id === 'usagi') {
      this.spin = { t:0, win:-1, id:sid };
      this.anim.play('sp_spin', true);
      SFX.play(id + '_special');
    } else if (id === 'chiikawa') {
      const mv = this.readMove(), d = mv.l > .2 ? { x:mv.x / mv.l, y:mv.y / mv.l } : this.aimDir();
      if (Math.abs(d.x) > .15) P.dir = Math.sign(d.x);
      this.dash = { t:0, dur:.3, len:TUNE.dash.len, dx:d.x, dy:d.y, sx:P.x, sy:P.y, id:sid };
      this.anim.play('dash', true);
      this.pop(P.x, P.y - 70, '시러! 시러!!!', '#ff9ac2');
      SFX.play(id + '_special');
    } else {
      this.rush = { t:0, dur:5, next:0, id:sid };
      this.pop(P.x, P.y - 70, '어떻게든 되어라~!', '#9fd3ff');
      SFX.play(id + '_special');
    }
  }
  spDmg() { return PRESETS[this.rig.id].base.dmg * (1 + this.M.spDmg); }
  doSpinHit(n) {                                              // 우사기: 회전 1회 (반경 150, 기본 피해 ×3)
    const P = this.P, R = 150 * (1 + this.M.range);
    let hits = 0;
    this.forEnemiesNear(P.x, P.y, R + 40, e => {
      if (e.lastHit === n || !circleHitsCircle(P.x, P.y, R, e.x, e.y, e.r)) return;
      e.lastHit = n; hits++;
      const d = Math.hypot(e.x - P.x, e.y - P.y) || 1;
      this.hitEnemy(e, this.spDmg() * 3, (e.x - P.x) / d, (e.y - P.y) / d, 560, STUN_SPIN);
    });
    this.rings.push({ r:R, age:0, color:0xfff2b0 });
    this.hitstop = hits ? .05 : 0;
    this.shake(140, hits ? .006 : .003);
  }
  stepSpecial(dt) {
    this.inSp = true;                                         // 필살기로 처치한 적은 게이지를 채우지 않음
    try { this.stepSpecialInner(dt); } finally { this.inSp = false; }
  }
  stepSpecialInner(dt) {
    const P = this.P;
    if (this.spin) {
      const a = ANIMS.sp_spin;
      this.spin.t += dt;
      const u = this.spin.t / a.dur, w = a.atk.findIndex(r => u >= r[0] && u < r[1]);
      if (w >= 0 && w !== this.spin.win) { this.spin.win = w; this.doSpinHit(this.spin.id * 10 + w); }
      if (u >= 1) {                                           // 회전이 끝나면 충격파
        this.waves.push({ x:P.x, y:P.y, r:20, max:420, sp:420 / .35, id:this.spin.id * 10 + 7, dmg:this.spDmg() * 2 });
        this.spin = null; this.atkTimer = Math.min(this.atkTimer, .15);
        this.shake(180, .007); SFX.play('boom');
      }
    }
    if (this.dash) {
      const dsh = this.dash, X = this.X, px = P.x, py = P.y;
      dsh.t += dt;
      const k = Math.min(1, dsh.t / dsh.dur), v = dsh.len / dsh.dur;
      P.x += dsh.dx * v * dt; P.y += dsh.dy * v * dt; P.vx = dsh.dx * 200; P.vy = dsh.dy * 200;
      const base = this.spDmg() * TUNE.dash.mul, nx = -dsh.dy, ny = dsh.dx, hw = TUNE.dash.w / 2;
      this.forEnemiesNear((px + P.x) / 2, (py + P.y) / 2, hw + 60, e => {
        if (e.lastHit === dsh.id || segDist(e.x, e.y, px, py, P.x, P.y) > hw + e.r) return;
        e.lastHit = dsh.id;
        const side = ((e.x - P.x) * nx + (e.y - P.y) * ny) >= 0 ? 1 : -1;
        this.hitEnemy(e, base, nx * side, ny * side, 520, STUN_SPIN);
      });
      if (k >= 1) {
        if (X.guard) { this.trails.push({ x0:dsh.sx, y0:dsh.sy, x1:P.x, y1:P.y, t:3, tick:0 }); this.st.courMax = 4; }
        this.dash = null; this.st.postInv = .3; this.atkTimer = Math.min(this.atkTimer, .1);
        this.shake(120, .005);
      }
    }
    if (this.rush) {                                          // 하치와레: 5초간 0.12초마다 랜덤 방향 2연타 찌르기
      const r = this.rush, sh = { lance:true, range:this.D.range * 1.3, halfW:28 };   // 가는 창으로 사방 찌르기
      r.t += dt; r.next -= dt;
      while (r.next <= 0 && r.t < r.dur) {
        r.next += .12;
        const a = Math.random() * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a), aid = ++this.atkId;
        this.forEnemiesNear(P.x, P.y, sh.range + 40, e => {
          if (!this.inShape(P.x, P.y, { x:dx, y:dy }, sh, e)) return;
          const d = Math.hypot(e.x - P.x, e.y - P.y) || 1;
          this.hitEnemy(e, this.spDmg() * .7, (e.x - P.x) / d, (e.y - P.y) / d, 0, 0, { raw:false });
          this.hitEnemy(e, this.spDmg() * .7, (e.x - P.x) / d, (e.y - P.y) / d, 800, STUN_SPIN);
        });
        this.slashes.push(this.slashOf({ x:dx, y:dy }, sh, { color:0x9fd3ff }));
        if (Math.abs(dx) > .15) P.dir = Math.sign(dx);
        this.anim.play('attack_thrust', true);
        SFX.play('swing');
      }
      if (r.t >= r.dur) { this.rush = null; this.atkTimer = .1; }
    }
    // 충격파 링 (우사기 필살기): 반경이 퍼지며 지나가는 적을 한 번씩 타격
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.r += w.sp * dt;
      this.forEnemiesNear(w.x, w.y, w.r + 30, e => {
        if (e.waveId === w.id) return;
        const d = Math.hypot(e.x - w.x, e.y - w.y);
        if (d - e.r > w.r) return;
        e.waveId = w.id;
        this.hitEnemy(e, w.dmg, (e.x - w.x) / (d || 1), (e.y - w.y) / (d || 1), 520, STUN_SPIN);
      });
      if (w.r >= w.max) this.waves.splice(i, 1);
    }
    // 분홍 충격 자국 (모두를 지키는 용기)
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i];
      tr.t -= dt; tr.tick -= dt;
      if (tr.tick <= 0) {
        tr.tick = .25;
        const base = this.spDmg() * .25;
        this.forEnemiesNear((tr.x0 + tr.x1) / 2, (tr.y0 + tr.y1) / 2, Math.hypot(tr.x1 - tr.x0, tr.y1 - tr.y0) / 2 + 60, e => {
          if (segDist(e.x, e.y, tr.x0, tr.y0, tr.x1, tr.y1) <= TUNE.dash.w / 2 + e.r) this.hitEnemy(e, base, 0, 0, 0, 0, { noCrit:true });
        });
      }
      if (tr.t <= 0) this.trails.splice(i, 1);
    }
  }
}

import { SFX } from '../audio/audio.js';
import { AIM_RANGE_MUL, LS_BASE, rad, rnd } from '../core/config.js';
import { SET } from '../core/store.js';
import { PRESETS } from '../data/characters.js';
import { STUN_SWING } from '../data/enemies.js';
import { TUNE } from '../data/tuning.js';
import { circleHitsCircle, fanHitsCircle, lanceHitsCircle, rot } from '../engine/collision.js';
import { SceneWorld } from './world.js';

/* 씬 4/9: 피해 처리 · 기본 공격 · 진화 효과 · 우라 야하! */
export class SceneCombat extends SceneWorld {
  /* ================= 전투 ================= */
  /* 모든 피해는 여기로: 피해 배율 · 정예 보너스 · 치명타 · 흡혈 · 넉백 */
  hitEnemy(e, base, nx, ny, kb, stun, opt = {}) {
    if (!e.active) return 0;
    const D = this.D, M = this.M;
    let amt = base * (opt.raw ? 1 : D.dmg) * (opt.mul || 1);
    if (e.elite) amt *= 1 + M.boss;
    let crit = false;
    if (!opt.noCrit && Math.random() < D.crit) { amt *= D.critDmg; crit = true; }
    e.hp -= amt; e.flash = .08; e.lastDmg = amt;
    if (kb > 0) {
      e.kbx = nx * kb / e.mass; e.kby = ny * kb / e.mass;   // 넉백은 덮어씀 (중첩되어 날아가지 않게)
      e.stun = Math.max(e.stun, stun / Math.sqrt(e.mass));   // 무거운 적은 경직 짧음
      e.bumped = false;
    }
    if (SET.dmgNum) { e.dmgAcc += amt; if (crit) e.dmgCrit = true; }   // 피해 숫자 (render 에서 모아서 표시)
    if (M.lsChance > 0 && Math.random() < M.lsChance && this.st.lsBudget > 0) {   // 흡혈
      const h = Math.min(this.st.lsBudget, amt * (LS_BASE + M.lsAmt));
      this.st.lsBudget -= h; this.heal(h / this.D.heal);
    }
    if (e.hp <= 0) this.kill(e);
    return amt;
  }
  kill(e) {
    const P = this.P, st = this.st;
    if (!e.active) return;
    this.puff(e.x, e.y - e.r, e.r / 10);
    this.spawnGem(e.x, e.y, e.type.xp);
    P.kills++;
    const gain = 3 * this.D.gaugeMul;
    if (!this.inSp) this.addGauge(gain);
    else {                                                    // 필살기로 처치: 한 번 발동당 TUNE.spRefillCap 까지만 (무한 연쇄 방지)
      const g = Math.min(gain, Math.max(0, TUNE.spRefillCap - this.spGained));
      this.spGained += g; this.addGauge(g);
    }
    if (Math.random() < .05) P.coins += Math.round(rnd(1, 3) * (1 + this.M.coin));
    if (Math.random() < .01 * (1 + this.M.heal) * (1 + this.M.luck / 2)) this.spawnItem('food', e.x, e.y);
    if (st.fever > 0 && this.X.nonstop) st.fever = Math.min(15, st.fever + .3);
    if (this.M.streak > 0) {                                  // 연속 토벌
      const kt = this.killTimes; kt.push(this.t);
      while (kt.length && kt[0] < this.t - 3) kt.shift();
      if (kt.length >= 10) { st.streakT = 5; kt.length = 0; }
    }
    if (e.elite) {
      this.spawnItem('chest', e.x, e.y);
      this.spawnItem('food', e.x + 24, e.y + 6);
      P.coins += 30;
      if (this.has('tmedal')) { this.addGauge(50); this.heal(P.maxHp * .1); }
      this.puff(e.x, e.y - e.r, 6, 0xffd54a);
      this.shake(200, .008);
      SFX.play('boom');
    }
    SFX.play('kill');
    this.releaseEnemy(e);
  }
  forEnemiesNear(x, y, r, fn) {
    const c = this.grid.cell, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
      const a = this.grid.cellAt(gx, gy);
      if (a) for (let i = a.length - 1; i >= 0; i--) { const e = a[i]; if (e.active) fn(e); }
    }
  }
  /* 공격 방향: 자동조준 켜짐 → 사거리×AIM_RANGE_MUL 안의 가장 가까운 적. 없거나 꺼짐 → 이동(마지막) 방향 */
  aimDir() {
    const P = this.P;
    if (SET.autoAim) {
      let best = null, bd = this.D.range * AIM_RANGE_MUL;
      this.forEnemiesNear(P.x, P.y, bd, e => { const d = Math.hypot(e.x - P.x, e.y - P.y) - e.r; if (d < bd) { bd = d; best = e; } });
      if (best) { const d = Math.hypot(best.x - P.x, best.y - P.y) || 1; return { x:(best.x - P.x) / d, y:(best.y - P.y) / d }; }
    }
    return { x:P.aimX, y:P.aimY };
  }
  attackShape() { return this.D; }
  /* 공격 도형 판정 — 창(sh.lance: 앞으로 뾰족한 삼각형) 또는 봉(부채꼴). sh = { lance, range, half, halfW } */
  inShape(ox, oy, d, sh, e) {
    return sh.lance ? lanceHitsCircle(ox, oy, d.x, d.y, sh.range, sh.halfW, e.x, e.y, e.r)
                    : fanHitsCircle(ox, oy, d.x, d.y, sh.range, sh.half, e.x, e.y, e.r);
  }
  /* 판정과 같은 모양의 이펙트 (render 에서 플레이어 위치 + ox/oy 에 그림) */
  slashOf(d, sh, extra) { return { ang:Math.atan2(d.y, d.x), lance:!!sh.lance, half:sh.half, halfW:sh.halfW, r:sh.range, age:0, ...extra }; }

  /* 기본 공격 1회. extra = 야하!·2연타로 생긴 추가 공격 (이 공격에서는 다시 추가 공격·피버 판정 안 함) */
  doAttack(dir, extra) {
    const P = this.P, D = this.D, X = this.X, Wp = this.Wp, id = this.rig.id, C = PRESETS[id].base, st = this.st, xm = this.xm();
    const aid = ++this.atkId;
    let mul = 1, kbMul = 1;
    if (X.unpred) { mul = rnd(.6, 1.7); if (mul >= 1.65) kbMul = 2; }
    const dirs = [dir];
    if (id === 'chiikawa' && Wp.evo) dirs.push(rot(dir, rad(25)), rot(dir, rad(-25)));
    const hitList = [];
    for (const d of dirs) {
      this.forEnemiesNear(P.x, P.y, D.range + 40, e => {
        if (e.lastAtk === aid || !this.inShape(P.x, P.y, d, D, e)) return;
        e.lastAtk = aid;
        const dd = Math.hypot(e.x - P.x, e.y - P.y) || 1;
        if (hitList.length < 12) hitList.push(e);
        this.hitEnemy(e, C.dmg, (e.x - P.x) / dd, (e.y - P.y) / dd, D.kb * kbMul, STUN_SWING, { mul });
      });
      this.slashes.push(this.slashOf(d, D, { color:st.fever > 0 ? 0xffe066 : 0xffffff }));
    }
    // 진화 효과
    if (id === 'hachiware' && Wp.evo) {                       // 푸른 시스테마 EX: 맞은 적 주변 추가타
      for (const h of hitList) this.forEnemiesNear(h.x, h.y, 40 + 30, e => {
        if (e === h || e.lastAtk === aid || Math.hypot(e.x - h.x, e.y - h.y) > 40 + e.r) return;
        e.lastAtk = aid; this.hitEnemy(e, C.dmg * .3, 0, 0, 0, 0, { mul });
      });
    }
    if (id === 'chiikawa' && Wp.evo && P.hp <= P.maxHp * .5) { // 용기의 핑크 시스테마: 찌르기 끝 추가타
      for (const d of dirs) this.areaHit(P.x + d.x * D.range, P.y + d.y * D.range, 26, C.dmg * .5 * mul, 0, 0xff9ac2);
    }
    if (id === 'usagi' && Wp.evo) {                           // 충격파 봉: 사거리 바깥 ~ 2배까지
      const R2 = D.range * 2;
      this.forEnemiesNear(P.x, P.y, R2 + 40, e => {
        if (e.lastAtk === aid || !fanHitsCircle(P.x, P.y, dir.x, dir.y, R2, D.half, e.x, e.y, e.r)) return;
        e.lastAtk = aid;
        const dd = Math.hypot(e.x - P.x, e.y - P.y) || 1;
        this.hitEnemy(e, C.dmg * .6, (e.x - P.x) / dd, (e.y - P.y) / dd, D.kb * .6, STUN_SWING, { mul });
      });
      this.slashes.push({ ang:Math.atan2(dir.y, dir.x), half:D.half, r:R2, age:0, color:0xfff2b0, faint:true });
    }
    // 우사기: 우라!! 폭발 / 야하! 추가 휘두르기 / 우라 야하! 발동
    if (id === 'usagi') {
      if (X.ura) {
        const lv = X.ura, ch = [0, .08, .11, .15][lv] * xm * (st.fever > 0 ? 2 : 1);
        if (Math.random() < ch) {
          const tx = P.x + dir.x * D.range, ty = P.y + dir.y * D.range, r = [0, 50, 60, 70][lv];
          const burn = C.dmg * D.dmg * [0, .2, .25, .3][lv] * xm;
          this.areaHit(tx, ty, r, C.dmg * [0, 1.5, 1.75, 2][lv] * xm * mul, 300, 0xff8a3b, e => { e.burnDps = e.burnT > 0 ? Math.max(e.burnDps, burn) : burn; e.burnT = 3; });
          SFX.play('boom');
        }
      }
      if (!extra) {
        if (X.yaha && Math.random() < [0, .12, .16, .2][X.yaha] * xm) this.extra.push({ t:.12, dir });
        if (st.fever <= 0 && st.feverCd <= 0 && Math.random() < (X.pururu ? .045 : .03)) this.startFever();
      }
    }
    if (!extra && Wp.double > 0 && Math.random() < Wp.double) this.extra.push({ t:.1, dir });
    SFX.play('swing'); if (hitList.length) SFX.play('hit');
  }
  /* 원형 범위 피해 (폭발 등). onHit: 맞은 적마다 추가 처리 */
  areaHit(x, y, r, base, kb, color, onHit) {
    this.forEnemiesNear(x, y, r + 30, e => {
      if (!circleHitsCircle(x, y, r, e.x, e.y, e.r)) return;
      const d = Math.hypot(e.x - x, e.y - y) || 1;
      if (onHit) onHit(e);
      this.hitEnemy(e, base, (e.x - x) / d, (e.y - y) / d, kb, STUN_SWING, { raw:false });
    });
    this.rings.push({ x, y, r, age:0, color, fixed:true });
  }
  startFever() {
    const st = this.st;
    st.fever = 6 + (this.X.pururu ? 2 : 0) + (this.has('treat') ? 2 : 0);
    this.pop(this.P.x, this.P.y - 70, '우라 야하!', '#ffe066');
    SFX.play('usagi_trait');
  }
  endFever() {
    const st = this.st;
    st.fever = 0; st.feverCd = 8;
    if (this.X.nonstop) this.addGauge(30);
    if (this.has('treat')) this.heal(this.P.maxHp * .05);
  }

}

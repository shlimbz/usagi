import { GAUGE_MAX, MIN_INTERVAL, clamp, rad } from '../core/config.js';
import { PRESETS } from '../data/characters.js';
import { TUNE } from '../data/tuning.js';
import { SceneBase } from './base.js';

/* 씬 2/9: 능력치 계산 (기본값 × 선택지·유물·특성 보너스) */
export class SceneStats extends SceneBase {
  /* ================= 능력치 계산 =================
   * 매 스텝 한 번: 기본값 × (1 + 공용·유물·전용·무기·조건부 보너스 합)                              */
  courage() {
    if (this.rig.id !== 'chiikawa') return { c:0, g:0, k:0 };
    const P = this.P, denom = this.X.resolve ? .65 : .8;
    let c = clamp((1 - P.hp / P.maxHp) / denom, 0, 1);
    if (this.st.courMax > 0) c = 1;
    const g = Math.min(1, .55 + .45 * (P.lvl - 1) / 29);
    const enh = 1 + .1 * (this.X.brave || 0) * this.xm();
    return { c, g, k:c * g * enh };
  }
  derive() {
    const P = this.P, M = this.M, Wp = this.Wp, X = this.X, st = this.st, id = this.rig.id, C = PRESETS[id].base;
    const cour = this.courage(), fever = st.fever > 0, xm = this.xm();
    let dmg = 1 + M.dmg + Wp.dmg + .6 * cour.k;
    if (P.hp <= P.maxHp * .5) dmg += M.lowHp;
    if (st.ramen > 0) dmg += .15;
    if (st.band > 0) dmg += .25;
    if (st.mfood > 0 && st.mfoodKind === 'dmg') dmg += .5;
    if (X.did) dmg += Math.min(.2, P.lvl * .005);
    if (X.together) dmg += .2;
    let aspd = M.aspd + Wp.aspd + .4 * cour.k;
    if (fever) aspd += .5;
    if (st.cry > 0) aspd += [0, .1, .15, .2][X.cry] * xm;
    if (st.streakT > 0) aspd += M.streak;
    if (st.mfood > 0 && st.mfoodKind === 'aspd') aspd += .5;
    let spd = 1 + M.spd + .2 * cour.k + (X.hyper ? [0, .06, .12, .18][X.hyper] * xm : 0);
    if (fever) spd += .4;
    if (st.cry > 0) spd += .1;
    if (X.shiver && P.inv > 0) spd += .2;
    const arcAdd = Wp.arc + M.arcDeg + M.arcLv * TUNE.arcStep[PRESETS[id].shape];
    let arc = Math.min(360, C.arc + arcAdd), range = C.range * (1 + M.range + Wp.range);
    if (fever) { arc = Math.min(360, arc * 1.4); range *= 1.4; }
    let dr = 1;
    for (const v of M.drList) dr *= 1 - v;
    dr *= 1 - .08 * (this.lvC.armor || 0);
    if (X.sing) dr *= .95;
    if (X.together) dr *= .85;
    if (this.rush) dr *= .5;
    dr = Math.max(.4, dr);                                   // 받는 피해 감소 상한 -60%
    const posi = X.posi ? [0, .08, .16, .24][X.posi] * xm : 0;
    return {
      dmg, interval:Math.max(MIN_INTERVAL, C.cd / (1 + aspd)), arc, half:rad(arc / 2), range,
      spd, kb:C.kb * (1 + M.kb + Wp.kb), crit:Math.min(1, M.crit + M.luck / 2), critDmg:1.5 + M.critDmg,
      dr, maxHpMul:1 + M.maxhp + posi, magnet:TUNE.magnet * (1 + M.magnet), xp:C.xp * (1 + M.xp + (X.did ? .15 : 0)),
      heal:(1 + M.heal) * (X.resolve ? .5 : 1), gaugeMul:1 + M.gauge + (this.once.medal ? .3 : 0), cour
    };
  }
  syncMaxHp() {                                               // 최대 HP가 늘면 늘어난 만큼 회복
    const P = this.P, nm = Math.round(PRESETS[this.rig.id].base.hp * this.derive().maxHpMul);
    if (nm > P.maxHp) P.hp += nm - P.maxHp;
    P.maxHp = nm; P.hp = Math.min(P.hp, nm);
  }
  heal(v) {
    const P = this.P;
    if (!P.alive) return 0;
    const before = P.hp;
    P.hp = Math.min(P.maxHp, P.hp + v * this.D.heal);
    return P.hp - before;
  }
  specialCost() { return this.X.guard ? 70 : GAUGE_MAX; }
  addGauge(v) { this.P.gauge = Math.min(GAUGE_MAX, this.P.gauge + v); }

}

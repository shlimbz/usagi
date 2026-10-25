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
    const R = this.R;
    let dmg = 1 + M.dmg + Wp.dmg + .6 * cour.k + R.allinDmg + R.berserk * Math.max(0, 1 - P.hp / P.maxHp);
    if (P.hp <= P.maxHp * .5) dmg += M.lowHp;
    if (st.ramen > 0) dmg += .15;
    if (st.band > 0) dmg += .25;
    if (st.mfood > 0 && st.mfoodKind === 'dmg') dmg += .5;
    if (X.did) dmg += Math.min(.4, P.lvl * .01);
    if (X.together) dmg += .35;
    let aspd = M.aspd + Wp.aspd + .4 * cour.k;
    if (fever) aspd += .5;
    if (st.cry > 0) aspd += [0, .1, .15, .2][X.cry] * xm;
    if (st.streakT > 0) aspd += M.streak;
    if (st.mfood > 0 && st.mfoodKind === 'aspd') aspd += .5;
    let spd = 1 + M.spd + .2 * cour.k + (X.hyper ? [0, .06, .12, .18][X.hyper] * xm : 0);
    if (fever) spd += .4;
    if (st.cry > 0) spd += .1;
    if (X.shiver && P.inv > 0) spd += .2;
    spd = Math.max(.4, spd);
    if (this.once.wind) dmg += Math.max(0, spd - 1) * 3;                // 바람돌이: 이동 속도 보너스 ×2 → 공격력
    if (st.chaosOn > 0 && st.chaosKind === 'dmg') dmg *= 2;           // 혼돈의 계약
    if (st.chaosOn > 0 && st.chaosKind === 'fever') aspd += .6;
    dmg = Math.max(.1, dmg);
    const lance = PRESETS[id].shape === 'cone';
    let arc = 0, width = 0, range = C.range * (1 + M.range + Wp.range + (lance ? M.arcLv * TUNE.lanceLenStep : 0));
    if (lance) width = C.width + Wp.width + M.arcLv * TUNE.widthStep;            // 마상창: 밑변 폭
    else {                                                                      // 봉: 부채꼴 각도
      arc = C.arc + Wp.arc + M.arcDeg + M.arcLv * TUNE.arcStep.fan;
      if (arc > 360) { range *= 1 + (arc - 360) / 600; arc = 360; }            // 360° 넘친 각도는 버리지 않고 사거리로 (30° = +5%)
    }
    width *= R.widthMul; arc *= R.widthMul;
    if (fever) { arc = Math.min(360, arc * 1.4); range *= 1.4; }
    let dr = 1;
    for (const v of M.drList) dr *= 1 - v;
    dr *= 1 - .08 * (this.lvC.armor || 0);
    if (X.sing) dr *= .95;
    if (X.together) dr *= .85;
    if (this.rush) dr *= .5;
    dr = Math.max(.4, dr);                                   // 받는 피해 감소 상한 -60%
    const posi = X.posi ? [0, .08, .16, .24][X.posi] * xm : 0;
    range = Math.max(30, range);
    return {
      dmg, interval:Math.max(MIN_INTERVAL, C.cd / (1 + Math.max(-.5, aspd))), lance, arc, half:rad(arc / 2), width, halfW:width / 2, range,
      spd, kb:C.kb * (1 + M.kb + Wp.kb), crit:Math.min(1, M.crit + M.luck / 2), critDmg:1.5 + M.critDmg,
      dr, maxHpMul:Math.max(.2, 1 + M.maxhp + posi), magnet:TUNE.magnet * (1 + M.magnet), xp:C.xp * (1 + M.xp + (X.did ? .25 : 0)),
      heal:(1 + M.heal) * (X.resolve ? .5 : 1), gaugeMul:1 + M.gauge + (this.once.medal ? .5 : 0), cour
    };
  }
  syncMaxHp() {                                               // 최대 HP가 늘면 늘어난 만큼 회복
    const P = this.P, nm = Math.round(PRESETS[this.rig.id].base.hp * this.derive().maxHpMul);
    if (nm > P.maxHp) P.hp += nm - P.maxHp;
    P.maxHp = nm; P.hp = Math.min(P.hp, nm);
  }
  /* 회복. ls = 흡혈 (흡혈귀·악마의 거래 중에도 흡혈은 됨). 가득 찬 뒤 넘친 양은 '넘치는 기운' 피해로 모음 */
  heal(v, ls) {
    const P = this.P, R = this.R;
    if (!P.alive || (R.noHeal && !ls)) return 0;
    const before = P.hp, amt = v * this.D.heal * R.healMul;
    P.hp = Math.min(P.maxHp, P.hp + amt);
    const got = P.hp - before;
    if (R.overflow > 0 && amt > got) this.st.overflowAcc += amt - got;
    return got;
  }
  specialCost() { return this.X.guard ? 70 : GAUGE_MAX; }
  addGauge(v) { this.P.gauge = Math.min(GAUGE_MAX, this.P.gauge + v); }

}

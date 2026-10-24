import { SFX } from '../audio/audio.js';
import { CONTACT_CD, INV_TIME } from '../core/config.js';
import { store } from '../core/store.js';
import { PRESETS } from '../data/characters.js';
import { SceneSpecials } from './specials.js';
import { $ } from '../ui/state.js';

/* 씬 6/9: 피격 · 부활 효과 · 음식 · 게임 종료 */
export class SceneSurvival extends SceneSpecials {
  invulnerable() { return this.P.inv > 0 || !!this.spin || !!this.dash || this.st.postInv > 0 || (this.st.mfood > 0 && this.st.mfoodKind === 'inv'); }
  hurt(e) {
    const P = this.P, X = this.X, st = this.st;
    if (this.invulnerable() || e.hitCd > 0) return;
    e.hitCd = CONTACT_CD;
    P.hp -= e.dmg * this.D.dr;
    P.inv = INV_TIME + (X.shiver ? .2 : 0);
    this.rig.flash(P.inv);
    this.shake(90, .003);
    SFX.play('hurt');
    const f = $('hurtFx'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    if (X.cry) st.cry = 3;
    if (this.has('hanky') && st.hankyCd <= 0) { st.courMax = 3; st.hankyCd = 10; }
    if (P.hp <= 0) {
      if (X.cando && st.candoCd <= 0) { P.hp = 1; P.inv = 2; st.candoCd = 90; this.pop(P.x, P.y - 70, '할 수 있어…!', '#ff9ac2'); }
      else if (this.miracle > 0) { this.miracle--; P.hp = 1; P.inv = 2; this.pop(P.x, P.y - 70, '작은 기적!', '#c38bff'); }
      else if (this.has('oldcharm') && !this.oldCharmUsed) { this.oldCharmUsed = true; P.hp = P.maxHp * .5; P.inv = 2; this.pop(P.x, P.y - 70, '낡은 부적!', '#ffd54a'); }
    }
    if (P.hp > 0 && X.together && P.hp < P.maxHp * .3 && st.togetherCd <= 0) {
      st.togetherCd = 90; this.heal(P.maxHp * .3); this.pop(P.x, P.y - 70, '모두 함께라면!', '#9fd3ff');
    }
    if (P.hp <= 0) { P.hp = 0; this.endRun(false); }
  }
  eat(it) {
    const P = this.P, st = this.st;
    this.heal(P.maxHp * .2);
    if (this.has('ramen')) st.ramen = 8;
    if (this.has('mfood')) { st.mfood = 10; st.mfoodKind = ['dmg', 'aspd', 'inv'][Math.floor(Math.random() * 3)]; this.pop(P.x, P.y - 70, { dmg:'힘이 솟는다!', aspd:'손이 빨라진다!', inv:'무적!' }[st.mfoodKind], '#ffb300'); }
    if (this.X.pururu && st.pururuCd <= 0 && st.fever <= 0) { st.pururuCd = 30; this.startFever(); }
    SFX.play('eat');
  }
  endRun(cleared) {
    const P = this.P, id = this.rig.id;
    P.alive = false;
    const fmt = t => `${Math.floor(t / 60)}분 ${String(Math.floor(t % 60)).padStart(2, '0')}초`;
    const prev = store.data.best[id], rec = { time:this.t, kills:P.kills, lvl:P.lvl, cleared };
    const better = !prev || (cleared && !prev.cleared) || (cleared === !!prev.cleared && (this.t > prev.time + .5 || (Math.abs(this.t - prev.time) <= .5 && P.kills > prev.kills)));
    if (better) { store.data.best[id] = rec; store.save(); }
    const b = store.data.best[id];
    $('resTitle').textContent = cleared ? '클리어! 🎉' : '쓰러졌어요';
    $('resTxt').innerHTML = `${PRESETS[id].name} · 생존 <b>${fmt(this.t)}</b><br>처치 <b>${P.kills}</b> · 레벨 <b>${P.lvl}</b> · 보수 <b>${P.coins}</b>`;
    $('resBest').textContent = better ? '★ 최고 기록 갱신!' : `최고 기록: ${b.cleared ? '클리어 · ' : ''}${fmt(b.time)} · 처치 ${b.kills}`;
    $('resBuild').innerHTML = this.buildHtml();
    SFX.play(cleared ? 'clear' : 'over');
    this.setMode('result');
  }

}

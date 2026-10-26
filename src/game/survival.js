import { SFX } from '../audio/audio.js';
import { CONTACT_CD, INV_TIME } from '../core/config.js';
import { store } from '../core/store.js';
import { PRESETS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { SceneSpecials } from './specials.js';
import { $ } from '../ui/state.js';
import { app } from '../core/app.js';

/* 씬 6/9: 피격 · 부활 효과 · 음식 · 게임 종료 */
export class SceneSurvival extends SceneSpecials {
  invulnerable() {
    const st = this.st;
    return this.P.inv > 0 || !!this.spin || !!this.dash || st.postInv > 0 || (st.mfood > 0 && st.mfoodKind === 'inv') || st.starInv > 0 || st.chaosInv > 0;
  }
  /* 적과 부딪힘 (같은 적은 CONTACT_CD 초마다) */
  hurt(e) {
    if (this.invulnerable() || e.hitCd > 0) return;
    e.hitCd = CONTACT_CD;
    this.damagePlayer(e.dmg, e);
  }
  /* 플레이어가 받는 모든 피해 (접촉·적 투사체). src = 때린 적 (투사체면 null) */
  damagePlayer(amount, src) {
    const P = this.P, X = this.X, st = this.st, R = this.R;
    if (this.invulnerable() || !P.alive) return;
    if (app.sandbox && app.sandbox.god) { this.rig.flash(.15); return; }   // 테스트 페이지: 무적 (맞은 표시만)
    if (st.shield > 0) {                                     // 껍데기 계약: 보호막이 한 번 막음
      st.shield = 0; st.shieldT = R.shieldCd; P.inv = INV_TIME;
      this.pop(P.x, P.y - 70, '보호막!', '#fff2b0'); SFX.play('hit');
      return;
    }
    P.hp -= amount * this.D.dr * (1 + R.dmgTaken);
    P.inv = INV_TIME + (X.shiver ? .2 : 0);
    this.rig.flash(P.inv);
    this.shake(90, .003);
    SFX.play('hurt');
    const f = $('hurtFx'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    if (R.thorns > 0) this.reflect(amount * R.thorns, src);  // 가시: 원래 피해(방어 전) × 배율을 주변에
    if (X.cry) st.cry = 3;
    if (this.has('hanky') && st.hankyCd <= 0) { st.courMax = 3; st.hankyCd = 10; }
    if (P.hp <= 0) {
      if (X.cando && st.candoCd <= 0) { P.hp = 1; P.inv = 2; st.candoCd = 90; this.pop(P.x, P.y - 70, '할 수 있어…!', '#ff9ac2'); }
      else if (this.miracle > 0) { this.miracle--; P.hp = P.maxHp * .5; P.inv = 3; this.pop(P.x, P.y - 70, '작은 기적!', '#c38bff'); }
      else if (this.has('oldcharm') && !this.oldCharmUsed) { this.oldCharmUsed = true; P.hp = P.maxHp * .5; P.inv = 2; this.pop(P.x, P.y - 70, '낡은 부적!', '#ffd54a'); }
    }
    if (P.hp > 0 && X.together && P.hp < P.maxHp * .3 && st.togetherCd <= 0) {
      st.togetherCd = 90; this.heal(P.maxHp * .3); this.pop(P.x, P.y - 70, '모두 함께라면!', '#9fd3ff');
    }
    if (P.hp <= 0) { P.hp = 0; this.endRun(false); }
  }
  /* 가시 반사: 플레이어 주변(반경 120)과 때린 적에게 고정 피해 */
  reflect(v, src) {
    const P = this.P, R0 = 120;
    let n = 0, srcHit = false;
    this.forEnemiesNear(P.x, P.y, R0 + 40, e => {
      if (n >= 40 || Math.hypot(e.x - P.x, e.y - P.y) > R0 + e.r) return;
      n++; if (e === src) srcHit = true;
      const d = Math.hypot(e.x - P.x, e.y - P.y) || 1;
      this.hitEnemy(e, v, (e.x - P.x) / d, (e.y - P.y) / d, 260, .15, { raw:true, noCrit:true });
    });
    if (src && src.active && !srcHit) this.hitEnemy(src, v, 0, 0, 0, 0, { raw:true, noCrit:true });   // 때린 적은 항상 맞음
    this.rings.push({ x:P.x, y:P.y, r:R0, age:0, color:0x9be37a, fixed:true });
  }
  eat(it) {
    const P = this.P, st = this.st;
    this.heal(P.maxHp * ITEMS.food.heal);
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
    const banked = this.bankCoins();
    $('resTxt').innerHTML = `${PRESETS[id].name} · 생존 <b>${fmt(this.t)}</b><br>처치 <b>${P.kills}</b> · 레벨 <b>${P.lvl}</b><br>` +
      `<span class="bank">💰 보수 +${banked} → 훈련소 지갑 ${store.data.wallet}</span>`;
    $('resBest').textContent = better ? '★ 최고 기록 갱신!' : `최고 기록: ${b.cleared ? '클리어 · ' : ''}${fmt(b.time)} · 처치 ${b.kills}`;
    $('resBuild').innerHTML = this.buildHtml();
    SFX.play(cleared ? 'clear' : 'over');
    this.setMode('result');
  }

}

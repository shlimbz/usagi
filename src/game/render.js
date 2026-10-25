import { AIM_RANGE_MUL, GOAL_TIME, LS_BASE, PLAYER_R, Q, VIEW_H, VIEW_W, clamp } from '../core/config.js';
import { SET } from '../core/store.js';
import { PRESETS } from '../data/characters.js';
import { TUNE } from '../data/tuning.js';
import { ITEM_RULES } from '../data/items.js';
import { NEUTRALS, NEUTRAL_RULES } from '../data/neutrals.js';
import { ENEMY_TIERS } from '../data/enemies.js';
import { SLASH_LIFE } from '../engine/anim.js';
import { lanceCorners } from '../engine/collision.js';
import { SceneLoop } from './loop.js';
import { $ } from '../ui/state.js';

/* 씬 10/10: 그리기 · HUD */
export class Main extends SceneLoop {
  /* ================= 그리기 ================= */
  render(dt) {
    const P = this.P, cam = this.cameras.main, inRun = this.mode !== 'menu' && this.mode !== 'select';
    // 무기 그림 길이 = 실제 타격 거리 (공격 순간 창끝 = 판정 끝). 메뉴에서는 기본 사거리
    this.rig.setReach(inRun && this.D ? this.D.range : PRESETS[this.rig.id].base.range);
    const camY = P.y - 30;
    cam.centerOn(P.x, camY);
    const L = P.x - VIEW_W / 2 - 80, R = P.x + VIEW_W / 2 + 80, T = camY - VIEW_H / 2 - 80, B = camY + VIEW_H / 2 + 120;
    this.bg.setPosition(Math.floor((P.x - VIEW_W / 2) / 128) * 128 - 128, Math.floor((camY - VIEW_H / 2) / 128) * 128 - 128);
    this.shadow.setPosition(P.x, P.y).setDepth(P.y - .5);

    const now = this.t, ov = this.overFx; ov.clear();
    const showNum = SET.dmgNum && inRun, showBar = SET.hpBar && inRun;
    let numBudget = 8, bars = 0, eliteN = 0;                // 프레임당 새 숫자 최대 8개, 체력바 최대 400개 (부하 제한)
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i], img = e.img;
      const vis = e.x > L - e.r && e.x < R + e.r && e.y > T && e.y < B + e.r;
      img.visible = vis;
      if (!vis) { e.dmgAcc = 0; continue; }
      const b = e.stun > 0 ? 0 : Math.sin(now * 9 + e.phase) * .05;
      img.x = e.x; img.y = e.y; img.depth = e.y;
      img.setScale((1 + b) * e.sc * e.ts * (P.x < e.x ? -1 : 1), (1 - b) * e.sc * e.ts);
      const frozen = this.st.freeze > 0, wind = e.chg === 'wind' && Math.floor(now * 14) % 2 === 0;
      const want = e.flash > 0 ? 'f' : wind ? 'w' : frozen ? 'i' : e.burnT > 0 ? 'b' : e.tint ? 'e' : '';
      if (want !== e.tintState) {
        e.tintState = want;
        if (want === 'f') img.setTintFill(0xffffff);
        else if (want === 'w') img.setTintFill(0xff5a5a);       // 돌진 직전 깜빡임 (피할 신호)
        else if (want === 'i') img.setTint(0x9fdcff);
        else if (want === 'b') img.setTint(0xff9a3b);
        else if (want === 'e') img.setTint(e.tint);      // 중간보스·보스 고유 색 또는 시간대 강화 단계 색
        else img.clearTint();
      }
      const top = e.y - (e.type.barY || e.r * 2.2) * e.sc;  // 머리 위
      if (e.elite) {                                       // 중간보스·보스: 큰 체력바 + 숫자 (항상 표시)
        const w = e.type.rank === 'boss' ? 96 : 70, y = top - 6, k = clamp(e.hp / e.maxHp, 0, 1);
        ov.fillStyle(0x000000, .55).fillRect(e.x - w / 2 - 1, y - 1, w + 2, 7);
        ov.fillStyle(0xff6b5a, 1).fillRect(e.x - w / 2, y, w * k, 5);
        const tx = this.eliteTexts[eliteN++];
        if (tx) tx.setText(Math.ceil(Math.max(0, e.hp)) + '').setPosition(e.x, y - 9).setVisible(true);
      } else if (showBar && e.hp < e.maxHp && bars++ < 400) {   // 일반 적: 맞은 적만 작은 체력바
        const w = Math.max(14, e.r * 1.5 * e.sc), y = top - 3, k = clamp(e.hp / e.maxHp, 0, 1);
        ov.fillStyle(0x000000, .5).fillRect(e.x - w / 2 - .5, y - .5, w + 1, 3.5);
        ov.fillStyle(k > .5 ? 0x7bd88f : k > .25 ? 0xffd54a : 0xff6b5a, 1).fillRect(e.x - w / 2, y, w * k, 2.5);
      }
      if (showNum && e.dmgAcc >= 1 && now - e.numT >= .14 && numBudget > 0) {   // 피해 숫자: 적마다 0.14초씩 모아서 표시
        numBudget--; e.numT = now;
        this.dmgNumber(e.x + (Math.random() - .5) * 12, top - 8, e.dmgAcc, e.dmgCrit);
        e.dmgAcc = 0; e.dmgCrit = false;
      }
    }
    for (let i = eliteN; i < this.eliteTexts.length; i++) this.eliteTexts[i].setVisible(false);
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i], vis = g.x > L && g.x < R && g.y > T && g.y < B;
      g.img.visible = vis;
      if (vis) { g.img.x = g.x; g.img.y = g.y; }
    }
    // 맵 아이템: 위아래로 흔들림 + 바닥 빛 링(아이템 색) → 경험치 구슬(작은 마름모)·적 투사체(빨간 구슬)와 구분. 사라지기 전 깜빡임
    const gf = this.groundFx; gf.clear();
    for (const it of this.items) {
      const left = it.life > 0 ? it.life - it.t : 99, blink = left < ITEM_RULES.BLINK ? (Math.floor(it.t * (left < 1.5 ? 12 : 6)) % 2 ? .25 : 1) : 1;
      it.img.setPosition(it.x, it.y - 3 - Math.abs(Math.sin(it.t * 3)) * 4).setDepth(it.y).setAlpha(blink);
      if (inRun && it.x > L && it.x < R && it.y > T && it.y < B) {
        const pulse = .5 + .5 * Math.sin(it.t * 4), c = it.def.color;
        gf.fillStyle(c, .16 * blink).fillEllipse(it.x, it.y, 34, 12);
        gf.lineStyle(1.5, c, (.45 + .35 * pulse) * blink).strokeEllipse(it.x, it.y, 26 + pulse * 6, 9 + pulse * 2);
      }
    }
    for (let i = 0; i < this.shots.length; i++) {         // 적 투사체
      const sh = this.shots[i], vis = sh.x > L && sh.x < R && sh.y > T && sh.y < B;
      sh.img.visible = vis;
      if (vis) { sh.img.x = sh.x; sh.img.y = sh.y; sh.img.depth = sh.y + 30; sh.img.rotation = now * 8; }
    }
    // 궤도 별 (노란별 동료는 노란별 그림)
    for (let i = 0; i < this.orbImgs.length; i++) {
      const im = this.orbImgs[i], o = inRun ? this.orbPos[i] : null;
      im.setVisible(!!o);
      if (!o) continue;
      const key = o.pal ? 'n_ystar' : 'orb_star';
      if (im.texture.key !== key) im.setTexture(key);
      im.setPosition(o.x, o.y).setDepth(o.y + 20).setScale(o.pal ? .2 : 1 / 3).setRotation(o.pal ? 0 : now * 6);
    }
    // 중립 캐릭터: 진행 링 + 이름·남은 초 + 화면 밖이면 방향 화살표
    const nt = this.neutral;
    if (nt && inRun) {
      const N = NEUTRALS[nt.type], k = nt.prog / NEUTRAL_RULES.stay, bob = Math.sin(nt.t * 3) * 3;
      nt.img.setPosition(nt.x, nt.y + bob * .3).setDepth(nt.y);
      gf.lineStyle(2, N.color, .35).strokeCircle(nt.x, nt.y, NEUTRAL_RULES.radius);
      if (k > 0) { gf.lineStyle(5, N.color, .9); gf.beginPath(); gf.arc(nt.x, nt.y, NEUTRAL_RULES.radius, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); gf.strokePath(); }
      const near = Math.hypot(P.x - nt.x, P.y - nt.y) < NEUTRAL_RULES.radius;
      this.neutralText.setText(near ? `${N.name} ${Math.max(0, NEUTRAL_RULES.stay - nt.prog).toFixed(0)}초` : `${N.name}\n${N.hint}`).setPosition(nt.x, nt.y - 50).setVisible(true);
      const ar = this.neutralArrow();
      if (ar) {
        const c = Math.cos(ar.a), s2 = Math.sin(ar.a);
        ov.fillStyle(N.color, .95).fillTriangle(ar.x + c * 12, ar.y + s2 * 12, ar.x - c * 6 - s2 * 8, ar.y - s2 * 6 + c * 8, ar.x - c * 6 + s2 * 8, ar.y - s2 * 6 - c * 8);
      }
    } else this.neutralText.setVisible(false);
    for (const b of this.booms) {                        // 폭발: 주황 불꽃이 퍼지고 흰 링
      const k = b.age / .4, r = b.r * (.5 + .7 * Math.min(1, k * 2.2));
      ov.fillStyle(0xff7a2a, .55 * (1 - k)).fillCircle(b.x, b.y, r);
      ov.fillStyle(0xffe08a, .7 * (1 - k)).fillCircle(b.x, b.y, r * .55);
      ov.lineStyle(4, 0xffffff, .9 * (1 - k)).strokeCircle(b.x, b.y, r * 1.05);
    }
    for (const w of this.pwaves) {                       // 검기: 진행 방향으로 볼록한 초승달
      const a = Math.atan2(w.dy, w.dx), al = Math.min(1, w.age * 8) * Math.min(1, w.left / 60);
      ov.lineStyle(7, 0xbfe9ff, .35 * al); ov.beginPath(); ov.arc(w.x - w.dx * w.r * .6, w.y - w.dy * w.r * .6, w.r, a - 1.1, a + 1.1, false); ov.strokePath();
      ov.lineStyle(3, 0xffffff, .95 * al); ov.beginPath(); ov.arc(w.x - w.dx * w.r * .6, w.y - w.dy * w.r * .6, w.r, a - 1, a + 1, false); ov.strokePath();
    }
    for (const b of this.bolts) { ov.lineStyle(2.5, 0xbfe9ff, Math.min(1, b.t / .1)); ov.lineBetween(b.x0, b.y0, b.x1, b.y1); }
    const fxDt = this.mode === 'play' ? dt : 0;          // 일시정지 중에는 이펙트도 멈춤
    for (const p of this.puffs) {
      if (p.t < 0) continue;
      p.t += fxDt;
      const k = p.t / .25;
      if (k >= 1) { p.t = -1; p.img.setVisible(false); continue; }
      p.img.setScale(p.size * (.4 + k) / Q).setAlpha(.8 * (1 - k));
    }
    for (const n of this.nums) {                         // 피해 숫자: 위로 떠오르며 사라짐
      if (n.t < 0) continue;
      n.t += fxDt;
      if (n.t >= .6) { n.t = -1; n.obj.setVisible(false); continue; }
      n.obj.setPosition(n.x, n.y - n.t * 34).setAlpha(1 - Math.max(0, n.t - .35) / .25).setScale(n.t < .08 ? 1.25 : 1);
    }
    for (const t of this.texts) {
      if (t.t < 0) continue;
      t.t += fxDt;
      if (t.t >= .9) { t.t = -1; t.obj.setVisible(false); continue; }
      t.obj.setPosition(t.x, t.y - t.t * 40).setAlpha(1 - Math.max(0, t.t - .5) / .4);
    }
    // 친구들의 응원
    const fOn = this.st.friendsOn > 0 && inRun;
    if (fOn) {
      const offs = this.friendOffsets();
      for (const im of this.friendImgs) {
        const f = offs.find(o => o.id === im.cid);
        im.setVisible(!!f);
        if (f) im.setPosition(P.x + f.ox, P.y + f.oy).setScale(im.baseScale * (!!PRESETS[f.id].flipX !== !!PRESETS[f.id].poses.idle.flipX ? -1 : 1) * P.dir, im.baseScale).setDepth(P.y + f.oy).setAlpha(.9);
      }
    } else for (const im of this.friendImgs) im.setVisible(false);

    // 바닥 이펙트: 판정과 같은 반경·각도, 현재 플레이어 위치 기준
    const g = this.groundFx;
    if (inRun) {
      if (this.st.shield > 0) { g.lineStyle(2, 0xfff2b0, .7); g.strokeEllipse(P.x, P.y - 22, 54, 64); }
      if (this.st.starInv > 0 || this.st.chaosInv > 0) { g.fillStyle(0xfff27a, .3 + .2 * Math.sin(this.t * 20)); g.fillEllipse(P.x, P.y, 76, 24); }
      if (this.st.freeze > 0) { g.fillStyle(0x9fdcff, .06); g.fillRect(L, T, R - L, B - T); }
      const cour = this.D ? this.D.cour : null;
      if (cour && cour.k > 0) {                           // 용기 오라
        g.fillStyle(0xff7ab0, .12 + .25 * cour.k); g.fillEllipse(P.x, P.y, 60 + 30 * cour.k, 18 + 9 * cour.k);
      }
      if (this.st.fever > 0) {                            // 우라 야하! 오라
        const pulse = .5 + .5 * Math.sin(this.t * 16);
        g.fillStyle(0xffe066, .25 + .2 * pulse); g.fillEllipse(P.x, P.y, 80, 24);
      }
      if (this.X.sing) { g.lineStyle(1.5, 0x9fd3ff, .25); g.strokeCircle(P.x, P.y, 140); }
      for (const tr of this.trails) { g.lineStyle(TUNE.dash.w, 0xff7ab0, .18 * Math.min(1, tr.t)); g.lineBetween(tr.x0, tr.y0, tr.x1, tr.y1); }
      if (this.dash) { const ds = this.dash; g.lineStyle(TUNE.dash.w, 0xff9ac2, .3); g.lineBetween(ds.sx, ds.sy, P.x, P.y); }
    }
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const sl = this.slashes[i]; sl.age += fxDt;
      const k = sl.age / SLASH_LIFE;
      if (k >= 1) { this.slashes.splice(i, 1); continue; }
      const cx = P.x + (sl.ox || 0), cy = P.y + (sl.oy || 0);
      if (sl.lance) {                                     // 마상창: 판정과 같은 삼각형, 창끝이 앞으로 뻗어 나감
        const dx = Math.cos(sl.ang), dy = Math.sin(sl.ang), reach = sl.r * (.55 + .45 * Math.min(1, k * 3));
        const c = lanceCorners(cx, cy, dx, dy, reach, sl.halfW * (reach / sl.r));
        g.fillStyle(sl.color || 0xffffff, (sl.faint ? .14 : .34) * (1 - k)); g.fillTriangle(...c);
        g.lineStyle(2.5, sl.color || 0xffffff, .95 * (1 - k)); g.strokeTriangle(...c);
        g.lineStyle(2, 0xffffff, .9 * (1 - k)); g.lineBetween(cx, cy, c[4], c[5]);
        continue;
      }
      const a0 = sl.ang - sl.half, a1 = sl.ang + sl.half, sweep = Math.min(1, k * 3); // 앞 1/3 동안 가장자리가 쓸고 지나감
      g.fillStyle(sl.color || 0xffffff, (sl.faint ? .14 : .32) * (1 - k));
      if (sl.half >= Math.PI - .001) g.fillCircle(cx, cy, sl.r); else { g.slice(cx, cy, sl.r, a0, a1, false); g.fillPath(); }
      g.lineStyle(3, sl.color || 0xffffff, (sl.faint ? .4 : .95) * (1 - k));
      g.beginPath(); g.arc(cx, cy, sl.r, a0, a0 + (a1 - a0) * sweep, false); g.strokePath();
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.age += fxDt;
      const k = r.age / .3;
      if (k >= 1) { this.rings.splice(i, 1); continue; }
      const cx = r.fixed ? r.x : P.x, cy = r.fixed ? r.y : P.y;
      g.fillStyle(r.color || 0xfff2b0, .3 * (1 - k)); g.fillCircle(cx, cy, r.r);
      g.lineStyle(4, 0xffffff, .9 * (1 - k)); g.strokeCircle(cx, cy, r.r * (.85 + .15 * k));
    }
    for (const w of this.waves) { g.lineStyle(10, 0xfff2b0, .7 * (1 - w.r / w.max)); g.strokeCircle(w.x, w.y, w.r); }

    const d = this.dbg; d.clear();
    if (SET.debug && inRun && this.D) {
      const sh = this.attackShape(), dir = this.aimDir(), ang = Math.atan2(dir.y, dir.x);
      d.lineStyle(1.5, 0xff3b6b, .9);
      if (sh.lance) d.strokeTriangle(...lanceCorners(P.x, P.y, dir.x, dir.y, sh.range, sh.halfW));
      else if (sh.half >= Math.PI - .001) d.strokeCircle(P.x, P.y, sh.range);
      else { d.beginPath(); d.slice(P.x, P.y, sh.range, ang - sh.half, ang + sh.half, false); d.strokePath(); }
      d.lineStyle(1, 0xff4fd8, .35); d.strokeCircle(P.x, P.y, sh.range * AIM_RANGE_MUL);
      d.lineStyle(2, 0xff4fd8, this.invulnerable() ? .35 : .95); d.strokeCircle(P.x, P.y, PLAYER_R);
      d.lineStyle(1, 0x5ec8ff, .5); d.strokeCircle(P.x, P.y, this.D.magnet);
      d.lineStyle(1.2, 0xffa13b, .9);
      for (const e of this.enemies) if (e.img.visible) d.strokeCircle(e.x, e.y, e.r);
    }

    this.hudT -= dt;
    if (this.hudT <= 0 && inRun) {
      this.hudT = .1;
      $('hpfill').style.width = (P.hp / P.maxHp * 100) + '%';
      $('hpwrap').classList.toggle('low', P.hp / P.maxHp < .3);
      $('xpfill').style.width = (P.xp / P.need * 100) + '%';
      $('lv').textContent = 'Lv ' + P.lvl;
      const left = Math.max(0, GOAL_TIME - this.t), m = Math.floor(this.t / 60), sec = Math.floor(this.t % 60);
      $('time').textContent = String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0') + (left < 60 ? ' 🔥' : '');
      $('kills').textContent = '처치 ' + P.kills;
      $('coin').textContent = '보수 ' + P.coins;
      const bb = $('bossBar'), bo = this.boss && this.boss.active ? this.boss : null;   // 보스 체력 (화면 위)
      bb.classList.toggle('on', !!bo);
      if (bo) { $('bossName').textContent = bo.type.name; $('bossFill').style.width = clamp(bo.hp / bo.maxHp, 0, 1) * 100 + '%'; }
      const tr = $('trait'), id = this.rig.id;
      let txt = '';
      if (id === 'chiikawa' && this.D) txt = `용기 ${Math.round(this.D.cour.k * 100)}%`;
      else if (id === 'usagi' && this.st.fever > 0) txt = `우라 야하! ${this.st.fever.toFixed(1)}초`;
      if (this.st.freeze > 0) txt += (txt ? ' · ' : '') + `❄️ ${this.st.freeze.toFixed(1)}초`;
      if (this.st.starInv > 0) txt += (txt ? ' · ' : '') + `⭐ 무적 ${this.st.starInv.toFixed(1)}초`;
      if (this.st.chaosOn > 0) txt += (txt ? ' · ' : '') + `🌪️ 혼돈 ${this.st.chaosOn.toFixed(0)}초`;
      tr.textContent = txt; tr.classList.toggle('on', !!txt);
      const sb = $('spinBtn'), cost = this.specialCost();
      sb.style.setProperty('--g', Math.min(100, P.gauge / cost * 100) + '%');
      sb.classList.toggle('ready', P.gauge >= cost);
      this.statT = (this.statT ?? 0) - .1;
      if (this.statT <= 0 && SET.statPanel && SET.statOpen && this.D) { this.statT = .25; $('statBody').innerHTML = this.statPanelHtml(); }
      this.fpsT -= .1;
      if (this.fpsT <= 0) { this.fpsT = .5; $('perf').textContent = `적 ${this.enemies.length} · 보석 ${this.gems.length} · ${Math.round(this.game.loop.actualFps)}fps`; }
    }
  }
  /* 우측 상단 능력치: 한 번 공격 피해, 초당 공격, 사거리·범위, 이동, 치명타, 받는 피해 … (일시 효과로 오른 값은 노란색) */
  statPanelHtml() {
    const D = this.D, P = this.P, C = PRESETS[this.rig.id].base, M = this.M, st = this.st;
    const boost = st.fever > 0 || (D.cour && D.cour.k > .05) || st.cry > 0 || st.ramen > 0 || st.band > 0 || st.mfood > 0 || st.streakT > 0;
    const row = (icon, k, v, cls = '') => `<div class="r ${cls}"><span>${icon} ${k}</span><b>${v}</b></div>`;
    const up = boost ? 'up' : '';
    let h = row('❤️', '체력', `${Math.ceil(P.hp)}/${P.maxHp}`, P.hp < P.maxHp * .3 ? 'hot' : '')
      + row('💪', '한 방 피해', Math.round(C.dmg * D.dmg), up)
      + row('⚡', '공격', `${(1 / D.interval).toFixed(2)}회/초`, up)
      + row('📏', D.lance ? '창 길이' : '사거리', Math.round(D.range), st.fever > 0 ? 'up' : '')
      + row('↔️', D.lance ? '창 폭' : '휘두름', D.lance ? Math.round(D.width) : `${Math.round(D.arc)}°`, st.fever > 0 ? 'up' : '')
      + row('👟', '이동', `×${D.spd.toFixed(2)}`, up)
      + row('🎯', '치명타', `${Math.round(D.crit * 100)}% · ×${D.critDmg.toFixed(1)}`)
      + row('🛡️', '받는 피해', D.dr < 1 ? `-${Math.round((1 - D.dr) * 100)}%` : '0%');
    if (M.lsChance > 0) h += row('🩸', '흡혈', `${Math.round(M.lsChance * 100)}% · ${Math.round((LS_BASE + M.lsAmt) * 100)}%`);
    if (M.luck > 0) h += row('🍀', '행운', `+${Math.round(M.luck * 100)}%`);
    if (this.rig.id === 'usagi') h += row('🌟', '폭주 확률', `${(this.feverChance() * 100).toFixed(1)}%`);
    if (M.multi) h += row('⚔️', '공격 횟수', `${1 + M.multi}회`);
    if (M.waveLv) h += row('🌙', '검기', `Lv${M.waveLv}`);
    h += row('☠️', '적 강화', ENEMY_TIERS[this.tier || 0].name, (this.tier || 0) >= 3 ? 'hot' : '');
    const R = this.R, orbs = this.orbCount();
    if (orbs) h += row('⭐', '궤도 별', `${orbs}개`);
    if (R.thorns > 0) h += row('🌵', '가시 반사', `${Math.round(R.thorns * 100)}%`);
    if (R.overflow > 0) h += row('⛲', '넘치는 기운', `×${R.overflow}`);
    if (R.hpDrain > 0) h += row('🩸', '체력 감소', `-${(R.hpDrain * 100).toFixed(1)}%/초`, 'hot');
    if (R.dmgTaken > 0) h += row('💢', '받는 피해 추가', `+${Math.round(R.dmgTaken * 100)}%`, 'hot');
    if (R.shieldCd > 0) h += row('🥚', '보호막', this.st.shield > 0 ? '준비됨' : `${Math.max(0, this.st.shieldT).toFixed(1)}초`);
    h += row('🧲', '줍는 범위', Math.round(D.magnet));
    if (D.cour && D.cour.k > 0) h += row('💗', '용기', `${Math.round(D.cour.k * 100)}%`, 'hot');
    if (st.fever > 0) h += row('🌟', '우라 야하!', `${st.fever.toFixed(1)}초`, 'up');
    return h;
  }

}

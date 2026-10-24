import { AIM_RANGE_MUL, GOAL_TIME, LS_BASE, PLAYER_R, Q, VIEW_H, VIEW_W, clamp } from '../core/config.js';
import { SET } from '../core/store.js';
import { PRESETS } from '../data/characters.js';
import { TUNE } from '../data/tuning.js';
import { SLASH_LIFE } from '../engine/anim.js';
import { lanceCorners } from '../engine/collision.js';
import { SceneLoop } from './loop.js';
import { $ } from '../ui/state.js';

/* 씬 9/9: 그리기 · HUD */
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
      const want = e.flash > 0 ? 'f' : e.burnT > 0 ? 'b' : e.elite ? 'e' : '';
      if (want !== e.tintState) {
        e.tintState = want;
        if (want === 'f') img.setTintFill(0xffffff);
        else if (want === 'b') img.setTint(0xff9a3b);
        else if (want === 'e') img.setTint(e.type.tint);
        else img.clearTint();
      }
      const top = e.y - (e.type.barY || e.r * 2.2) * e.sc;  // 머리 위
      if (e.elite) {                                       // 정예: 큰 체력바 + 숫자 (항상 표시)
        const w = 70, y = top - 6, k = clamp(e.hp / e.maxHp, 0, 1);
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
    for (const it of this.items) { it.img.setPosition(it.x, it.y - 3 - Math.abs(Math.sin(it.t * 3)) * 4).setDepth(it.y); }
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
    const g = this.groundFx; g.clear();
    if (inRun) {
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
      const tr = $('trait'), id = this.rig.id;
      let txt = '';
      if (id === 'chiikawa' && this.D) txt = `용기 ${Math.round(this.D.cour.k * 100)}%`;
      else if (id === 'usagi' && this.st.fever > 0) txt = `우라 야하! ${this.st.fever.toFixed(1)}초`;
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
    h += row('🧲', '줍는 범위', Math.round(D.magnet));
    if (D.cour && D.cour.k > 0) h += row('💗', '용기', `${Math.round(D.cour.k * 100)}%`, 'hot');
    if (st.fever > 0) h += row('🌟', '우라 야하!', `${st.fever.toFixed(1)}초`, 'up');
    return h;
  }

}

import { AIM_RANGE_MUL, GOAL_TIME, PLAYER_R, Q, VIEW_H, VIEW_W, clamp } from '../core/config.js';
import { SET } from '../core/store.js';
import { PRESETS } from '../data/characters.js';
import { TUNE } from '../data/tuning.js';
import { SLASH_LIFE } from '../engine/anim.js';
import { SceneLoop } from './loop.js';
import { $ } from '../ui/state.js';

/* 씬 9/9: 그리기 · HUD */
export class Main extends SceneLoop {
  /* ================= 그리기 ================= */
  render(dt) {
    const P = this.P, cam = this.cameras.main, inRun = this.mode !== 'menu' && this.mode !== 'select';
    const camY = P.y - 30;
    cam.centerOn(P.x, camY);
    const L = P.x - VIEW_W / 2 - 80, R = P.x + VIEW_W / 2 + 80, T = camY - VIEW_H / 2 - 80, B = camY + VIEW_H / 2 + 120;
    this.bg.setPosition(Math.floor((P.x - VIEW_W / 2) / 128) * 128 - 128, Math.floor((camY - VIEW_H / 2) / 128) * 128 - 128);
    this.shadow.setPosition(P.x, P.y).setDepth(P.y - .5);

    const now = this.t, ov = this.overFx; ov.clear();
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i], img = e.img;
      const vis = e.x > L - e.r && e.x < R + e.r && e.y > T && e.y < B + e.r;
      img.visible = vis;
      if (!vis) continue;
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
      if (e.elite) {                                       // 정예 체력바
        const w = 70, y = e.y - e.r * 2.6;
        ov.fillStyle(0x000000, .55).fillRect(e.x - w / 2 - 1, y - 1, w + 2, 7);
        ov.fillStyle(0xff6b5a, 1).fillRect(e.x - w / 2, y, w * clamp(e.hp / e.maxHp, 0, 1), 5);
      }
    }
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
        if (f) im.setPosition(P.x + f.ox, P.y + f.oy).setScale(im.baseScale * (PRESETS[f.id].flipX ? -1 : 1) * P.dir, im.baseScale).setDepth(P.y + f.oy).setAlpha(.9);
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
      if (sh.half >= Math.PI - .001) d.strokeCircle(P.x, P.y, sh.range);
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
      this.fpsT -= .1;
      if (this.fpsT <= 0) { this.fpsT = .5; $('perf').textContent = `적 ${this.enemies.length} · 보석 ${this.gems.length} · ${Math.round(this.game.loop.actualFps)}fps`; }
    }
  }
}

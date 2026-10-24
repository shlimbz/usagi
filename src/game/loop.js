import { SFX } from '../audio/audio.js';
import { CELL, DESPAWN_R, FIXED, GAUGE_MAX, GOAL_TIME, LS_CAP, MAX_STEPS, PLAYER_R, RING_R, S, clamp, rad, rnd } from '../core/config.js';
import { CHAR_IDS, PRESETS } from '../data/characters.js';
import { STUN_SWING } from '../data/enemies.js';
import { TUNE } from '../data/tuning.js';
import { ANIMS } from '../engine/anim.js';
import { fanHitsCircle } from '../engine/collision.js';
import { SceneProgression } from './progression.js';
import { renderCharCards } from '../ui/menu.js';
import { btn, joy } from '../ui/state.js';

/* 씬 8/9: 메인 루프 · 입력 · 타이머 · 이동 · 적 AI · 줍기 */
export class SceneLoop extends SceneProgression {
  /* ================= 메인 루프 ================= */
  update(time, delta) {
    const dts = Math.min(delta / 1000, .1), k = this.keys, JD = Phaser.Input.Keyboard.JustDown, m = this.mode;

    // 키보드 단축키
    if (JD(k.ESC) || JD(k.P)) {
      if (m === 'play') this.pauseGame();
      else if (m === 'pause') this.resume();
      else if (m === 'settings') this.closeSettings();
      else if (m === 'select') this.goMenu();
    }
    if (JD(k.ENTER)) {
      if (m === 'menu') this.act('toSelect');
      else if (m === 'select') this.act('start');
    }
    if (JD(k.R)) { if (m === 'result' || m === 'pause') this.act('restart'); else if (m === 'levelup') btn.tool = 'reroll'; }
    if (m === 'levelup') {
      ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].forEach((n, i) => { if (JD(k[n])) btn.pick = i; });
      if (JD(k.B)) btn.tool = 'banish';
      if (JD(k.X)) btn.tool = 'skip';
      if (btn.tool) { const t = btn.tool; btn.tool = null; this.levelTool(t); }
      if (btn.pick >= 0) { const i = btn.pick; btn.pick = -1; this.choose(i); }
    } else { btn.pick = -1; btn.tool = null; }
    if (m === 'select') ['ONE', 'TWO', 'THREE'].forEach((n, i) => { if (JD(k[n])) { this.setChar(CHAR_IDS[i]); renderCharCards(); } });
    if ((JD(k.SPACE) || JD(k.U)) && m === 'play') btn.spin = true;

    if (this.mode === 'play') {
      if (this.hitstop > 0) this.hitstop -= dts;
      else {
        this.acc += dts;
        let n = 0;
        while (this.acc >= FIXED && n < MAX_STEPS) {
          this.acc -= FIXED; n++; this.step(FIXED);
          if (this.hitstop > 0 || this.mode !== 'play') { this.acc = 0; break; }
        }
        if (n === MAX_STEPS) this.acc = 0;
      }
    } else if (this.mode === 'menu' || this.mode === 'select') {
      this.anim.update(dts);                              // 메뉴 배경: 캐릭터 대기 모션만
      this.actor.setPosition(0, 0).setScale(S, S).setDepth(0);
      this.rig.apply(this.anim.pose, false, 0, dts);
    }
    this.render(dts);
  }

  readMove() {
    const k = this.keys;
    let x = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    let y = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    if (!x && !y) { x = joy.x; y = joy.y; }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y, l: Math.min(l, 1) };
  }

  tickTimers(dt) {
    const st = this.st, P = this.P;
    for (const k of ['cry', 'feverCd', 'courMax', 'hankyCd', 'candoCd', 'togetherCd', 'ramen', 'band', 'mfood', 'streakT', 'pururuCd', 'postInv'])
      if (st[k] > 0) st[k] -= dt;
    if (st.fever > 0) { st.fever -= dt; if (st.fever <= 0) this.endFever(); }
    if (P.inv > 0) P.inv -= dt;
    const cap = P.maxHp * LS_CAP;                             // 흡혈 예산: 초당 최대 HP 8%
    st.lsBudget = Math.min(cap, st.lsBudget + cap * dt);
    if (this.X.posi) { st.regen += dt; if (st.regen >= 5) { st.regen -= 5; this.heal(P.maxHp * .01 * this.X.posi * this.xm()); } }
    if (this.once.lunch) {
      st.lunch -= dt;
      if (st.lunch <= 0) { st.lunch = 30; const a = Math.random() * 6.28, r = rnd(80, 140); this.spawnItem('food', P.x + Math.cos(a) * r, P.y + Math.sin(a) * r); }
    }
    if (this.has('friends')) {                               // 친구들의 응원: 30초마다 4초간 두 친구가 함께 공격
      st.friends -= dt;
      if (st.friends <= 0) { st.friends = 30; st.friendsOn = 4; st.friendHit = 0; }
      if (st.friendsOn > 0) {
        st.friendsOn -= dt; st.friendHit -= dt;
        if (st.friendHit <= 0) {
          st.friendHit = .6;
          this.friendOffsets().forEach(f => {
            const C = PRESETS[f.id].base, d = this.aimDir(), fx = P.x + f.ox, fy = P.y + f.oy;
            const sh = { lance:PRESETS[f.id].shape === 'cone', range:C.range, half:rad((C.arc || 0) / 2 + 20), halfW:(C.width || 0) / 2 + 10 };
            this.forEnemiesNear(fx, fy, C.range + 60, e => {
              if (!this.inShape(fx, fy, d, sh, e)) return;
              const dd = Math.hypot(e.x - fx, e.y - fy) || 1;
              this.hitEnemy(e, C.dmg, (e.x - fx) / dd, (e.y - fy) / dd, C.kb, STUN_SWING);
            });
            this.slashes.push(this.slashOf(d, sh, { ox:f.ox, oy:f.oy, color:0xbfe3ff }));
          });
        }
      }
    }
  }
  friendOffsets() { return CHAR_IDS.filter(i => i !== this.rig.id).map((id, k) => ({ id, ox:k ? 46 : -46, oy:-8 })); }

  step(dt) {
    const P = this.P;
    this.t += dt;
    if (this.t >= GOAL_TIME) { this.endRun(true); return; }
    this.tickTimers(dt);
    const D = this.D = this.derive(), C = PRESETS[this.rig.id].base;

    // ---- 이동 (휘두르는 동안은 몸 방향을 공격 방향에 고정) ----
    const mv = this.readMove(), run = this.keys.SHIFT.isDown || btn.run;
    if (mv.l > .2) { P.aimX = mv.x / mv.l; P.aimY = mv.y / mv.l; if (!this.swing && !this.dash && Math.abs(mv.x) > .15) P.dir = Math.sign(mv.x); }
    if (!this.dash) {
      const sp = (run ? C.run : C.walk) * D.spd * (this.spin ? .7 : 1), kk = 1 - Math.exp(-14 * dt);
      P.vx += (mv.x * sp - P.vx) * kk; P.vy += (mv.y * sp - P.vy) * kk;
      P.x += P.vx * dt; P.y += P.vy * dt;
    }
    P.gauge = Math.min(GAUGE_MAX, P.gauge + 1.2 * D.gaugeMul * dt);

    // ---- 격자 갱신 ----
    this.grid.clear();
    for (let i = 0; i < this.enemies.length; i++) this.grid.insert(this.enemies[i]);

    // ---- 필살기 ----
    if (btn.spin) { btn.spin = false; this.startSpecial(); }
    this.stepSpecial(dt);
    if (!P.alive || this.mode !== 'play') return;

    // ---- 자동 공격 ----
    if (!this.spin && !this.dash && !this.rush) {
      const animName = PRESETS[this.rig.id].anim, A = ANIMS[animName];
      this.atkTimer -= dt;
      if (!this.swing && this.atkTimer <= 0) {
        const dir = this.aimDir();
        this.swing = { t:0, done:false, dir, rate:Math.max(1, A.dur / (D.interval * .9)) };
        if (Math.abs(dir.x) > .15) P.dir = Math.sign(dir.x);
        this.atkTimer = D.interval;
        this.anim.play(animName, true);
      }
      if (this.swing) {
        this.swing.t += dt * this.swing.rate;
        const u = this.swing.t / A.dur;
        if (!this.swing.done && u >= (A.hitAt ?? .4)) {
          this.swing.done = true;
          const dir = this.aimDir();                 // 맞는 순간 다시 조준 (적이 움직였을 수 있음)
          if (Math.abs(dir.x) > .15) P.dir = Math.sign(dir.x);
          this.doAttack(dir, false);
        }
        if (u >= 1) this.swing = null;
      }
      for (let i = this.extra.length - 1; i >= 0; i--) {    // 야하!·2연타 추가 공격
        const x = this.extra[i]; x.t -= dt;
        if (x.t <= 0) { this.extra.splice(i, 1); this.doAttack(this.aimDir(), true); }
      }
    }
    if (!P.alive || this.mode !== 'play') return;

    // ---- 애니메이션 ----
    const speed = Math.hypot(P.vx, P.vy), moving = speed > 20;
    const atkAnim = PRESETS[this.rig.id].anim;
    const name = this.spin ? 'sp_spin' : this.dash ? 'dash' : this.rush ? 'attack_thrust' : this.swing ? atkAnim : moving ? (speed > 155 ? 'run' : 'walk') : 'idle';
    if (!this.rush) this.anim.play(name);
    const rate = (name === 'walk' || name === 'run') ? clamp(speed / (name === 'walk' ? C.walk : C.run), .5, 1.4)
               : this.swing && name === atkAnim ? this.swing.rate : this.rush ? 3 : 1;
    this.anim.update(dt * rate);
    this.actor.setPosition(P.x, P.y).setScale(S * P.dir, S).setDepth(P.y);
    this.rig.apply(this.anim.pose, name === 'walk' || name === 'run' || (moving && !this.rig.P.bob && !this.swing), speed, dt);

    // ---- 적 이동 + 접촉 + 화상 ----
    const E = this.enemies, kd = Math.exp(-8 * dt), sing = !!this.X.sing;
    for (let i = E.length - 1; i >= 0; i--) {
      const e = E[i];
      if (i >= E.length) continue;
      let dx = P.x - e.x, dy = P.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > DESPAWN_R && !e.elite) {
        const a = Math.atan2(P.aimY, P.aimX) + (Math.random() - .5) * 2.2;
        e.x = P.x + Math.cos(a) * RING_R; e.y = P.y + Math.sin(a) * RING_R; e.kbx = e.kby = 0; e.stun = 0;
        continue;
      }
      if (e.burnT > 0) {
        e.burnT -= dt; e.hp -= e.burnDps * dt; e.dmgAcc += e.burnDps * dt;
        if (e.burnT <= 0) e.burnDps = 0;
        if (e.hp <= 0) { this.kill(e); continue; }
      }
      if (e.hitCd > 0) e.hitCd -= dt;
      dx /= d; dy /= d;
      let chase = e.stun > 0 ? 0 : e.spd;                  // 경직 중에는 다가오지 못함
      if (sing && d < 140) chase *= .85;
      if (e.stun > 0) e.stun -= dt;
      e.x += (dx * chase + e.kbx) * dt; e.y += (dy * chase + e.kby) * dt;
      e.kbx *= kd; e.kby *= kd;
      if (e.flash > 0) e.flash -= dt;
      const touch = e.r + PLAYER_R;
      if (d < touch) {
        e.x -= dx * (touch - d) * .5; e.y -= dy * (touch - d) * .5;
        this.hurt(e);
        if (!P.alive) return;
      }
    }

    // ---- 적끼리 밀어내기 (+ 밀어내기 Lv2: 날아간 적이 부딪히면 피해) ----
    const bump = (this.lvC.push || 0) >= 2;
    for (let i = 0; i < E.length; i++) {
      const e = E[i], cx = Math.floor(e.x / CELL), cy = Math.floor(e.y / CELL);
      let checks = 0;
      outer:
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const a = this.grid.cellAt(gx, gy);
        if (!a) continue;
        for (let j = 0; j < a.length; j++) {
          const o = a[j];
          if (o.id <= e.id || !o.active || !e.active) continue;
          if (++checks > 20) break outer;
          const ox = o.x - e.x, oy = o.y - e.y, min = e.r + o.r, d2 = ox * ox + oy * oy;
          if (d2 >= min * min) continue;
          let d = Math.sqrt(d2), nx, ny;
          if (d < .01) { nx = Math.random() - .5; ny = Math.random() - .5; d = .01; } else { nx = ox / d; ny = oy / d; }
          const ov = (min - d) * .8, we = o.mass / (e.mass + o.mass);
          e.x -= nx * ov * we; e.y -= ny * ov * we;
          o.x += nx * ov * (1 - we); o.y += ny * ov * (1 - we);
          if (bump) {
            for (const [a1, b1] of [[e, o], [o, e]]) {
              if (!a1.bumped && a1.kbx * a1.kbx + a1.kby * a1.kby > 150 * 150) { a1.bumped = true; this.hitEnemy(b1, a1.lastDmg * .3, 0, 0, 0, 0, { raw:true, noCrit:true }); }
            }
          }
        }
      }
    }

    // ---- 보석 ----
    const G = this.gems, mag2 = D.magnet * D.magnet, far2 = DESPAWN_R * DESPAWN_R;
    for (let i = G.length - 1; i >= 0; i--) {
      const g = G[i], dx = P.x - g.x, dy = P.y - g.y, d2 = dx * dx + dy * dy;
      if (d2 > far2) { this.lostXp += g.val; this.releaseGem(g); continue; }   // 너무 멀어진 보석은 회수 대기
      if (!g.pull && d2 < mag2) g.pull = true;
      if (!g.pull) continue;
      const d = Math.sqrt(d2) || 1;
      g.sp = Math.min(g.sp + 900 * dt, 650);
      g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
      if (d < 16) { const v = g.val; this.releaseGem(g); SFX.play('gem'); this.gainXp(v); }
    }
    this.lostT -= dt;
    if (this.lostT <= 0) {                                   // 놓친 경험치 → 근처에 큰 보석 하나
      this.lostT = TUNE.lostGemEvery;
      if (this.lostXp >= 1) { const a = Math.random() * 6.28, r = rnd(120, 220), v = Math.floor(this.lostXp); this.lostXp -= v; this.spawnGem(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, v); }
    }
    // ---- 음식·보물상자 (직접 밟아야 먹음) ----
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (Math.hypot(P.x - it.x, P.y - it.y) > 24) continue;
      it.img.destroy(); this.items.splice(i, 1);
      if (it.type === 'food') this.eat(it);
      else { this.pendingChest++; if (this.mode === 'play' && this.pendingLv === 0) this.openChest(); }
    }
    if (this.mode === 'play' && this.pendingChest > 0 && this.pendingLv === 0) this.openChest();

    this.spawnTick(dt);
  }

}

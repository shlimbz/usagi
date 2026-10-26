import { SFX } from '../audio/audio.js';
import { RING_R } from '../core/config.js';
import { app } from '../core/app.js';
import { SET } from '../core/store.js';
import { ENEMY_TIERS, ENEMY_TYPES, SCHEDULE, SHOT_RULES } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import { TUNE } from '../data/tuning.js';
import { texInfo } from '../engine/textures.js';
import { SceneStats } from './stats.js';

/* 씬 3/9: 오브젝트 풀(적·보석·아이템) · 적 스폰 */
export class SceneWorld extends SceneStats {
  /* ================= 풀 ================= */
  spawnEnemy(typeName, x, y) {
    const e = this.enemyPool.pop();
    if (!e) return null;
    const T = ENEMY_TYPES[typeName], hpK = 1 + this.t / TUNE.hpA + (this.t / TUNE.hpB) ** 2;
    const elite = T.rank === 'mid' || T.rank === 'boss';    // 중간보스·보스: 체력바·이름·보물상자
    Object.assign(e, { active:true, id:++this.enemyId, type:T, elite, x, y, kbx:0, kby:0, stun:0,
                       hp:elite ? ENEMY_TYPES.slime.hp * hpK * T.hpMul : T.hp * hpK, dmg:T.dmg * (1 + this.t / 1200),
                       shotCd:T.shot ? T.shot.cd * (.5 + Math.random() * .7) : 0, spiral:Math.random() * 6.28, orbCd:0, ramCd:0,
                       chg:'', chgT:T.charge ? T.charge.cd * (.6 + Math.random() * .5) : 0, cdx:0, cdy:0, strafe:Math.random() < .5 ? 1 : -1,
                       r:T.r, spd:T.spd * (elite ? 1 : .9 + Math.random() * .2), mass:T.mass, flash:0, tintState:'', lastAtk:-1,
                       lastHit:-1, waveId:-1, dmgAcc:0, dmgCrit:false, numT:-1, burnT:0, burnDps:0, hitCd:0, bumped:true, lastDmg:0, sc:T.scale || 1, phase:Math.random() * 6 });
    const tier = elite ? null : ENEMY_TIERS[this.tier || 0];   // 시간대 강화 단계 (기본 몹만)
    if (tier) { e.hp *= tier.hp; e.dmg *= tier.dmg; e.sc *= tier.scale; }
    e.tint = elite ? T.tint || null : tier.tint; e.tierIdx = elite ? -1 : this.tier || 0;
    e.maxHp = e.hp;
    const ti = texInfo(T.tex); e.ts = ti.scale;
    e.img.setTexture(T.tex).setOrigin(...ti.origin).setScale(e.sc * e.ts).clearTint();
    e.idx = this.enemies.length; this.enemies.push(e);
    return e;
  }
  releaseEnemy(e) {
    const last = this.enemies.pop();
    if (last !== e) { this.enemies[e.idx] = last; last.idx = e.idx; }
    e.active = false; e.idx = -1; e.img.setVisible(false);
    this.enemyPool.push(e);
  }
  spawnGem(x, y, val) {
    if (!this.gemPool.length) {                            // 풀이 가득 차면 가장 먼 보석을 회수해 자리를 만듦
      let far = null, fd = -1;
      for (const o of this.gems) { const d = (o.x - this.P.x) ** 2 + (o.y - this.P.y) ** 2; if (d > fd) { fd = d; far = o; } }
      this.lostXp += far.val; this.releaseGem(far);
    }
    const g = this.gemPool.pop();
    Object.assign(g, { active:true, x, y, val, pull:false, sp:0 });
    g.img.setTint(val >= 20 ? 0xffb300 : val >= 5 ? 0x63e07d : 0x5ec8ff).setScale((val >= 20 ? 1.6 : 1) * texInfo('gem').scale);
    g.idx = this.gems.length; this.gems.push(g);
  }
  releaseGem(g) {
    const last = this.gems.pop();
    if (last !== g) { this.gems[g.idx] = last; last.idx = g.idx; }
    g.active = false; g.idx = -1; g.img.setVisible(false);
    this.gemPool.push(g);
  }
  /* 맵 아이템 (src/data/items.js). life 초 뒤 사라짐 (0 = 계속) */
  spawnItem(type, x, y) {
    const def = ITEMS[type] || ITEMS.food, tex = def.tex, ti = texInfo(tex);
    const img = this.add.image(x, y, tex).setScale(ti.scale).setOrigin(...ti.origin).setDepth(y);
    this.items.push({ type, def, x, y, img, t:0, life:def.life });
  }
  /* 가중치로 아이템 종류 고르기 (kind = 'drop' 처치 드롭 | 'field' 맵에 저절로) — 간식 주머니(회복량)는 주먹밥 가중치 ↑ */
  pickDrop(kind) {
    let tot = 0;
    const w = k => (ITEMS[k][kind] || 0) * (k === 'food' ? 1 + this.M.heal : 1);
    for (const k in ITEMS) tot += w(k);
    let r = Math.random() * tot;
    for (const k in ITEMS) if ((r -= w(k)) <= 0) return k;
    return 'food';
  }
  /* 적 투사체 풀 */
  spawnShot(x, y, vx, vy, dmg, r) {
    const s = this.shotPool.pop();
    if (!s) return null;
    Object.assign(s, { active:true, x, y, vx, vy, dmg, r, life:SHOT_RULES.life });
    s.img.setScale(texInfo('e_shot').scale * r / 7.8).setVisible(true);
    s.idx = this.shots.length; this.shots.push(s);
    return s;
  }
  releaseShot(s) {
    const last = this.shots.pop();
    if (last !== s) { this.shots[s.idx] = last; last.idx = s.idx; }
    s.active = false; s.idx = -1; s.img.setVisible(false);
    this.shotPool.push(s);
  }
  /* 적의 원거리 공격 패턴 */
  fireShots(e) {
    const P = this.P, S0 = e.type.shot, dmg = S0.dmg * (1 + this.t / 1200), base = Math.atan2(P.y - e.y, P.x - e.x), y0 = e.y - e.r * .8 * e.sc;
    const shoot = a => this.spawnShot(e.x, y0, Math.cos(a) * S0.speed, Math.sin(a) * S0.speed, dmg, S0.r);
    if (S0.pattern === 'fan') { const n = S0.n || 3, sp = (S0.spread || 40) * Math.PI / 180; for (let i = 0; i < n; i++) shoot(base - sp / 2 + sp * (n > 1 ? i / (n - 1) : .5)); }
    else if (S0.pattern === 'ring') { const n = S0.n || 8; for (let i = 0; i < n; i++) shoot(base + i * Math.PI * 2 / n); }
    else if (S0.pattern === 'spiral') { const n = S0.n || 4; e.spiral += .45; for (let i = 0; i < n; i++) shoot(e.spiral + i * Math.PI * 2 / n); }
    else shoot(base);
  }
  puff(x, y, size, tint = 0xffffff) {
    const p = this.puffs[this.puffNext]; this.puffNext = (this.puffNext + 1) % this.puffs.length;
    p.t = 0; p.size = size; p.img.setPosition(x, y).setDepth(y).setTint(tint).setVisible(true);
  }

  /* ================= 스폰 ================= */
  pickType() {
    let total = 0;
    const ok = T => T.from <= this.t && T.w > 0 && (!T.maxAlive || this.countType(T) < T.maxAlive);
    for (const k in ENEMY_TYPES) if (ok(ENEMY_TYPES[k])) total += ENEMY_TYPES[k].w;
    let r = Math.random() * total;
    for (const k in ENEMY_TYPES) { const T = ENEMY_TYPES[k]; if (!ok(T)) continue; if ((r -= T.w) <= 0) return k; }
    return 'slime';
  }
  countType(T) { let n = 0; for (let i = 0; i < this.enemies.length; i++) if (this.enemies[i].type === T) n++; return n; }
  spawnTick(dt) {
    if (app.sandbox && app.sandbox.noSpawn) return;      // 테스트 페이지: 자동 생성 끔
    const st = SET.stress, cap = Math.min(this.MAX_ENEMIES, Math.floor(220 * st + this.t * 1.5));
    this.spawnAcc += (1 + this.t * .045) * st * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length >= cap) continue;
      const a = Math.random() * Math.PI * 2;
      this.spawnEnemy(this.pickType(), this.P.x + Math.cos(a) * RING_R, this.P.y + Math.sin(a) * RING_R);
    }
    if (this.t >= this.nextBurst) {
      this.nextBurst += 45;
      const n = Math.round(28 * st);
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        this.spawnEnemy('slime', this.P.x + Math.cos(a) * RING_R * .85, this.P.y + Math.sin(a) * RING_R * .85);
      }
    }
    const nt = ENEMY_TIERS.reduce((a, T, i) => this.t >= T.t ? i : a, 0);    // 강화 단계 올라감 알림
    if (nt !== (this.tier || 0)) { this.tier = nt; this.toast(`적이 강해졌다! ${ENEMY_TIERS[nt].name}`); SFX.play('elite'); }
    while (this.schedIdx < SCHEDULE.length && this.t >= SCHEDULE[this.schedIdx].t) {   // 중간보스·보스 (enemies.js SCHEDULE)
      const ev = SCHEDULE[this.schedIdx++], type = ev.boss ? ev.boss[Math.floor(Math.random() * ev.boss.length)] : ev.type;
      const a = Math.atan2(this.P.aimY, this.P.aimX);
      const e = this.spawnEnemy(type, this.P.x + Math.cos(a) * RING_R * .9, this.P.y + Math.sin(a) * RING_R * .9);
      if (!e) continue;
      if (ev.boss) this.boss = e;
      this.toast(`${ev.boss ? '보스' : '중간보스'} 등장! ${ENEMY_TYPES[type].name}`);
      SFX.play('elite');
    }
  }

}

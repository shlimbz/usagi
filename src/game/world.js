import { SFX } from '../audio/audio.js';
import { ELITE_TIMES, RING_R } from '../core/config.js';
import { SET } from '../core/store.js';
import { ENEMY_TYPES } from '../data/enemies.js';
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
    Object.assign(e, { active:true, id:++this.enemyId, type:T, elite:!!T.elite, x, y, kbx:0, kby:0, stun:0,
                       hp:T.elite ? ENEMY_TYPES.slime.hp * hpK * 25 : T.hp * hpK, dmg:T.dmg * (1 + this.t / 1200),
                       r:T.r, spd:T.spd * (T.elite ? 1 : .9 + Math.random() * .2), mass:T.mass, flash:0, tintState:'', lastAtk:-1,
                       lastHit:-1, waveId:-1, dmgAcc:0, dmgCrit:false, numT:-1, burnT:0, burnDps:0, hitCd:0, bumped:true, lastDmg:0, sc:T.scale || 1, phase:Math.random() * 6 });
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
  spawnItem(type, x, y) {
    const ti = texInfo(type), img = this.add.image(x, y, type).setScale(ti.scale).setOrigin(...ti.origin).setDepth(y);
    this.items.push({ type, x, y, img, t:0 });
  }
  puff(x, y, size, tint = 0xffffff) {
    const p = this.puffs[this.puffNext]; this.puffNext = (this.puffNext + 1) % this.puffs.length;
    p.t = 0; p.size = size; p.img.setPosition(x, y).setDepth(y).setTint(tint).setVisible(true);
  }

  /* ================= 스폰 ================= */
  pickType() {
    let total = 0;
    for (const k in ENEMY_TYPES) if (ENEMY_TYPES[k].from <= this.t) total += ENEMY_TYPES[k].w;
    let r = Math.random() * total;
    for (const k in ENEMY_TYPES) { const T = ENEMY_TYPES[k]; if (T.from > this.t) continue; if ((r -= T.w) <= 0) return k; }
    return 'slime';
  }
  spawnTick(dt) {
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
    if (this.eliteIdx < ELITE_TIMES.length && this.t >= ELITE_TIMES[this.eliteIdx]) {
      this.eliteIdx++;
      const a = Math.atan2(this.P.aimY, this.P.aimX);
      this.spawnEnemy('big', this.P.x + Math.cos(a) * RING_R * .9, this.P.y + Math.sin(a) * RING_R * .9);
      this.toast('커다란 녀석 등장!');
      SFX.play('elite');
    }
  }

}

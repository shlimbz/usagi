import { SFX } from '../audio/audio.js';
import { DESPAWN_R, GAUGE_MAX, PLAYER_R, VIEW_H, VIEW_W, rnd } from '../core/config.js';
import { PRESETS } from '../data/characters.js';
import { STUN_SWING } from '../data/enemies.js';
import { ITEMS, ITEM_RULES } from '../data/items.js';
import { NEUTRALS, NEUTRAL_RULES, ORBIT } from '../data/neutrals.js';
import { SHOP, SHOP_RULES } from '../data/shop.js';
import { texInfo } from '../engine/textures.js';
import { SceneProgression } from './progression.js';
import { $, btn } from '../ui/state.js';

/* 씬 8/10: 맵 아이템 · 중립 캐릭터(노란별·갑옷씨·검은별) · 궤도 별 · 적 투사체 · 갑옷 상점 · 특수 규칙(거래·유물) */
export class SceneField extends SceneProgression {
  stepField(dt) {
    this.chainBudget = 24; this.bombBudget = 8;              // 프레임당 번개 연쇄·구슬 폭발 상한 (부하 방지)
    this.stepRules(dt);
    this.stepItems(dt);
    if (this.mode !== 'play') return;
    this.stepOrbs(dt);
    this.stepShots(dt);
    this.stepNeutral(dt);
    for (let i = this.bolts.length - 1; i >= 0; i--) { this.bolts[i].t -= dt; if (this.bolts[i].t <= 0) this.bolts.splice(i, 1); }
  }

  /* ---------- 특수 규칙: 체력 감소 · 보호막 · 재생 · 넘치는 기운 · 혼돈 · 얼음 ---------- */
  stepRules(dt) {
    const P = this.P, R = this.R, st = this.st;
    for (const k of ['freeze', 'starInv', 'chaosOn', 'chaosInv']) if (st[k] > 0) st[k] -= dt;
    if (R.hpDrain > 0 && P.hp > 1) P.hp = Math.max(1, P.hp - P.maxHp * R.hpDrain * dt);
    if (R.shieldCd > 0 && st.shield <= 0) { st.shieldT -= dt; if (st.shieldT <= 0) st.shield = 1; }
    if (R.regen > 0) { st.rRegen += dt; if (st.rRegen >= 5) { st.rRegen -= 5; this.heal(P.maxHp * R.regen); } }
    if (R.overflow > 0 && st.overflowAcc >= P.maxHp * .02) {    // 넘친 회복 → 주변 폭발
      const v = st.overflowAcc * R.overflow; st.overflowAcc = 0;
      this.areaHit(P.x, P.y, 110, v, 220, 0x7bffd0, null, true);
    }
    if (R.chaos) {
      st.chaosT -= dt;
      if (st.chaosT <= 0) {
        st.chaosT = 20; st.chaosOn = 10;
        st.chaosKind = ['dmg', 'inv', 'magnet', 'fever'][Math.floor(Math.random() * 4)];
        if (st.chaosKind === 'inv') st.chaosInv = 4;
        if (st.chaosKind === 'magnet') this.pullAllGems();
        if (st.chaosKind === 'fever' && this.rig.id === 'usagi' && st.fever <= 0) this.startFever();
        this.pop(P.x, P.y - 80, { dmg:'혼돈: 공격력 ×2!', inv:'혼돈: 무적!', magnet:'혼돈: 자석!', fever:'혼돈: 폭주!' }[st.chaosKind], '#c38bff');
      }
    }
  }

  /* ---------- 맵 아이템 ---------- */
  stepItems(dt) {
    const P = this.P;
    this.fieldT += dt;
    if (this.fieldT >= ITEM_RULES.fieldEvery) {                // 맵에 저절로 생기는 아이템
      this.fieldT = 0;
      const a = Math.random() * 6.28, r = rnd(...ITEM_RULES.fieldDist);
      this.spawnItem(this.pickDrop('field'), P.x + Math.cos(a) * r, P.y + Math.sin(a) * r);
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (it.life > 0 && it.t >= it.life) { this.puff(it.x, it.y - 8, 1.2, it.def.color); it.img.destroy(); this.items.splice(i, 1); continue; }
      const far = Math.hypot(P.x - it.x, P.y - it.y);
      if (far > DESPAWN_R && it.type !== 'chest') { it.img.destroy(); this.items.splice(i, 1); continue; }
      if (far > ITEM_RULES.pickR) continue;
      it.img.destroy(); this.items.splice(i, 1);
      this.pickItem(it);
      if (this.mode !== 'play') return;
    }
    if (this.mode === 'play' && this.pendingChest > 0 && this.pendingLv === 0) this.openChest();
  }
  pickItem(it) {
    const P = this.P, D = this.D, C = PRESETS[this.rig.id].base, d = it.def;
    switch (it.type) {
      case 'food': this.eat(it); return;
      case 'chest': this.pendingChest++; if (this.mode === 'play' && this.pendingLv === 0) this.openChest(); return;
      case 'magnet': this.pullAllGems(); break;
      case 'coins': { const n = this.addCoins(Math.round(rnd(...d.coins))); this.pop(P.x, P.y - 60, `보수 +${n}`, '#ffd54a'); SFX.play('gem'); return; }
      case 'candy': this.addGauge(d.gauge); break;
      case 'bomb':
        this.forEnemiesNear(P.x, P.y, d.r + 40, e => {
          const dd = Math.hypot(e.x - P.x, e.y - P.y);
          if (dd > d.r + e.r) return;
          this.hitEnemy(e, C.dmg * d.mul * (e.elite ? .5 : 1), (e.x - P.x) / (dd || 1), (e.y - P.y) / (dd || 1), 500, .3, { noCrit:true });
        });
        this.rings.push({ x:P.x, y:P.y, r:d.r, age:0, color:0xff9a3b, fixed:true });
        this.shake(220, .01); SFX.play('boom'); break;
      case 'freeze': this.st.freeze = d.dur; break;
      case 'star': this.st.starInv = d.dur; break;
    }
    this.pop(P.x, P.y - 60, d.name + '!', '#' + d.color.toString(16).padStart(6, '0'));
    SFX.play('eat');
  }
  /* 자석: 맵의 모든 경험치 구슬을 끌어옴 (멀어서 회수 대기 중인 경험치도 바로 근처에 큰 구슬로) */
  pullAllGems() {
    for (const g of this.gems) g.pull = true;
    if (this.lostXp >= 1) { const v = Math.floor(this.lostXp); this.lostXp -= v; this.spawnGem(this.P.x + 60, this.P.y, v); this.gems[this.gems.length - 1].pull = true; }
  }

  /* ---------- 궤도 별: 노란별 동료 + 빙글빙글 별 · 별사탕 부적 · 별자리 지도 · 별의 계약 ---------- */
  orbCount() { return Math.min(ORBIT.max, this.pals + Math.round(this.M.orbs)); }
  stepOrbs(dt) {
    const n = this.orbCount(), P = this.P;
    this.orbPos.length = 0;
    if (!n) return;
    this.orbAng += ORBIT.speed * dt;
    const R = ORBIT.radius * (1 + Math.max(0, this.M.range) * .5), dmg = PRESETS[this.rig.id].base.dmg * ORBIT.dmg * (1 + this.M.orbDmg);
    for (let i = 0; i < n; i++) {
      const a = this.orbAng + i * Math.PI * 2 / n, ox = P.x + Math.cos(a) * R, oy = P.y + Math.sin(a) * R * .85;
      this.orbPos.push({ x:ox, y:oy, pal:i < this.pals });
      this.forEnemiesNear(ox, oy, ORBIT.size + 50, e => {
        if (e.orbCd > 0) return;
        const dx = e.x - ox, dy = e.y - oy, d = Math.hypot(dx, dy);
        if (d > ORBIT.size + e.r) return;
        e.orbCd = ORBIT.hitCd;
        this.hitEnemy(e, dmg, dx / (d || 1), dy / (d || 1), ORBIT.kb, STUN_SWING * .5);
      });
    }
  }

  /* ---------- 적 투사체 ---------- */
  stepShots(dt) {
    const P = this.P, far = DESPAWN_R;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const dx = s.x - P.x, dy = s.y - P.y;
      if (s.life <= 0 || Math.abs(dx) > far || Math.abs(dy) > far) { this.releaseShot(s); continue; }
      if (dx * dx + dy * dy < (s.r + PLAYER_R) ** 2) {
        const dmg = s.dmg; this.releaseShot(s);
        this.damagePlayer(dmg, null);
        if (!P.alive || this.mode !== 'play') return;
      }
    }
  }

  /* ---------- 중립 캐릭터 ---------- */
  stepNeutral(dt) {
    const P = this.P, NR = NEUTRAL_RULES;
    if (!this.neutral) {
      if (this.t < NR.first) return;
      this.neutralT -= dt;
      if (this.neutralT > 0) return;
      this.neutralT = NR.every;
      if (Math.random() < NR.chance) this.spawnNeutral();
      return;
    }
    const n = this.neutral, d = Math.hypot(P.x - n.x, P.y - n.y);
    n.life -= dt; n.t += dt;
    if (d < NR.radius) n.prog += dt; else n.prog = Math.max(0, n.prog - NR.decay * dt);
    if (n.prog >= NR.stay) { this.neutral = null; n.img.destroy(); this.neutralText.setVisible(false); this.triggerNeutral(n); return; }
    if (n.life <= 0 && n.prog <= 0) { this.puff(n.x, n.y - 20, 2, NEUTRALS[n.type].color); n.img.destroy(); this.neutral = null; this.neutralText.setVisible(false); }
  }
  spawnNeutral(type) {
    const NR = NEUTRAL_RULES;
    if (!type) {
      let tot = 0;
      const w = k => k === 'ystar' && this.pals >= NR.maxPals ? 0 : NEUTRALS[k].w;
      for (const k in NEUTRALS) tot += w(k);
      let r = Math.random() * tot;
      for (const k in NEUTRALS) if ((r -= w(k)) <= 0) { type = k; break; }
      type = type || 'armor';
    }
    const N = NEUTRALS[type], a = Math.random() * 6.28, r = rnd(...NR.dist), x = this.P.x + Math.cos(a) * r, y = this.P.y + Math.sin(a) * r;
    const ti = texInfo(N.tex), img = this.add.image(x, y, N.tex).setScale(ti.scale).setOrigin(...ti.origin).setDepth(y);
    this.neutral = { type, x, y, img, prog:0, life:NR.life, t:0 };
    this.toast(`${N.name}이(가) 나타났다!`);
    return this.neutral;
  }
  triggerNeutral(n) {
    const N = NEUTRALS[n.type];
    this.log.neutrals++;
    this.puff(n.x, n.y - 20, 3, N.color);
    if (n.type === 'ystar') {
      if (this.pals < NEUTRAL_RULES.maxPals) { this.pals++; this.toast(`${N.done} (${this.pals}/${NEUTRAL_RULES.maxPals})`); }
      else { this.addGauge(GAUGE_MAX); this.toast('노란별이 힘을 나눠줬다! 필살기 가득'); }
      SFX.play('reveal_rare');
    } else if (n.type === 'armor') this.openShop();
    else this.openTrade();
  }

  /* ---------- 갑옷씨의 상점 ---------- */
  openShop() {
    const can = SHOP.filter(it => (this.shopBought[it.id] || 0) < it.max && (!it.ok || it.ok(this)));
    const pick = [];
    while (pick.length < SHOP_RULES.slots && can.length) pick.push(can.splice(Math.floor(Math.random() * can.length), 1)[0]);
    this.shopOffer = pick.map(it => ({ it, sold:false }));
    this.renderShop();
    SFX.play('chest');
    this.setMode('shop');
  }
  renderShop() {
    const box = $('shopOpts');
    if (!box) return;
    $('shopCoins').textContent = `💰 보수 ${this.P.coins}`;
    box.innerHTML = '';
    this.shopOffer.forEach((o, i) => {
      const b = document.createElement('button'), poor = this.P.coins < o.it.price;
      b.className = 'opt shopItem' + (o.sold ? ' sold' : '') + (poor && !o.sold ? ' poor' : '');
      b.style.setProperty('--i', i);
      b.innerHTML = `<span class="ico">${o.it.icon}</span><b class="nm">${o.it.name}</b><span class="main">${o.it.d.replace(/\n/g, '<br>')}</span>` +
        `<span class="price">${o.sold ? '구매 완료' : `💰 ${o.it.price}`}</span><span class="key">${i + 1}</span>`;
      b.addEventListener('pointerdown', ev => { ev.preventDefault(); btn.buy = i; });
      box.appendChild(b);
    });
  }
  buyShop(i) {
    const o = this.shopOffer[i];
    if (this.mode !== 'shop' || !o || o.sold || this.P.coins < o.it.price) { SFX.play('hurt'); return false; }
    this.P.coins -= o.it.price;
    o.sold = true; this.log.shop++;
    this.shopBought[o.it.id] = (this.shopBought[o.it.id] || 0) + 1;
    o.it.buy(this);
    this.D = this.derive(); this.syncMaxHp();
    SFX.play('levelup');
    this.renderShop();
    return true;
  }
  leaveShop() {
    if (this.mode !== 'shop') return;
    if (this.pendingLv > 0) this.openLevelUp();
    else if (this.pendingChest > 0) this.openChest();
    else this.setMode('play');
  }
  /* 화면 밖에 있는 중립 캐릭터 방향 (render 에서 화살표) */
  neutralArrow() {
    const n = this.neutral, P = this.P;
    if (!n) return null;
    const dx = n.x - P.x, dy = n.y - (P.y - 30);
    if (Math.abs(dx) < VIEW_W / 2 - 20 && Math.abs(dy) < VIEW_H / 2 - 20) return null;
    const k = Math.min((VIEW_W / 2 - 26) / Math.abs(dx || 1), (VIEW_H / 2 - 26) / Math.abs(dy || 1));
    return { x:P.x + dx * k, y:P.y - 30 + dy * k, a:Math.atan2(dy, dx) };
  }
}

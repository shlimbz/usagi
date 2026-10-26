import { SFX } from '../audio/audio.js';
import { LEGEND_CAP, MAX_RELICS, PASSIVE_SLOTS, PITY, XP_NEED, pct } from '../core/config.js';
import { PRESETS } from '../data/characters.js';
import { COMMON, EXCL, GRADES, MUL_EXCL, MUL_OWNED, MUL_WEAPON, ONCE, RARE_UP } from '../data/choices.js';
import { CHEST_ODDS, GRADE_ORDER, RELICS } from '../data/relics.js';
import { TUNE } from '../data/tuning.js';
import { WEAPONS } from '../data/weapons.js';
import { DICE_STATS, TRADES, TRADE_RULES, diceRoll } from '../data/trades.js';
import { SceneSurvival } from './survival.js';
import { $, btn } from '../ui/state.js';
import { app } from '../core/app.js';

/* 씬 7/9: 레벨업 · 선택지 추첨 · Reroll/Banish/Skip · 보물상자 · 빌드 요약 */
export class SceneProgression extends SceneSurvival {
  /* ================= 레벨업 / 보물상자 ================= */
  gainXp(v) {
    const P = this.P;
    if (app.sandbox && app.sandbox.noXp) return;            // 테스트 페이지: 레벨업 끔
    P.xp += v * this.D.xp;
    while (P.xp >= P.need) {
      P.xp -= P.need; P.lvl++; P.need = XP_NEED(P.lvl); this.pendingLv++;
      if (this.X.did && this.st.didCd <= 0) { this.heal(P.maxHp * .1); this.st.didCd = 3; }   // 해냈다!: 레벨업 회복 (3초에 한 번 — 레벨업이 몰려도 한꺼번에 회복 안 됨)
    }
    if (this.pendingLv > 0 && this.mode === 'play') this.openLevelUp();
  }
  choiceCount() { return 3 + (this.once.cheer ? 1 : 0) + (this.X.think ? 1 : 0); }
  passiveCount() { return Object.keys(this.lvC).length; }
  /* 지금 뽑을 수 있는 모든 후보와 가중치 */
  candidates() {
    const id = this.rig.id, M = this.M, out = [], luck = 1 + M.luck, fate = this.has('fate') ? 2 : 1;
    const w = (g, k) => {
      if (g === '전설' && this.legends >= LEGEND_CAP) return 0;
      let v = GRADES[g].w * k;
      if (RARE_UP[g]) v *= luck;
      if (g === '영웅' || g === '전설') v *= fate;
      return v;
    };
    const Wd = WEAPONS[id];
    if (this.Wp.lv < 5 && !this.banned.has('weapon')) out.push({ kind:'weapon', key:'weapon', g:'일반', w:w('일반', MUL_WEAPON) });
    for (const c of COMMON) {
      if (c.shop || this.banned.has(c.id)) continue;
      const lv = this.lvC[c.id] || 0;
      if (lv >= c.max || (lv === 0 && this.passiveCount() >= PASSIVE_SLOTS)) continue;
      out.push({ kind:'common', key:c.id, def:c, g:c.g, w:w(c.g, lv ? MUL_OWNED : 1) });
    }
    for (const c of ONCE) if (!this.once[c.id] && !this.banned.has(c.id)) out.push({ kind:'once', key:c.id, def:c, g:c.g, w:w(c.g, 1) });
    for (const c of EXCL[id]) {
      const lv = this.X[c.id] || 0;
      if (lv < c.max && !this.banned.has(c.id)) out.push({ kind:'excl', key:c.id, def:c, g:c.g, w:w(c.g, MUL_EXCL * (lv ? MUL_OWNED : 1)) });
    }
    return out.filter(o => o.w > 0);
  }
  evoReady() {
    const Wd = WEAPONS[this.rig.id];
    return !this.Wp.evo && this.Wp.lv >= 5 && (this.lvC[Wd.evo.need] || 0) > 0 ? { kind:'evo', key:'evo', g:'전설', w:0 } : null;
  }
  drawOffer(n, exclude = [], rareOnly = false) {
    let pool = this.candidates().filter(o => !exclude.includes(o.key));
    if (rareOnly) { const r = pool.filter(o => RARE_UP[o.g]); if (r.length) pool = r; }   // 시간 되돌리기: 희귀 이상만
    const pick = [];
    const take = list => {
      const tot = list.reduce((s, o) => s + o.w, 0);
      let r = Math.random() * tot;
      for (let i = 0; i < list.length; i++) if ((r -= list[i].w) <= 0) return list[i];
      return list[list.length - 1];
    };
    const evo = this.evoReady();
    if (evo && !exclude.includes('evo')) pick.push(evo);
    while (pick.length < n && pool.length) { const o = take(pool); pick.push(o); pool = pool.filter(x => x !== o); }
    // 확정 보정: 8번 연속 희귀 이상이 없었으면 마지막 칸을 희귀 이상으로
    if (this.pity >= PITY && !pick.some(o => RARE_UP[o.g] || o.kind === 'evo')) {
      const rare = this.candidates().filter(o => RARE_UP[o.g] && !pick.includes(o) && !pick.some(p => p.key === o.key));
      if (rare.length) pick[Math.max(0, pick.length - 1)] = take(rare);
    }
    if (!pick.length) pick.push({ kind:'filler', key:'rice', g:'일반' }, { kind:'filler', key:'pouch', g:'일반' });
    return pick;
  }
  /* 카드 내용: icon · name · badge(종류) · main(굵은 효과, \n 줄바꿈) · sub(작은 보조) · lv/max(레벨 점) */
  describe(o) {
    const id = this.rig.id, xm = this.xm(), lance = PRESETS[id].shape === 'cone';
    if (o.kind === 'weapon') { const Wd = WEAPONS[id], n = this.Wp.lv + 1; return { icon:'⚔️', name:Wd.name, badge:'무기 강화', main:Wd.lv[n].d, lv:n, max:5 }; }
    if (o.kind === 'evo') { const e = WEAPONS[id].evo; return { icon:'🌟', name:e.name, badge:'무기 진화', main:e.d }; }
    if (o.kind === 'filler') return o.key === 'rice' ? { icon:'🍙', name:'주먹밥', badge:'', main:'체력 30% 회복' } : { icon:'💰', name:'보수 주머니', badge:'', main:'보수 +20' };
    if (o.kind === 'relic') return { icon:o.def.icon || '🎁', name:o.def.name, badge:o.def.only ? '전용 유물' : '유물', main:o.def.d };
    if (o.kind === 'trade') return { icon:o.def.icon, name:o.def.name, badge:'검은별의 거래', main:o.def.d };
    if (o.kind === 'once') return { icon:o.def.icon, name:o.def.name, badge:'한 번만', main:o.def.d };
    if (o.kind === 'excl') {
      const lv = (this.X[o.key] || 0) + 1, c = o.def;
      return { icon:c.icon, name:c.name, badge:`${PRESETS[id].name} 전용`, main:c.d(lv), sub:xm > 1 ? '사진 효과 +20%' : '', lv:c.max > 1 ? lv : 0, max:c.max };
    }
    const c = o.def, lv = (this.lvC[c.id] || 0) + 1, sign = c.minus ? '-' : '+';
    let main, sub;
    if (c.id === 'wave') {
      const W = TUNE.wave; main = `공격 방향으로 검기 발사\n피해 ${pct(W.dmg[lv - 1])} · 관통`; sub = lv > 1 ? `피해 ${pct(W.dmg[lv - 2])} → ${pct(W.dmg[lv - 1])} · 크기 ↑` : '사거리의 2.5배까지 날아감';
    } else if (c.id === 'multi') {
      main = `기본 공격 +1회\n(한 번에 ${lv + 1}번 휘두름)`; sub = '추가 공격도 같은 피해';
    } else if (c.custom) {
      if (lance) { const st = TUNE.widthStep, w0 = PRESETS[id].base.width + this.Wp.width + st * (lv - 1); main = `창 폭 +${st} · 길이 +${pct(TUNE.lanceLenStep)}`; sub = `폭 ${w0} → ${w0 + st}`; }
      else { const st = TUNE.arcStep.fan, a0 = Math.min(360, PRESETS[id].base.arc + this.Wp.arc + this.M.arcDeg + st * (lv - 1)); main = `휘두르는 각도 +${st}°`; sub = a0 + st >= 360 ? `${a0}° → 한 바퀴(360°) 완성!` : `${a0}° → ${a0 + st}°`; }
    } else if (c.count) {
      main = `${c.label} +${c.per}개`;
      sub = lv > 1 ? `${c.per * (lv - 1)}개 → ${c.per * lv}개` : '';
    } else {
      main = `${c.label} ${sign}${pct(c.per)}`;
      sub = lv > 1 ? `합계 ${sign}${pct(c.per * (lv - 1))} → ${sign}${pct(c.per * lv)}` : '';
    }
    if (c.note) sub = sub ? `${sub} · ${c.note}` : c.note;
    return { icon:c.icon, name:c.name, badge:lv > 1 ? '강화' : '새 능력', main, sub, lv, max:c.max };
  }
  applyChoice(o) {
    const P = this.P, M = this.M, id = this.rig.id;
    if (RARE_UP[o.g] || o.kind === 'evo') this.pity = 0; else this.pity++;
    if (o.g === '전설' && o.kind !== 'evo') this.legends++;
    if (o.kind === 'weapon') { if (this.Wp.lv < 5) { this.Wp.lv++; WEAPONS[id].lv[this.Wp.lv].f(this.Wp); } }
    else if (o.kind === 'evo') {
      this.Wp.evo = true;
      if (id === 'hachiware') this.Wp.range += .2;
      this.toast(WEAPONS[id].evo.name + '!');
    } else if (o.kind === 'filler') {
      if (o.key === 'rice') this.heal(P.maxHp * .3 / this.D.heal); else this.addCoins(20);
    } else if (o.kind === 'once') {
      this.once[o.key] = true;
      if (o.key === 'miracle') this.miracle++;
      if (o.key === 'toolset') { M.dmg += .25; M.spDmg += .6; }
      if (o.key === 'medal') { M.dmg += .35; M.aspd += .25; }
      if (o.key === 'lunch') { this.st.lunch = 20; M.maxhp += .2; }
      if (o.key === 'cheer') this.rerolls += 2;
    } else if (o.kind === 'excl') {
      if ((this.X[o.key] || 0) >= o.def.max) return;
      this.X[o.key] = (this.X[o.key] || 0) + 1;
      if (o.key === 'idea') this.rerolls++;
      if (o.key === 'sing') SFX.playMusic('sing');          // 노래하기: 배경음악을 '혼잣말'로
    } else {
      const c = o.def;
      if ((this.lvC[c.id] || 0) >= c.max) return;
      this.lvC[c.id] = (this.lvC[c.id] || 0) + 1;
      if (c.id === 'wave' || c.id === 'multi') M[c.key] = (M[c.key] || 0) + 1;   // 검기 Lv · 추가 공격 횟수
      else if (c.custom) M.arcLv += 1;                     // 넓게 휘두르기: 창 폭 +50·길이 +10%, 봉 +100°
      else if (c.key !== 'dr') M[c.key] += c.per;          // 받는 피해 감소(dr)는 derive()에서 Lv로 계산
      if (c.also) for (const k in c.also) M[k] += c.also[k];   // 함께 오르는 값 (기운 받기: 흡혈량)
    }
    this.D = this.derive();
    this.syncMaxHp();
  }
  openLevelUp() {
    this.lvKind = 'level';
    this.banishArmed = false;
    let n = this.choiceCount();
    const rareOnly = this.R.rareNext > 0;
    if (rareOnly) this.R.rareNext--;
    const offer = this.drawOffer(n, [], rareOnly);
    this.rareShown = rareOnly;
    if (this.memo) {                                          // 하치와레의 메모: 보관한 선택지를 꺼냄
      const m = this.candidates().find(o => o.key === this.memo.key) || (this.memo.kind === 'evo' ? this.evoReady() : null);
      if (m && !offer.some(o => o.key === m.key)) offer.push(m);
      this.memo = null;
    }
    this.offer = offer;
    this.renderOffer();
    this.revealSound();
    this.setMode('levelup');
  }
  openChest() {
    this.lvKind = 'chest'; this.rareShown = false;
    this.banishArmed = false;
    const id = this.rig.id, own = new Set(this.relics), up = this.has('goldkey') ? 1 : 0, luck = this.M.luck;
    const avail = RELICS.filter(r => !own.has(r.id) && !r.shop && (!r.only || r.only.includes(id)));
    const offer = [];
    for (let k = 0; k < 3 && avail.length; k++) {
      let r = Math.random(), gi = 0;
      for (const [g, p] of CHEST_ODDS) { if ((r -= p) <= 0) break; gi++; }
      gi = Math.min(4, gi + up + (Math.random() < luck / 2 ? 1 : 0));
      let pick = null;
      for (let gg = gi; gg >= 0 && !pick; gg--) {
        const list = avail.filter(x => x.g === GRADE_ORDER[gg] && !offer.includes(x));
        if (list.length) pick = list[Math.floor(Math.random() * list.length)];
      }
      if (!pick) pick = avail.find(x => !offer.includes(x));
      if (pick) offer.push(pick);
    }
    this.offer = this.relics.length >= MAX_RELICS ? [] : offer.map(r => ({ kind:'relic', key:r.id, def:r, g:r.g }));
    this.renderOffer();
    this.revealSound();
    this.setMode('levelup');
  }
  renderOffer() {
    const box = $('lvOpts'), trade = this.lvKind === 'trade', chest = this.lvKind === 'chest' || trade;
    $('lvTitle').textContent = trade ? '🌑 검은별의 거래 — 하나만, 혹은 거절' : this.lvKind === 'chest' ? '🎁 보물상자! 유물을 골라요' : `⬆ 레벨 업! Lv ${this.P.lvl - this.pendingLv + 1}`;
    $('lvup').classList.toggle('trade', trade);
    box.innerHTML = '';
    box.classList.toggle('banish', !!this.banishArmed);
    const pips = (lv, max) => '<span class="on">' + '●'.repeat(lv) + '</span>' + '○'.repeat(Math.max(0, max - lv));
    this.offer.forEach((o, i) => {
      const info = this.describe(o), gr = o.kind === 'evo' ? 'gevo' : GRADES[o.g].cls;
      const b = document.createElement('button');
      b.className = `opt ${gr}`;
      b.style.setProperty('--gc', o.kind === 'evo' ? '#ffd54a' : GRADES[o.g].c);
      b.style.setProperty('--i', i);
      b.innerHTML = `<span class="top"><span class="tag">${o.kind === 'evo' ? '진화' : o.g}</span><span class="badge">${info.badge || ''}</span></span>` +
        `<span class="ico">${info.icon || '✦'}</span><b class="nm">${info.name}</b>` +
        (info.max > 1 && info.lv ? `<span class="pips">${pips(info.lv, info.max)}</span>` : '') +
        `<span class="main">${String(info.main).replace(/\n/g, '<br>')}</span>` +
        (info.sub ? `<span class="sub">${info.sub}</span>` : '') + `<span class="key">${i + 1}</span>`;
      if (!chest && this.has('memo') && !this.memo && o.kind !== 'filler') {
        const k = document.createElement('i'); k.className = 'keep'; k.textContent = '📌 보관';
        k.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); btn.tool = 'keep' + i; });
        b.appendChild(k);
      }
      b.addEventListener('pointerdown', ev => { ev.preventDefault(); btn.pick = i; });
      box.appendChild(b);
    });
    const kbd = k => ` <span class="kbd">(${k})</span>`;
    $('bReroll').innerHTML = `🎲 다시 뽑기 ${this.rerolls}` + kbd('R');
    $('bBanish').innerHTML = (this.banishArmed ? '빼기 취소' : `🚫 빼기 ${this.banishes}`) + kbd('B');
    $('bReroll').style.display = $('bBanish').style.display = chest ? 'none' : '';
    $('bReroll').disabled = this.rerolls <= 0;
    $('bBanish').disabled = this.banishes <= 0 && !this.banishArmed;
    $('bBanish').classList.toggle('armed', !!this.banishArmed);
    $('bSkip').innerHTML = (trade ? '거절하기' : chest ? (this.offer.length ? '넘기기' : '가방 가득 · 보수 +30') : '넘기기 · 보수 +5') + kbd('X');
    $('lvHint').textContent = this.banishArmed ? '이번 판에서 뺄 카드를 누르세요' : trade ? '거래는 이번 판 끝까지 유지돼요' :
      chest ? `유물 ${this.relics.length}/${MAX_RELICS}` : (this.R.rareNext > 0 || this.rareShown ? '⏪ 희귀 이상만 나오는 레벨업' : `능력 ${this.passiveCount()}/${PASSIVE_SLOTS}칸 · ${Math.max(0, PITY - this.pity)}번 안에 희귀 이상 확정`);
  }
  /* 화면에 나온 카드 중 가장 높은 등급에 맞춰 효과음 */
  revealSound() {
    const rank = { '일반':0, '고급':1, '희귀':2, '영웅':3, '전설':4 };
    const best = Math.max(0, ...this.offer.map(o => o.kind === 'evo' ? 4 : rank[o.g] ?? 0));
    SFX.play(best >= 4 ? 'reveal_legend' : best >= 3 ? 'reveal_epic' : best >= 2 ? 'reveal_rare' : this.lvKind === 'chest' ? 'chest' : 'levelup');
  }
  levelTool(t) {
    if (this.mode !== 'levelup') return;
    SFX.play('click');
    if (t === 'reroll' && this.lvKind === 'level' && this.rerolls > 0) {
      if (!(this.rig.id === 'usagi' && Math.random() < .1)) this.rerolls--;
      this.offer = this.drawOffer(this.choiceCount(), [], this.rareShown); this.banishArmed = false; this.renderOffer();
    } else if (t === 'banish' && this.lvKind === 'level' && (this.banishes > 0 || this.banishArmed)) {
      this.banishArmed = !this.banishArmed; this.renderOffer();
    } else if (t === 'skip') {
      if (this.lvKind !== 'trade') this.addCoins(this.lvKind === 'chest' ? (this.offer.length ? 0 : 30) : 5);
      this.finishChoice();
    } else if (t.startsWith('keep')) {
      const i = +t.slice(4), o = this.offer[i];
      if (o && this.has('memo') && !this.memo) { this.memo = o; this.offer.splice(i, 1); this.renderOffer(); }
    }
  }
  choose(i) {
    const o = this.offer && this.offer[i];
    if (!o) return;
    if (this.banishArmed) {                                   // 빼기: 이 선택지를 이번 판에서 제거하고 그 칸만 새로 뽑음
      if (o.kind === 'evo' || o.kind === 'filler') return;
      this.banned.add(o.key); this.banishes--; this.banishArmed = false;
      const repl = this.drawOffer(1, this.offer.map(x => x.key)).find(x => x.kind !== 'evo');
      if (repl && !this.offer.some(x => x.key === repl.key)) this.offer[i] = repl; else this.offer.splice(i, 1);
      SFX.play('click'); this.renderOffer(); return;
    }
    if (o.kind === 'relic') this.addRelic(o.def);
    else if (o.kind === 'trade') {
      this.tradesTaken.add(o.key);
      o.def.take(this);
      this.D = this.derive(); this.syncMaxHp();
      this.toast(`거래 성립: ${o.def.name}`);
    } else this.applyChoice(o);
    SFX.play('click');
    this.finishChoice();
  }
  finishChoice() {
    if (this.lvKind === 'level') this.pendingLv--;
    else if (this.lvKind === 'chest') this.pendingChest--;
    this.banishArmed = false;
    if (this.pendingLv > 0) this.openLevelUp();
    else if (this.pendingChest > 0) this.openChest();
    else this.setMode('play');
  }
  /* ---------- 유물 얻기·잃기 (mod: 수정치, rule: 특수 규칙) ---------- */
  addRelic(r) {
    if (this.relics.includes(r.id)) return;
    this.relics.push(r.id);
    if (r.mod) for (const k in r.mod) this.M[k] += r.mod[k];
    if (r.rule) for (const k in r.rule) this.R[k] += r.rule[k];
    if (r.id === 'grip') this.M.arcDeg += 30;
    this.D = this.derive(); this.syncMaxHp();
  }
  removeRelic(id) {
    const i = this.relics.indexOf(id), r = RELICS.find(x => x.id === id);
    if (i < 0) return;
    this.relics.splice(i, 1);
    if (r && r.mod) for (const k in r.mod) this.M[k] -= r.mod[k];
    if (r && r.rule) for (const k in r.rule) this.R[k] -= r.rule[k];
    if (id === 'grip') this.M.arcDeg -= 30;
  }
  relicPool(minG = 0) {
    const id = this.rig.id;
    return RELICS.filter(r => !this.relics.includes(r.id) && !r.shop && (!r.only || r.only.includes(id)) && GRADE_ORDER.indexOf(r.g) >= minG);
  }
  /* 상점 '수상한 상자': 보물상자와 같은 등급 확률로 유물 1개 */
  giveRandomRelic() {
    let r = Math.random(), gi = 0;
    for (const [, p] of CHEST_ODDS) { if ((r -= p) <= 0) break; gi++; }
    let list = [];
    for (let g = Math.min(4, gi); g >= 0 && !list.length; g--) list = this.relicPool(g).filter(x => x.g === GRADE_ORDER[g]);
    if (!list.length) list = this.relicPool();
    if (!list.length || this.relics.length >= MAX_RELICS) { this.addCoins(60); return null; }
    const pick = list[Math.floor(Math.random() * list.length)];
    this.addRelic(pick); this.toast(`${pick.icon} ${pick.name}!`);
    return pick;
  }
  /* ---------- 검은별의 거래 ---------- */
  openTrade() {
    const luck = 1 + this.M.luck, can = TRADES.filter(t => !this.tradesTaken.has(t.id) && (!t.ok || t.ok(this)));
    const w = t => GRADES[t.g].w * (RARE_UP[t.g] ? luck : 1), offer = [];
    while (offer.length < TRADE_RULES.offer && can.length) {
      let r = Math.random() * can.reduce((a, t) => a + w(t), 0), k = 0;
      for (; k < can.length - 1; k++) if ((r -= w(can[k])) <= 0) break;
      offer.push(can.splice(k, 1)[0]);
    }
    this.lvKind = 'trade'; this.banishArmed = false;
    this.offer = offer.map(t => ({ kind:'trade', key:t.id, def:t, g:t.g }));
    this.renderOffer(); this.revealSound();
    this.setMode('levelup');
  }
  rollDice() {
    const out = DICE_STATS.map(([k, label]) => { const v = diceRoll(); this.M[k] += v; return `${label} ${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`; });
    this.diceText = out.join(' · ');
    this.pop(this.P.x, this.P.y - 80, '🎲 ' + out.slice(0, 2).join(' '), '#ffd54a');
  }
  coinFlip() {
    const P = this.P;
    if (Math.random() < .5) { for (let i = 0; i < 3; i++) { P.lvl++; P.need = XP_NEED(P.lvl); this.pendingLv++; } this.pop(P.x, P.y - 80, '앞면! 레벨 +3', '#ffd54a'); }
    else { P.hp = Math.max(1, P.hp / 2); this.pop(P.x, P.y - 80, '뒷면… 체력 절반', '#ff6b6b'); }
  }
  barterRelics() {
    const give = [];
    while (give.length < 2 && this.relics.length) give.push(this.relics[Math.floor(Math.random() * this.relics.length)]), this.removeRelic(give[give.length - 1]);
    const top = Math.max(...give.map(id => GRADE_ORDER.indexOf((RELICS.find(r => r.id === id) || { g:'일반' }).g)));
    let list = [];
    for (let g = Math.min(4, top + 1); g >= 0 && !list.length; g--) list = this.relicPool(g).filter(x => x.g === GRADE_ORDER[g] && !give.includes(x.id));
    if (!list.length) { this.addCoins(80); return; }
    const pick = list[Math.floor(Math.random() * list.length)];
    this.addRelic(pick); this.toast(`${pick.icon} ${pick.name} (${pick.g})!`);
  }
  shufflePassives() {
    const ids = Object.keys(this.lvC), lost = [];
    while (lost.length < 3 && ids.length) lost.push(ids.splice(Math.floor(Math.random() * ids.length), 1)[0]);
    let total = 0;
    for (const id of lost) {
      const c = COMMON.find(x => x.id === id), lv = this.lvC[id];
      if (c.id === 'wave' || c.id === 'multi') this.M[c.key] -= lv; else if (c.custom) this.M.arcLv -= lv; else if (c.key !== 'dr') this.M[c.key] -= c.per * lv;
      if (c.also) for (const k in c.also) this.M[k] -= c.also[k] * lv;
      delete this.lvC[id]; total += lv;
    }
    const pool = [['dmg', .05], ['aspd', .05], ['crit', .04], ['maxhp', .06], ['spd', .03], ['range', .04]];
    for (let i = 0; i < total * 2; i++) { const [k, v] = pool[Math.floor(Math.random() * pool.length)]; this.M[k] += v; }
    this.pop(this.P.x, this.P.y - 80, `능력 ${lost.length}개 → 강화 ${total * 2}번`, '#c38bff');
  }
  rewindLevels(n) {
    const P = this.P;
    P.lvl = Math.max(1, P.lvl - n); P.xp = 0; P.need = XP_NEED(P.lvl);
    this.R.rareNext += n;
  }

  /* 일시정지·결과 화면의 빌드 요약 */
  buildHtml() {
    const id = this.rig.id, D = this.D || this.derive(), P = this.P;
    const pips = (lv, max) => `<i>${'●'.repeat(lv)}${'○'.repeat(max - lv)}</i>`;
    const chip = (icon, name, extra = '') => `<span class="chip">${icon} ${name}${extra}</span>`;
    const sec = (title, chips) => `<div class="bsec"><h4>${title}</h4><div class="chips">${chips.join('') || '<span class="none">없음</span>'}</div></div>`;
    const Wd = WEAPONS[id];
    const out = [];
    out.push(sec('무기', [chip(this.Wp.evo ? '🌟' : '⚔️', this.Wp.evo ? Wd.evo.name : Wd.name, this.Wp.evo ? '' : pips(this.Wp.lv, 5))]));
    out.push(sec(`능력 ${this.passiveCount()}/${PASSIVE_SLOTS}`, COMMON.filter(c => this.lvC[c.id]).map(c => chip(c.icon, c.name, pips(this.lvC[c.id], c.max)))));
    out.push(sec(`${PRESETS[id].name} 전용`, EXCL[id].filter(c => this.X[c.id]).map(c => chip(c.icon, c.name, c.max > 1 ? pips(this.X[c.id], c.max) : ''))
      .concat(ONCE.filter(c => this.once[c.id]).map(c => chip(c.icon, c.name)))));
    out.push(sec(`유물 ${this.relics.length}/${MAX_RELICS}`, this.relics.map(r => RELICS.find(x => x.id === r)).filter(Boolean).map(r => chip(r.icon || '🎁', r.name))));
    if (this.tradesTaken && this.tradesTaken.size) out.push(sec('검은별의 거래', [...this.tradesTaken].map(id => TRADES.find(t => t.id === id)).filter(Boolean).map(t => chip(t.icon, t.name))));
    if (this.orbCount && this.orbCount()) out.push(sec('궤도 별', [chip('⭐', `${this.orbCount()}개`, this.pals ? ` (노란별 동료 ${this.pals})` : '')]));
    const stat = (icon, k, v) => `<div><span>${icon} ${k}</span><b>${v}</b></div>`;
    out.push(`<div class="bsec"><h4>능력치</h4><div class="stats">` +
      stat('❤️', '체력', `${Math.ceil(P.hp)}/${P.maxHp}`) + stat('💪', '공격력', `×${D.dmg.toFixed(2)}`) +
      stat('⚡', '공격 간격', `${D.interval.toFixed(2)}초`) + stat('📏', D.lance ? '창 길이' : '사거리', Math.round(D.range)) +
      stat('↔️', D.lance ? '창 폭' : '각도', D.lance ? Math.round(D.width) : `${Math.round(D.arc)}°`) + stat('🎯', '치명타', pct(D.crit)) +
      stat('🛡️', '받는 피해', `${D.dr < 1 ? '-' : ''}${pct(1 - D.dr)}`) + stat('👟', '이동', `×${D.spd.toFixed(2)}`) + `</div></div>`);
    return out.join('');
  }

}

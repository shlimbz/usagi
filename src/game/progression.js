import { SFX } from '../audio/audio.js';
import { LEGEND_CAP, MAX_RELICS, PASSIVE_SLOTS, PITY, XP_NEED, pct } from '../core/config.js';
import { PRESETS } from '../data/characters.js';
import { COMMON, EXCL, GRADES, MUL_EXCL, MUL_OWNED, MUL_WEAPON, ONCE, RARE_UP } from '../data/choices.js';
import { CHEST_ODDS, GRADE_ORDER, RELICS } from '../data/relics.js';
import { TUNE } from '../data/tuning.js';
import { WEAPONS } from '../data/weapons.js';
import { SceneSurvival } from './survival.js';
import { $, btn } from '../ui/state.js';

/* 씬 7/9: 레벨업 · 선택지 추첨 · Reroll/Banish/Skip · 보물상자 · 빌드 요약 */
export class SceneProgression extends SceneSurvival {
  /* ================= 레벨업 / 보물상자 ================= */
  gainXp(v) {
    const P = this.P;
    P.xp += v * this.D.xp;
    while (P.xp >= P.need) {
      P.xp -= P.need; P.lvl++; P.need = XP_NEED(P.lvl); this.pendingLv++;
      if (this.X.did) this.heal(P.maxHp * .1);
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
  drawOffer(n, exclude = []) {
    let pool = this.candidates().filter(o => !exclude.includes(o.key));
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
    if (o.kind === 'once') return { icon:o.def.icon, name:o.def.name, badge:'한 번만', main:o.def.d };
    if (o.kind === 'excl') {
      const lv = (this.X[o.key] || 0) + 1, c = o.def;
      return { icon:c.icon, name:c.name, badge:`${PRESETS[id].name} 전용`, main:c.d(lv), sub:xm > 1 ? '사진 효과 +20%' : '', lv:c.max > 1 ? lv : 0, max:c.max };
    }
    const c = o.def, lv = (this.lvC[c.id] || 0) + 1, sign = c.minus ? '-' : '+';
    let main, sub;
    if (c.custom) {
      if (lance) { const st = TUNE.widthStep, w0 = PRESETS[id].base.width + this.Wp.width + st * (lv - 1); main = `창 폭 +${st}`; sub = `폭 ${w0} → ${w0 + st}`; }
      else { const st = TUNE.arcStep.fan; main = `휘두르는 각도 +${st}°`; sub = lv === c.max ? '한 바퀴(360°) 완성!' : '360°까지 넓어짐'; }
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
      if (o.key === 'rice') this.heal(P.maxHp * .3 / this.D.heal); else P.coins += 20;
    } else if (o.kind === 'once') {
      this.once[o.key] = true;
      if (o.key === 'miracle') this.miracle++;
      if (o.key === 'toolset') { M.dmg += .15; M.spDmg += .3; }
      if (o.key === 'medal') { M.dmg += .2; M.aspd += .15; }
      if (o.key === 'lunch') this.st.lunch = 30;
    } else if (o.kind === 'excl') {
      if ((this.X[o.key] || 0) >= o.def.max) return;
      this.X[o.key] = (this.X[o.key] || 0) + 1;
      if (o.key === 'idea') this.rerolls++;
    } else {
      const c = o.def;
      if ((this.lvC[c.id] || 0) >= c.max) return;
      this.lvC[c.id] = (this.lvC[c.id] || 0) + 1;
      if (c.custom) M.arcLv += 1;                          // 넓게 휘두르기: 원뿔 +20°, 봉 +90°
      else if (c.key !== 'dr') M[c.key] += c.per;          // 받는 피해 감소(dr)는 derive()에서 Lv로 계산
    }
    this.D = this.derive();
    this.syncMaxHp();
  }
  openLevelUp() {
    this.lvKind = 'level';
    this.banishArmed = false;
    let n = this.choiceCount();
    const offer = this.drawOffer(n);
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
    this.lvKind = 'chest';
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
    const box = $('lvOpts'), chest = this.lvKind === 'chest';
    $('lvTitle').textContent = chest ? '🎁 보물상자! 유물을 골라요' : `⬆ 레벨 업! Lv ${this.P.lvl - this.pendingLv + 1}`;
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
    $('bSkip').innerHTML = (chest ? (this.offer.length ? '넘기기' : '가방 가득 · 보수 +30') : '넘기기 · 보수 +5') + kbd('X');
    $('lvHint').textContent = this.banishArmed ? '이번 판에서 뺄 카드를 누르세요' :
      chest ? `유물 ${this.relics.length}/${MAX_RELICS}` : `능력 ${this.passiveCount()}/${PASSIVE_SLOTS}칸 · ${Math.max(0, PITY - this.pity)}번 안에 희귀 이상 확정`;
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
      this.offer = this.drawOffer(this.choiceCount()); this.banishArmed = false; this.renderOffer();
    } else if (t === 'banish' && this.lvKind === 'level' && (this.banishes > 0 || this.banishArmed)) {
      this.banishArmed = !this.banishArmed; this.renderOffer();
    } else if (t === 'skip') {
      this.P.coins += this.lvKind === 'chest' ? (this.offer.length ? 0 : 30) : 5;
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
    if (o.kind === 'relic') {
      this.relics.push(o.key);
      const r = o.def;
      if (r.mod) for (const k in r.mod) this.M[k] += r.mod[k];
      if (r.id === 'grip') this.M.arcDeg += 30;
      this.D = this.derive(); this.syncMaxHp();
    } else this.applyChoice(o);
    SFX.play('click');
    this.finishChoice();
  }
  finishChoice() {
    if (this.lvKind === 'level') this.pendingLv--;
    else this.pendingChest--;
    this.banishArmed = false;
    if (this.pendingLv > 0) this.openLevelUp();
    else if (this.pendingChest > 0) this.openChest();
    else this.setMode('play');
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
    const stat = (icon, k, v) => `<div><span>${icon} ${k}</span><b>${v}</b></div>`;
    out.push(`<div class="bsec"><h4>능력치</h4><div class="stats">` +
      stat('❤️', '체력', `${Math.ceil(P.hp)}/${P.maxHp}`) + stat('💪', '공격력', `×${D.dmg.toFixed(2)}`) +
      stat('⚡', '공격 간격', `${D.interval.toFixed(2)}초`) + stat('📏', D.lance ? '창 길이' : '사거리', Math.round(D.range)) +
      stat('↔️', D.lance ? '창 폭' : '각도', D.lance ? Math.round(D.width) : `${Math.round(D.arc)}°`) + stat('🎯', '치명타', pct(D.crit)) +
      stat('🛡️', '받는 피해', `${D.dr < 1 ? '-' : ''}${pct(1 - D.dr)}`) + stat('👟', '이동', `×${D.spd.toFixed(2)}`) + `</div></div>`);
    return out.join('');
  }

}

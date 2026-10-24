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
  describe(o) {
    const id = this.rig.id, xm = this.xm();
    if (o.kind === 'weapon') { const Wd = WEAPONS[id], n = this.Wp.lv + 1; return { name:`${Wd.name}`, lv:`무기 Lv${n - 1} → ${n}`, d:Wd.lv[n].d }; }
    if (o.kind === 'evo') { const e = WEAPONS[id].evo; return { name:e.name, lv:'무기 진화', d:e.d }; }
    if (o.kind === 'filler') return o.key === 'rice' ? { name:'주먹밥', lv:'', d:'HP 30% 회복' } : { name:'보수 주머니', lv:'', d:'보수 +20' };
    if (o.kind === 'once') return { name:o.def.name, lv:'한 번만', d:o.def.d };
    if (o.kind === 'excl') {
      const lv = (this.X[o.key] || 0) + 1, c = o.def;
      return { name:c.name, lv:`${PRESETS[id].name} 전용 · ` + (c.max > 1 ? `Lv${lv - 1} → ${lv}` : '한 번만'), d:c.d(lv) + (xm > 1 ? ' (사진 +20%)' : '') };
    }
    const c = o.def, lv = (this.lvC[c.id] || 0) + 1;
    let d;
    const stp = TUNE.arcStep[PRESETS[id].shape];
    if (c.custom) d = PRESETS[id].shape === 'fan' ? `공격 각도 +${stp}° (합계 +${stp * lv}°, 최대 360°)` : `원뿔 각도 +${stp}° (합계 +${stp * lv}°)`;
    else d = `${c.label} +${pct(c.per)} (합계 +${pct(c.per * lv)})`;
    if (c.note) d += ` · ${c.note}`;
    return { name:c.name, lv:`Lv${lv - 1} → ${lv} / 최대 ${c.max}`, d };
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
    SFX.play('levelup');
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
    SFX.play('chest');
    this.setMode('levelup');
  }
  renderOffer() {
    const box = $('lvOpts'), chest = this.lvKind === 'chest';
    $('lvTitle').textContent = chest ? '보물상자! 유물을 하나 고르세요' : `레벨 업! (Lv ${this.P.lvl - this.pendingLv + 1})`;
    box.innerHTML = '';
    box.classList.toggle('banish', !!this.banishArmed);
    this.offer.forEach((o, i) => {
      const info = o.kind === 'relic' ? { name:o.def.name, lv:`유물${o.def.only ? ' · 전용' : ''}`, d:o.def.d } : this.describe(o);
      const b = document.createElement('button');
      b.style.setProperty('--gc', GRADES[o.g].c);
      b.innerHTML = `<span class="tag">${o.kind === 'evo' ? '진화' : o.g}</span><b>${i + 1}. ${info.name}</b><em>${info.lv}</em>${info.d}`;
      if (!chest && this.has('memo') && !this.memo && o.kind !== 'filler') {
        const k = document.createElement('i'); k.className = 'keep'; k.textContent = '📌 보관';
        k.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); btn.tool = 'keep' + i; });
        b.appendChild(k);
      }
      b.addEventListener('pointerdown', ev => { ev.preventDefault(); btn.pick = i; });
      box.appendChild(b);
    });
    $('bReroll').textContent = `다시 뽑기 ${this.rerolls} (R)`;
    $('bBanish').textContent = this.banishArmed ? '빼기 취소 (B)' : `빼기 ${this.banishes} (B)`;
    $('bReroll').style.display = $('bBanish').style.display = chest ? 'none' : '';
    $('bReroll').disabled = this.rerolls <= 0;
    $('bBanish').disabled = this.banishes <= 0 && !this.banishArmed;
    $('bBanish').classList.toggle('armed', !!this.banishArmed);
    $('bSkip').textContent = chest ? (this.offer.length ? '넘기기 (X)' : '가방이 가득 찼어요 · 보수 +30 (X)') : '넘기기 · 보수 +5 (X)';
    $('lvHint').textContent = this.banishArmed ? '이번 판에서 뺄 선택지를 누르세요' :
      chest ? `유물 ${this.relics.length}/${MAX_RELICS}` : `공용 ${this.passiveCount()}/${PASSIVE_SLOTS}종 · 희귀 이상 확정까지 ${Math.max(0, PITY - this.pity)}회`;
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
  buildHtml() {
    const id = this.rig.id, rows = [];
    rows.push(`<b>${WEAPONS[id].name}</b> Lv${this.Wp.lv}${this.Wp.evo ? ` → ${WEAPONS[id].evo.name}` : ''}`);
    const com = COMMON.filter(c => this.lvC[c.id]).map(c => `${c.name} ${this.lvC[c.id]}/${c.max}`);
    rows.push(`<b>공용 ${com.length}/${PASSIVE_SLOTS}</b> ${com.join(' · ') || '없음'}`);
    const once = ONCE.filter(c => this.once[c.id]).map(c => c.name);
    if (once.length) rows.push(`<b>한 번만</b> ${once.join(' · ')}`);
    const ex = EXCL[id].filter(c => this.X[c.id]).map(c => c.max > 1 ? `${c.name} ${this.X[c.id]}/${c.max}` : c.name);
    rows.push(`<b>전용</b> ${ex.join(' · ') || '없음'}`);
    rows.push(`<b>유물 ${this.relics.length}/${MAX_RELICS}</b> ${this.relics.map(r => RELICS.find(x => x.id === r).name).join(' · ') || '없음'}`);
    const D = this.D || this.derive();
    rows.push(`<b>능력치</b> 피해 ×${D.dmg.toFixed(2)} · 공격 간격 ${D.interval.toFixed(2)}초 · 각도 ${Math.round(D.arc)}° · 사거리 ${Math.round(D.range)} · 치명타 ${pct(D.crit)} · 받는 피해 ×${D.dr.toFixed(2)}`);
    return rows.join('<br>');
  }

}

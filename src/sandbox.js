/* =====================================================================
 *  테스트 페이지 (test.html → index.html?test)
 *   실제 게임 엔진을 그대로 쓰고, 오른쪽 패널에서
 *   - 주인공 3명의 공격·필살기 모션 (느린 재생 · 판정 표시)
 *   - 적 11종 소환 · 돌진/탄 발사 시키기 · 강화 단계 색
 *   - 레벨업 선택지 · 유물 · 거래 · 상점 아이템을 하나씩 적용하고 능력치 변화(이전 → 이후) 확인
 *   - 맵 아이템 · 중립 캐릭터 · 레벨업/보물상자/거래/상점 화면 미리보기
 *  기록(보수·최고 기록)은 저장하지 않음
 * ===================================================================== */
import { app, scene } from './core/app.js';
import { SET, store } from './core/store.js';
import { GAUGE_MAX, LS_BASE, pct } from './core/config.js';
import { CHAR_IDS, PRESETS } from './data/characters.js';
import { COMMON, EXCL, GRADES, ONCE } from './data/choices.js';
import { RELICS } from './data/relics.js';
import { TRADES } from './data/trades.js';
import { SHOP } from './data/shop.js';
import { WEAPONS } from './data/weapons.js';
import { ENEMY_TIERS, ENEMY_TYPES } from './data/enemies.js';
import { ITEMS } from './data/items.js';
import { NEUTRALS, NEUTRAL_RULES } from './data/neutrals.js';
import { UI, btn } from './ui/state.js';

const FLAGS = app.sandbox = { god:true, noSpawn:true, dummy:true, noXp:true };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const S = () => scene();
let panel, statBox, logBox, lists = {}, lastChanged = {}, labels = [], timer = null, savedSpeed = SET.speed, savedDebug = SET.debug;

/* ---------- 능력치 스냅샷 (적용 전·후 비교) ---------- */
export function snap(s = S()) {
  const D = s.derive(), C = PRESETS[s.rig.id].base, M = s.M, R = s.R, o = {};
  o['최대 체력'] = Math.round(C.hp * D.maxHpMul);
  o['한 방 피해'] = +(C.dmg * D.dmg).toFixed(1);
  o['공격력 배율'] = +D.dmg.toFixed(2);
  o['공격 간격(초)'] = +D.interval.toFixed(3);
  o['공격 횟수'] = 1 + (M.multi || 0);
  o[D.lance ? '창 길이' : '사거리'] = Math.round(D.range);
  o[D.lance ? '창 폭' : '휘두름 각도'] = D.lance ? Math.round(D.width) : Math.round(D.arc);
  o['이동 배율'] = +D.spd.toFixed(2);
  o['치명타'] = pct(D.crit) + ' · ×' + D.critDmg.toFixed(2);
  o['받는 피해'] = pct(D.dr * (1 + R.dmgTaken));
  o['넉백'] = Math.round(D.kb);
  o['정예·보스 피해'] = pct(1 + M.boss);
  o['위기 공격력(HP 50%↓)'] = M.lowHp ? '+' + pct(M.lowHp) : '-';
  o['연속 처치 공속'] = M.streak ? '+' + pct(M.streak) : '-';
  o['2연타 확률'] = s.Wp.double ? pct(s.Wp.double) : '-';
  o['무기'] = `Lv${s.Wp.lv}${s.Wp.evo ? ' 진화' : ''}`;
  o['부활'] = (s.miracle || 0) + (s.has('oldcharm') && !s.oldCharmUsed ? 1 : 0) + (s.X.cando ? 1 : 0);
  o['줍는 범위'] = Math.round(D.magnet);
  o['경험치 배율'] = +D.xp.toFixed(2);
  o['회복 배율'] = R.noHeal ? '흡혈만' : +(D.heal * R.healMul).toFixed(2);
  o['필살기 충전'] = +D.gaugeMul.toFixed(2);
  o['필살기 피해'] = +(1 + M.spDmg).toFixed(2);
  o['흡혈'] = M.lsChance > 0 ? `${pct(M.lsChance)} · ${pct(LS_BASE + M.lsAmt)}` : '-';
  o['행운'] = pct(M.luck);
  o['궤도 별'] = s.orbCount();
  o['검기 Lv'] = M.waveLv || 0;
  o['가시 반사'] = R.thorns ? pct(R.thorns) : '-';
  o['넘치는 기운'] = R.overflow ? '×' + R.overflow : '-';
  o['체력 감소/초'] = R.hpDrain ? pct(R.hpDrain) : '-';
  o['보수 배율'] = +((1 + M.coin) * R.coinMul).toFixed(2);
  o['선택지 수'] = s.choiceCount();
  o['다시 뽑기 · 빼기'] = `${s.rerolls} · ${s.banishes}`;
  if (s.rig.id === 'usagi') o['폭주 확률'] = pct(s.feverChance());
  if (s.rig.id === 'chiikawa') o['용기'] = pct(D.cour.k);
  return o;
}
/* 무언가를 적용하고 능력치 변화를 기록 */
export function apply(label, fn, desc = '') {
  const s = S(), before = snap(s);
  let err = '';
  try { fn(s); } catch (e) { err = e.message; console.error(e); }
  s.D = s.derive(); s.syncMaxHp();
  const after = snap(s), diff = [];
  for (const k in after) if (String(before[k]) !== String(after[k])) { diff.push(`${k} ${before[k] ?? '-'} → <b>${after[k]}</b>`); lastChanged[k] = performance.now(); }
  log(`<b>${label}</b>${desc ? ` <small>${desc}</small>` : ''}<br>` + (err ? `<span class="bad">오류: ${err}</span>` : diff.length ? diff.join(' · ') : '<i>능력치 숫자 변화 없음 (특수 효과 — 화면에서 확인)</i>'));
  refreshLists(); drawStats();
  return { before, after, diff, err };
}
function log(html) { if (!logBox) return; const d = el('div', 'lg', html); logBox.prepend(d); while (logBox.children.length > 40) logBox.lastChild.remove(); }

/* ---------- 시작 · 토글 ---------- */
export function start(cid) {
  const s = S();
  UI.char = cid; s.setChar(cid);
  s.bankCoins = () => 0;                                   // 테스트 중 보수는 지갑에 저장하지 않음
  s.act('start');
  s.P.coins = 999;
  lastChanged = {};
  if (logBox) logBox.innerHTML = '';
  log(`<b>${PRESETS[cid].name}</b> 테스트 시작 — 무적·자동 생성 끔·허수아비 적`);
  buildLists(); drawStats();
}
function toggle(key, label, on) {
  const w = el('label', 'tg'), c = el('input'); c.type = 'checkbox'; c.checked = on;
  c.addEventListener('change', () => { if (key in FLAGS) FLAGS[key] = c.checked; else if (key === 'debug') SET.debug = c.checked; });
  w.append(c, document.createTextNode(' ' + label));
  return w;
}
function button(text, fn, cls = '', title = '') {
  const b = el('button', 'sb ' + cls, text);
  if (title) b.title = title;
  b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (S().mode === 'menu' || S().mode === 'select') start(UI.char); fn(); });
  return b;
}
function section(title, open = true) { const d = el('details'); d.open = open; d.append(el('summary', '', title)); const body = el('div', 'grid'); d.append(body); panel.append(d); return body; }
const gradeDot = g => `<i class="gd" style="background:${GRADES[g] ? GRADES[g].c : '#ffd54a'}"></i>`;

/* ---------- 적 ---------- */
export function spawn(type, ang = Math.random() * 6.28, dist = 170) {
  const s = S(), P = s.P;
  return s.spawnEnemy(type, P.x + Math.cos(ang) * dist, P.y + Math.sin(ang) * dist);
}
export function lineup() {
  const ks = Object.keys(ENEMY_TYPES);
  ks.forEach((k, i) => spawn(k, i / ks.length * Math.PI * 2, ENEMY_TYPES[k].rank === 'base' ? 190 : 270));
  log(`적 ${ks.length}종 나열`);
}
export function chargeAll() {
  let n = 0;
  for (const e of S().enemies) if (e.type.charge) { e.chg = 'wind'; e.chgT = e.type.charge.wind; n++; }
  log(`돌진 시키기: ${n}마리 (깜빡인 뒤 직선 돌진)`);
}
export function shootAll() {
  let n = 0;
  for (const e of S().enemies) if (e.type.shot) { S().fireShots(e); n++; }
  log(`탄 발사: ${n}마리`);
}
function clearEnemies() { const s = S(); for (let i = s.enemies.length - 1; i >= 0; i--) s.releaseEnemy(s.enemies[i]); for (let i = s.shots.length - 1; i >= 0; i--) s.releaseShot(s.shots[i]); }

/* ---------- 선택지 · 유물 · 거래 · 상점 목록 ---------- */
function buildLists() {
  const s = S(), id = s.rig.id;
  const fill = (key, items) => { const box = lists[key]; if (!box) return; box.innerHTML = ''; items.forEach(b => box.append(b)); };
  fill('weapon', [
    button('⚔️ 무기 강화 +1', () => s.Wp.lv < 5 ? apply(`무기 Lv${s.Wp.lv + 1}`, x => x.applyChoice({ kind:'weapon', key:'weapon', g:'일반' }), WEAPONS[id].lv[s.Wp.lv + 1].d) : log('무기는 이미 Lv5'), '', '무기 Lv2~5'),
    button('🌟 진화', () => s.Wp.evo ? log('이미 진화') : apply(WEAPONS[id].evo.name, x => x.applyChoice({ kind:'evo', key:'evo', g:'전설' }), WEAPONS[id].evo.d.replace(/\n/g, ' ')), 'evo', WEAPONS[id].evo.d)
  ]);
  fill('common', COMMON.map(c => button(`${gradeDot(c.g)}${c.icon} ${c.name} <small data-lv="${c.id}"></small>`, () => {
    if ((s.lvC[c.id] || 0) >= c.max) return log(`${c.name}: 이미 최대 Lv`);
    const o = { kind:'common', key:c.id, def:c, g:c.g }, info = s.describe(o);
    apply(`${c.name} Lv${(s.lvC[c.id] || 0) + 1}`, x => x.applyChoice(o), String(info.main).replace(/\n/g, ' '));
  }, '', `${c.g} · ${c.label}${c.note ? ' — ' + c.note : ''}${c.shop ? ' (상점 전용 표시 — 레벨업엔 안 나옴)' : ''}`)));
  fill('once', ONCE.map(c => button(`${gradeDot(c.g)}${c.icon} ${c.name}`, () => {
    if (s.once[c.id]) return log(`${c.name}: 이미 얻음`);
    apply(c.name, x => x.applyChoice({ kind:'once', key:c.id, def:c, g:c.g }), c.d.replace(/\n/g, ' '));
  }, '', `${c.g} · ${c.d}`)));
  fill('excl', EXCL[id].map(c => button(`${gradeDot(c.g)}${c.icon} ${c.name} <small data-xl="${c.id}"></small>`, () => {
    const lv = s.X[c.id] || 0;
    if (lv >= c.max) return log(`${c.name}: 이미 최대 Lv`);
    apply(`${c.name} Lv${lv + 1}`, x => x.applyChoice({ kind:'excl', key:c.id, def:c, g:c.g }), c.d(lv + 1).replace(/\n/g, ' '));
  }, '', `${c.g} · ${c.d(1)}`)));
  fill('relic', RELICS.filter(r => !r.only || r.only.includes(id)).map(r => button(`${gradeDot(r.g)}${r.icon} ${r.name}`, () => {
    if (s.relics.includes(r.id)) return log(`${r.name}: 이미 있음`);
    apply(r.name, x => x.addRelic(r), r.d.replace(/\n/g, ' ') + (r.shop ? ' (상점용 — 상자엔 안 나옴)' : ''));
  }, '', `${r.g} 유물 · ${r.d}`)));
  fill('trade', TRADES.map(t => button(`${gradeDot(t.g)}${t.icon} ${t.name}`, () => {
    if (s.tradesTaken.has(t.id)) return log(`${t.name}: 이미 거래함`);
    if (t.ok && !t.ok(s)) return log(`${t.name}: 지금 조건이 안 맞음 (유물 2개·능력 3개·레벨 5·보수 50 등)`);
    apply(`거래: ${t.name}`, x => { x.tradesTaken.add(t.id); t.take(x); }, t.d.replace(/\n/g, ' '));
  }, '', `${t.g} 거래 · ${t.d}`)));
  fill('shop', SHOP.map(it => button(`${it.icon} ${it.name} <small>💰${it.price}</small>`, () => {
    if (it.ok && !it.ok(s)) return log(`${it.name}: 지금 살 수 없음`);
    apply(`상점: ${it.name}`, x => { x.shopBought[it.id] = (x.shopBought[it.id] || 0) + 1; it.buy(x); }, it.d.replace(/\n/g, ' '));
  }, '', it.d)));
  refreshLists();
}
function refreshLists() {
  const s = S();
  if (!panel || !s) return;
  panel.querySelectorAll('[data-lv]').forEach(x => { const c = COMMON.find(c => c.id === x.dataset.lv); const lv = s.lvC[c.id] || 0; x.textContent = `${lv}/${c.max}`; x.parentElement.classList.toggle('own', lv > 0); x.parentElement.classList.toggle('max', lv >= c.max); });
  panel.querySelectorAll('[data-xl]').forEach(x => { const c = EXCL[s.rig.id].find(c => c.id === x.dataset.xl); if (!c) return; const lv = s.X[c.id] || 0; x.textContent = `${lv}/${c.max}`; x.parentElement.classList.toggle('own', lv > 0); x.parentElement.classList.toggle('max', lv >= c.max); });
}

/* ---------- 능력치 표 (매 0.25초, 최근 바뀐 줄은 노란색) ---------- */
function drawStats() {
  const s = S();
  if (!statBox || !s || !s.P) return;
  const o = snap(s), now = performance.now(), P = s.P;
  let h = `<div class="row head"><span>${PRESETS[s.rig.id].name} · Lv ${P.lvl} · ${s.mode}</span><b>HP ${Math.ceil(P.hp)}/${P.maxHp} · 게이지 ${Math.floor(P.gauge)}</b></div>`;
  for (const k in o) h += `<div class="row ${now - (lastChanged[k] || -1e9) < 4000 ? 'chg' : ''}"><span>${k}</span><b>${o[k]}</b></div>`;
  statBox.innerHTML = h;
}

/* ---------- 적 이름표 (Phaser 텍스트, 적 위치를 따라감) ---------- */
function updateLabels() {
  const s = S();
  if (!s || !s.add) return;
  while (labels.length < 24) labels.push(s.add.text(0, 0, '', { fontFamily:'system-ui,sans-serif', fontSize:'10px', color:'#fff', stroke:'#000', strokeThickness:3 }).setOrigin(.5, 0).setDepth(7e6));
  const inRun = s.mode !== 'menu' && s.mode !== 'select';
  let n = 0;
  if (inRun) for (const e of s.enemies) {
    if (n >= labels.length) break;
    const t = e.type, tier = e.tierIdx >= 0 ? ` ${ENEMY_TIERS[e.tierIdx].name}` : '';
    const state = e.chg === 'wind' ? ' ⚠돌진 준비' : e.chg === 'dash' ? ' ▶돌진' : '';
    labels[n++].setText(`${t.name}${tier}${state}\n${Math.ceil(Math.max(0, e.hp))}`).setPosition(e.x, e.y + 4).setVisible(true);
  }
  for (; n < labels.length; n++) labels[n].setVisible(false);
}

/* ---------- 패널 만들기 ---------- */
function build() {
  document.body.classList.add('sandbox');
  panel = el('div'); panel.id = 'sbPanel';
  panel.append(el('h3', '', '🧪 테스트 페이지 <small>기록 저장 안 함</small>'));
  // 캐릭터
  const top = el('div', 'grid c3');
  CHAR_IDS.forEach(id => top.append(button(PRESETS[id].name, () => start(id), 'char')));
  panel.append(top);
  const tg = el('div', 'tgs');
  tg.append(toggle('god', '무적', true), toggle('noSpawn', '적 자동 생성 끔', true), toggle('dummy', '적 허수아비(안 움직임)', true), toggle('noXp', '레벨업 끔', true), toggle('debug', '판정 표시', true));
  SET.debug = true;
  panel.append(tg);
  const sp = el('div', 'speeds'); sp.append(el('span', '', '속도'));
  [.25, .5, 1, 2, 3].forEach(v => { const b = button(v + 'x', () => { SET.speed = v; sp.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }); if (v === 1) b.classList.add('on'); sp.append(b); });
  panel.append(sp);
  // 능력치 + 기록
  const st = el('details'); st.open = true; st.append(el('summary', '', '📊 현재 능력치 (바뀐 줄은 노란색)')); statBox = el('div', 'stats'); st.append(statBox); panel.append(st);
  const lg = el('details'); lg.open = true; lg.append(el('summary', '', '📝 적용 기록 (이전 → 이후)')); logBox = el('div', 'log'); lg.append(logBox); panel.append(lg);
  // 주인공 모션
  const mv = section('🐰 주인공 공격·필살기');
  mv.append(
    button('필살기 쓰기', () => { const s = S(); s.P.gauge = GAUGE_MAX; btn.spin = true; log('필살기'); }),
    button('우라 야하! (우사기 폭주)', () => { const s = S(); if (s.rig.id !== 'usagi') return log('우사기 전용'); s.st.fever = 0; s.st.feverCd = 0; s.startFever(); log('우라 야하! 발동'); }),
    button('체력 100%', () => { const s = S(); s.P.hp = s.P.maxHp; log('체력 100%'); }),
    button('체력 20% (용기 확인)', () => { const s = S(); s.P.hp = s.P.maxHp * .2; log('체력 20%'); }),
    button('친구들의 응원 소환', () => { const s = S(); if (!s.has('friends')) s.addRelic(RELICS.find(r => r.id === 'friends')); s.st.friendsOn = 4; s.st.friendHit = 0; log('친구 소환 4초'); }),
    button('적 1마리 앞에 (공격 확인)', () => { spawn('golem', Math.atan2(S().P.aimY, S().P.aimX), 90); log('골렘 소환 (앞쪽)'); }),
    button('위·아래·대각선에 1마리씩', () => { [-Math.PI / 2, Math.PI / 2, -Math.PI / 4, Math.PI * .75].forEach(a => spawn('golem', a, 100)); log('방향별 4마리'); })
  );
  // 적
  const en = section('👾 적 (기본 4 · 중간보스 3 · 보스 4)');
  for (const k in ENEMY_TYPES) { const T = ENEMY_TYPES[k]; en.append(button(`${{ base:'', mid:'⭐', boss:'👑' }[T.rank]}${T.name} <small>${T.size}</small>`, () => { spawn(k); log(`${T.name} 소환`); }, T.rank, `${T.rank} · HP ${T.hp || '×' + T.hpMul} · 이동 ${T.spd}${T.shot ? ' · 원거리 ' + T.shot.pattern : ''}${T.charge ? ' · 돌진' : ''}`)); }
  en.append(
    button('전체 나열', lineup, 'wide2'),
    button('돌진 시키기', chargeAll), button('탄 쏘기', shootAll),
    button('체력 1로', () => { for (const e of S().enemies) e.hp = 1; log('모든 적 체력 1'); }),
    button('모두 제거', () => { clearEnemies(); log('적·탄 모두 제거'); })
  );
  const tierRow = el('div', 'speeds'); tierRow.append(el('span', '', '강화 단계'));
  ENEMY_TIERS.forEach((T, i) => tierRow.append(button(String(i + 1), () => { S().tier = i; tierRow.querySelectorAll('button').forEach((x, j) => x.classList.toggle('on', j === i)); log(`이후 소환되는 기본 몹: ${T.name}`); })));
  tierRow.querySelector('button').classList.add('on');
  en.append(tierRow);
  // 선택지
  lists.weapon = section('⚔️ 무기');
  lists.common = section('🔼 공용 선택지 (누를 때마다 Lv +1)');
  lists.once = section('✨ 1회성 선택지', false);
  lists.excl = section('💗 캐릭터 전용 선택지', true);
  lists.relic = section('🎁 유물', false);
  lists.trade = section('🌑 검은별 거래', false);
  lists.shop = section('🛡️ 갑옷씨 상점 아이템', false);
  // 아이템 · 중립 · 화면
  const it = section('🍙 맵 아이템 (발밑에 놓기)', false);
  for (const k in ITEMS) it.append(button(ITEMS[k].name, () => { const s = S(); s.spawnItem(k, s.P.x + 34, s.P.y); log(`${ITEMS[k].name} 놓음 — 밟으면 효과`); }));
  const ne = section('⭐ 중립 캐릭터', false);
  for (const k in NEUTRALS) ne.append(button(`${NEUTRALS[k].name} 바로 완료`, () => { const s = S(); if (s.neutral) { s.neutral.img.destroy(); s.neutral = null; } const n = s.spawnNeutral(k); n.x = s.P.x + 50; n.y = s.P.y; n.prog = NEUTRAL_RULES.stay; log(`${NEUTRALS[k].name} → ${NEUTRALS[k].done}`); }));
  for (const k in NEUTRALS) ne.append(button(`${NEUTRALS[k].name} 근처에 소환`, () => { const s = S(); if (s.neutral) { s.neutral.img.destroy(); s.neutral = null; } const n = s.spawnNeutral(k); n.x = s.P.x + 140; n.y = s.P.y; log(`${NEUTRALS[k].name} 소환 — 곁에서 ${NEUTRAL_RULES.stay}초`); }));
  const sc = section('🪟 화면 미리보기', false);
  sc.append(
    button('레벨업 화면', () => { const s = S(); s.P.lvl++; s.pendingLv++; s.openLevelUp(); }),
    button('보물상자 화면', () => { const s = S(); s.pendingChest++; s.openChest(); }),
    button('검은별 거래 화면', () => S().openTrade()),
    button('갑옷씨 상점 화면', () => { const s = S(); s.P.coins = Math.max(s.P.coins, 999); s.openShop(); }),
    button('보수 +500', () => { S().P.coins += 500; log('보수 +500'); })
  );
  document.body.append(panel);
  buildLists();
  timer = setInterval(() => { drawStats(); refreshLists(); }, 250);
  const loop = () => { updateLabels(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

/* 패널 스타일 (테스트 페이지에서만) */
const css = `
body.sandbox #game{right:360px}
body.sandbox #statPanel,body.sandbox #help{display:none!important}
body.sandbox #spinBtn{right:378px}
body.sandbox #runBtn{right:486px}
body.sandbox #toast{left:calc(50% - 180px)}
#sbPanel{position:fixed;z-index:20;top:0;right:0;bottom:0;width:360px;box-sizing:border-box;overflow:auto;background:#161a26;border-left:1px solid #ffffff22;padding:10px 10px 40px;font-size:12px;color:#fff}
#sbPanel h3{margin:2px 0 8px;font-size:15px;color:#ffd54a}
#sbPanel h3 small{font-size:10px;color:#fff;opacity:.5;margin-left:6px}
#sbPanel details{background:#1f2434;border-radius:10px;margin:6px 0;padding:4px 8px}
#sbPanel summary{cursor:pointer;font-weight:700;padding:4px 0;color:#cfe0ff}
#sbPanel .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px 0}
#sbPanel .grid.c3{grid-template-columns:1fr 1fr 1fr}
#sbPanel .sb{background:#323a52;color:#fff;border:1px solid #ffffff1a;border-radius:7px;padding:5px 6px;font-size:11.5px;text-align:left;cursor:pointer;line-height:1.3}
#sbPanel .sb:hover{border-color:#ffd54a}
#sbPanel .sb.char{text-align:center;font-weight:700;font-size:13px;background:#3b4462}
#sbPanel .sb.own{background:#2f4a3b}
#sbPanel .sb.max{opacity:.55}
#sbPanel .sb.mid{background:#4a3a2a}
#sbPanel .sb.boss{background:#5a2a34}
#sbPanel .sb.evo{background:#5a4a1a}
#sbPanel .sb.on{background:#ffd54a;color:#1d2230}
#sbPanel .sb small{opacity:.6;margin-left:3px}
#sbPanel .gd{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;vertical-align:middle}
#sbPanel .tgs{display:flex;flex-wrap:wrap;gap:4px 10px;margin:6px 0}
#sbPanel .tg{white-space:nowrap}
#sbPanel .speeds{display:flex;gap:4px;align-items:center;margin:4px 0;grid-column:1/-1}
#sbPanel .speeds span{opacity:.7;margin-right:4px}
#sbPanel .speeds .sb{text-align:center;padding:4px 8px}
#sbPanel .wide2{grid-column:1/-1;text-align:center}
#sbPanel .stats .row{display:flex;justify-content:space-between;gap:8px;padding:1px 2px;border-radius:4px}
#sbPanel .stats .row span{opacity:.7}
#sbPanel .stats .row.head{opacity:1;color:#ffd54a;margin-bottom:3px}
#sbPanel .stats .row.chg{background:#ffd54a33}
#sbPanel .stats .row.chg b{color:#ffd54a}
#sbPanel .log{max-height:180px;overflow:auto}
#sbPanel .lg{padding:4px 2px;border-bottom:1px solid #ffffff12;line-height:1.45}
#sbPanel .lg b{color:#ffe9a8}
#sbPanel .lg small{opacity:.6}
#sbPanel .lg .bad{color:#ff8a8a}
@media (max-width:760px){body.sandbox #game{right:0;bottom:45vh}#sbPanel{top:auto;height:45vh;width:100%;border-left:0;border-top:1px solid #ffffff22}body.sandbox #spinBtn,body.sandbox #runBtn{bottom:calc(45vh + 16px)}}
`;
export function init() {
  window.addEventListener('beforeunload', () => { SET.speed = savedSpeed; SET.debug = savedDebug; store.save(); });   // 테스트용 속도·판정 표시는 실제 게임에 남기지 않음
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);
  const wait = () => { const s = S(); if (s && s.rig && s.rig.id) { build(); start(UI.char); } else setTimeout(wait, 100); };
  wait();
}
export const SB = { start, apply, snap, spawn, lineup, chargeAll, shootAll, stop:() => clearInterval(timer), FLAGS };
if (typeof window !== 'undefined' && window.addEventListener && !globalThis.__NO_SANDBOX_INIT) init();

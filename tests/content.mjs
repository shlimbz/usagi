/* 새 콘텐츠 점검: 맵 아이템 7종 · 아이템 소멸 · 중립 캐릭터 3종(동료·상점·거래) · 거래 20종 · 상점 · 궤도 별
 * · 적 11종(원거리·돌진·보스) · 가시/넘치는 기운/번개/구슬 폭발/바람돌이 · 훈련소 · 보수 저장. 매 프레임 불변식 검사 */
import { G, newGame, startRun, invariants } from './harness.mjs';
const ok = [], fail = [];
const expect = (name, cond, info = '') => (cond ? ok : fail).push(name + (cond || !info ? '' : ` (${info})`));
const run = (g, sec, each) => { let bad = []; for (let f = 0; f < 60 * sec && g.s.mode !== 'result'; f++) { if (each) each(f); if (g.s.mode === 'levelup') G.btn.pick = 0; g.frame(); if (g.s.mode === 'play') { g.s.P.hp = Math.max(g.s.P.hp, g.s.P.maxHp * .5); } if (f % 10 === 0) { const b = invariants(g.s); if (b.length && bad.length < 3) bad.push(b.join('; ')); } } return bad; };

// ---------- 맵 아이템 ----------
{
  const g = newGame(), { s } = g; startRun(g, 'usagi'); g.frame();
  const P = s.P;
  for (let i = 0; i < 30; i++) s.spawnGem(P.x + 900 + i, P.y, 1);
  s.spawnItem('magnet', P.x, P.y); g.frame();
  expect('자석: 모든 구슬 끌어옴', s.gems.every(x => x.pull));
  const c0 = P.coins; s.spawnItem('coins', P.x, P.y); g.frame(); expect('보수 주머니', P.coins >= c0 + 8, P.coins - c0);
  P.gauge = 0; s.spawnItem('candy', P.x, P.y); g.frame(); expect('필살 사탕', P.gauge >= 40);
  const e = s.spawnEnemy('golem', P.x + 60, P.y); const hp0 = e.hp; s.spawnItem('bomb', P.x, P.y); g.frame(); expect('폭탄: 주변 적 피해', !e.active || e.hp < hp0);
  s.spawnItem('freeze', P.x, P.y); g.frame(); expect('얼음 시계: 적 정지', s.st.freeze > 3);
  const f = s.spawnEnemy('slime', P.x + 200, P.y), fx = f.x; for (let i = 0; i < 30; i++) g.frame(); expect('얼음 중 적이 안 움직임', Math.abs(f.x - fx) < 1);
  s.spawnItem('star', P.x, P.y); g.frame(); expect('반짝 별: 무적', s.invulnerable());
  P.hp = 10; s.spawnItem('food', P.x, P.y); g.frame(); expect('주먹밥 회복', P.hp > 10);
  s.spawnItem('food', P.x + 150, P.y + 150); const n0 = s.items.length;
  for (let i = 0; i < 60 * 21; i++) { s.P.x = 0; s.P.y = 0; if (s.mode === 'levelup') G.btn.pick = 0; g.frame(); s.P.hp = s.P.maxHp; }
  expect('아이템 20초 뒤 사라짐 (구슬은 남음)', !s.items.some(it => it.type === 'food' && it.t > 20.5) && n0 >= 1);
  s.spawnGem(P.x + 500, P.y + 500, 1); for (let i = 0; i < 60 * 25; i++) { if (s.mode === 'levelup') G.btn.pick = 0; g.frame(); s.P.hp = s.P.maxHp; }
  expect('경험치 구슬은 사라지지 않음', s.gems.some(x => Math.abs(x.x - (P.x + 500)) < 600));
}

// ---------- 중립 캐릭터 · 상점 · 거래 ----------
for (const cid of G.CHAR_IDS) {
  const g = newGame(), { s } = g; startRun(g, cid); g.frame();
  const stay = () => { const n = s.neutral; s.P.x = n.x; s.P.y = n.y; for (let i = 0; i < 60 * 15.5 && s.neutral; i++) { s.P.x = n.x; s.P.y = n.y; s.P.hp = s.P.maxHp; if (s.mode === 'levelup' && s.lvKind !== 'trade') G.btn.pick = 0; g.frame(); } };
  for (let k = 0; k < 4; k++) { s.spawnNeutral('ystar'); stay(); }
  expect(`[${cid}] 노란별 동료 최대 3`, s.pals === 3 && s.orbCount() === 3, s.pals);
  for (let i = 0; i < 120; i++) g.frame();
  expect(`[${cid}] 궤도 별 3개 회전`, s.orbPos.length === 3);
  s.P.coins = 2000; s.spawnNeutral('armor'); stay();
  expect(`[${cid}] 갑옷씨 → 상점`, s.mode === 'shop' && s.shopOffer.length === 4);
  const c0 = s.P.coins; G.btn.buy = 0; g.frame(); G.btn.buy = 1; g.frame();
  expect(`[${cid}] 상점 구매`, s.P.coins < c0 && s.shopOffer.filter(o => o.sold).length === 2);
  s.leaveShop(); expect(`[${cid}] 상점 나가기`, s.mode === 'play' || s.mode === 'levelup');
  while (s.mode === 'levelup') { G.btn.pick = 0; g.frame(); }
  s.spawnNeutral('bstar'); stay();
  expect(`[${cid}] 검은별 → 거래 3개`, s.mode === 'levelup' && s.lvKind === 'trade' && s.offer.length === 3);
  G.btn.pick = 0; g.frame(); expect(`[${cid}] 거래 성립`, s.tradesTaken.size === 1);
  const bad = run(g, 20); expect(`[${cid}] 이후 20초 이상 없음`, !bad.length, bad[0]);
}

// ---------- 상점 아이템 전부 ----------
{
  const g = newGame(), { s } = g; startRun(g, 'hachiware'); g.frame();
  let errs = 0;
  for (const it of G.SHOP) { try { for (let i = 0; i < it.max; i++) if (!it.ok || it.ok(s)) it.buy(s); s.D = s.derive(); s.syncMaxHp(); } catch (e) { errs++; console.log(it.id, e.message); } }
  const bad = run(g, 30);
  expect('상점 아이템 전부 구매 후 30초', !errs && !bad.length, bad[0]);
}

// ---------- 거래 20종 (하나씩 새 판에서) ----------
{
  let errs = [];
  for (const t of G.TRADES) {
    const g = newGame(), { s } = g; startRun(g, ['usagi', 'chiikawa', 'hachiware'][errs.length % 3]);
    for (let i = 0; i < 60 * 3; i++) g.frame();
    s.P.coins = 300; s.P.lvl = 10;
    for (const c of G.COMMON.slice(0, 4)) s.applyChoice({ kind:'common', key:c.id, def:c, g:c.g });
    s.addRelic(G.RELICS[0]); s.addRelic(G.RELICS[1]); s.addRelic(G.RELICS[2]);
    if (t.ok && !t.ok(s)) { errs.push(t.id + ' 조건 불가'); continue; }
    try {
      s.offer = [{ kind:'trade', key:t.id, def:t, g:t.g }]; s.lvKind = 'trade'; s.mode = 'levelup'; s.choose(0);
      while (s.mode === 'levelup') { G.btn.pick = 0; g.frame(); }
      const bad = run(g, 25);
      if (bad.length) errs.push(t.id + ': ' + bad[0]);
    } catch (e) { errs.push(t.id + ': ' + e.message); }
  }
  expect(`거래 ${G.TRADES.length}종 각각 적용 후 25초`, !errs.length, errs.join(' | '));
  expect('거래 20종', G.TRADES.length === 20, G.TRADES.length);
}

// ---------- 적 11종: 원거리·돌진·보스 ----------
{
  const g = newGame(), { s } = g; startRun(g, 'usagi'); g.frame();
  let shots = 0, charged = new Set();
  const types = Object.keys(G.ENEMY_TYPES);
  for (const k of types) { const a = Math.random() * 6.28; s.spawnEnemy(k, s.P.x + Math.cos(a) * 260, s.P.y + Math.sin(a) * 260); }
  const bad = run(g, 25, () => { shots = Math.max(shots, s.shots.length); for (const e of s.enemies) if (e.chg === 'dash') charged.add(e.type.name); s.P.inv = Math.max(s.P.inv, 0); });
  expect(`적 ${types.length}종 동시 25초`, !bad.length, bad[0]);
  expect('원거리 투사체 발사', shots > 0, shots);
  expect('돌진형 돌진', charged.size >= 2, [...charged].join(','));
  expect('적 11종 (기본4·중간3·보스4)', types.filter(k => G.ENEMY_TYPES[k].rank === 'base').length === 4 && types.filter(k => G.ENEMY_TYPES[k].rank === 'mid').length === 3 && types.filter(k => G.ENEMY_TYPES[k].rank === 'boss').length === 4);
  const b = s.spawnEnemy('knight', s.P.x + 40, s.P.y); s.boss = b; const ch0 = s.items.filter(i => i.type === 'chest').length;
  b.hp = 1; s.hitEnemy(b, 999, 1, 0, 0, 0);
  expect('보스 처치 → 보물상자', s.items.filter(i => i.type === 'chest').length > ch0 && s.log.boss === 1 && !s.boss);
  // 투사체가 플레이어를 맞힘
  s.P.inv = 0; s.st.postInv = 0; s.st.starInv = 0; s.st.freeze = 0; const hp0 = s.P.hp = s.P.maxHp;
  for (const e of [...s.enemies]) s.releaseEnemy(e);
  s.spawnShot(s.P.x + 40, s.P.y, -400, 0, 10, 6); for (let i = 0; i < 12; i++) g.frame();
  expect('투사체 피격', s.P.hp < hp0, `${hp0}→${s.P.hp}`);
}

// ---------- 특이 조합 ----------
{
  const g = newGame(), { s } = g; startRun(g, 'hachiware'); g.frame();
  s.R.thorns = 4; s.P.inv = 0; s.st.postInv = 0;
  const e = s.spawnEnemy('golem', s.P.x + 10, s.P.y), hp0 = e.hp; s.hurt(e);
  expect('가시: 맞으면 주변 적에게 반사', !e.active || e.hp < hp0);
  s.R.overflow = 5; s.P.hp = s.P.maxHp; const e2 = s.spawnEnemy('golem', s.P.x + 30, s.P.y), h2 = e2.hp;
  s.heal(s.P.maxHp * .2); g.frame();
  expect('넘치는 기운: 가득 찬 회복 → 주변 피해', !e2.active || e2.hp < h2);
  s.once.chain = true; s.M.crit = 1; s.D = s.derive(); s.chainBudget = 10;
  const a = s.spawnEnemy('golem', s.P.x + 300, s.P.y), b = s.spawnEnemy('golem', s.P.x + 340, s.P.y), hb = b.hp;
  s.R.thorns = 0; s.R.overflow = 0; s.P.inv = 9; g.frame(); s.chainBudget = 10; s.hitEnemy(a, 5, 0, 0, 0, 0); expect('번개 부적: 치명타 연쇄', b.hp < hb && s.bolts.length > 0);
  s.R.gemBomb = 1; s.bombBudget = 5; const c = s.spawnEnemy('golem', s.P.x + 5, s.P.y + 5), hc = c.hp; s.spawnGem(s.P.x, s.P.y, 1); g.frame();
  expect('터지는 구슬: 구슬 먹으면 폭발', !c.active || c.hp < hc);
  s.once.wind = true; s.M.spd = .5; s.D = s.derive(); expect('바람돌이: 이동 보너스 → 공격력', s.D.dmg >= 1 + .5 * 2 - 1e-6, s.D.dmg);
  const bad = run(g, 20); expect('특이 조합 20초', !bad.length, bad[0]);
}

// ---------- 훈련소 · 보수 저장 ----------
{
  G.store.data.train = { tr_hp:2, tr_reroll:1 }; G.store.data.wallet = 0;
  const g = newGame(), { s } = g; startRun(g, 'chiikawa'); g.frame();
  expect('훈련소: 최대 체력 +8%', s.P.maxHp === Math.round(80 * 1.08), s.P.maxHp);
  expect('훈련소: 다시 뽑기 +1', s.rerolls === G.BASE_REROLL + 1);
  s.P.coins = 123; s.endRun(false);
  expect('판 종료 → 지갑에 보수 저장', G.store.data.wallet === 123, G.store.data.wallet);
  s.act('toMenu'); expect('메뉴로 가도 두 번 저장 안 함', G.store.data.wallet === 123);
  G.store.data.train = {}; G.store.data.wallet = 0;
}

console.log(ok.map(x => '✓ ' + x).join('\n'));
if (fail.length) { console.log(fail.map(x => '✗ ' + x).join('\n')); process.exitCode = 1; } else console.log(`새 콘텐츠 ${ok.length}개 모두 통과`);

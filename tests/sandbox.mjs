/* 테스트 페이지(src/sandbox.js) 점검: 캐릭터마다 모든 선택지·유물·거래·상점을 하나씩 적용 + 적 전체 나열·돌진·탄 → 60초 진행, 오류·불변식 검사 */
import { G, newGame, invariants } from './harness.mjs';
globalThis.__NO_SANDBOX_INIT = true;
const { app } = await import('../src/core/app.js');
const { SB } = await import('../src/sandbox.js');
let problems = 0;
for (const cid of G.CHAR_IDS) {
  const g = newGame(); app.game = { scene:{ keys:{ main:g.s } } };
  const s = g.s; SB.start(cid); g.frame();
  const errs = [], noChange = [];
  const tryApply = (label, fn) => { const r = SB.apply(label, fn); if (r.err) errs.push(`${label}: ${r.err}`); else if (!r.diff.length) noChange.push(label); };
  for (let i = 0; i < 4; i++) tryApply('무기', x => x.Wp.lv < 5 && x.applyChoice({ kind:'weapon', key:'weapon', g:'일반' }));
  tryApply('진화', x => x.applyChoice({ kind:'evo', key:'evo', g:'전설' }));
  for (const c of G.COMMON) for (let i = 0; i < c.max; i++) tryApply(c.name, x => x.applyChoice({ kind:'common', key:c.id, def:c, g:c.g }));
  for (const c of G.ONCE) tryApply(c.name, x => x.applyChoice({ kind:'once', key:c.id, def:c, g:c.g }));
  for (const c of G.EXCL[cid]) for (let i = 0; i < c.max; i++) tryApply(c.name, x => x.applyChoice({ kind:'excl', key:c.id, def:c, g:c.g }));
  for (const r of G.RELICS.filter(r => !r.only || r.only.includes(cid))) tryApply(r.name, x => x.addRelic(r));
  for (const t of G.TRADES) if (!t.ok || t.ok(s)) tryApply(t.name, x => { x.tradesTaken.add(t.id); t.take(x); });
  for (const it of G.SHOP) if (!it.ok || it.ok(s)) tryApply(it.name, x => it.buy(x));
  SB.lineup(); SB.chargeAll(); SB.shootAll();
  let bad = [];   // 테스트 페이지는 6칸·유물 6개·전설 2개 제한을 일부러 무시하므로 그 항목은 제외
  for (let f = 0; f < 60 * 60; f++) {
    if (s.mode === 'levelup') G.btn.pick = 0; if (s.mode === 'shop') s.leaveShop();
    if (f % 600 === 0) { SB.chargeAll(); SB.shootAll(); }
    g.frame();
    if (f % 15 === 0) { const b = invariants(s).filter(x => !/^passives|^relics|^legends/.test(x)); if (b.length && bad.length < 3) bad.push(b.join('; ')); }
  }
  console.log(`[${cid}] 적용 오류 ${errs.length} · 숫자 변화 없는 항목 ${noChange.length}개 (특수 효과: ${[...new Set(noChange)].slice(0, 12).join(', ')}…) · 무적 HP ${Math.round(s.P.hp)}/${s.P.maxHp} · 적 ${s.enemies.length} · 불변식 ${bad.length ? bad[0] : '이상 없음'}`);
  if (errs.length) console.log('   ' + errs.slice(0, 5).join('\n   '));
  if (errs.length || bad.length || !s.P.alive) problems++;
}
SB.stop(); app.sandbox = null;
console.log(problems ? `문제 ${problems}건` : '테스트 페이지 점검 통과');
process.exitCode = problems ? 1 : 0;

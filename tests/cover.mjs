/* 기능 점검: 캐릭터마다 모든 유물·전용·1회성 선택지·진화를 강제로 얻은 뒤 150초 플레이 (필살기·피버·친구 소환·음식·정예·부활)
 * + 보관(메모)/빼기/다시 뽑기 흐름. 매 프레임 불변식 검사 */
import { G, newGame, startRun, invariants } from './harness.mjs';
let problems = 0;
for (const cid of G.CHAR_IDS) {
  const g = newGame(), { s } = g; startRun(g, cid);
  // 레벨업 UI: 보관 → 빼기 → 다시 뽑기 → 넘기기, 다음 화면에 보관한 선택지가 나오는지
  s.relics.push('memo'); s.pendingLv = 2; s.openLevelUp();
  const keepKey = s.offer[0].key; G.btn.tool = 'keep0'; g.frame();
  const kept = s.memo?.key === keepKey;
  G.btn.tool = 'skip'; g.frame();
  const memoBack = s.mode === 'levelup' && s.offer.some(o => o.key === keepKey);
  G.btn.pick = 0; g.frame();
  s.relics.length = 0;
  // 전부 얻기
  for (const r of G.RELICS) if (!r.shop && (!r.only || r.only.includes(cid))) { s.offer = [{ kind:'relic', key:r.id, def:r, g:r.g }]; s.lvKind = 'chest'; s.pendingChest = 1; s.mode = 'levelup'; s.relics.length = Math.min(s.relics.length, 5); s.choose(0); }
  for (const c of G.EXCL[cid]) for (let i = 0; i < c.max; i++) s.applyChoice({ kind:'excl', key:c.id, def:c, g:c.g });
  for (const c of G.ONCE) s.applyChoice({ kind:'once', key:c.id, def:c, g:c.g });
  while (s.Wp.lv < 5) s.applyChoice({ kind:'weapon', key:'weapon', g:'일반' });
  const need = G.COMMON.find(c => c.id === G.WEAPONS[cid].evo.need); s.applyChoice({ kind:'common', key:need.id, def:need, g:need.g });
  const evo = s.evoReady(); if (evo) s.applyChoice(evo);
  for (const c of G.COMMON) if (!c.shop && s.passiveCount() < G.PASSIVE_SLOTS && !s.lvC[c.id]) for (let i = 0; i < c.max; i++) s.applyChoice({ kind:'common', key:c.id, def:c, g:c.g });
  s.legends = 0;   // 테스트로 강제 지급한 전설은 한도 계산에서 제외
  s.relics = ['friends', 'mfood', 'band', 'tmedal', 'oldcharm', { chiikawa:'hanky', hachiware:'memo', usagi:'treat' }[cid]];
  s.setMode('play');
  const seen = { special:0, fever:0, friends:0, eat:0, elite:0, chest:0, save:0 };
  const oe = s.eat.bind(s); s.eat = it => { seen.eat++; return oe(it); };
  s.t = 115; let inv = [];
  for (let f = 0; f < 60 * 150 && s.mode !== 'result'; f++) {
    const a = f / 150; g.K.D.isDown = Math.cos(a) > .3; g.K.A.isDown = Math.cos(a) < -.3; g.K.S.isDown = Math.sin(a) > .3; g.K.W.isDown = Math.sin(a) < -.3;
    if (s.P.gauge >= s.specialCost() && f % 30 === 0) { g.press('SPACE'); seen.special++; }
    if (s.mode === 'levelup') { if (s.lvKind === 'chest') seen.chest++; if (s.offer.length) G.btn.pick = 0; else G.btn.tool = 'skip'; }
    if (f % 600 === 0) s.spawnItem('food', s.P.x + 10, s.P.y);
    const el = s.enemies.find(x => x.elite); if (el) { seen.elite = 1; if (f % 300 === 0) el.hp = 1; }
    if (f === 60 * 50) { s.P.hp = 1; s.P.inv = 0; s.st.postInv = 0; }
    const hp0 = s.P.hp;
    g.frame();
    if (hp0 <= 1 && s.P.hp > 1 && s.P.alive) seen.save++;
    if (s.mode === 'play' && s.P.hp < s.P.maxHp * .3) s.P.hp = s.P.maxHp * .3;
    if (s.st.fever > 0) seen.fever++; if (s.st.friendsOn > 0) seen.friends++;
    if (f % 10 === 0) { const b = invariants(s); if (b.length && inv.length < 3) inv.push(`t=${s.t.toFixed(0)} ${b.join('; ')}`); }
  }
  const okUI = kept && memoBack;
  console.log(`[${cid}] 보관→다음 화면 ${okUI ? 'OK' : 'FAIL'} · 진화 ${s.Wp.evo} · 필살기 ${seen.special} · 피버 ${seen.fever} · 친구 ${seen.friends} · 음식 ${seen.eat} · 정예 ${seen.elite} · 상자 ${seen.chest} · 부활/버티기 ${seen.save} · Lv${s.P.lvl} 처치 ${s.P.kills}`);
  if (inv.length) console.log('   ⚠ ' + inv.join('\n   ⚠ '));
  if (!okUI || inv.length || !s.Wp.evo) problems++;
}
console.log(problems ? `문제 ${problems}건` : '기능 점검 통과');
process.exitCode = problems ? 1 : 0;

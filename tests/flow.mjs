/* 화면 흐름·단축키 점검: 메뉴 → 선택 → 플레이 → 일시정지 → 설정 → 레벨업(R/B/1/X) → 보물상자 → 사망 → 재시작 → 클리어 → 메뉴 */
import { G, newGame } from './harness.mjs';
const g = newGame(), { s } = g, ok = [], fail = [];
const expect = (name, cond) => (cond ? ok : fail).push(name);
expect('시작은 메뉴', s.mode === 'menu');
g.press('ENTER'); g.frame(); expect('Enter → 캐릭터 선택', s.mode === 'select');
g.press('TWO'); g.frame(); expect('2 → 치이카와', G.UI.char === 'chiikawa' && s.rig.id === 'chiikawa');
g.press('ENTER'); g.frame(); expect('Enter → 플레이', s.mode === 'play' && s.P.maxHp === 80);
for (let i = 0; i < 120; i++) g.frame();
g.press('ESC'); g.frame(); const tp = s.t; for (let i = 0; i < 60; i++) g.frame();
expect('Esc → 일시정지, 시간 멈춤', s.mode === 'pause' && s.t === tp);
s.act('settings'); expect('설정 열기', s.mode === 'settings'); g.press('ESC'); g.frame(); expect('Esc → 일시정지로 복귀', s.mode === 'pause');
g.press('ESC'); g.frame(); expect('Esc → 계속', s.mode === 'play');
s.pendingLv = 2; s.openLevelUp(); expect('레벨업 화면', s.mode === 'levelup' && s.offer.length >= 3);
const rr = s.rerolls; g.press('R'); g.frame(); expect('R → 다시 뽑기', s.rerolls === rr - 1 || s.rig.id === 'usagi');
g.press('B'); g.frame(); expect('B → 빼기 모드', s.banishArmed);
const bn = s.banishes; g.press('ONE'); g.frame(); expect('빼기 모드에서 1 → 제거', s.banned.size === 1 && s.banishes === bn - 1 && !s.banishArmed);
g.press('ONE'); g.frame(); expect('1 → 선택, 다음 레벨업', s.pendingLv === 1 && s.mode === 'levelup');
const c0 = s.P.coins; g.press('X'); g.frame(); expect('X → 넘기기 (보수 +5)', s.mode === 'play' && s.P.coins === c0 + 5);
s.spawnItem('chest', s.P.x, s.P.y); g.frame(); expect('보물상자 → 유물 선택', s.mode === 'levelup' && s.lvKind === 'chest' && s.offer.length === 3);
g.press('TWO'); g.frame(); expect('2 → 유물 획득', s.relics.length === 1 && s.mode === 'play');
s.relics.push('a', 'b', 'c', 'd', 'e'); s.spawnItem('chest', s.P.x, s.P.y); g.frame();
expect('유물 6개면 상자 = 보수', s.mode === 'levelup' && s.offer.length === 0); const c1 = s.P.coins; g.press('X'); g.frame(); expect('X → 보수 +30', s.P.coins === c1 + 30 && s.mode === 'play');
s.relics.length = 0;
s.P.hp = .1; let n = 0;
while ((s.mode === 'play' || s.mode === 'levelup') && n++ < 4000) { if (s.mode === 'levelup') { G.btn.pick = 0; g.frame(); continue; } s.P.hp = Math.min(s.P.hp, .1); s.P.inv = 0; s.st.postInv = 0; g.frame(); }
expect('사망 → 결과', s.mode === 'result' && !s.P.alive);
g.press('R'); g.frame(); expect('R → 재시작(초기화)', s.mode === 'play' && s.t < .1 && s.P.lvl === 1 && s.relics.length === 0 && s.enemies.length < 5);
s.t = 599.95; for (let i = 0; i < 30 && s.mode !== 'result'; i++) { if (s.mode === 'levelup') { G.btn.pick = 0; } s.P.hp = s.P.maxHp; g.frame(); }
expect('10분 → 클리어 기록', s.mode === 'result' && G.store.data.best.chiikawa?.cleared === true);
s.act('toMenu'); expect('메인 메뉴로, 적·아이템 정리', s.mode === 'menu' && s.enemies.length === 0 && s.items.length === 0);
console.log(ok.map(x => '✓ ' + x).join('\n'));
if (fail.length) { console.log(fail.map(x => '✗ ' + x).join('\n')); process.exitCode = 1; } else console.log(`화면 흐름 ${ok.length}개 모두 통과`);

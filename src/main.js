/* =====================================================================
 *  우사기 서바이버 — 진입점
 *
 *  src/
 *    core/     config(상수) · store(저장) · app(게임 인스턴스 연결)
 *    data/     캐릭터 · 무기 · 적 · 선택지 · 유물 · 밸런스 값 · 이미지/사운드 목록  ← 확장은 대부분 여기서
 *    engine/   애니메이션 · 리그 · 텍스처 · 격자 · 판정 (게임 규칙과 무관한 도구)
 *    game/     씬(기능별 파일을 상속으로 연결: base → stats → world → combat → specials
 *              → survival → progression → loop → render)
 *    audio/    효과음·배경음악 엔진
 *    ui/       HTML 메뉴·설정·입력
 * ===================================================================== */
import { W, H, WORLD } from './core/config.js';
import { app } from './core/app.js';
import { Main } from './game/render.js';
import { initUI } from './ui/menu.js';

app.game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: W * WORLD, height: H * WORLD, backgroundColor: '#1d2230',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, antialiasGL: false, powerPreference: 'high-performance', batchSize: 4096 },
  fps: { target: 60, smoothStep: false }, banner: false, scene: Main
});
initUI();
window.__game = app.game;
if (/[?&]test\b/.test(location.search)) import('./sandbox.js');   // 테스트 페이지 (test.html → index.html?test)          // 개발용: 브라우저 콘솔에서 __game.scene.keys.main 으로 상태 확인

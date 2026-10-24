/* 앱 전역 연결점: Phaser.Game 인스턴스와 현재 씬에 접근 (UI ↔ 씬 순환 import 방지) */
export const app = { game:null };
export const scene = () => app.game?.scene.keys.main;

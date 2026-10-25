/* 입력·UI 공유 상태 */
/* ---------- 입력 / UI 상태 ---------- */
export const UI = { char:'usagi' };
export const joy = { x:0, y:0 };
export const btn = { run:false, spin:false, pick:-1, tool:null, buy:-1 };
export const $ = id => document.getElementById(id);

/* 화면 모드 → 보여줄 오버레이 */
export const SCREEN = { menu:'menu', select:'select', play:null, pause:'pause', settings:'settings', levelup:'lvup', result:'result', shop:'shop', training:'training' };

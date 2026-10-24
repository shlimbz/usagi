/* 적 종류 — from(등장 시각 초), w(등장 가중치). 이미지 교체는 assets.js */
/* ---------- 적 ---------- */
export const ENEMY_TYPES = {
  slime: { tex:'e_slime', hp:14, spd:46, r:13, dmg:7,  xp:1,  mass:1,  from:0,  w:10 },
  bat:   { tex:'e_bat',   hp:8,  spd:88, r:10, dmg:5,  xp:1,  mass:.7, from:25, w:6 },
  golem: { tex:'e_golem', hp:70, spd:30, r:22, dmg:14, xp:6,  mass:3,  from:60, w:2 },
  big:   { tex:'e_golem', hp:0,  spd:34, r:40, dmg:25, xp:40, mass:14, from:1e9, w:0, elite:true, scale:1.85, tint:0xff9f8a, name:'커다란 녀석' }
};
export const STUN_SWING = .18, STUN_SPIN = .3;   // 넉백 후 경직 시간 (이동 멈춤)

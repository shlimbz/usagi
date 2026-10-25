/* =====================================================================
 *  적 종류 — 이미지 교체는 assets.js 의 ASSETS.enemies[tex] (없으면 코드로 그린 임시 그림)
 *
 *  공통: tex(텍스처) · hp · spd(이동) · r(판정 반지름) · dmg(접촉 피해) · xp · mass(무게: 넉백·밀치기)
 *        from(등장 시각 초) · w(등장 가중치, 0 = 일반 스폰 안 함) · barY(발밑~머리 높이: 체력바 위치) · scale(그림 배율)
 *  rank : 'base'(기본) | 'mid'(중간보스) | 'boss'(보스) — 중간보스·보스는 체력바·이름 표시, 보물상자 드롭
 *  maxAlive: 동시에 살아 있을 수 있는 최대 수 (원거리형이 너무 많아지지 않게)
 *  hpMul: 중간보스·보스 체력 = 기본 적 체력 × 시간 배율 × hpMul
 *  size : '소형' | '중형' | '대형' (설명용)
 *
 *  행동 ai
 *    'chase'  : 곧장 다가옴 (기본)
 *    'keep'   : keep 거리를 유지하며 맴돎 (원거리형)
 *    'charge' : 평소엔 다가오다가 charge.cd 초마다 멈춰서(wind 초 동안 깜빡) 직선 돌진 (speed, time)
 *  원거리 공격 shot (없으면 근접만)
 *    cd(간격 초) · range(이 거리 안에서만 쏨) · speed · dmg · r(탄 크기)
 *    플레이어의 공격(기본 공격·필살기)에 닿은 투사체는 사라짐 → 근접 캐릭터도 쳐내며 막을 수 있음
 *    pattern: 'aim'(플레이어 조준) | 'fan'(부채꼴 n발, spread°) | 'ring'(사방 n발) | 'spiral'(돌아가며 n발씩)
 * ===================================================================== */
export const ENEMY_TYPES = {
  // ---------- 기본 몹 4종 (소형 2 · 중형 2) ----------
  slime:   { name:'벌레1',   rank:'base', size:'소형', tex:'e_slime',   hp:14, spd:46, r:13, dmg:7,  xp:1, mass:1,   from:0,   w:10, barY:26 },
  bat:     { name:'고블린',     rank:'base', size:'소형', tex:'e_bat',     hp:8,  spd:88, r:10, dmg:5,  xp:1, mass:.7,  from:25,  w:6,  barY:33 },
  golem:   { name:'벌레2',     rank:'base', size:'중형', tex:'e_golem',   hp:70, spd:30, r:22, dmg:14, xp:6, mass:3,   from:60,  w:2,  barY:46 },
  spitter: { name:'벌레3',   rank:'base', size:'중형', tex:'e_spitter', hp:26, spd:40, r:16, dmg:6,  xp:3, mass:1.5, from:110, w:1.1, barY:40, maxAlive:6,
             ai:'keep', keep:210, shot:{ cd:5, range:280, speed:115, dmg:4, r:6, pattern:'aim' } },
  // ---------- 중간보스 3종 (소형 · 중형 · 대형 스핑크스) ----------
  imp:     { name:'날쌘꼬마',   rank:'mid', size:'소형', tex:'e_imp',    hp:0, hpMul:14, spd:80, r:15, dmg:14, xp:30, mass:4,  from:1e9, w:0, barY:36,
             ai:'charge', charge:{ cd:3.5, wind:.5, speed:430, time:.45 } },
  big:     { name:'커다란 녀석', rank:'mid', size:'중형', tex:'e_big',    hp:0, hpMul:25, spd:34, r:40, dmg:25, xp:40, mass:14, from:1e9, w:0, barY:46, scale:1.85,
             shot:{ cd:6, range:380, speed:120, dmg:7, r:7, pattern:'ring', n:8 } },
  sphinx:  { name:'스핑크스',    rank:'mid', size:'대형', tex:'e_sphinx', hp:0, hpMul:32, spd:24, r:44, dmg:24, xp:60, mass:20, from:1e9, w:0, barY:92,
             ai:'keep', keep:240, shot:{ cd:3.2, range:440, speed:160, dmg:8, r:8, pattern:'fan', n:5, spread:50 } },
  // ---------- 보스 4종 (인간형 중형 2 · 새 대형 · 자동차 대형) ----------
  knight:  { name:'검은기사',   rank:'boss', size:'중형', tex:'e_knight', hp:0, hpMul:55, spd:62, r:22, dmg:20, xp:120, mass:25, from:1e9, w:0, barY:74,
             ai:'charge', charge:{ cd:5, wind:.7, speed:480, time:.5 }, shot:{ cd:6, range:400, speed:130, dmg:8, r:8, pattern:'ring', n:8 } },
  mage:    { name:'점술사',      rank:'boss', size:'중형', tex:'e_mage',   hp:0, hpMul:45, spd:45, r:20, dmg:16, xp:120, mass:22, from:1e9, w:0, barY:74,
             ai:'keep', keep:230, shot:{ cd:1.8, range:480, speed:140, dmg:7, r:7, pattern:'spiral', n:3 } },
  bird:    { name:'큰 새',       rank:'boss', size:'대형', tex:'e_bird',   hp:0, hpMul:75, spd:95, r:40, dmg:22, xp:160, mass:30, from:1e9, w:0, barY:80,
             ai:'charge', charge:{ cd:5, wind:.8, speed:520, time:.6 }, shot:{ cd:4, range:420, speed:170, dmg:8, r:7, pattern:'fan', n:5, spread:60 } },
  car:     { name:'폭주자동차', rank:'boss', size:'대형', tex:'e_car',    hp:0, hpMul:80, spd:50, r:40, dmg:26, xp:160, mass:40, from:1e9, w:0, barY:62,
             ai:'charge', charge:{ cd:3.2, wind:.9, speed:600, time:1 } }
};
/* 중간보스·보스 등장 시각. boss 에 여러 개를 쓰면 그중 하나 무작위 */
export const SCHEDULE = [
  { t:120, type:'big' },
  { t:240, type:'imp' },
  { t:300, boss:['knight', 'mage'] },
  { t:360, type:'sphinx' },
  { t:480, type:'big' },
  { t:540, boss:['bird', 'car'] }
];
/* 시간대 강화 단계: 기본 몹은 등장 시각의 단계 색·크기로 나옴 (체력·공격력은 시간에 따라 계속 오름 — world.js spawnEnemy)
 * t: 이 시각(초)부터 · tint: 색 (null = 원래 색) · scale: 크기 배율 · hp/dmg: 추가 배율 */
export const ENEMY_TIERS = [
  { t:0,   name:'1단계', tint:null,     scale:1,    hp:1,    dmg:1 },
  { t:120, name:'2단계', tint:0xa8ffb4, scale:1.06, hp:1.05, dmg:1.05 },   // 초록
  { t:240, name:'3단계', tint:0x9ad8ff, scale:1.12, hp:1.1,  dmg:1.1 },    // 파랑
  { t:360, name:'4단계', tint:0xffa8f0, scale:1.18, hp:1.15, dmg:1.15 },   // 분홍
  { t:480, name:'5단계', tint:0xff7a6a, scale:1.25, hp:1.2,  dmg:1.2 }     // 빨강
];
export const BOSS_REWARD = { coins:80, chests:1 };      // 보스 처치: 보수 + 보물상자 (중간보스는 상자 1개 + 보수 30)
export const SHOT_RULES = { max:300, life:5 };          // 적 투사체 최대 수, 수명(초)
export const STUN_SWING = .18, STUN_SPIN = .3;          // 넉백 후 경직 시간 (이동 멈춤)

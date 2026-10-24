/* 화면·시뮬레이션·전투 공통 상수 */
/* =====================================================================
 *  우사기 서바이버 — 뱀파이어 서바이벌류 프로토타입 v3 (밸런스 기획 v2.1 반영)
 *
 *  [화면 흐름]  메인 메뉴 → 캐릭터 선택 → 플레이 ⇄ 일시정지(계속/재시작/설정/메인메뉴)
 *                                        → 레벨업·보물상자 선택 → 결과(게임오버/클리어)
 *  [캐릭터]  치이카와(용기: 저HP일수록 강함) · 하치와레(경험치 +10%) · 우사기(우라 야하!: 랜덤 피버)
 *  [성장]   공용 선택지(최대 Lv 2~5, 6종 제한) + 1회성 + 캐릭터 전용 + 무기 Lv2~5 + 진화
 *           등급 가중치 추첨, Reroll 3 · Banish 3 · Skip, 8회 연속 실패 시 희귀 이상 확정
 *  [기타]   커다란 녀석(2·4·6·8분) → 보물상자 → 유물 3택1, 음식(회복), 보수(가게는 다음 단계)
 *  [좌표]   모든 판정은 "발밑(그림자) 점" 기준 원/부채꼴. 공격 이펙트도 같은 크기로 그림.
 *  [최적화] 오브젝트 풀, 공간 격자, 화면 밖 렌더 생략, 원거리 적 재배치,
 *           고정 60Hz 시뮬레이션, HUD 10Hz 갱신, 효과음 종류별 재생 간격 제한
 * ===================================================================== */

export const Q = 3, WORLD = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches ? 1.5 : 2, W = 800, H = 450, S = 1.2;
export const ZOOM = WORLD * .75;
export const VIEW_W = W * WORLD / ZOOM, VIEW_H = H * WORLD / ZOOM;
export const FIXED = 1 / 60, MAX_STEPS = 5;
export const PLAYER_R = 14;
export const INV_TIME = .25;                     // 피격 후 전역 무적 (초)
export const CONTACT_CD = .5;                    // 같은 적이 다시 때릴 수 있기까지 (초)
export const GAUGE_MAX = 100;
export const GOAL_TIME = 600;                    // 클리어 시간 (초)
export const AIM_RANGE_MUL = 1.6;                // 자동조준: 공격 사거리의 몇 배 안의 적을 노릴지
export const MIN_INTERVAL = .2;                  // 공격 간격 하한 (초)
export const PASSIVE_SLOTS = 6, MAX_RELICS = 6, LEGEND_CAP = 2, PITY = 8;
export const BASE_REROLL = 3, BASE_BANISH = 3;
export const LS_BASE = .10, LS_CAP = .08;        // 흡혈: 기본 회복량(준 피해 대비), 초당 회복 상한(최대 HP 대비)
export const XP_NEED = lvl => Math.round(5 + 2 * lvl + .2 * lvl * lvl);   // 다음 레벨까지 필요 경험치 (10분 Lv45~50 목표)
export const ELITE_TIMES = [120, 240, 360, 480];
export const CELL = 48;
export const RING_R = Math.hypot(VIEW_W / 2, VIEW_H / 2) + 50;
export const DESPAWN_R = RING_R + 380;
export const OUT = 0x6b5a5a;
export const rad = d => d * Math.PI / 180;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pct = v => Math.round(v * 1000) / 10 + '%';
export const rnd = (a, b) => a + Math.random() * (b - a);

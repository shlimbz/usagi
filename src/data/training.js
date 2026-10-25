/* =====================================================================
 *  훈련소 (메인 메뉴) — 판이 끝날 때 모은 보수로 영구 강화. 모든 캐릭터에 적용
 *   key  : 수정치 이름 (공용 선택지와 같은 M[key]) — 'reroll' / 'banish' 는 시작 횟수
 *   per  : 레벨당 값 · cost : 레벨별 가격 (길이 = 최대 레벨)
 *  새 훈련: 항목만 추가하면 화면에 자동으로 나옴
 * ===================================================================== */
export const TRAINING = [
  { id:'tr_hp',     icon:'❤️', name:'튼튼 훈련',   key:'maxhp',  per:.04, label:'최대 체력',    cost:[60, 120, 200, 320, 480] },
  { id:'tr_atk',    icon:'💪', name:'힘 훈련',     key:'dmg',    per:.03, label:'공격력',       cost:[80, 160, 260, 400, 600] },
  { id:'tr_spd',    icon:'👟', name:'달리기 훈련', key:'spd',    per:.02, label:'이동 속도',    cost:[50, 100, 170, 260, 380] },
  { id:'tr_magnet', icon:'🧲', name:'줍기 훈련',   key:'magnet', per:.08, label:'줍는 범위',    cost:[40, 80, 140, 220, 320] },
  { id:'tr_xp',     icon:'📖', name:'공부',        key:'xp',     per:.03, label:'경험치',       cost:[70, 140, 230, 350, 520] },
  { id:'tr_gauge',  icon:'🔋', name:'기합 훈련',   key:'gauge',  per:.04, label:'필살기 충전',  cost:[60, 120, 200, 320, 480] },
  { id:'tr_coin',   icon:'💰', name:'흥정 연습',   key:'coin',   per:.05, label:'보수',         cost:[100, 250, 450] },
  { id:'tr_reroll', icon:'🎲', name:'다시 생각하기', key:'reroll', per:1, label:'시작 다시 뽑기', cost:[150, 400] }
];

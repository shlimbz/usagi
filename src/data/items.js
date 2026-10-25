/* =====================================================================
 *  맵 아이템 — 바닥에 나타났다가 시간이 지나면 사라지는 아이템
 *   (경험치 구슬은 여기 없음: 구슬은 사라지지 않고 계속 남음)
 *
 *  항목
 *    name  : 이름 (획득 시 화면에 표시)
 *    tex   : 텍스처 키. assets.js 의 ASSETS.items[tex] 에 이미지를 넣으면 그 그림, 없으면 코드로 그린 기본 그림
 *    color : 바닥 빛(링) 색 — 경험치 구슬·적 투사체와 구분되도록 아이템마다 다른 색
 *    life  : 바닥에 남아 있는 시간(초). 0 = 사라지지 않음(보물상자). 마지막 BLINK 초 동안 깜빡임
 *    drop  : 적 처치 시 떨어질 때 가중치 (0 = 처치로는 안 떨어짐)
 *    field : 맵에 저절로 생길 때 가중치 (0 = 저절로 안 생김)
 *    효과는 src/game/field.js 의 pickItem() 에서 type 별로 처리
 *
 *  새 아이템: 여기 항목 추가 → field.js pickItem() 에 효과 추가 → (선택) assets.js items 에 그림
 * ===================================================================== */
export const ITEMS = {
  food:   { name:'주먹밥',      tex:'food',      color:0xffffff, life:20, drop:50, field:30, heal:.2 },          // 체력 20% 회복 (유물 라멘·기적의 음식 등 '음식' 효과도 발동)
  magnet: { name:'자석',        tex:'it_magnet', color:0xff5a5a, life:20, drop:6,  field:14 },                    // 맵의 모든 경험치 구슬을 끌어옴
  coins:  { name:'보수 주머니', tex:'it_coins',  color:0xffd54a, life:20, drop:14, field:16, coins:[8, 20] },     // 보수 8~20
  candy:  { name:'필살 사탕',   tex:'it_candy',  color:0xff8ad8, life:15, drop:8,  field:10, gauge:40 },         // 필살기 게이지 +40
  bomb:   { name:'폭탄',        tex:'it_bomb',   color:0xff9a3b, life:15, drop:5,  field:8,  mul:12, r:330 },     // 주변 적에게 기본 피해 ×12 (정예·보스는 절반)
  freeze: { name:'얼음 시계',   tex:'it_freeze', color:0x7fd6ff, life:15, drop:4,  field:7,  dur:4 },            // 화면 안 적 4초 멈춤
  star:   { name:'반짝 별',     tex:'it_star',   color:0xfff27a, life:12, drop:1,  field:3,  dur:5 },            // 5초 무적 + 부딪힌 적에게 피해
  chest:  { name:'보물상자',    tex:'chest',     color:0xffb300, life:0,  drop:0,  field:0 }                     // 정예·보스가 떨어뜨림 (사라지지 않음)
};
export const ITEM_RULES = {
  BLINK:4,              // 사라지기 전 깜빡이는 시간(초)
  dropChance:.012,      // 적 1마리 처치 시 아이템이 떨어질 확률 (행운·간식 주머니로 증가)
  fieldEvery:22,        // 맵에 아이템이 저절로 생기는 간격(초)
  fieldDist:[220, 340], // 저절로 생길 때 플레이어와의 거리
  pickR:26              // 줍는 거리 (아이템은 직접 밟아야 먹음)
};

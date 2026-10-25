/* =====================================================================
 *  갑옷씨의 상점 — 판 중간에 갑옷씨 곁에서 15초 버티면 열림. 보수(코인)로 구매
 *   한 번 열릴 때 SHOP_RULES.slots 개를 무작위로 보여줌. max = 한 판에 살 수 있는 횟수
 *   buy(s): 구매 효과. s = 게임 씬 (수정치 s.M, 규칙 s.R, 플레이어 s.P …)
 *   ok(s) : 지금 살 수 있는지 (없으면 항상 가능)
 * ===================================================================== */
export const SHOP = [
  { id:'s_rice',   icon:'🍙', name:'큰 주먹밥',   price:25,  max:9, d:'체력 50% 회복',                     buy:s => s.heal(s.P.maxHp * .5) },
  { id:'s_whet',   icon:'🪨', name:'숫돌',        price:70,  max:3, d:'공격력 +8%',                        buy:s => { s.M.dmg += .08; } },
  { id:'s_plate',  icon:'🛡️', name:'갑옷 조각',   price:70,  max:3, d:'받는 피해 -6%',                     buy:s => { s.M.drList.push(.06); } },
  { id:'s_boots',  icon:'👢', name:'가벼운 장화', price:50,  max:2, d:'이동 속도 +6%',                     buy:s => { s.M.spd += .06; } },
  { id:'s_candy',  icon:'🍭', name:'필살 사탕',   price:30,  max:9, d:'필살기 게이지 가득',                buy:s => { s.P.gauge = 100; } },
  { id:'s_dice',   icon:'🎲', name:'주사위 두 개', price:45, max:3, d:'다시 뽑기 +2',                      buy:s => { s.rerolls += 2; } },
  { id:'s_eraser', icon:'🧽', name:'지우개',      price:40,  max:3, d:'빼기 +2',                           buy:s => { s.banishes += 2; } },
  { id:'s_box',    icon:'📦', name:'수상한 상자', price:140, max:2, d:'무작위 유물 1개',                   buy:s => s.giveRandomRelic(), ok:s => s.relics.length < 6 },
  { id:'s_star',   icon:'⭐', name:'별사탕 부적', price:120, max:2, d:'궤도 별 +1\n(캐릭터 주위를 돌며 공격)', buy:s => { s.M.orbs += 1; } },
  { id:'s_spike',  icon:'🌵', name:'가시 갑옷',   price:160, max:1, d:'맞으면 원래 피해의 150%를\n주변 적에게 돌려줌', buy:s => { s.R.thorns += 1.5; } },
  { id:'s_ward',   icon:'🔰', name:'수호 부적',   price:110, max:1, d:'쓰러질 피해 1번 막음',              buy:s => { s.miracle++; } },
  { id:'s_purse',  icon:'👛', name:'큰 주머니',   price:60,  max:1, d:'보수 획득 +30%',                    buy:s => { s.M.coin += .3; } }
];
export const SHOP_RULES = { slots:4 };

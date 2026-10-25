/* =====================================================================
 *  검은별의 거래 — 하이리스크·하이리턴. 검은별 곁에서 15초 버티면 3개 중 하나를 고르거나 거절
 *   g    : 등급 (선택지 등급 가중치 GRADES 를 그대로 사용 → 전설은 드묾. 행운이 높으면 높은 등급이 잘 나옴)
 *   d    : 카드 문구 (\n 줄바꿈). 위험한 부분은 '대신' 뒤에
 *   ok(s): 지금 제안할 수 있는지 (조건이 안 맞으면 안 나옴)
 *   take(s): 효과. s.M = 수정치(공용 선택지와 같은 값), s.R = 거래·특수 규칙 (src/game/base.js reset() 참고)
 *   같은 거래는 한 판에 한 번만
 * ===================================================================== */
import { rnd } from '../core/config.js';

export const TRADES = [
  // ---------- 일반 ----------
  { id:'t_blood',  g:'일반', icon:'🩸', name:'피의 계약',     d:'공격력 +35%\n대신 매초 체력 -0.6%',          take:s => { s.M.dmg += .35; s.R.hpDrain += .006; } },
  { id:'t_dice',   g:'일반', icon:'🎲', name:'운명의 주사위', d:'공격력·공속·이동·체력·사거리가\n각각 -15% ~ +25% 무작위', take:s => s.rollDice() },
  { id:'t_coin',   g:'일반', icon:'🪙', name:'동전 던지기',   d:'50%: 레벨 +3\n50%: 체력 절반',               take:s => s.coinFlip() },
  { id:'t_heavy',  g:'일반', icon:'🪨', name:'무거운 갑옷',   d:'받는 피해 -25%\n대신 이동 속도 -18%',         take:s => { s.M.drList.push(.25); s.M.spd -= .18; } },
  { id:'t_greed',  g:'일반', icon:'💰', name:'탐욕',          d:'보수 획득 ×2\n대신 받는 피해 +20%',           take:s => { s.R.coinMul *= 2; s.R.dmgTaken += .2; } },
  // ---------- 고급 ----------
  { id:'t_glass',  g:'고급', icon:'🥂', name:'유리 대포',     d:'공격력 +70%\n대신 최대 체력 -45%',            take:s => { s.M.dmg += .7; s.M.maxhp -= .45; } },
  { id:'t_barter', g:'고급', icon:'🔁', name:'물물교환',      d:'유물 2개를 내주고\n더 높은 등급 유물 1개',     ok:s => s.relics.length >= 2, take:s => s.barterRelics() },
  { id:'t_shuffle',g:'고급', icon:'🌀', name:'능력 갈아엎기', d:'능력 3개를 잃고\n잃은 레벨 ×2 만큼 무작위 강화', ok:s => s.passiveCount() >= 3, take:s => s.shufflePassives() },
  { id:'t_rush',   g:'고급', icon:'⏩', name:'성급한 필살',   d:'필살기 충전 +100%\n대신 최대 체력 -20%',      take:s => { s.M.gauge += 1; s.M.maxhp -= .2; } },
  { id:'t_tunnel', g:'고급', icon:'🔭', name:'외골수',        d:'사거리 +35%\n대신 창 폭·휘두름 각도 -30%',    take:s => { s.M.range += .35; s.R.widthMul *= .7; } },
  // ---------- 희귀 ----------
  { id:'t_vamp',   g:'희귀', icon:'🧛', name:'흡혈귀',        d:'흡혈 확률 +25% · 흡혈량 +10%\n대신 흡혈 말고는 회복 안 됨', take:s => { s.M.lsChance += .25; s.M.lsAmt += .1; s.R.noHeal = true; } },
  { id:'t_berserk',g:'희귀', icon:'😤', name:'광전사',        d:'체력이 낮을수록 공격력 최대 +100%\n대신 회복량 -40%', take:s => { s.R.berserk += 1; s.R.healMul *= .6; } },
  { id:'t_thorns', g:'희귀', icon:'🦔', name:'가시 피부',     d:'맞으면 원래 피해의 400%를\n주변 적에게 · 대신 최대 체력 -15%', take:s => { s.R.thorns += 4; s.M.maxhp -= .15; } },
  { id:'t_overflow',g:'희귀',icon:'⛲', name:'넘치는 기운',   d:'체력이 가득할 때 회복량 ×5를\n주변 피해로 · 대신 받는 피해 +15%', take:s => { s.R.overflow += 5; s.R.dmgTaken += .15; } },
  { id:'t_rewind', g:'희귀', icon:'⏪', name:'시간 되돌리기', d:'레벨 -3 (능력은 그대로)\n다음 레벨업 3번은 희귀 이상만', ok:s => s.P.lvl > 4, take:s => s.rewindLevels(3) },
  // ---------- 영웅 ----------
  { id:'t_allin',  g:'영웅', icon:'🎰', name:'올인',          d:'보수를 전부 내고\n낸 보수 10당 공격력 +1% (최대 +120%)', ok:s => s.P.coins >= 50, take:s => { s.R.allinDmg = Math.min(1.2, s.P.coins / 10 * .01); s.P.coins = 0; } },
  { id:'t_shield', g:'영웅', icon:'🥚', name:'껍데기 계약',   d:'6초마다 피해 1번 막는 보호막\n대신 최대 체력 -60%', take:s => { s.R.shieldCd = 6; s.st.shield = 1; s.M.maxhp -= .6; } },
  { id:'t_starpact',g:'영웅',icon:'🌌', name:'별의 계약',     d:'궤도 별 +3\n대신 기본 공격 피해 -35%',          take:s => { s.M.orbs += 3; s.R.basicMul *= .65; } },
  // ---------- 전설 ----------
  { id:'t_chaos',  g:'전설', icon:'🌪️', name:'혼돈의 계약',   d:'20초마다 무작위 강력 효과 10초\n(공격력 ×2·무적·자석·폭주)\n대신 받는 피해 +20%', take:s => { s.R.chaos = true; s.R.dmgTaken += .2; } },
  { id:'t_devil',  g:'전설', icon:'😈', name:'악마의 거래',   d:'공격력 +100% · 공격 속도 +40%\n대신 매초 체력 -1.5%\n흡혈 말고는 회복 안 됨', take:s => { s.M.dmg += 1; s.M.aspd += .4; s.R.hpDrain += .015; s.R.noHeal = true; } }
];
export const TRADE_RULES = { offer:3 };
export const DICE_STATS = [['dmg', '공격력'], ['aspd', '공격 속도'], ['spd', '이동'], ['maxhp', '최대 체력'], ['range', '사거리']];
export const diceRoll = () => Math.round(rnd(-.15, .25) * 100) / 100;

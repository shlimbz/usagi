/* 캐릭터 정의 — 새 캐릭터는 여기에 항목 추가 (+ weapons.js, choices.js EXCL, sounds.js 의 <id>_special) */
import { ASSETS } from './assets.js';

export const IMG = ASSETS.characters;

/* ---------- 캐릭터 프리셋 (밸런스 기획 v2.1 '캐릭터 기본' 시트) ----------
 * base: hp, walk/run(이동속도), dmg(기본 피해), cd(공격 간격 초), arc(시작 공격 각도°), range(사거리), kb(넉백), xp(경험치 배율)
 * shape: 'cone'(원뿔 찌르기) | 'fan'(부채꼴 휘두르기) — 둘 다 범위 안의 모든 적이 맞음                      */
export const USAGI_IDLE_SC = .12 * 455 / 235;
export const PRESETS = {
  usagi: {
    name:'우사기', diff:'중·상급자', desc:'초반부터 강하고 빠름. 랜덤 피버로 순간 최고점이 높다',
    trait:'우라 야하!', traitDesc:'휘두를 때 3% 확률로 6초간 이동속도 +40%, 공격속도 +50%, 공격 각도·사거리 +40%',
    spName:'이야아~ 야다야다', spDesc:'2회전베기 후 화면 끝까지 퍼지는 충격파',
    hipY:-26.88, armReach:8,
    poses: {
      idle: { key:'usagi:idle', src:IMG.usagi_idle, scale:USAGI_IDLE_SC, ax:188.5, ay:374, hand:[260, 308] },
      run:  { key:'usagi:run',  src:IMG.usagi_run,  scale:.12,           ax:277,   ay:494, hand:[401, 388] }
    },
    weapon: { key:'w_usagi_rod', gen:{ type:'rod', color:0xffd43b, hi:0xffed86 }, len:144, grip:.30 },
    shape:'fan', anim:'attack_swing',
    base: { hp:100, walk:135, run:210, dmg:14, cd:.90, arc:60, range:115, kb:400, xp:1 }
  },
  chiikawa: {
    name:'치이카와', diff:'상급자', desc:'풀피에선 약하지만 HP가 낮을수록 강해진다',
    trait:'용기', traitDesc:'HP가 낮을수록 피해·공격속도·이동속도 증가 (HP 20% 이하에서 최대, 레벨이 오를수록 커짐)',
    spName:'시러! 시러!!!', spDesc:'이동 방향으로 무적 돌진, 경로의 모든 적에게 큰 피해',
    hipY:-25.75, armReach:8,
    bob: { sx:.022, sy:.045, rot:.028 },
    poses: { idle: { key:'chiikawa:idle', src:IMG.chii_idle, scale:51.5 / 359, ax:157.5, ay:359, hand:[265, 208] } },
    weapon: { key:'w_chiikawa_systema', gen:{ type:'systema', color:0xf19ab5, hi:0xffd7e2 }, len:108, grip:.30 },
    shape:'cone', anim:'attack_thrust',
    base: { hp:80, walk:120, run:190, dmg:11, cd:1.0, arc:55, range:95, kb:400, xp:1 }
  },
  hachiware: {
    name:'하치와레', diff:'초보자', desc:'튼튼하고 성장이 빠른 안정형',
    trait:'차근차근', traitDesc:'경험치 획득량 +10%',
    spName:'어떻게든 되어라~!', spDesc:'5초간 사방으로 2연타 찌르기 + 강한 넉백, 받는 피해 -50%',
    hipY:-26, armReach:8, flipX:true,
    bob: { sx:.018, sy:.035, rot:.018 },
    poses: { idle: { key:'hachiware:idle', src:IMG.hachi_idle, scale:52 / 125, ax:55, ay:125, hand:[17.6, 72.5] } },
    weapon: { key:'w_hachiware_systema', gen:{ type:'systema', color:0x7da9bf, hi:0xd7edf5 }, len:108, grip:.30 },
    shape:'cone', anim:'attack_thrust',
    base: { hp:120, walk:120, run:190, dmg:10, cd:.75, arc:55, range:100, kb:400, xp:1.1 }
  }
};
export const CHAR_IDS = Object.keys(PRESETS);

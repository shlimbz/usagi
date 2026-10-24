/* 레벨업 선택지: 등급 가중치, 공용(성장형·1회성), 캐릭터 전용 */

/* ---------- 선택지 등급 ('선택지 확률' 시트) ---------- */
export const GRADES = {
  '일반': { w:100, c:'#cfd8dc' }, '고급': { w:55, c:'#7bd88f' }, '희귀': { w:25, c:'#5ec8ff' },
  '영웅': { w:8,   c:'#c38bff' }, '전설': { w:3,  c:'#ffb300' }
};
export const RARE_UP = { '희귀':1, '영웅':1, '전설':1 };
export const MUL_OWNED = 1.6, MUL_WEAPON = 1.3, MUL_EXCL = 1.2;

/* ---------- 공용 선택지 ('공용 선택지' 시트) ----------
 * 성장형: per(Lv당 값) × Lv 만큼 mods[key]에 더함. 한 런에 PASSIVE_SLOTS 종까지                          */
export const COMMON = [
  { id:'meal',    g:'일반', name:'든든한 밥',        max:4, per:.15, key:'maxhp',  label:'최대 HP', note:'올린 만큼 회복' },
  { id:'power',   g:'일반', name:'힘내기',           max:5, per:.12, key:'dmg',    label:'피해' },
  { id:'quick',   g:'일반', name:'빠른 손놀림',      max:5, per:.10, key:'aspd',   label:'공격속도' },
  { id:'light',   g:'일반', name:'가벼운 발걸음',    max:3, per:.08, key:'spd',    label:'이동속도' },
  { id:'wide',    g:'일반', name:'넓게 휘두르기',    max:3, per:0,   key:'arcLv',  label:'공격 각도', custom:true },
  { id:'far',     g:'일반', name:'멀리까지',         max:3, per:.12, key:'range',  label:'사거리' },
  { id:'pick',    g:'일반', name:'주워주워',         max:3, per:.40, key:'magnet', label:'아이템 획득 범위' },
  { id:'study',   g:'일반', name:'풀뽑기 검정 공부', max:3, per:.10, key:'xp',     label:'경험치' },
  { id:'armor',   g:'고급', name:'갑옷 씨의 보호대', max:3, per:.08, key:'dr',     label:'받는 피해 감소' },
  { id:'push',    g:'고급', name:'밀어내기',         max:2, per:.25, key:'kb',     label:'넉백', note:'Lv2: 날아간 적이 다른 적과 부딪히면 피해 30%' },
  { id:'tact',    g:'고급', name:'토벌 요령',        max:4, per:.15, key:'crit',   label:'치명타 확률' },
  { id:'burst',   g:'고급', name:'폭발적인 일격',    max:3, per:.30, key:'critDmg',label:'치명타 피해', note:'기본 150%' },
  { id:'giant',   g:'고급', name:'강적 토벌',        max:3, per:.20, key:'boss',   label:'보스·정예 피해' },
  { id:'drain',   g:'고급', name:'기운 받기',        max:4, per:.08, key:'lsChance', label:'흡혈 확률', note:'적중 시 확률로 준 피해의 일부 회복' },
  { id:'snack',   g:'고급', name:'간식 주머니',      max:3, per:.20, key:'heal',   label:'회복 효과·음식 드롭' },
  { id:'coinup',  g:'고급', name:'토벌 보수',        max:3, per:.20, key:'coin',   label:'보수 획득', shop:true },
  { id:'drainAmt',g:'희귀', name:'기운 듬뿍',        max:3, per:.10, key:'lsAmt',  label:'흡혈량', note:'기본 10%, 초당 최대 HP 8%까지' },
  { id:'clover',  g:'희귀', name:'네잎클로버',       max:3, per:.15, key:'luck',   label:'행운', note:'희귀 이상 등장·치명타(행운÷2)·상자 등급' },
  { id:'endure',  g:'희귀', name:'꾹 참기',          max:3, per:.15, key:'lowHp',  label:'HP 50% 이하 피해' },
  { id:'charge',  g:'희귀', name:'필살 충전',        max:3, per:.20, key:'gauge',  label:'필살기 게이지 충전 속도' },
  { id:'streak',  g:'희귀', name:'연속 토벌',        max:2, per:.15, key:'streak', label:'3초 안에 10마리 처치 시 5초간 공격속도' }
];
export const ONCE = [
  { id:'miracle', g:'영웅', name:'작은 기적',      d:'죽을 피해를 한 번 무효화' },
  { id:'cheer',   g:'영웅', name:'친구의 응원',    d:'레벨업 선택지 +1개' },
  { id:'toolset', g:'영웅', name:'토벌 도구 세트', d:'피해 +15%, 필살기 피해 +30%' },
  { id:'medal',   g:'전설', name:'토벌 훈장',      d:'피해 +20%, 공격속도 +15%, 필살기 게이지 충전 +30%' },
  { id:'lunch',   g:'전설', name:'끝없는 도시락',  d:'30초마다 근처에 주먹밥(HP 20% 회복) 생성' }
];

/* ---------- 캐릭터 전용 선택지 ('전용 선택지' 시트) ---------- */
export const EXCL = {
  chiikawa: [
    { id:'brave',   g:'일반', name:'작지만 용감하게', max:3, d:l => `용기 보너스 +${[10, 20, 30][l - 1]}%` },
    { id:'cry',     g:'고급', name:'울면서도 전진',   max:3, d:l => `피격 시 3초간 공격속도 +${[10, 15, 20][l - 1]}%, 이동속도 +10%` },
    { id:'shiver',  g:'고급', name:'덜덜 떨면서',     max:1, d:() => '피격 후 무적 +0.2초, 무적 중 이동속도 +20%' },
    { id:'cando',   g:'희귀', name:'할 수 있어…!',    max:1, d:() => '죽을 피해를 받으면 HP 1로 버티고 2초 무적 (재사용 90초)' },
    { id:'resolve', g:'영웅', name:'각오',            max:1, d:() => '회복 효과 -50%, 대신 용기 최대 구간이 HP 35% 이하로 넓어짐' },
    { id:'guard',   g:'전설', name:'모두를 지키는 용기', max:1, d:() => '필살기 게이지 100→70, 돌진 경로에 3초간 분홍 충격, 돌진 후 4초간 용기 최대' }
  ],
  hachiware: [
    { id:'posi',     g:'일반', name:'긍정 에너지', max:3, d:l => `최대 HP +${[8, 16, 24][l - 1]}%, 5초마다 HP ${l}% 회복` },
    { id:'idea',     g:'고급', name:'그럼 이렇게 하면 되지 않을까?', max:3, d:() => 'Reroll +1회' },
    { id:'sing',     g:'고급', name:'노래하기',    max:1, d:() => '주변 반경 140 안 적 이동속도 -15%, 받는 피해 -5%' },
    { id:'think',    g:'희귀', name:'잘 생각해보자', max:1, d:() => '레벨업 선택지 +1개' },
    { id:'did',      g:'영웅', name:'해냈다!',     max:1, d:() => '경험치 +15%, 레벨당 피해 +0.5%(최대 +20%), 레벨업마다 HP 10% 회복' },
    { id:'together', g:'전설', name:'모두 함께라면', max:1, d:() => '피해 +20%, 받는 피해 -15%, HP 30% 아래로 떨어지면 HP 30% 회복 (재사용 90초)' }
  ],
  usagi: [
    { id:'hyper',   g:'일반', name:'신나는 우사기', max:3, d:l => `이동속도 +${[6, 12, 18][l - 1]}%` },
    { id:'yaha',    g:'고급', name:'야하!',         max:3, d:l => `휘두를 때 ${[12, 16, 20][l - 1]}% 확률로 한 번 더 휘두름` },
    { id:'ura',     g:'희귀', name:'우라!!',        max:3, d:l => `휘두를 때 ${[8, 11, 15][l - 1]}% 확률로 봉 끝 폭발(피해 ${[150, 175, 200][l - 1]}%) + 화상 3초. 우라 야하! 중 확률 2배` },
    { id:'pururu',  g:'희귀', name:'푸루루루~',     max:1, d:() => '우라 야하! 확률 3%→4.5%, 지속 +2초, 음식을 먹으면 즉시 발동 (재사용 30초)' },
    { id:'unpred',  g:'영웅', name:'예측불허',      max:1, d:() => '매 공격 피해 60%~170% 랜덤, 165% 이상이면 넉백 2배' },
    { id:'nonstop', g:'전설', name:'멈추지 않는 우사기', max:1, d:() => '우라 야하! 중 처치마다 지속 +0.3초(최대 15초), 끝날 때 필살기 게이지 +30' }
  ]
};

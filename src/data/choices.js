/* =====================================================================
 *  레벨업 선택지: 등급 가중치, 공용(성장형·1회성), 캐릭터 전용
 *  카드 표시: icon + name, 굵은 한 줄 효과, 작은 보조 설명(note). 설명은 짧게(한 줄 20자 안팎)
 *  d 안의 '\n' 은 카드에서 줄바꿈
 * ===================================================================== */

/* ---------- 선택지 등급 ---------- */
export const GRADES = {
  '일반': { w:100, c:'#cfd8dc', cls:'g0' }, '고급': { w:55, c:'#7bd88f', cls:'g1' }, '희귀': { w:25, c:'#5ec8ff', cls:'g2' },
  '영웅': { w:8,   c:'#c38bff', cls:'g3' }, '전설': { w:3,  c:'#ffb300', cls:'g4' }
};
export const RARE_UP = { '희귀':1, '영웅':1, '전설':1 };
export const MUL_OWNED = 1.6, MUL_WEAPON = 1.3, MUL_EXCL = 1.2;

/* ---------- 공용 선택지 ----------
 * 성장형: per(Lv당 값) × Lv 만큼 수정치 M[key]에 더함. 한 판에 PASSIVE_SLOTS 종까지
 *   also : Lv마다 함께 오르는 다른 수정치 { 키:값 }  · count : 퍼센트가 아니라 개수(예: 궤도 별 +1개)
 *   용어: '공격력' = 모든 피해에 곱해지는 값 하나로 통일 (무기 강화·유물·거래도 같은 값)            */
export const COMMON = [
  { id:'meal',    g:'일반', icon:'🍙', name:'든든한 밥',        max:4, per:.15, key:'maxhp',  label:'최대 체력', note:'늘어난 만큼 회복' },
  { id:'power',   g:'일반', icon:'💪', name:'힘내기',           max:5, per:.12, key:'dmg',    label:'공격력' },
  { id:'quick',   g:'일반', icon:'⚡', name:'빠른 손놀림',      max:5, per:.10, key:'aspd',   label:'공격 속도' },
  { id:'light',   g:'일반', icon:'👟', name:'가벼운 발걸음',    max:3, per:.08, key:'spd',    label:'이동 속도' },
  { id:'wide',    g:'일반', icon:'↔️', name:'넓게 휘두르기',    max:3, per:0,   key:'arcLv',  label:'공격 범위', custom:true },
  { id:'far',     g:'일반', icon:'📏', name:'멀리까지',         max:3, per:.12, key:'range',  label:'사거리' },
  { id:'pick',    g:'일반', icon:'🧲', name:'주워주워',         max:3, per:.40, key:'magnet', label:'줍는 범위' },
  { id:'study',   g:'일반', icon:'📖', name:'풀뽑기 검정 공부', max:3, per:.10, key:'xp',     label:'경험치' },
  { id:'armor',   g:'고급', icon:'🛡️', name:'갑옷 씨의 보호대', max:3, per:.08, key:'dr',     label:'받는 피해', minus:true },
  { id:'push',    g:'고급', icon:'💨', name:'밀어내기',         max:2, per:.25, key:'kb',     label:'넉백', note:'Lv2: 날아간 적이 부딪히면 피해' },
  { id:'tact',    g:'고급', icon:'🎯', name:'토벌 요령',        max:4, per:.15, key:'crit',   label:'치명타 확률' },
  { id:'burst',   g:'고급', icon:'💥', name:'폭발적인 일격',    max:3, per:.30, key:'critDmg',label:'치명타 피해', note:'기본 150%' },
  { id:'giant',   g:'고급', icon:'👹', name:'강적 토벌',        max:3, per:.20, key:'boss',   label:'정예·보스 피해' },
  { id:'drain',   g:'고급', icon:'🩸', name:'기운 받기',        max:4, per:.08, key:'lsChance', label:'흡혈 확률', also:{ lsAmt:.03 }, note:'흡혈량도 +3%씩 (준 피해의 10%부터)' },
  { id:'snack',   g:'고급', icon:'🍡', name:'간식 주머니',      max:3, per:.20, key:'heal',   label:'회복량·음식', note:'회복 효과와 음식 드롭 모두' },
  { id:'coinup',  g:'고급', icon:'💰', name:'토벌 보수',        max:3, per:.20, key:'coin',   label:'보수', shop:true },
  { id:'orbit',   g:'희귀', icon:'⭐', name:'빙글빙글 별',      max:3, per:1,   key:'orbs',   label:'궤도 별', count:true, note:'캐릭터 주위를 돌며 부딪힌 적 공격' },
  { id:'clover',  g:'희귀', icon:'🍀', name:'네잎클로버',       max:3, per:.15, key:'luck',   label:'행운', note:'좋은 선택지·치명타·상자 등급 ↑' },
  { id:'endure',  g:'희귀', icon:'😣', name:'꾹 참기',          max:3, per:.15, key:'lowHp',  label:'위기 공격력', note:'체력 50% 이하일 때' },
  { id:'charge',  g:'희귀', icon:'🔋', name:'필살 충전',        max:3, per:.20, key:'gauge',  label:'필살기 충전' },
  { id:'streak',  g:'희귀', icon:'🔥', name:'연속 토벌',        max:2, per:.15, key:'streak', label:'연속 처치 공속', note:'3초에 10마리 잡으면 5초간' }
];
export const ONCE = [
  { id:'miracle', g:'영웅', icon:'✨', name:'작은 기적',      d:'죽을 피해 1번 무효' },
  { id:'cheer',   g:'영웅', icon:'📣', name:'친구의 조언',    d:'레벨업 선택지 +1개' },
  { id:'toolset', g:'영웅', icon:'🧰', name:'토벌 도구 세트', d:'공격력 +15%\n필살기 피해 +30%' },
  { id:'medal',   g:'전설', icon:'🏅', name:'토벌 훈장',      d:'공격력 +20% · 공격 속도 +15%\n필살기 충전 +30%' },
  { id:'lunch',   g:'전설', icon:'🍱', name:'끝없는 도시락',  d:'30초마다 주먹밥 등장\n(체력 20% 회복)' },
  // 특이 조합용 (드묾): 다른 선택지·유물·거래와 엮이면 크게 강해짐
  { id:'chain',   g:'영웅', icon:'⚡', name:'번개 부적',      d:'치명타 때 주변 적 2마리에\n공격력 60% 번개 연쇄' },
  { id:'wind',    g:'영웅', icon:'🌬️', name:'바람돌이',       d:'이동 속도 보너스 ×2 만큼 공격력\n달릴 때 부딪힌 적에게 피해' }
];

/* ---------- 캐릭터 전용 선택지 ---------- */
export const EXCL = {
  chiikawa: [
    { id:'brave',   g:'일반', icon:'💗', name:'작지만 용감하게', max:3, d:l => `용기 효과 +${[10, 20, 30][l - 1]}%` },
    { id:'cry',     g:'고급', icon:'😢', name:'울면서도 전진',   max:3, d:l => `맞으면 3초간\n공격 속도 +${[10, 15, 20][l - 1]}% · 이동 +10%` },
    { id:'shiver',  g:'고급', icon:'🫨', name:'덜덜 떨면서',     max:1, d:() => '맞은 뒤 무적 +0.2초\n무적 중 이동 +20%' },
    { id:'cando',   g:'희귀', icon:'✊', name:'할 수 있어…!',    max:1, d:() => '죽을 때 체력 1로 버팀\n(90초마다)' },
    { id:'resolve', g:'영웅', icon:'🔥', name:'각오',            max:1, d:() => '용기 최대: 체력 35% 이하부터\n대신 회복 -50%' },
    { id:'guard',   g:'전설', icon:'🌸', name:'모두를 지키는 용기', max:1, d:() => '필살기 게이지 30% 절약\n돌진 자리 분홍 충격 · 4초간 용기 최대' }
  ],
  hachiware: [
    { id:'posi',     g:'일반', icon:'😊', name:'긍정 에너지', max:3, d:l => `최대 체력 +${[8, 16, 24][l - 1]}%\n5초마다 체력 ${l}% 회복` },
    { id:'idea',     g:'고급', icon:'💡', name:'그럼 이렇게 하면 되지 않을까?', max:3, d:() => '다시 뽑기 +1회' },
    { id:'sing',     g:'고급', icon:'🎵', name:'노래하기',    max:1, d:() => '주변 적 느려짐 -15%\n받는 피해 -5%' },
    { id:'think',    g:'희귀', icon:'🤔', name:'잘 생각해보자', max:1, d:() => '레벨업 선택지 +1개' },
    { id:'did',      g:'영웅', icon:'🙌', name:'해냈다!',     max:1, d:() => '경험치 +15% · 레벨업마다 회복\n레벨이 오를수록 공격력 ↑' },
    { id:'together', g:'전설', icon:'🤝', name:'모두 함께라면', max:1, d:() => '공격력 +20% · 받는 피해 -15%\n위기 때 체력 30% 회복 (90초마다)' }
  ],
  usagi: [
    { id:'hyper',   g:'일반', icon:'🐰', name:'신나는 우사기', max:3, d:l => `이동 속도 +${[6, 12, 18][l - 1]}%` },
    { id:'yaha',    g:'고급', icon:'❗', name:'야하!',         max:3, d:l => `${[12, 16, 20][l - 1]}% 확률로 한 번 더 휘두름` },
    { id:'ura',     g:'희귀', icon:'💣', name:'우라!!',        max:3, d:l => `${[8, 11, 15][l - 1]}% 확률로 봉 끝 폭발\n피해 ${[150, 175, 200][l - 1]}% + 화상` },
    { id:'pururu',  g:'희귀', icon:'🍮', name:'푸루루루~',     max:1, d:() => '폭주 확률 ↑ · 지속 +2초\n음식 먹으면 바로 폭주' },
    { id:'unpred',  g:'영웅', icon:'🎲', name:'예측불허',      max:1, d:() => '공격마다 피해 60~170% 랜덤' },
    { id:'nonstop', g:'전설', icon:'🌪️', name:'멈추지 않는 우사기', max:1, d:() => '폭주 중 적을 잡을수록 계속 폭주\n끝나면 필살기 게이지 +30' }
  ]
};

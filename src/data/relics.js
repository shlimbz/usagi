/* 유물 — mod 는 수정치(this.M)에 더해지는 값, only 는 해당 캐릭터 전용 */
/* ---------- 유물 ('유물' 시트) — 커다란 녀석의 보물상자에서 3택1 ---------- */
export const RELICS = [
  { id:'bag',      g:'일반', name:'작은 가방',      d:'아이템 획득 범위 +30%', mod:{ magnet:.3 } },
  { id:'shoes',    g:'일반', name:'낡은 운동화',    d:'이동속도 +6%',          mod:{ spd:.06 } },
  { id:'glove',    g:'일반', name:'오래된 장갑',    d:'공격속도 +6%',          mod:{ aspd:.06 } },
  { id:'bento',    g:'일반', name:'도시락',         d:'회복 효과 +20%',        mod:{ heal:.2 } },
  { id:'charm',    g:'일반', name:'작은 부적',      d:'행운 +10%',             mod:{ luck:.1 } },
  { id:'wallet',   g:'일반', name:'동전 지갑',      d:'보수 획득 +15%',        mod:{ coin:.15 }, shop:true },
  { id:'cord',     g:'고급', name:'시스테마 끈',    d:'시스테마 공격속도 +12%', mod:{ aspd:.12 }, only:['chiikawa', 'hachiware'] },
  { id:'grip',     g:'고급', name:'노란 봉 손잡이', d:'봉 공격 각도 +30°',     only:['usagi'] },
  { id:'tools',    g:'고급', name:'토벌 도구',      d:'보스·정예 피해 +20%',   mod:{ boss:.2 } },
  { id:'notebook', g:'고급', name:'토벌 수첩',      d:'치명타 확률 +15%',      mod:{ crit:.15 } },
  { id:'ramen',    g:'고급', name:'맛있는 라멘',    d:'음식을 먹으면 8초간 피해 +15%' },
  { id:'stone',    g:'고급', name:'반짝이는 돌',    d:'처치 시 2% 확률로 보수 +5', shop:true },
  { id:'pencil',   g:'고급', name:'연필과 공책',    d:'경험치 +12%',           mod:{ xp:.12 } },
  { id:'hanky',    g:'희귀', name:'치이카와의 손수건', d:'피격 시 3초간 용기 보너스 최대 (재사용 10초)', only:['chiikawa'] },
  { id:'memo',     g:'희귀', name:'하치와레의 메모',   d:'레벨업 선택지 1개를 보관해 다음 화면에 꺼냄', only:['hachiware'] },
  { id:'treat',    g:'희귀', name:'우사기의 간식',     d:'우라 야하! 지속 +2초, 끝날 때 HP 5% 회복', only:['usagi'] },
  { id:'oldcharm', g:'희귀', name:'낡은 부적',      d:'죽으면 한 번 HP 50%로 부활' },
  { id:'band',     g:'희귀', name:'힘내는 머리띠',  d:'필살기를 쓴 뒤 5초간 피해 +25%' },
  { id:'goldkey',  g:'영웅', name:'황금 상자 열쇠', d:'보물상자 보상이 항상 한 등급 위' },
  { id:'photo',    g:'영웅', name:'친구들의 사진',  d:'전용 선택지 수치 +20%' },
  { id:'tmedal',   g:'영웅', name:'토벌 메달',      d:'정예 처치 시 필살기 게이지 +50, HP 10% 회복' },
  { id:'friends',  g:'전설', name:'친구들의 응원',  d:'30초마다 다른 두 친구가 4초간 나타나 함께 싸움' },
  { id:'mfood',    g:'전설', name:'기적의 음식',    d:'음식을 먹으면 10초간 피해 +50% / 공격속도 +50% / 무적 중 하나' },
  { id:'fate',     g:'전설', name:'운명의 부적',    d:'영웅·전설 선택지 가중치 ×2' }
];
export const CHEST_ODDS = [['일반', .45], ['고급', .32], ['희귀', .16], ['영웅', .06], ['전설', .01]];
export const GRADE_ORDER = ['일반', '고급', '희귀', '영웅', '전설'];

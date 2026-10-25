/* 유물 — mod 는 수정치(this.M)에 더해지는 값, rule 은 특수 규칙(this.R)에 더해지는 값, only 는 해당 캐릭터 전용 */
/* ---------- 유물 ('유물' 시트) — 커다란 녀석의 보물상자에서 3택1 ---------- */
export const RELICS = [
  { id:'bag',      g:'일반', name:'작은 가방',      icon:'🎒', d:'줍는 범위 +30%', mod:{ magnet:.3 } },
  { id:'shoes',    g:'일반', name:'낡은 운동화',    icon:'👟', d:'이동 속도 +6%',          mod:{ spd:.06 } },
  { id:'glove',    g:'일반', name:'오래된 장갑',    icon:'🧤', d:'공격 속도 +6%',          mod:{ aspd:.06 } },
  { id:'bento',    g:'일반', name:'반찬통',         icon:'🍱', d:'회복량 +20%',        mod:{ heal:.2 } },
  { id:'charm',    g:'일반', name:'작은 부적',      icon:'🧿', d:'행운 +10%',             mod:{ luck:.1 } },
  { id:'wallet',   g:'일반', name:'동전 지갑',      icon:'👛', d:'보수 +15%',        mod:{ coin:.15 }, shop:true },
  { id:'cord',     g:'고급', name:'시스테마 끈',    icon:'🎀', d:'공격 속도 +12%', mod:{ aspd:.12 }, only:['chiikawa', 'hachiware'] },
  { id:'grip',     g:'고급', name:'노란 봉 손잡이', icon:'🟡', d:'휘두르는 각도 +30°',     only:['usagi'] },
  { id:'tools',    g:'고급', name:'강적 도감',      icon:'🔨', d:'정예·보스 피해 +20%',   mod:{ boss:.2 } },
  { id:'notebook', g:'고급', name:'토벌 수첩',      icon:'📓', d:'치명타 확률 +15%',      mod:{ crit:.15 } },
  { id:'ramen',    g:'고급', name:'맛있는 라멘',    icon:'🍜', d:'음식 먹으면 8초간\n공격력 +15%' },
  { id:'stone',    g:'고급', name:'반짝이는 돌',    icon:'💎', d:'처치 시 가끔 보수 +5', shop:true },
  { id:'pencil',   g:'고급', name:'연필과 공책',    icon:'✏️', d:'경험치 +12%',           mod:{ xp:.12 } },
  { id:'hanky',    g:'희귀', name:'치이카와의 손수건', icon:'🧣', d:'맞으면 3초간 용기 최대\n(10초마다)', only:['chiikawa'] },
  { id:'memo',     g:'희귀', name:'하치와레의 메모',   icon:'📝', d:'선택지 1개를 보관해\n다음 레벨업에 꺼냄', only:['hachiware'] },
  { id:'treat',    g:'희귀', name:'우사기의 간식',     icon:'🥕', d:'폭주 +2초\n끝나면 체력 5% 회복', only:['usagi'] },
  { id:'oldcharm', g:'희귀', name:'낡은 부적',      icon:'🪬', d:'쓰러지면 1번 부활\n(체력 50%)' },
  { id:'band',     g:'희귀', name:'힘내는 머리띠',  icon:'🎽', d:'필살기 후 5초간\n공격력 +25%' },
  { id:'goldkey',  g:'영웅', name:'황금 상자 열쇠', icon:'🗝️', d:'보물상자 등급 +1' },
  { id:'photo',    g:'영웅', name:'친구들의 사진',  icon:'🖼️', d:'전용 선택지 효과 +20%' },
  { id:'tmedal',   g:'영웅', name:'정예 사냥 배지',      icon:'🎖️', d:'정예 처치 시\n필살기 +50 · 체력 10% 회복' },
  { id:'friends',  g:'전설', name:'친구들의 응원',  icon:'👯', d:'30초마다 두 친구가\n4초간 함께 싸움' },
  { id:'mfood',    g:'전설', name:'기적의 음식',    icon:'🌟', d:'음식 먹으면 10초간\n공격력·공속 +50% 또는 무적' },
  { id:'fate',     g:'전설', name:'운명의 부적',    icon:'🔮', d:'영웅·전설 선택지 2배 자주' },
  // 특이 조합용 유물 (다른 선택지·거래와 엮이면 크게 강해짐)
  { id:'cactus',   g:'희귀', name:'선인장 화분',    icon:'🌵', d:'맞으면 원래 피해의 200%를\n주변 적에게 돌려줌', rule:{ thorns:2 } },
  { id:'starmap',  g:'희귀', name:'별자리 지도',    icon:'🗺️', d:'궤도 별 +1\n궤도 별 피해 +50%', mod:{ orbs:1, orbDmg:.5 } },
  { id:'gembomb',  g:'영웅', name:'터지는 구슬',    icon:'💥', d:'경험치 구슬을 먹으면 15% 확률로\n그 자리에서 폭발 (공격력 200%)', rule:{ gemBomb:.15 } },
  { id:'spring',   g:'영웅', name:'샘솟는 물병',    icon:'⛲', d:'5초마다 체력 1% 회복\n체력이 가득하면 회복량 ×3을 주변 피해로', rule:{ overflow:3, regen:.01 } }
];
export const CHEST_ODDS = [['일반', .45], ['고급', .32], ['희귀', .16], ['영웅', .06], ['전설', .01]];
export const GRADE_ORDER = ['일반', '고급', '희귀', '영웅', '전설'];

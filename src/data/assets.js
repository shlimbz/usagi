/* =====================================================================
 *  이미지 에셋 목록
 *
 *  characters : 캐릭터 원본 그림 (포즈별). 프레임 정렬값(ax/ay/hand/scale)은 src/data/characters.js
 *  enemies    : 적 그림. null 이면 코드로 그린 기본 도형 사용 (src/engine/textures.js)
 *  items      : 보석·음식·보물상자 그림. null 이면 기본 도형
 *
 *  이미지로 교체하는 법: 파일을 assets/ 아래 넣고 { src, scale, origin } 을 지정
 *    src    : 경로
 *    scale  : 게임 안 크기 배율 (원본 픽셀 × scale = 게임 픽셀)
 *    origin : 발밑 기준점 [x비율, y비율] — 그림자·판정이 이 점 기준
 *  예) e_slime: { src:'assets/enemies/slime.png', scale:.25, origin:[.5, .92] }
 * ===================================================================== */
export const ASSETS = {
  characters: {
    usagi_idle: 'assets/characters/usagi_idle.png',
    usagi_run:  'assets/characters/usagi_run.png',
    chii_idle:  'assets/characters/chiikawa_idle.png',
    chii_run:   'assets/characters/chiikawa_run.png',      // 예전 대기 그림 → 이동용
    hachi_idle: 'assets/characters/hachiware_idle.png',
    hachi_run:  'assets/characters/hachiware_run.png'      // 예전 대기 그림(왼쪽을 봄 → flipX) → 이동용
  },
  enemies: {                 // 기본 몹 · 중간보스 · 보스 (종류·능력치는 src/data/enemies.js)
    e_slime: null,           // 소형 · 슬라임
    e_bat:   null,           // 소형 · 박쥐
    e_golem: null,           // 중형 · 골렘 (중간보스 '커다란 녀석'도 이 그림을 크게·붉게)
    e_spitter: null,         // 중형 · 침뱉개 (원거리)
    e_imp:   null,           // 중간보스 소형 · 날쌘 꼬마
    e_sphinx: null,          // 중간보스 대형 · 스핑크스
    e_knight: null,          // 보스 인간형 중형 · 검은 기사
    e_mage:  null,           // 보스 인간형 중형 · 점술사
    e_bird:  null,           // 보스 대형 · 큰 새
    e_car:   null            // 보스 대형 · 폭주 자동차
  },
  items: {                   // 맵 아이템 (종류·효과는 src/data/items.js)
    gem:   null,             // 경험치 구슬
    food:  null,             // 주먹밥
    chest: null,             // 보물상자
    it_magnet: null, it_coins: null, it_candy: null, it_bomb: null, it_freeze: null, it_star: null,
    orb_star: null,          // 궤도 별 (빙글빙글 별·별사탕 부적 등)
    e_shot: null             // 적 투사체
  },
  neutrals: {                // 중립 캐릭터 (src/data/neutrals.js)
    n_ystar: null,           // 노란별 (동료가 되면 궤도를 돌며 공격)
    n_armor: null,           // 갑옷씨 (상점)
    n_bstar: null            // 검은별 (거래)
  }
};

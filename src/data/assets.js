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
 *  예) e_slime: { src:'assets/enemies/e_slime.png', scale:.15, origin:[.5, .95] }
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
  enemies: {                 // 이미지 PNG는 캐릭터만 보이도록 배경을 제거함
    e_slime:  { src:'assets/enemies/e_slime.png',  scale:.15,  origin:[.5,.95] }, // 벌레1
    e_bat:    { src:'assets/enemies/e_bat.png',    scale:.12,  origin:[.5,.96] }, // 고블린
    e_golem:  { src:'assets/enemies/e_golem.png',  scale:.23,  origin:[.5,.96] }, // 벌레2
    e_spitter:{ src:'assets/enemies/e_spitter.png',scale:.155, origin:[.5,.96] }, // 벌레3
    e_imp:    { src:'assets/enemies/e_imp.png',    scale:.095, origin:[.5,.96] }, // 풍댕이
    e_big:    { src:'assets/enemies/e_big.png',    scale:.175, origin:[.5,.94] }, // 키메라
    e_sphinx: { src:'assets/enemies/e_sphinx.png', scale:.34,  origin:[.5,.96] }, // 스핑크스
    e_knight: { src:'assets/enemies/e_knight.png', scale:.33,  origin:[.5,.96] }, // 마녀 그림 → 검은기사
    e_mage:   { src:'assets/enemies/e_mage.png',   scale:.28,  origin:[.5,.96] }, // 코끼리 그림 → 점술사
    e_bird:   { src:'assets/enemies/e_bird.png',   scale:.40,  origin:[.5,.96] }, // 큰 새
    e_car:    { src:'assets/enemies/e_car.png',    scale:.285, origin:[.5,.98] }  // 의태형 그림 → 왼쪽이 앞인 폭주 자동차
  },
  items: {                   // 맵 아이템 (종류·효과는 src/data/items.js)
    gem:   null,             // 경험치 구슬
    food:  null,             // 주먹밥
    chest: null,             // 보물상자
    it_magnet: null, it_coins: null, it_candy: null, it_bomb: null, it_freeze: null, it_star: null,
    orb_star: null,          // 궤도 별 (빙글빙글 별·별사탕 부적 등)
    e_shot: null             // 적 투사체
  },
  neutrals: {                // 중립 캐릭터
    n_ystar: { src:'assets/neutrals/n_ystar.png', scale:.16,  origin:[.5,.94] }, // 노란별: 동료
    n_armor: { src:'assets/neutrals/n_armor.png', scale:.15,  origin:[.5,.98] }, // 갑옷씨: 상점
    n_bstar: { src:'assets/neutrals/n_bstar.png', scale:.16,  origin:[.5,.96] }  // 검은별: 거래
  }
};

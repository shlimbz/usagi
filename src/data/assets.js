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
    hachi_idle: 'assets/characters/hachiware_idle.png'
  },
  enemies: {
    e_slime: null,
    e_bat:   null,
    e_golem: null      // 커다란 녀석(정예)도 이 그림을 크게·붉게 씀 (src/data/enemies.js 의 big)
  },
  items: {
    gem:   null,
    food:  null,
    chest: null
  }
};

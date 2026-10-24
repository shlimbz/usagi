# 우사기 서바이버

치이카와·하치와레·우사기로 10분 동안 살아남는 뱀파이어 서바이벌류 웹 게임입니다.
Phaser 3 + 순수 ES 모듈로 만들었고, **빌드 과정 없이** 정적 파일 그대로 GitHub Pages·Vercel에 올릴 수 있습니다.

> ⚠️ 치이카와 캐릭터와 원본 그림의 저작권은 원작자(ナガノ)와 권리사에 있습니다. 공개 배포 전에 팬 게임 가이드라인을 확인하세요.

## 실행

ES 모듈은 `file://`(파일 더블클릭)로는 열리지 않습니다. **웹 서버로 여세요.**

```bash
npm run dev                    # = npx serve -l 5173 .   → http://localhost:5173
# 또는
python3 -m http.server 5173    # → http://localhost:5173
```

VS Code를 쓴다면 Live Server 확장으로 `index.html`을 열어도 됩니다.

| 조작 | 키보드 | 모바일 |
| --- | --- | --- |
| 이동 | WASD / 방향키 | 왼쪽 조이스틱 |
| 달리기 | Shift | 달리기 버튼 |
| 공격 | 자동 (가까운 적, 없으면 이동 방향) | 자동 |
| 필살기 | Space (게이지가 차면) | 오른쪽 큰 버튼 |
| 레벨업 | 1~5 선택 · R 다시 뽑기 · B 빼기 · X 넘기기 | 버튼 |
| 일시정지 | Esc / P | ❚❚ |

설정에서 효과음·음악 볼륨, 자동조준, **피해 숫자 표시**, **적 체력바 표시**를 켜고 끌 수 있습니다. (피해 숫자는 적마다 0.14초씩 모아 프레임당 최대 8개, 체력바는 맞은 적만 최대 400개로 제한해 적이 많아도 부하가 작습니다.)

설정 화면: 효과음·음악 볼륨, 자동조준, 화면 흔들림, **피해 숫자**·**적 체력바** 표시 켜기/끄기 (적이 많아도 부담 없도록 숫자는 적마다 0.14초씩 모아 프레임당 최대 8개, 체력바는 맞은 적만 최대 400개)

## 폴더 구조

```
index.html            화면 뼈대(HUD·메뉴·레벨업 카드). 게임 코드는 src/main.js 에서 시작
css/style.css         화면 스타일
assets/
  characters/         캐릭터 원본 그림 (PNG)
  enemies/ items/     (비어 있음) 적·아이템 그림을 넣으면 코드로 그린 도형 대신 사용
  audio/voice/        캐릭터 목소리 (usagi_attack_1~3, usagi_fever, *_special, chiikawa_attack_1~3)
  audio/music/        배경음악 (battle_bgm1, hachiware_sing)
  audio/sfx/          (비어 있음) 효과음 파일
src/
  main.js             진입점: Phaser.Game 생성 + UI 연결
  core/               config(공통 상수) · store(저장) · app(게임 인스턴스)
  data/               ★ 게임 내용 — 대부분의 확장은 여기서
    characters.js       캐릭터 (능력치, 특성·필살기 이름, 그림 정렬값)
    weapons.js          기본 무기 Lv2~5, 진화 조건
    choices.js          레벨업 선택지 (등급 가중치, 공용 성장형·1회성, 캐릭터 전용)
    relics.js           유물, 보물상자 등급 확률
    enemies.js          적 종류, 등장 시각·가중치
    tuning.js           밸런스 조정 값 (적 체력 곡선, 획득 범위, 돌진 크기 …)
    assets.js           이미지 경로
    sounds.js           효과음·배경음악 목록
  engine/             애니메이션 · 리그 · 텍스처 · 공간 격자 · 판정
  game/               씬 (기능별 파일을 상속으로 연결)
                        base → stats → world → combat → specials → survival → progression → loop → render
  audio/audio.js      효과음·음악 엔진
  ui/                 메뉴·설정·입력
tests/                헤드리스 시뮬레이터 (Node 18+) — 브라우저 없이 실제 게임 로직 실행
```

## 확장하기

### 효과음·배경음악 넣기

`src/data/sounds.js` 에서 경로만 넣으면 됩니다. 파일이 없거나 못 읽으면 지금의 합성음이 그대로 나갑니다.

```js
swing: { file:'assets/audio/sfx/swing.mp3', vol:1, gap:.08, pitch:.06, synth:... },
...
export const MUSIC = {
  title:  { file:'assets/audio/music/title.mp3',  vol:.6 },
  battle: { file:'assets/audio/music/battle.mp3', vol:.5 },
```

- `files`: 여러 파일 중 랜덤 · `chance`: 재생 확률(목소리 빈도) · `channel:'voice'`: 새 목소리가 이전 목소리를 끊음
- `gap`: 같은 소리 최소 간격(초) — 적이 수백 마리여도 소리가 폭주하지 않음
- `pitch`: 파일 재생 속도를 ±값만큼 랜덤 — 반복음이 덜 단조로움
- 새 소리: 항목을 추가하고 코드에서 `SFX.play('이름')`
- 캐릭터 필살기 소리는 `<캐릭터id>_special`, 우사기 특성은 `usagi_trait` (목소리 등으로 교체하기 좋음)
- 음악 볼륨은 설정 화면에서 따로 조절, 일시정지·레벨업 중에는 자동으로 작아짐
- 레벨업·보물상자 카드가 열릴 때 가장 높은 등급에 맞춰 `reveal_rare` / `reveal_epic` / `reveal_legend` 재생

### 공격 모양

- **창(치이카와·하치와레)**: 캐릭터 쪽이 넓고 앞으로 갈수록 뾰족한 마상창 모양. `base.range` = 창 길이, `base.width` = 밑변 폭, '넓게 휘두르기' 1Lv당 `TUNE.widthStep` 만큼 굵어짐
- **봉(우사기)**: 부채꼴. `base.arc` = 시작 각도, 1Lv당 `TUNE.arcStep.fan`, 최대 360°
- 판정 함수: `src/engine/collision.js` (`lanceHitsCircle`, `fanHitsCircle`), 이펙트는 같은 도형으로 그림
- 무기 그림 길이는 실제 타격 거리에 자동으로 맞춰짐 (`Rig.setReach`) — 무기 그림을 바꿀 때 `weapon.len`(그림 속 무기 길이)·`grip`(손잡이 위치 0~1)만 맞추면 됨

### 화면 설명 문구

캐릭터 카드는 짧은 필드를 씁니다(`characters.js`): `tagline`(한 줄 소개), `stars`(난이도 1~3), `traitShort`, `spShort`. 자세한 설명(`desc`, `traitDesc`, `spDesc`)은 카드에 마우스를 올리면 보입니다.
선택지·유물은 `icon` + 짧은 `d`(줄바꿈은 `\n`), 성장형은 `label`·`note` 로 카드가 자동 구성됩니다. 등급별 카드 연출은 `css/style.css` 의 `.opt.g0`~`.g4`, `.gevo`.

### 이미지 교체

`src/data/assets.js`. 적·아이템은 `null` 이면 코드로 그린 도형을 씁니다.

```js
e_slime: { src:'assets/enemies/slime.png', scale:.25, origin:[.5, .92] },
food:    { src:'assets/items/onigiri.png', scale:.2,  origin:[.5, .9] },
```

`origin` 은 발밑 기준점(그림자·판정 위치)입니다. 무기 그림은 `characters.js` 의 `weapon` 에 `src` 와 `img:{ buttX, tipX, axisY }`(손잡이·끝·축 픽셀)를 넣으면 됩니다.

### 레벨업 선택지 추가 (`src/data/choices.js`)

- 공용 성장형: `{ id, g:'고급', name, max:3, per:.1, key:'dmg', label:'피해' }` — `key` 는 `src/game/base.js` 의 `this.M` 수정치 이름
- 1회성: `ONCE` 에 추가하고 효과는 `src/game/progression.js` 의 `applyChoice` 에서 처리
- 캐릭터 전용: `EXCL[캐릭터id]` 에 추가하고 효과는 `this.X[id]` 로 읽음 (`stats.js` · `combat.js` 등)

### 유물 추가 (`src/data/relics.js`)

단순 능력치는 `mod:{ aspd:.1 }` 만 쓰면 끝. 특수 효과는 코드에서 `this.has('유물id')` 로 확인합니다. `only:['usagi']` 로 전용 유물.

### 캐릭터 추가

1. 그림을 `assets/characters/` 에 넣고 `assets.js` 에 경로 추가
2. `characters.js` 에 항목 추가 (`base` 능력치, `shape:'cone'|'fan'`, 그림 정렬값 `ax/ay/hand/scale`)
3. `weapons.js` 에 무기 Lv2~5·진화, `choices.js` 의 `EXCL` 에 전용 선택지
4. 특성·필살기 코드는 `stats.js`(능력치에 반영) · `specials.js`(필살기) 에 캐릭터 id 분기 추가
5. `sounds.js` 에 `<id>_special`

### 밸런스 조정

수치는 `src/data/` 에만 있습니다. 바꾼 뒤 시뮬레이터로 확인하세요.

```bash
npm test             # 화면 흐름 + 기능 점검 + 짧은 시뮬레이션
npm run sim          # 캐릭터 × 봇 3판씩 10분
npm run sim:full     # 8판씩 (시간 오래 걸림)
node tests/sim.mjs --chars chiikawa --bots brave --runs 10 --json out.json
```

봇 종류: `fight`(사거리 유지하며 싸움) · `brave`(치이카와: 저HP로 파고들기) · `kite`(계속 도망) · `idle`(가만히) · `chaos`(무작위, 오류 탐색).
판마다 생존·레벨·처치·저HP 시간·성능을 내고, 매 프레임 게임 상태 불변식(NaN, 오브젝트 풀 누수, 최대 레벨 초과 등)을 검사합니다.

## 배포

빌드 단계가 없으므로 저장소 루트를 그대로 올리면 됩니다. 모든 경로가 상대 경로라 하위 경로(`/저장소이름/`)에서도 동작합니다.

**GitHub Pages**: 저장소 Settings → Pages → Source: *Deploy from a branch* → Branch `main` / `/ (root)` → 저장. `.nojekyll` 이 들어 있어 그대로 동작합니다.

**Vercel**: New Project → 저장소 Import → Framework Preset *Other*, Build Command 비움, Output Directory `.` (기본값) → Deploy.

`.github/workflows/test.yml` 이 push 때마다 `npm test` 를 돌립니다.

밸런스 측정 결과와 고친 오류 목록은 [docs/BALANCE.md](docs/BALANCE.md).

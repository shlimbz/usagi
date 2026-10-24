/* =====================================================================
 *  사운드 목록 — 효과음(SOUNDS)과 배경음악(MUSIC)을 한 곳에서 관리
 *
 *  효과음 항목
 *    file  : 오디오 파일 경로(assets/audio/sfx/...). 넣으면 그 파일을 재생하고,
 *            null 이거나 불러오지 못하면 synth(코드로 만든 소리)로 대신 재생
 *    vol   : 볼륨 배율 (1 = 기본)
 *    gap   : 같은 소리를 다시 낼 수 있는 최소 간격(초). 적이 많을 때 소리 폭주 방지
 *    pitch : 파일 재생 시 속도(음높이)를 ±pitch 만큼 랜덤하게 — 반복음이 덜 단조로움
 *    synth : (s, t) => ... 합성음. s.tone / s.noise 사용 (src/audio/audio.js)
 *
 *  새 효과음 추가: 여기 항목을 하나 추가하고 코드에서 SFX.play('이름') 호출
 *  파일로 교체:   file: 'assets/audio/sfx/swing.mp3' 처럼 경로만 넣으면 됨 (mp3/ogg/wav)
 *
 *  배경음악 항목: file(경로), vol. file 이 null 이면 그 장면은 무음
 *  재생 위치: 메인 메뉴·캐릭터 선택 = title, 플레이 = battle, 결과 = result
 * ===================================================================== */

export const SOUNDS = {
  // ---- 전투 ----
  swing:   { file:null, vol:1, gap:.08, pitch:.06, synth:(s, t) => s.noise(t, { dur:.12, g:.16, f:2600, f1:700, q:.8 }) },
  hit:     { file:null, vol:1, gap:.05, pitch:.08, synth:(s, t) => s.tone(t, { type:'square', f0:240, f1:110, dur:.07, g:.1 }) },
  kill:    { file:null, vol:1, gap:.04, pitch:.1,  synth:(s, t) => s.tone(t, { f0:520, f1:980, dur:.09, g:.16 }) },
  boom:    { file:null, vol:1, gap:.08, pitch:.05, synth:(s, t) => { s.noise(t, { dur:.3, g:.3, f:300, f1:80, q:.6 }); s.tone(t, { type:'sine', f0:120, f1:40, dur:.25, g:.25 }); } },
  hurt:    { file:null, vol:1, gap:.2,  pitch:0,   synth:(s, t) => s.tone(t, { type:'sawtooth', f0:300, f1:90, dur:.18, g:.18 }) },
  // ---- 줍기 ----
  gem:     { file:null, vol:1, gap:.05, pitch:.1,  synth:(s, t) => s.tone(t, { type:'triangle', f0:1046, f1:1568, dur:.07, g:.1 }) },
  eat:     { file:null, vol:1, gap:.1,  pitch:0,   synth:(s, t) => [784, 988].forEach((f, i) => s.tone(t, { type:'triangle', f0:f, dur:.08, g:.14, delay:i * .07 })) },
  chest:   { file:null, vol:1, gap:.5,  pitch:0,   synth:(s, t) => [523, 784, 1046, 1568].forEach((f, i) => s.tone(t, { type:'triangle', f0:f, dur:.16, g:.18, delay:i * .07 })) },
  // ---- 캐릭터 (PRESETS[id].sfx 에서 이름으로 연결 — 캐릭터 목소리 등으로 바꾸기 쉬움) ----
  usagi_special:     { file:null, vol:1, gap:.2, pitch:0, synth:(s, t) => { s.noise(t, { dur:.35, g:.28, f:600, f1:2400, q:.7 }); s.tone(t, { type:'triangle', f0:180, f1:90, dur:.3, g:.22 }); } },
  chiikawa_special:  { file:null, vol:1, gap:.2, pitch:0, synth:(s, t) => s.noise(t, { dur:.25, g:.3, f:800, f1:3000, q:.7 }) },
  hachiware_special: { file:null, vol:1, gap:.2, pitch:0, synth:(s, t) => { s.noise(t, { dur:.35, g:.28, f:600, f1:2400, q:.7 }); s.tone(t, { type:'triangle', f0:240, f1:120, dur:.3, g:.2 }); } },
  usagi_trait:       { file:null, vol:1, gap:.5, pitch:0, synth:(s, t) => [660, 880, 1320].forEach((f, i) => s.tone(t, { type:'square', f0:f, dur:.08, g:.1, delay:i * .06 })) },
  // ---- 이벤트 / UI ----
  elite:   { file:null, vol:1, gap:1,   pitch:0, synth:(s, t) => [196, 165, 131].forEach((f, i) => s.tone(t, { type:'sawtooth', f0:f, dur:.22, g:.16, delay:i * .16 })) },
  // 레벨업·보물상자 카드 공개: 화면에 나온 가장 높은 등급에 맞춰 재생
  reveal_rare:   { file:null, vol:1, gap:.3, pitch:0, synth:(s, t) => [659, 880, 1175, 1568].forEach((f, i) => s.tone(t, { type:'triangle', f0:f, dur:.16, g:.17, delay:i * .06 })) },
  reveal_epic:   { file:null, vol:1, gap:.3, pitch:0, synth:(s, t) => { [523, 784, 1046, 1318, 1568].forEach((f, i) => s.tone(t, { type:'triangle', f0:f, dur:.22, g:.17, delay:i * .07 })); s.noise(t, { dur:.5, g:.08, f:6000, f1:9000, q:2 }); } },
  reveal_legend: { file:null, vol:1, gap:.3, pitch:0, synth:(s, t) => { [392, 523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => s.tone(t, { type:'triangle', f0:f, dur:.3, g:.16, delay:i * .06 })); s.tone(t, { type:'sine', f0:130, f1:65, dur:.6, g:.22 }); s.noise(t, { dur:.9, g:.1, f:5000, f1:10000, q:2, delay:.2 }); } },
  levelup: { file:null, vol:1, gap:.3,  pitch:0, synth:(s, t) => [523, 659, 784, 1046].forEach((f, i) => s.tone(t, { type:'triangle', f0:f, dur:.14, g:.18, delay:i * .08 })) },
  click:   { file:null, vol:1, gap:.03, pitch:0, synth:(s, t) => s.tone(t, { f0:660, f1:880, dur:.05, g:.1 }) },
  over:    { file:null, vol:1, gap:1,   pitch:0, synth:(s, t) => [392, 330, 262, 196].forEach((f, i) => s.tone(t, { type:'triangle', f0:f, dur:.25, g:.2, delay:i * .18 })) },
  clear:   { file:null, vol:1, gap:1,   pitch:0, synth:(s, t) => [523, 659, 784, 1046, 1318].forEach((f, i) => s.tone(t, { type:'triangle', f0:f, dur:.2, g:.2, delay:i * .1 })) }
};

export const MUSIC = {
  title:  { file:null, vol:.6 },   // 예: 'assets/audio/music/title.mp3'
  battle: { file:null, vol:.5 },   // 예: 'assets/audio/music/battle.mp3'
  result: { file:null, vol:.6 }
};

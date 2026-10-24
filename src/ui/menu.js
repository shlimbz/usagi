/* HTML UI: 캐릭터 카드·초상화, 설정, 버튼·조이스틱 입력 연결 */
import { SFX } from '../audio/audio.js';
import { scene } from '../core/app.js';
import { GOAL_TIME } from '../core/config.js';
import { SET, store } from '../core/store.js';
import { CHAR_IDS, PRESETS } from '../data/characters.js';
import { $, UI, btn, joy } from './state.js';

/* ---------- HTML UI ---------- */
/* 캐릭터 카드 초상화: 원본 이미지를 그림이 있는 부분만 잘라내고(투명 여백 제거)
 * 게임 안과 같은 배율(poses.idle.scale)로, 발밑을 같은 바닥선에 맞춰 같은 크기 캔버스에 그림.
 * → 이미지 파일마다 여백·해상도가 달라도 카드에서 실제 게임 속 크기 비율 그대로 보임 */
export const PORTRAITS = {};
export function buildPortraits(done) {
  const U = 3, BW = 60, BH = 62, PADB = 3;          // 캔버스: 60x62 월드 단위, 1단위 = 3px
  let left = CHAR_IDS.length;
  const fin = () => { if (--left === 0) done(); };
  CHAR_IDS.forEach(id => {
    const P = PRESETS[id], cfg = P.poses.idle, img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
        const d = cx.getImageData(0, 0, c.width, c.height).data;
        let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++)
          if (d[(y * c.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0) throw new Error('empty');
        const o = document.createElement('canvas'); o.width = BW * U; o.height = BH * U;
        const g = o.getContext('2d'), sc = cfg.scale * U, w = (x1 - x0 + 1) * sc, h = (y1 - y0 + 1) * sc;
        const top = (BH - PADB) * U - (cfg.ay - y0) * sc;   // 발밑(ay)을 바닥선에
        g.imageSmoothingQuality = 'high';
        if (!!P.flipX !== !!cfg.flipX) { g.translate(o.width, 0); g.scale(-1, 1); }
        g.drawImage(img, x0, y0, x1 - x0 + 1, y1 - y0 + 1, (o.width - w) / 2, top, w, h);
        PORTRAITS[id] = o.toDataURL();
      } catch (e) { PORTRAITS[id] = cfg.src; }
      fin();
    };
    img.onerror = fin;
    img.src = cfg.src;
  });
}
/* 카드 능력치 막대에 쓰는 값 (초당 피해 = 피해 ÷ 공격 간격) */
const STAT_OF = { hp:A => A.hp, atk:A => A.dmg / A.cd, spd:A => A.walk, range:A => A.range };
export function renderCharCards() {
  const box = $('charCards'); box.innerHTML = '';
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  CHAR_IDS.forEach((id, i) => {
    const P = PRESETS[id], A = P.base, b = store.data.best[id];
    // 능력치 막대: 세 캐릭터 중 가장 높은 값 = 꽉 찬 막대
    const max = k => Math.max(...CHAR_IDS.map(c => STAT_OF[k](PRESETS[c].base)));
    const bar = (label, k) => `<span>${label}</span><i style="--v:${(STAT_OF[k](A) / max(k)).toFixed(2)}"></i>`;
    const el = document.createElement('div');
    el.className = 'cc' + (UI.char === id ? ' sel' : '');
    el.title = `${P.desc}\n\n특성 ${P.trait}: ${P.traitDesc}\n필살기 ${P.spName}: ${P.spDesc}`;
    el.innerHTML = `<img src="${PORTRAITS[id] || ''}" alt="">
      <div class="cc-head"><b>${i + 1}. ${P.name}</b><span class="stars">${'★'.repeat(P.stars)}${'☆'.repeat(3 - P.stars)}<small>${P.diff}</small></span></div>
      <div class="tagline">${P.tagline}</div>
      <div class="bars">${bar('체력', 'hp')}${bar('공격', 'atk')}${bar('속도', 'spd')}${bar('사거리', 'range')}</div>
      <span class="feat"><em>특성</em>${P.trait}<small>${P.traitShort}</small></span>
      <span class="feat sp"><em>필살기</em>${P.spName}<small>${P.spShort}</small></span>
      <div class="best">${b ? `🏆 ${b.cleared ? '클리어 · ' : ''}${fmt(b.time)} · 처치 ${b.kills}` : '기록 없음'}</div>`;
    el.addEventListener('click', () => { SFX.init(); SFX.play('click'); scene().setChar(id); renderCharCards(); });
    el.addEventListener('dblclick', () => scene().act('start'));
    box.appendChild(el);
  });
}
export function syncSettingsUI() {
  $('sVol').value = SET.vol; $('sMusic').value = SET.musicVol; $('sAim').checked = SET.autoAim; $('sShake').checked = SET.shake;
  $('sDbg').checked = SET.debug; $('sDmg').checked = SET.dmgNum; $('sStat').checked = SET.statPanel; $('sHpBar').checked = SET.hpBar; $('sStress').value = SET.stress; $('sStressV').textContent = SET.stress + 'x';
}

export function initUI() {
  buildPortraits(() => { if (scene()?.mode === 'select') renderCharCards(); });
  $('goalTxt').textContent = Math.round(GOAL_TIME / 60) + '분';
  document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => scene()?.act(b.dataset.act)));
  $('sVol').addEventListener('input', e => { SET.vol = +e.target.value; SFX.setVol(SET.vol); });
  $('sMusic').addEventListener('input', e => { SET.musicVol = +e.target.value; SFX.setMusicVol(SET.musicVol); });
  $('sVol').addEventListener('change', () => { SFX.init(); SFX.play('hit'); });
  $('sAim').addEventListener('change', e => { SET.autoAim = e.target.checked; });
  $('sShake').addEventListener('change', e => { SET.shake = e.target.checked; });
  $('sDbg').addEventListener('change', e => { SET.debug = e.target.checked; });
  $('sDmg').addEventListener('change', e => { SET.dmgNum = e.target.checked; });
  $('sStat').addEventListener('change', e => { SET.statPanel = e.target.checked; document.body.classList.toggle('nostat', !SET.statPanel); });
  document.body.classList.toggle('nostat', !SET.statPanel);
  document.body.classList.toggle('statfold', !SET.statOpen);
  $('statPanel').addEventListener('pointerdown', e => { e.preventDefault(); SET.statOpen = !SET.statOpen; document.body.classList.toggle('statfold', !SET.statOpen); store.save(); });
  $('sHpBar').addEventListener('change', e => { SET.hpBar = e.target.checked; });
  $('sStress').addEventListener('input', e => { SET.stress = +e.target.value; $('sStressV').textContent = SET.stress + 'x'; });
  $('pauseBtn').addEventListener('pointerdown', e => { e.preventDefault(); scene()?.pauseGame(); });
  $('spinBtn').addEventListener('pointerdown', e => { e.preventDefault(); btn.spin = true; });
  $('bReroll').addEventListener('pointerdown', e => { e.preventDefault(); btn.tool = 'reroll'; });
  $('bBanish').addEventListener('pointerdown', e => { e.preventDefault(); btn.tool = 'banish'; });
  $('bSkip').addEventListener('pointerdown', e => { e.preventDefault(); btn.tool = 'skip'; });
  $('runBtn').addEventListener('pointerdown', e => { e.preventDefault(); btn.run = !btn.run; $('runBtn').classList.toggle('on', btn.run); });

  // 브라우저는 사용자 입력 이벤트 안에서만 소리를 켤 수 있음 → 첫 키/터치에서 오디오 준비
  ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => SFX.init(), { capture:true }));
  // 탭 전환·창 이탈 시 자동 일시정지
  document.addEventListener('visibilitychange', () => { if (document.hidden) scene()?.pauseGame(); });
  window.addEventListener('blur', () => scene()?.pauseGame());

  // 가상 조이스틱
  const stick = $('stick'), knob = $('knob'), R = 50;
  let pid = null;
  const move = e => {
    const r = stick.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / R, y = (e.clientY - (r.top + r.height / 2)) / R;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    joy.x = x; joy.y = y;
    knob.style.transform = `translate(${x * R}px,${y * R}px)`;
  };
  stick.addEventListener('pointerdown', e => { e.preventDefault(); pid = e.pointerId; stick.setPointerCapture(pid); move(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === pid) move(e); });
  const end = e => { if (e.pointerId !== pid) return; pid = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  window.addEventListener('contextmenu', e => e.preventDefault());
}

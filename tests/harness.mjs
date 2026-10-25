/* =====================================================================
 *  헤드리스 하네스: 브라우저·Phaser 없이 게임 로직(src/)을 그대로 실행
 *   - Phaser·DOM·오디오는 아무 일도 안 하는 Proxy 스텁으로 대체 (그리기는 생략, 규칙·수치는 실제 코드)
 *   - newGame(): 씬 하나 생성 → { s(씬), K(키 상태), press(키), frame() }
 * ===================================================================== */
const mk = () => {
  const f = function () {};
  const p = new Proxy(f, {
    get: (t, k) => { if (k === Symbol.toPrimitive) return () => 0; if (k === 'then') return undefined; if (k in t) return t[k]; return p; },
    set: (t, k, v) => { t[k] = v; return true; }, apply: () => p, construct: () => p
  });
  return p;
};
const mem = {};
globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
globalThis.document = { getElementById: () => mk(), createElement: () => mk(), querySelectorAll: () => [], addEventListener() {}, body: mk(), documentElement: mk() };
globalThis.window = { addEventListener() {} };
globalThis.matchMedia = () => ({ matches: false });
globalThis.Image = function () { return {}; };
let justDown = () => false;
globalThis.Phaser = {
  Scene: class {}, Game: function () { return { scene: { keys: {} } }; },
  Scale: { FIT: 0, CENTER_BOTH: 0 }, AUTO: 0, Input: { Keyboard: { JustDown: k => justDown(k) } }
};

export const G = {
  ...(await import('../src/game/render.js')),
  ...(await import('../src/data/characters.js')),
  ...(await import('../src/data/choices.js')),
  ...(await import('../src/data/relics.js')),
  ...(await import('../src/data/weapons.js')),
  ...(await import('../src/data/enemies.js')),
  ...(await import('../src/data/tuning.js')),
  ...(await import('../src/core/config.js')),
  ...(await import('../src/core/store.js')),
  ...(await import('../src/ui/state.js')),
  ...(await import('../src/data/items.js')),
  ...(await import('../src/data/neutrals.js')),
  ...(await import('../src/data/shop.js')),
  ...(await import('../src/data/trades.js')),
  ...(await import('../src/data/training.js'))
};

const KEYS = 'LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,SHIFT,U,R,P,ESC,ENTER,ONE,TWO,THREE,FOUR,FIVE,B,X,T'.split(',');
export function newGame() {
  const s = new G.Main();
  s.add = { image: () => mk(), tileSprite: () => mk(), graphics: () => mk(), ellipse: () => mk(), container: () => mk(), text: () => mk() };
  s.make = { image: () => { const m = mk(); m.width = 100; m.height = 100; return m; }, container: () => mk(), graphics: () => mk() };
  s.textures = { exists: () => true, getFrame: () => ({ width: 300, height: 50 }) }; s.load = mk();
  s.cameras = { main: { setZoom() {}, centerOn() {}, shake() {} } }; s.game = { loop: { actualFps: 60 } };
  s.input = { keyboard: { addKeys: () => mk() } };
  s.preload(); s.create();
  const K = {}; for (const n of KEYS) K[n] = { isDown: false }; s.keys = K;
  let pressed = null;
  justDown = k => { if (k === pressed) { pressed = null; return true; } return false; };
  return { s, K, press: n => { pressed = K[n]; }, frame: () => s.update(0, 1000 / 60) };
}
export function startRun(g, cid) { G.UI.char = cid; g.s.setChar(cid); g.s.act('start'); }

/* ---------------- 불변식 검사: 깨지면 문자열 목록 반환 ---------------- */
export function invariants(s) {
  const bad = [], P = s.P, fin = v => typeof v === 'number' && Number.isFinite(v);
  for (const k of ['x', 'y', 'hp', 'maxHp', 'gauge', 'xp', 'need', 'lvl', 'kills', 'coins']) if (!fin(P[k])) bad.push(`P.${k}=${P[k]}`);
  if (P.alive && P.hp > P.maxHp + 1e-6) bad.push(`hp ${P.hp} > maxHp ${P.maxHp}`);
  if (P.gauge < -1e-6 || P.gauge > G.GAUGE_MAX + 1e-6) bad.push(`gauge ${P.gauge}`);
  if (s.D) for (const k in s.D) if (typeof s.D[k] === 'number' && !fin(s.D[k])) bad.push(`D.${k}=${s.D[k]}`);
  if (s.D && (s.D.interval < G.MIN_INTERVAL - 1e-9 || s.D.arc > 360 + 1e-9 || s.D.dr < .4 - 1e-9)) bad.push(`D out of range int=${s.D.interval} arc=${s.D.arc} dr=${s.D.dr}`);
  if (s.enemies.length + s.enemyPool.length !== s.MAX_ENEMIES) bad.push(`enemy pool leak ${s.enemies.length}+${s.enemyPool.length}`);
  for (let i = 0; i < s.enemies.length; i++) { const e = s.enemies[i]; if (!e.active || e.idx !== i) { bad.push(`enemy[${i}] active=${e.active} idx=${e.idx}`); break; } if (!fin(e.x) || !fin(e.y) || !fin(e.hp)) { bad.push(`enemy NaN ${e.x},${e.y},${e.hp}`); break; } }
  if (s.gems.length + s.gemPool.length !== s.MAX_GEMS) bad.push(`gem pool leak ${s.gems.length}+${s.gemPool.length}`);
  for (let i = 0; i < s.gems.length; i++) { const g = s.gems[i]; if (!g.active || g.idx !== i || !fin(g.val)) { bad.push(`gem[${i}] bad`); break; } }
  for (const c of G.COMMON) if ((s.lvC[c.id] || 0) > c.max) bad.push(`${c.id} Lv ${s.lvC[c.id]} > ${c.max}`);
  if (s.passiveCount() > G.PASSIVE_SLOTS) bad.push(`passives ${s.passiveCount()}`);
  for (const c of G.EXCL[s.rig.id]) if ((s.X[c.id] || 0) > c.max) bad.push(`excl ${c.id} ${s.X[c.id]}`);
  if (s.relics.length > G.MAX_RELICS || new Set(s.relics).size !== s.relics.length) bad.push(`relics ${s.relics.join(',')}`);
  if (s.legends > G.LEGEND_CAP) bad.push(`legends ${s.legends}`);
  if (s.Wp.lv > 5) bad.push(`weapon lv ${s.Wp.lv}`);
  if (s.pendingLv < 0 || s.pendingChest < 0) bad.push(`pending ${s.pendingLv}/${s.pendingChest}`);
  if (s.mode === 'levelup') {
    if (!s.offer) bad.push('levelup without offer');
    else { const keys = s.offer.map(o => o.key); if (new Set(keys).size !== keys.length) bad.push(`dup offer ${keys}`); }
  }
  if (s.items.length > 300) bad.push(`items ${s.items.length}`);
  for (const k of ['slashes', 'rings', 'waves', 'trails', 'extra']) if (s[k].length > 600) bad.push(`${k} ${s[k].length}`);
  for (const k in s.st) if (!fin(s.st[k]) && typeof s.st[k] === 'number') bad.push(`st.${k}=${s.st[k]}`);
  if (!['menu', 'select', 'play', 'pause', 'settings', 'levelup', 'result', 'shop', 'training'].includes(s.mode)) bad.push(`mode ${s.mode}`);
  if (s.shots.length + s.shotPool.length !== G.SHOT_RULES.max) bad.push(`shot pool leak ${s.shots.length}+${s.shotPool.length}`);
  for (const sh of s.shots) if (!fin(sh.x) || !fin(sh.y) || !sh.active) { bad.push('shot bad'); break; }
  for (const k in s.M) if (typeof s.M[k] === 'number' && !fin(s.M[k])) bad.push(`M.${k}=${s.M[k]}`);
  for (const k in s.R) if (typeof s.R[k] === 'number' && !fin(s.R[k])) bad.push(`R.${k}=${s.R[k]}`);
  if (s.pals > 3) bad.push(`pals ${s.pals}`);
  if (s.P.coins < 0) bad.push(`coins ${s.P.coins}`);
  for (const it of s.items) if (it.life > 0 && it.t > it.life + .1) { bad.push(`item ${it.type} not expired`); break; }
  return bad;
}

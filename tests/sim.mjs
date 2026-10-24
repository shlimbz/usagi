/* =====================================================================
 *  밸런스·오류 시뮬레이터
 *   node tests/sim.mjs [--runs 5] [--sec 600] [--chars usagi,chiikawa,hachiware] [--bots fight,kite]
 *                      [--json out.json] [--stress 1] [--set '{"PRESETS.usagi.base.dmg":12}']
 *  판마다: 생존 시간, 10분 레벨, 처치, HP 40% 미만 시간, 최대 적 수, 스텝 처리 시간, 불변식 위반·예외
 *  (brave 봇은 치이카와 전용)
 * ===================================================================== */
import { G, newGame, startRun, invariants } from './harness.mjs';
import { makeBot } from './bots.mjs';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const RUNS = +arg('runs', 3), SEC = +arg('sec', 600), STRESS = +arg('stress', 1);
const CHARS = arg('chars', 'usagi,chiikawa,hachiware').split(','), BOTS = arg('bots', 'fight,brave,kite,idle,chaos').split(',');
const CHECK_EVERY = +arg('check', 15);
G.SET.stress = STRESS;
/* --set '{"PRESETS.usagi.base.dmg":12,"TUNE.hpA":140}' : 데이터 값을 코드 수정 없이 바꿔서 실험 */
const SETS = JSON.parse(arg('set', '{}'));
for (const [path, v] of Object.entries(SETS)) {
  const ks = path.split('.'), last = ks.pop(); let o = G;
  for (const k of ks) { o = o[k]; if (o === undefined) throw new Error('--set 경로 없음: ' + path); }
  o[last] = v;
}

export function runOne(cid, botKind, sec = SEC) {
  const g = newGame(), { s, K } = g, bot = makeBot(botKind);
  startRun(g, cid);
  const r = { cid, bot: botKind, t: 0, lvl: 1, kills: 0, low: 0, maxEnemies: 0, errors: [], inv: [], stepMs: 0, stepMax: 0, steps: 0, picks: 0, marks: {} };
  let frames = 0, guard = 0;
  while (s.t < sec && s.mode !== 'result' && guard++ < 60 * sec * 3) {
    try {
      if (s.mode === 'levelup') {
        const c = bot.choose(s);
        if (c.pick !== undefined) { G.btn.pick = c.pick; r.picks++; } else G.btn.tool = c.tool;
      } else if (s.mode === 'play') {
        if (bot.move(s, K) && frames % 10 === 0) g.press('SPACE');
      }
      const t0 = performance.now();
      g.frame();
      if (botKind === 'chaos' && s.P.alive) s.P.hp = Math.max(s.P.hp, s.P.maxHp * .5);   // 오류 탐색용: 후반까지 살려 둠
      const dt = performance.now() - t0;
      if (s.mode === 'play') { r.stepMs += dt; r.steps++; if (dt > r.stepMax && s.t > 2) r.stepMax = dt; }
    } catch (e) { r.errors.push(String(e.stack || e).split('\n').slice(0, 4).join(' | ')); break; }
    frames++;
    if (s.mode === 'play' && s.P.hp < s.P.maxHp * .4) r.low += 1 / 60;
    if (s.enemies.length > r.maxEnemies) r.maxEnemies = s.enemies.length;
    if (frames % CHECK_EVERY === 0) { const b = invariants(s); if (b.length && r.inv.length < 5) r.inv.push(`t=${s.t.toFixed(1)} ` + b.join('; ')); }
    for (const m of [60, 180, 300, 450, 600]) if (!r.marks[m] && s.t >= m) r.marks[m] = s.P.lvl;
  }
  Object.assign(r, { t: s.t, lvl: s.P.lvl, kills: s.P.kills, died: s.mode === 'result' && !s.P.alive && s.t < sec - .1, cleared: s.t >= sec - .1 || (s.mode === 'result' && s.P.alive) });
  r.stepAvg = r.stepMs / Math.max(1, r.steps);
  return r;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all = [];
  const pad = (v, n) => String(v).padEnd(n);
  console.log(`runs=${RUNS} sec=${SEC} stress=${STRESS}${Object.keys(SETS).length ? ' set=' + JSON.stringify(SETS) : ''}`);
  for (const cid of CHARS) for (const bot of BOTS) {
    if (bot === 'brave' && cid !== 'chiikawa') continue;
    const rs = [];
    for (let i = 0; i < RUNS; i++) rs.push(runOne(cid, bot));
    all.push(...rs);
    const surv = rs.filter(r => !r.died).length, med = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
    const deaths = rs.filter(r => r.died).map(r => Math.round(r.t)).sort((a, b) => a - b);
    console.log(`${pad(cid, 9)} ${pad(bot, 5)} 생존 ${surv}/${RUNS}  사망시각 [${deaths.join(',')}]  레벨 중앙값 ${med(rs.map(r => r.lvl))} (5분 ${med(rs.map(r => r.marks[300] ?? 0))})` +
      `  처치 ${med(rs.map(r => r.kills))}  저HP ${Math.round(med(rs.map(r => r.low)))}s  적최대 ${Math.max(...rs.map(r => r.maxEnemies))}` +
      `  step ${med(rs.map(r => r.stepAvg)).toFixed(2)}ms(max ${Math.max(...rs.map(r => r.stepMax)).toFixed(1)})` +
      `${rs.some(r => r.errors.length) ? '  ❌ERR ' + rs.flatMap(r => r.errors)[0] : ''}${rs.some(r => r.inv.length) ? '  ⚠INV ' + rs.flatMap(r => r.inv)[0] : ''}`);
  }
  const errs = all.filter(r => r.errors.length || r.inv.length).length;
  console.log(errs ? `문제 발생 판: ${errs}` : '오류·불변식 위반 없음');
  const out = arg('json', null); if (out) writeFileSync(out, JSON.stringify(all, null, 1));
  process.exitCode = errs ? 1 : 0;
}

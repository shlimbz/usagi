/* =====================================================================
 *  플레이 봇 — 매 프레임 이동 키·필살기·레벨업 선택을 정함
 *   fight : 가장 가까운 적과 '사거리×0.8'을 유지하며 싸움, 밀집하면 달려서 빠짐 (평범한 플레이어)
 *   brave : 치이카와식 — HP 30% 이상이면 적에게 파고듦, 흡혈·용기 선택지 우선
 *   kite  : 적에게서 계속 도망 (소극적인 초보)
 *   idle  : 제자리에 서 있음 (방치 플레이 — 초반에는 죽어야 정상)
 *   chaos : 무작위 이동·무작위 선택·Reroll/Banish/Skip/보관 남발 (오류 찾기용, sim 에서 HP 50% 아래로 안 내려감)
 * ===================================================================== */
const GOOD = ['multi', 'power', 'quick', 'wide', 'wave', 'far', 'tact', 'burst', 'meal', 'armor', 'drain', 'orbit', 'endure', 'light', 'pick'];
const BRAVE_GOOD = ['multi', 'drain', 'endure', 'quick', 'power', 'tact', 'burst', 'wide', 'far', 'armor', 'orbit'];

function setMove(K, vx, vy, run) {
  const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
  K.D.isDown = vx > .38; K.A.isDown = vx < -.38; K.S.isDown = vy > .38; K.W.isDown = vy < -.38;
  K.SHIFT.isDown = !!run;
}

function pickSmart(s, good) {
  const o = s.offer;
  let i = o.findIndex(x => x.kind === 'evo' || x.kind === 'weapon');
  if (i < 0) i = o.findIndex(x => x.kind === 'excl' || x.kind === 'once');
  if (i < 0) i = o.findIndex(x => good.includes(x.key));
  return i;
}

export function makeBot(kind, rng = Math.random) {
  let wander = rng() * 6.28, hold = 0;
  return {
    kind,
    /* 레벨업·상자 화면: btn 에 넣을 값 반환 { pick } | { tool } */
    choose(s) {
      if (s.lvKind === 'trade') {                     // 검은별 거래: chaos 는 무작위, 나머지는 거절
        if (!s.offer.length) return { tool: 'skip' };
        if (kind === 'chaos') return rng() < .8 ? { pick: Math.floor(rng() * s.offer.length) } : { tool: 'skip' };
        return { tool: 'skip' };                     // 일반 봇은 위험한 거래를 거절 (기본 밸런스 측정용)
      }
      if (s.lvKind === 'chest') return s.offer.length ? { pick: kind === 'chaos' ? Math.floor(rng() * s.offer.length) : 0 } : { tool: 'skip' };
      if (kind === 'chaos') {
        const r = rng();
        if (r < .12 && s.rerolls > 0) return { tool: 'reroll' };
        if (r < .22 && (s.banishes > 0 || s.banishArmed)) return { tool: 'banish' };
        if (r < .27) return { tool: 'skip' };
        if (r < .33 && s.offer.length) return { tool: 'keep' + Math.floor(rng() * s.offer.length) };
        return { pick: Math.floor(rng() * Math.max(1, s.offer.length)) };
      }
      const i = pickSmart(s, kind === 'brave' ? BRAVE_GOOD : GOOD);
      if (i < 0 && s.rerolls > 0) return { tool: 'reroll' };
      return { pick: Math.max(0, i) };
    },
    /* 갑옷 상점: 살 수 있는 것 중 하나 사고 나감 { buy } | { leave } */
    shop(s) {
      const i = s.shopOffer.findIndex(o => !o.sold && s.P.coins >= o.it.price);
      if (i >= 0 && (kind === 'chaos' ? rng() < .7 : true)) return { buy: i };
      return { leave: true };
    },
    /* 플레이 중: 이동 키 설정, 필살기를 쓰려면 true */
    move(s, K) {
      const P = s.P, R = s.D.range;
      if (kind === 'idle') { setMove(K, 0, 0, false); K.D.isDown = K.A.isDown = K.S.isDown = K.W.isDown = false; return P.gauge >= s.specialCost(); }
      if (kind === 'chaos') {
        if (--hold <= 0) { hold = 20 + rng() * 90; wander = rng() * 6.28; }
        setMove(K, Math.cos(wander), Math.sin(wander), rng() < .3);
        return rng() < .02;
      }
      let vx = 0, vy = 0, near = null, nd = 1e9, crowd = 0;
      for (const e of s.enemies) {
        const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) - e.r;
        if (d < nd) { nd = d; near = e; }
        const reach = kind === 'kite' ? 260 : 90;
        if (d < reach) { const w = (e.elite ? 4 : 1) / Math.max(15, d) ** 2; vx += dx * w; vy += dy * w; crowd++; }
      }
      for (const sh of s.shots) {                      // 날아오는 적 투사체를 옆으로 피함 (사람처럼 대충)
        const dx = P.x - sh.x, dy = P.y - sh.y, d = Math.hypot(dx, dy);
        if (d > 110 || (sh.vx * dx + sh.vy * dy) <= 0) continue;
        const sp = Math.hypot(sh.vx, sh.vy) || 1, side = (dx * sh.vy - dy * sh.vx) >= 0 ? 1 : -1;
        const w = .06 / Math.max(20, d); vx += -sh.vy / sp * side * w * 100; vy += sh.vx / sp * side * w * 100;
      }
      if (kind !== 'kite') {
        const want = R * .8, hpF = P.hp / P.maxHp;
        if (kind === 'brave' && hpF > .3 && near && crowd < 9 && nd > want * .6) { const dx = near.x - P.x, dy = near.y - P.y, l = Math.hypot(dx, dy) || 1; vx = dx / l; vy = dy / l; }
        else if (near && crowd < 4 && nd > want) { const dx = near.x - P.x, dy = near.y - P.y, l = Math.hypot(dx, dy) || 1; vx += dx / l * .02; vy += dy / l * .02; }
        else if (near && nd < want * .7) { const dx = P.x - near.x, dy = P.y - near.y, l = Math.hypot(dx, dy) || 1; vx += dx / l * .03; vy += dy / l * .03; }
      }
      let gb = 1e18, gx = 0, gy = 0;
      for (const g of s.gems) { const d2 = (g.x - P.x) ** 2 + (g.y - P.y) ** 2; if (d2 < gb) { gb = d2; gx = g.x - P.x; gy = g.y - P.y; } }
      for (const it of s.items) {
        if (it.type === 'food' && s.rig.id === 'chiikawa' && kind === 'brave' && P.hp > P.maxHp * .2) continue;
        const d2 = (it.x - P.x) ** 2 + (it.y - P.y) ** 2; if (d2 < gb) { gb = d2; gx = it.x - P.x; gy = it.y - P.y; }
      }
      if (s.neutral && kind !== 'kite') { const n = s.neutral, d2 = (n.x - P.x) ** 2 + (n.y - P.y) ** 2; if (d2 > 60 * 60 && crowd < 4) { gb = Math.min(gb, d2); gx = n.x - P.x; gy = n.y - P.y; } }
      if (gb < 400 * 400 && crowd < 3) { const gl = Math.sqrt(gb) || 1; vx += gx / gl * .015; vy += gy / gl * .015; }
      if (Math.hypot(vx, vy) < 1e-5) { wander += (rng() - .5) * .2; vx = Math.cos(wander); vy = Math.sin(wander); }
      setMove(K, vx, vy, kind === 'kite' || crowd >= 3);
      return P.gauge >= s.specialCost();
    }
  };
}

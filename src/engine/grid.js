/* 공간 격자 (근처 적 빠르게 찾기) */
/* ---------- 공간 격자 ---------- */
export class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); this.pool = []; }
  key(cx, cy) { return (cx + 100000) * 200000 + (cy + 100000); }
  clear() { for (const a of this.map.values()) { a.length = 0; this.pool.push(a); } this.map.clear(); }
  insert(e) {
    const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
    let a = this.map.get(k);
    if (!a) { a = this.pool.pop() || []; this.map.set(k, a); }
    a.push(e);
  }
  cellAt(cx, cy) { return this.map.get(this.key(cx, cy)); }
}

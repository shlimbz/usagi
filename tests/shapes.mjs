/* 판정 도형 검증: 마상창(삼각형)·부채꼴 판정이 그려지는 도형과 일치하는지
 * 적 원 안의 점을 촘촘히 찍어 "실제로 겹치는지"를 계산해 판정 함수와 비교 (2만 개 무작위) */
import { lanceHitsCircle, fanHitsCircle } from '../src/engine/collision.js';
const inTri = (u, v, len, hw) => u >= 0 && u <= len && Math.abs(v) <= hw * (1 - u / len);
const inWedge = (x, y, ang, half, r) => { const d = Math.hypot(x, y); if (d > r) return false; if (d < 1e-9) return true; let a = Math.atan2(y, x) - ang; a = Math.atan2(Math.sin(a), Math.cos(a)); return Math.abs(a) <= half; };
let bad = 0, loose = 0; const N = 20000;
for (let i = 0; i < N; i++) {
  const ang = Math.random() * 6.28, dx = Math.cos(ang), dy = Math.sin(ang), len = 60 + Math.random() * 140, hw = 15 + Math.random() * 110, er = 6 + Math.random() * 30;
  const ex = (Math.random() * 2 - 1) * (len + 60), ey = (Math.random() * 2 - 1) * (len + 60);
  const hit = lanceHitsCircle(0, 0, dx, dy, len, hw, ex, ey, er);
  let real = false;
  for (let a = 0; a < 64 && !real; a++) for (let k = 0; k <= 8 && !real; k++) {
    const rr = er * k / 8, px = ex + Math.cos(a / 64 * 6.283) * rr, py = ey + Math.sin(a / 64 * 6.283) * rr;
    if (inTri(px * dx + py * dy, -px * dy + py * dx, len, hw)) real = true;
  }
  if (real && !hit) bad++; else if (hit && !real) loose++;
}
let fbad = 0;
for (let i = 0; i < 5000; i++) {
  const ang = Math.random() * 6.28, half = (10 + Math.random() * 170) * Math.PI / 180, r = 60 + Math.random() * 120, er = 6 + Math.random() * 20;
  const ex = (Math.random() * 2 - 1) * (r + 40), ey = (Math.random() * 2 - 1) * (r + 40);
  const hit = fanHitsCircle(0, 0, Math.cos(ang), Math.sin(ang), r, half, ex, ey, er);
  let real = false;
  for (let a = 0; a < 48 && !real; a++) for (let k = 0; k <= 6 && !real; k++) { const rr = er * k / 6; if (inWedge(ex + Math.cos(a / 48 * 6.283) * rr, ey + Math.sin(a / 48 * 6.283) * rr, ang, half, r)) real = true; }
  if (real && !hit) fbad++;
}
console.log(`마상창: ${N}건 중 놓침 ${bad} · 테두리 근처 관대 ${loose} | 부채꼴: 5000건 중 놓침 ${fbad}`);
process.exitCode = bad || fbad ? 1 : 0;

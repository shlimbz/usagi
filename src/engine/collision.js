/* 판정 도형 */
import { clamp } from '../core/config.js';

/* ---------- 판정 ---------- */
/* 부채꼴 vs 원: 적 원이 부채꼴에 조금이라도 겹치면 적중 (이펙트도 같은 반경·각도로 그림) */
export function fanHitsCircle(cx, cy, dx, dy, range, half, ex, ey, er) {
  const vx = ex - cx, vy = ey - cy, d = Math.hypot(vx, vy);
  if (d - er > range) return false;
  if (d <= er + 4) return true;
  const c = clamp((vx * dx + vy * dy) / d, -1, 1);
  return Math.acos(c) <= half + Math.asin(Math.min(1, er / d));
}
export const circleHitsCircle = (ax, ay, ar, bx, by, br) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by) <= (ar + br) * (ar + br);

/* 점과 선분 사이 거리 */
export function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  const t = l2 ? clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}
export const rot = (d, a) => ({ x:d.x * Math.cos(a) - d.y * Math.sin(a), y:d.x * Math.sin(a) + d.y * Math.cos(a) });

/* 마상창(삼각형) vs 원: 캐릭터 쪽 밑변(폭 2×halfW)에서 앞으로 len 만큼 뾰족해지는 삼각형.
 * 적 원이 삼각형에 조금이라도 겹치면 적중 (이펙트도 같은 삼각형으로 그림) */
export function lanceHitsCircle(px, py, dx, dy, len, halfW, ex, ey, er) {
  const rx = ex - px, ry = ey - py, u = rx * dx + ry * dy, v = -rx * dy + ry * dx;   // u: 앞쪽, v: 옆쪽
  if (u < -er || u > len + er || Math.abs(v) > halfW + er) return false;
  if (u >= 0 && u <= len && Math.abs(v) <= halfW * (1 - u / len)) return true;       // 중심이 안쪽
  return segDist(u, v, 0, -halfW, 0, halfW) <= er || segDist(u, v, 0, -halfW, len, 0) <= er || segDist(u, v, 0, halfW, len, 0) <= er;
}
/* 마상창 꼭짓점 3개 (그리기용): 밑변 양끝, 창끝 */
export function lanceCorners(px, py, dx, dy, len, halfW) {
  return [px - dy * halfW, py + dx * halfW, px + dy * halfW, py - dx * halfW, px + dx * len, py + dy * len];
}

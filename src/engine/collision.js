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

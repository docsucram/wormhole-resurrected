import { Point2D } from './RotationalPolygon';

export class Collision {
  /**
   * Circle-Circle intersection
   */
  public static testCircleCircle(
    x1: number,
    y1: number,
    r1: number,
    x2: number,
    y2: number,
    r2: number
  ): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const distSq = dx * dx + dy * dy;
    const radSum = r1 + r2;
    return distSq <= radSum * radSum;
  }

  /**
   * Circle-Polygon intersection
   */
  public static testCirclePolygon(
    cx: number,
    cy: number,
    radius: number,
    polyPoints: Point2D[]
  ): boolean {
    if (polyPoints.length < 3) return false;

    // 1. Check if center is inside polygon
    if (this.isPointInPolygon(cx, cy, polyPoints)) return true;

    // 2. Check if circle intersects any edge
    const rSq = radius * radius;
    for (let i = 0; i < polyPoints.length; i++) {
      const p1 = polyPoints[i];
      const p2 = polyPoints[(i + 1) % polyPoints.length];
      const distSq = this.distToSegmentSq(cx, cy, p1.x, p1.y, p2.x, p2.y);
      if (distSq <= rSq) return true;
    }

    return false;
  }

  /**
   * Point-in-polygon ray-casting test
   */
  public static isPointInPolygon(x: number, y: number, points: Point2D[]): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x;
      const yi = points[i].y;
      const xj = points[j].x;
      const yj = points[j].y;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0000001) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Separating Axis Theorem (SAT) for convex/oriented polygons
   */
  public static testPolygonPolygon(polyA: Point2D[], polyB: Point2D[]): boolean {
    if (polyA.length < 3 || polyB.length < 3) return false;

    const polygons = [polyA, polyB];
    for (let pIndex = 0; pIndex < polygons.length; pIndex++) {
      const poly = polygons[pIndex];
      for (let i1 = 0; i1 < poly.length; i1++) {
        const i2 = (i1 + 1) % poly.length;
        const p1 = poly[i1];
        const p2 = poly[i2];

        // Normal vector to edge
        const normalX = -(p2.y - p1.y);
        const normalY = p2.x - p1.x;

        // Project polyA onto normal
        let minA = Infinity;
        let maxA = -Infinity;
        for (const p of polyA) {
          const projected = normalX * p.x + normalY * p.y;
          if (projected < minA) minA = projected;
          if (projected > maxA) maxA = projected;
        }

        // Project polyB onto normal
        let minB = Infinity;
        let maxB = -Infinity;
        for (const p of polyB) {
          const projected = normalX * p.x + normalY * p.y;
          if (projected < minB) minB = projected;
          if (projected > maxB) maxB = projected;
        }

        // Check for separating axis
        if (maxA < minB || maxB < minA) {
          return false;
        }
      }
    }
    return true;
  }

  private static distToSegmentSq(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    const dx = px - projX;
    const dy = py - projY;
    return dx * dx + dy * dy;
  }
}

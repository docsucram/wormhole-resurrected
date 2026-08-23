export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export class RotationalPolygon {
  public points: Point2D[] = [];
  public distances: number[] = [];
  public angles: number[] = []; // Base angles in radians
  public currentAngle = 0; // Current rotation in radians

  constructor() {}

  /**
   * Adds a vertex by distance and angle in degrees
   */
  public addPoint(distance: number, angleDeg: number): void {
    const angleRad = (angleDeg * Math.PI) / 180;
    this.distances.push(distance);
    this.angles.push(angleRad);
    this.points.push({
      x: Math.cos(angleRad) * distance,
      y: Math.sin(angleRad) * distance,
    });
  }

  /**
   * Adds a cartesian (x, y) point
   */
  public addIntPoint(x: number, y: number): void {
    const dist = Math.hypot(x, y);
    const angleDeg = (Math.atan2(y, x) * 180) / Math.PI;
    this.addPoint(dist, angleDeg);
  }

  /**
   * Rotates the polygon by delta radians
   */
  public rotate(radians: number): void {
    this.setAngle(this.currentAngle + radians);
  }

  /**
   * Sets the absolute rotation in radians
   */
  public setAngle(radians: number): void {
    this.currentAngle = radians % (Math.PI * 2);
    for (let i = 0; i < this.points.length; i++) {
      const a = this.angles[i] + this.currentAngle;
      const d = this.distances[i];
      this.points[i].x = Math.cos(a) * d;
      this.points[i].y = Math.sin(a) * d;
    }
  }

  /**
   * Returns a transformed copy of the polygon at position (cx, cy) and scale
   */
  public getTransformedPoints(cx = 0, cy = 0, scale = 1): Point2D[] {
    return this.points.map((p) => ({
      x: cx + p.x * scale,
      y: cy + p.y * scale,
    }));
  }

  /**
   * Computes the bounding box of current rotated points
   */
  public getBounds(cx = 0, cy = 0, scale = 1): BoundingBox {
    if (this.points.length === 0) {
      return { minX: cx, minY: cy, maxX: cx, maxY: cy, width: 0, height: 0 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of this.points) {
      const px = cx + p.x * scale;
      const py = cy + p.y * scale;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Clones the current polygon
   */
  public clone(): RotationalPolygon {
    const copy = new RotationalPolygon();
    copy.distances = [...this.distances];
    copy.angles = [...this.angles];
    copy.currentAngle = this.currentAngle;
    copy.points = this.points.map((p) => ({ ...p }));
    return copy;
  }

  /**
   * Constructs a symmetric polygon from half-points raw array.
   * Matching legacy Wormhole RotationalPolygon.constructPolygon logic.
   * @param rawPoints array of [x, y, isCollisionFlag]
   * @param allPoints if true, includes all visual points; if false, only collision points (flag == 1)
   */
  public static constructPolygon(
    rawPoints: [number, number, number][],
    allPoints = true
  ): RotationalPolygon {
    const poly = new RotationalPolygon();

    // 1. Add first half (left side points)
    for (let i = 0; i < rawPoints.length; i++) {
      const [x, y, flag] = rawPoints[i];
      if (allPoints || flag === 1) {
        poly.addIntPoint(x, y);
      }
    }

    // 2. Add symmetric mirrored points on the right side in reverse order
    for (let j = rawPoints.length - 1; j >= 0; j--) {
      const [x, y, flag] = rawPoints[j];
      if (x !== 0 && (allPoints || flag === 1)) {
        poly.addIntPoint(-x, y);
      }
    }

    return poly;
  }
}

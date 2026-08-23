export class Vector2D {
  public x: number;
  public y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v: Vector2D): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  add(v: Vector2D): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  addScaled(v: Vector2D, s: number): this {
    this.x += v.x * s;
    this.y += v.y * s;
    return this;
  }

  sub(v: Vector2D): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  dot(v: Vector2D): number {
    return this.x * v.x + this.y * v.y;
  }

  cross(v: Vector2D): number {
    return this.x * v.y - this.y * v.x;
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  normalize(): this {
    const len = this.length();
    if (len > 0.00001) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  distanceTo(v: Vector2D): number {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }

  distanceToSq(v: Vector2D): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  rotate(radians: number): this {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nx = this.x * cos - this.y * sin;
    const ny = this.x * sin + this.y * cos;
    this.x = nx;
    this.y = ny;
    return this;
  }

  static fromAngle(radians: number, length = 1): Vector2D {
    return new Vector2D(Math.cos(radians) * length, Math.sin(radians) * length);
  }

  static distance(a: Vector2D, b: Vector2D): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}

import { VectorRenderer } from '../graphics/VectorRenderer';
import { Point2D } from '../math/RotationalPolygon';

export class HeatSeekerMissile {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public angle = 0; // in radians
  public maxSpeed = 7.5;
  public thrust = 0.25;
  public turnSpeed = (12 * Math.PI) / 180; // 12 deg per frame (authentic slingshot overshoot)
  public damage = 12;
  public life = 5.5;
  public isAlive = true;
  public color = '#00ffff';
  public radius = 10;
  public wormholeImmunity = 0.8; // Ignore wormhole collision for first 0.8s so it escapes

  private joints: Point2D[] = [];
  private jointCount = 16;
  private burstDelay = 0;

  constructor(
    x: number,
    y: number,
    angle: number,
    burstDelay = 0,
    color = '#00ffff'
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.burstDelay = burstDelay;
    this.color = color;

    // Burst outwards from wormhole
    const initSpeed = 4.0;
    this.vx = Math.cos(angle) * initSpeed;
    this.vy = Math.sin(angle) * initSpeed;

    for (let i = 0; i < this.jointCount; i++) {
      this.joints.push({ x, y });
    }
  }

  public takeDamage(_dmg: number, particles: any, sound: any): void {
    this.isAlive = false;
    if (particles && particles.createExplosion) {
      particles.createExplosion(this.x, this.y, this.color, 10);
    }
    if (sound && sound.playExplosion) {
      sound.playExplosion(false);
    }
  }

  public update(dt: number, targetX?: number, targetY?: number): boolean {
    this.life -= dt;
    if (this.wormholeImmunity > 0) this.wormholeImmunity -= dt;

    if (this.life <= 0) {
      this.isAlive = false;
      return false;
    }

    // Natural fluid aerodynamic drag allowing overshoots & slingshot loops
    this.vx *= 0.988;
    this.vy *= 0.988;

    if (this.burstDelay > 0) {
      this.burstDelay -= dt * 60;
    } else if (targetX !== undefined && targetY !== undefined) {
      // Actively track target player with clamped turn arc
      const targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const frameTurn = this.turnSpeed * Math.min(dt * 60, 2.0);
      if (Math.abs(diff) <= frameTurn) {
        this.angle = targetAngle;
      } else {
        this.angle += Math.sign(diff) * frameTurn;
      }

      const ax = Math.cos(this.angle) * this.thrust * dt * 60;
      const ay = Math.sin(this.angle) * this.thrust * dt * 60;
      this.vx += ax;
      this.vy += ay;

      const spd = Math.hypot(this.vx, this.vy);
      if (spd > this.maxSpeed) {
        this.vx = (this.vx / spd) * this.maxSpeed;
        this.vy = (this.vy / spd) * this.maxSpeed;
      }
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Shift joints history
    this.joints.pop();
    this.joints.unshift({ x: this.x, y: this.y });

    return true;
  }

  public draw(renderer: VectorRenderer): void {
    const ctx = renderer.ctx;
    ctx.save();

    // Segmented neon trail
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    ctx.moveTo(this.joints[0].x, this.joints[0].y);
    for (let i = 1; i < this.joints.length; i++) {
      ctx.lineTo(this.joints[i].x, this.joints[i].y);
    }
    ctx.stroke();

    // Dart missile head
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

import { VectorRenderer } from '../graphics/VectorRenderer';

export class Bullet {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public damage: number;
  public size: number;
  public color: string;
  public glowColor: string;
  public life = 1.6; // ~100 frames
  public ownerSlot: number;
  public isAlive = true;
  public isPowerup = false;
  public powerupType = -1;

  // Luminous trail nodes
  private trailHistory: { x: number; y: number }[] = [];

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage = 10,
    size = 5,
    color = '#00e5ff',
    glowColor = '#00e5ff',
    ownerSlot = 0,
    isPowerup = false,
    powerupType = -1
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.size = size;
    this.color = color;
    this.glowColor = glowColor;
    this.ownerSlot = ownerSlot;
    this.isPowerup = isPowerup;
    this.powerupType = powerupType;
  }

  public update(dt: number): boolean {
    this.life -= dt;
    if (this.life <= 0) {
      this.isAlive = false;
      return false;
    }

    // Capture smooth tail trail points
    this.trailHistory.unshift({ x: this.x, y: this.y });
    if (this.trailHistory.length > 6) {
      this.trailHistory.pop();
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    return true;
  }

  public draw(renderer: VectorRenderer): void {
    const ctx = renderer.ctx;
    ctx.save();

    const angle = Math.atan2(this.vy, this.vx);

    // 1. Draw elongated glowing laser beam tail
    if (this.trailHistory.length > 1) {
      for (let i = 0; i < this.trailHistory.length - 1; i++) {
        const p1 = this.trailHistory[i];
        const p2 = this.trailHistory[i + 1];
        const alpha = (1 - (i + 1) / this.trailHistory.length) * 0.9;
        const width = Math.max(1, (this.size * 0.7) * (1 - i * 0.16));

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = width;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.glowColor;
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Inner white hot core line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(0.8, width * 0.4);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 2. Draw lead projectile head at (this.x, this.y)
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    // Luminous laser bolt capsule
    const headLen = Math.max(12, this.size * 2.8);
    const headThick = this.size * 0.9;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.glowColor;
    ctx.fillStyle = '#ffffff';

    // Elongated diamond / capsule bolt pointing forward
    ctx.beginPath();
    ctx.moveTo(headLen * 0.5, 0);
    ctx.lineTo(0, headThick * 0.6);
    ctx.lineTo(-headLen * 0.5, 0);
    ctx.lineTo(0, -headThick * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Powerup payload glowing bubble
    if (this.isPowerup) {
      renderer.drawGlowCircle(0, 0, 10, '#ff00ff', '#ff00ff', 2);
    }

    ctx.restore();
  }
}

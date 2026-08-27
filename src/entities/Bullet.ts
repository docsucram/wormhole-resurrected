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
  public life = 1.5; // ~90 frames
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

  public static drawAll(bullets: Bullet[], renderer: VectorRenderer): void {
    if (bullets.length === 0) return;
    const ctx = renderer.ctx;

    // Group bullets by color
    const groups = new Map<string, Bullet[]>();
    for (const b of bullets) {
      if (!b.isAlive) continue;
      const list = groups.get(b.color);
      if (list) {
        list.push(b);
      } else {
        groups.set(b.color, [b]);
      }
    }

    // Render all trails and bolts batched by color
    for (const [color, group] of groups) {
      // 1. Wide outer radiant trails pass
      ctx.beginPath();
      for (const b of group) {
        if (b.trailHistory.length > 1) {
          ctx.moveTo(b.trailHistory[0].x, b.trailHistory[0].y);
          for (let i = 1; i < b.trailHistory.length; i++) {
            ctx.lineTo(b.trailHistory[i].x, b.trailHistory[i].y);
          }
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.5;
      ctx.globalAlpha = 0.35;
      ctx.stroke();

      // 2. Crisp core laser trails pass
      ctx.beginPath();
      for (const b of group) {
        if (b.trailHistory.length > 1) {
          ctx.moveTo(b.trailHistory[0].x, b.trailHistory[0].y);
          for (let i = 1; i < b.trailHistory.length; i++) {
            ctx.lineTo(b.trailHistory[i].x, b.trailHistory[i].y);
          }
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.0;
      ctx.globalAlpha = 0.95;
      ctx.stroke();

      // 3. White-hot center cores
      ctx.beginPath();
      for (const b of group) {
        if (b.trailHistory.length > 1) {
          ctx.moveTo(b.trailHistory[0].x, b.trailHistory[0].y);
          for (let i = 1; i < Math.min(3, b.trailHistory.length); i++) {
            ctx.lineTo(b.trailHistory[i].x, b.trailHistory[i].y);
          }
        }
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.8;
      ctx.stroke();

      // 4. Projectile diamond bolts
      ctx.globalAlpha = 1.0;
      for (const b of group) {
        ctx.save();
        ctx.translate(b.x, b.y);
        const angle = Math.atan2(b.vy, b.vx);
        ctx.rotate(angle);
        const headLen = Math.max(12, b.size * 2.8);
        const headThick = b.size * 0.9;

        ctx.strokeStyle = b.color;
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        ctx.moveTo(headLen * 0.5, 0);
        ctx.lineTo(0, headThick * 0.6);
        ctx.lineTo(-headLen * 0.5, 0);
        ctx.lineTo(0, -headThick * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (b.isPowerup) {
          ctx.strokeStyle = '#ff00ff';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  public draw(renderer: VectorRenderer): void {
    Bullet.drawAll([this], renderer);
  }
}

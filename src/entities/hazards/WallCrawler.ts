import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

export class WallCrawler implements Hazard {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public radius = 24;
  public health = 150;
  public maxHealth = 150;
  public damage = 20;
  public isAlive = true;
  public color = '#00ffcc';
  public slot = 1;
  public powerupType = 15;

  private side = 0; // 0=Top, 1=Right, 2=Bottom, 3=Left
  private shotCooldown = 0;
  public bound = 420;
  private cycle = 0;

  // Exact polygon vertices from WallCrawlerSprite.java:
  // g_drawPoints = { { -10, -16 }, { 0, -22 }, { 0, -30 }, { 12, -25 }, { 15, -20 }, { 8, -20 }, { 8, 20 }, { 15, 20 }, { 12, 25 }, { 0, 30 }, { 0, 22 }, { -10, 16 } };
  private static readonly DRAW_POINTS: [number, number][] = [
    [-10, -16],
    [0, -22],
    [0, -30],
    [12, -25],
    [15, -20],
    [8, -20],
    [8, 20],
    [15, 20],
    [12, 25],
    [0, 30],
    [0, 22],
    [-10, 16],
  ];

  constructor(x: number, y: number, bound = 420, slot = 1) {
    this.bound = bound;
    this.slot = slot;
    this.color = (PLAYER_COLORS[slot % PLAYER_COLORS.length] || PLAYER_COLORS[0]).primary;

    // Attach directly onto nearest perimeter wall line
    const distTop = Math.abs(y - (-bound));
    const distBottom = Math.abs(y - bound);
    const distLeft = Math.abs(x - (-bound));
    const distRight = Math.abs(x - bound);

    const minDist = Math.min(distTop, distBottom, distLeft, distRight);
    if (minDist === distTop) {
      this.side = 0;
      this.x = Math.max(-bound, Math.min(bound, x));
      this.y = -this.bound;
    } else if (minDist === distRight) {
      this.side = 1;
      this.x = this.bound;
      this.y = Math.max(-bound, Math.min(bound, y));
    } else if (minDist === distBottom) {
      this.side = 2;
      this.x = Math.max(-bound, Math.min(bound, x));
      this.y = this.bound;
    } else {
      this.side = 3;
      this.x = -this.bound;
      this.y = Math.max(-bound, Math.min(bound, y));
    }
  }

  public update(
    dt: number,
    player: PlayerShip,
    bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine
  ): boolean {
    if (!this.isAlive) return false;

    this.cycle += dt * 60;
    this.shotCooldown += dt;

    // Authentic speed = 4.0 px/frame
    const speed = 4.0 * dt * 60;
    switch (this.side) {
      case 0: // Top wall (y = -bound): move right -> corner -> right wall
        this.x += speed;
        this.y = -this.bound;
        this.vx = speed;
        this.vy = 0;
        if (this.x >= this.bound) {
          this.x = this.bound;
          this.y = -this.bound;
          this.side = 1;
        }
        break;
      case 1: // Right wall (x = bound): move down -> corner -> bottom wall
        this.y += speed;
        this.x = this.bound;
        this.vx = 0;
        this.vy = speed;
        if (this.y >= this.bound) {
          this.x = this.bound;
          this.y = this.bound;
          this.side = 2;
        }
        break;
      case 2: // Bottom wall (y = bound): move left -> corner -> left wall
        this.x -= speed;
        this.y = this.bound;
        this.vx = -speed;
        this.vy = 0;
        if (this.x <= -this.bound) {
          this.x = -this.bound;
          this.y = this.bound;
          this.side = 3;
        }
        break;
      case 3: // Left wall (x = -bound): move up -> corner -> top wall
        this.y -= speed;
        this.x = -this.bound;
        this.vx = 0;
        this.vy = -speed;
        if (this.y <= -this.bound) {
          this.x = -this.bound;
          this.y = -this.bound;
          this.side = 0;
        }
        break;
    }

    // Authentic lead targeting: fires every 35 cycles (0.58s)
    if (this.shotCooldown >= 0.65 && player.isAlive) {
      this.shotCooldown = 0;
      sound.playLaser(0);

      // Lead aim target
      const leadDist = Math.hypot(player.x - this.x, player.y - this.y) / 6.0;
      const targetX = player.x + player.vx * Math.min(leadDist, 15);
      const targetY = player.y + player.vy * Math.min(leadDist, 15);

      const angle = Math.atan2(targetY - this.y, targetX - this.x);
      const bSpeed = 6.0;

      bullets.push(
        new Bullet(
          this.x,
          this.y,
          Math.cos(angle) * bSpeed,
          Math.sin(angle) * bSpeed,
          10,
          4,
          '#ffffff',
          this.color,
          this.slot
        )
      );
    }

    // Collision with player
    if (Collision.testCircleCircle(this.x, this.y, this.radius, player.x, player.y, 16)) {
      player.takeDamage(this.damage, particles, sound);
      this.takeDamage(30, particles, sound);
    }

    return true;
  }

  public takeDamage(dmg: number, particles: ParticleSystem, sound: SoundEngine): void {
    this.health -= dmg;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      particles.createExplosion(this.x, this.y, this.color, 30);
      sound.playExplosion();
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Rotation angles matching legacy WallCrawlerSprite.g_c_directions:
    // side 0 (Top) -> points 90 deg
    // side 1 (Right) -> points 180 deg
    // side 2 (Bottom) -> points 270 deg
    // side 3 (Left) -> points 0 deg
    const rotationAngles = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 0];
    ctx.rotate(rotationAngles[this.side]);

    // Draw authentic WallCrawler polygon straddling the perimeter wall
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillStyle = 'rgba(8, 20, 36, 0.9)';

    ctx.beginPath();
    const pts = WallCrawler.DRAW_POINTS;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Health bar if damaged
    const hpRatio = Math.max(0, this.health / this.maxHealth);
    if (hpRatio < 1.0) {
      renderer.drawHealthBar(0, -32, this.health, this.maxHealth, 28, 3, this.color);
    }

    ctx.restore();
  }
}

import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

export class Gunship implements Hazard {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public angle = 0;
  public radius = 32;
  public health = 50;
  public maxHealth = 50;
  public damage = 10;
  public isAlive = true;
  public color = '#ff3344';
  public slot = 1;
  public powerupType = 12;

  private shotCooldown = 0;
  private strafeOffsetX = 0;
  private strafeOffsetY = 0;
  private mode = 0; // 0=Init, 1=Strafe, 2=Retreat, 3=Kamikaze
  private retreatCounter = 0;
  private isRightSeeker: boolean;

  // Authentic hull vertices from GunshipSprite.java:
  // g_points = { { 40, 0 }, { 35, -6 }, { 25, -11 }, { 2, -15 }, { -25, -15 }, { -35, 0 }, { -25, 15 }, { 2, 15 }, { 25, 11 }, { 35, 6 } };
  private static readonly HULL_POINTS: [number, number][] = [
    [40, 0],
    [35, -6],
    [25, -11],
    [2, -15],
    [-25, -15],
    [-35, 0],
    [-25, 15],
    [2, 15],
    [25, 11],
    [35, 6],
  ];

  // Authentic Turret positions: Fore at { 22, 0 }, Aft at { -16, 0 }
  private static readonly TURRET_OFFSETS: [number, number][] = [
    [22, 0],
    [-16, 0],
  ];

  public bound = 650;

  constructor(x: number, y: number, slot = 1, bound = 650, customColor?: string) {
    this.x = x;
    this.y = y;
    this.slot = slot;
    this.bound = bound;
    this.color = customColor || (PLAYER_COLORS[slot % PLAYER_COLORS.length] || PLAYER_COLORS[0]).primary;
    this.isRightSeeker = Math.random() < 0.5;
  }

  public update(
    dt: number,
    player: PlayerShip,
    bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine
  ): boolean {
    if (!this.isAlive) return false;

    this.shotCooldown += dt;

    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

    // Authentic AI State Machine from GunshipSprite.java:
    switch (this.mode) {
      case 0: {
        const a =
          Math.atan2(player.y - this.y, player.x - this.x) +
          (this.isRightSeeker ? Math.PI / 2 : -Math.PI / 2);
        this.strafeOffsetX = Math.cos(a) * 200;
        this.strafeOffsetY = Math.sin(a) * 200;
        this.mode = 1;
        break;
      }
      case 1: {
        const destX = player.x + this.strafeOffsetX;
        const destY = player.y + this.strafeOffsetY;
        const d = Math.hypot(destX - this.x, destY - this.y);

        if (distToPlayer < 120) {
          this.mode = 2;
        } else if (d > 50) {
          const steerA = Math.atan2(destY - this.y, destX - this.x);
          this.angle = steerA;
          this.vx += Math.cos(steerA) * 0.25 * dt * 60;
          this.vy += Math.sin(steerA) * 0.25 * dt * 60;
        } else {
          this.mode = 2;
        }
        this.retreatCounter = 0;
        break;
      }
      case 2: {
        // Reverse track away from player
        const fleeA = Math.atan2(this.y - player.y, this.x - player.x);
        this.angle = fleeA;
        this.vx += Math.cos(fleeA) * 0.25 * dt * 60;
        this.vy += Math.sin(fleeA) * 0.25 * dt * 60;

        this.retreatCounter += dt * 60;
        if (this.retreatCounter > 200 || this.health < 15) {
          this.mode = 3;
        } else if (distToPlayer > 380) {
          this.mode = 0;
        }
        break;
      }
      case 3: {
        // Kamikaze rush
        const rushA = Math.atan2(player.y - this.y, player.x - this.x);
        this.angle = rushA;
        this.vx += Math.cos(rushA) * 0.3 * dt * 60;
        this.vy += Math.sin(rushA) * 0.3 * dt * 60;
        break;
      }
    }

    // Max speed clamp = 4.0
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > 4.0) {
      this.vx = (this.vx / spd) * 4.0;
      this.vy = (this.vy / spd) * 4.0;
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Bounds rebound
    const effectiveBound = Math.max(100, this.bound - this.radius);
    if (Math.abs(this.x) > effectiveBound) {
      this.x = Math.sign(this.x) * effectiveBound;
      this.vx *= -0.5;
    }
    if (Math.abs(this.y) > effectiveBound) {
      this.y = Math.sign(this.y) * effectiveBound;
      this.vy *= -0.5;
    }

    // Fire dual tracking turret lasers every 40 frames (~0.65s)
    if (this.shotCooldown >= 0.7 && player.isAlive) {
      this.shotCooldown = 0;
      sound.playLaser(1);

      // Lead aim target
      const leadDist = distToPlayer / 6.0;
      const targetX = player.x + player.vx * Math.min(leadDist, 15);
      const targetY = player.y + player.vy * Math.min(leadDist, 15);

      const cos = Math.cos(this.angle);
      const sin = Math.sin(this.angle);

      // Fire from both Fore and Aft turrets
      for (const [tx, ty] of Gunship.TURRET_OFFSETS) {
        const worldTurretX = this.x + (tx * cos - ty * sin);
        const worldTurretY = this.y + (tx * sin + ty * cos);
        const aimAngle = Math.atan2(targetY - worldTurretY, targetX - worldTurretX);

        bullets.push(
          new Bullet(
            worldTurretX,
            worldTurretY,
            Math.cos(aimAngle) * 6.0,
            Math.sin(aimAngle) * 6.0,
            2,
            5,
            '#ffffff',
            this.color,
            this.slot
          )
        );
      }
    }

    if (Collision.testCircleCircle(this.x, this.y, this.radius, player.x, player.y, 16)) {
      player.takeDamage(this.damage, particles, sound);
      this.takeDamage(25, particles, sound);
    }

    return true;
  }

  public takeDamage(dmg: number, particles: ParticleSystem, sound: SoundEngine): void {
    this.health -= dmg;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      particles.createExplosion(this.x, this.y, this.color, 32);
      sound.playExplosion();
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 1. Draw Authentic Battleship Cruiser Hull Polygon
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;
    ctx.fillStyle = 'rgba(8, 18, 32, 0.9)';

    ctx.beginPath();
    const pts = Gunship.HULL_POINTS;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Draw Dual Rotating Deck Turrets (Fore & Aft)
    for (const [tx, ty] of Gunship.TURRET_OFFSETS) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, Math.PI * 2);
      ctx.fill();

      // Turret barrel
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 8, ty);
      ctx.stroke();
    }

    // Health bar
    const hpRatio = Math.max(0, this.health / this.maxHealth);
    if (hpRatio < 1.0) {
      renderer.drawHealthBar(0, -22, this.health, this.maxHealth, 32, 3, this.color);
    }

    ctx.restore();
  }
}

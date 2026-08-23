import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

export class GhostPud implements Hazard {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public radius = 20;
  public health = 999;
  public maxHealth = 999;
  public damage = 20;
  public isAlive = true;
  public color = '#9966ff';
  public slot = 1;
  public powerupType = 18;
  public isIndestructible = true; // Authentic GhostPud is immune to standard bullets

  private cycle = 0;
  private bound = 420;

  // Authentic atom orbital ring points from GhostPudSprite.java:
  // g_atomRingShape = { { 0, -10 }, { 20, -9 }, { 27, -6 }, { 30, -3 }, { 32, 0 }, { 30, 3 }, { 27, 6 }, { 20, 9 }, { 0, 10 } };
  private static readonly ATOM_RING: [number, number][] = [
    [0, -10],
    [20, -9],
    [27, -6],
    [30, -3],
    [32, 0],
    [30, 3],
    [27, 6],
    [20, 9],
    [0, 10],
    [-20, 9],
    [-27, 6],
    [-30, 3],
    [-32, 0],
    [-30, -3],
    [-27, -6],
    [-20, -9],
  ];

  constructor(x: number, y: number, angle = 0, slot = 1, bound = 420) {
    this.x = x;
    this.y = y;
    this.slot = slot;
    this.bound = bound;
    this.color = (PLAYER_COLORS[slot % PLAYER_COLORS.length] || PLAYER_COLORS[0]).primary;

    // Authentic speed = 14.0 px/frame initial warp velocity
    this.vx = Math.cos(angle) * 4.5;
    this.vy = Math.sin(angle) * 4.5;
  }

  public update(
    dt: number,
    player: PlayerShip,
    _bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine
  ): boolean {
    if (!this.isAlive) return false;

    this.cycle += dt * 60;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Bounce off walls
    if (Math.abs(this.x) > this.bound) {
      this.x = Math.sign(this.x) * this.bound;
      this.vx *= -1;
    }
    if (Math.abs(this.y) > this.bound) {
      this.y = Math.sign(this.y) * this.bound;
      this.vy *= -1;
    }

    // Collision with player
    if (Collision.testCircleCircle(this.x, this.y, this.radius, player.x, player.y, 16)) {
      player.takeDamage(this.damage, particles, sound);
      // Bounce off ship
      this.vx = (this.x - player.x) * 0.15;
      this.vy = (this.y - player.y) * 0.15;
    }

    return true;
  }

  public onHitByBullet(bullet: Bullet, particles: ParticleSystem, sound: SoundEngine): void {
    // Bullets bounce / punt GhostPud (authentic behavior)
    this.vx += bullet.vx * 0.25;
    this.vy += bullet.vy * 0.25;
    particles.createExplosion(this.x, this.y, '#ffffff', 6);
    sound.playLaser(0);
  }

  public takeDamage(_dmg: number, particles: ParticleSystem, sound: SoundEngine): void {
    // Screen Zap can kill GhostPud
    particles.createExplosion(this.x, this.y, this.color, 25);
    sound.playExplosion();
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Central glowing nucleus core
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // 2. Three orbital atom rings (rotated at 0, 60, 120 degrees + continuous rotation)
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;

    const ringRotations = [0, Math.PI / 3, (2 * Math.PI) / 3];
    for (let r = 0; r < 3; r++) {
      ctx.save();
      ctx.rotate(ringRotations[r] + this.cycle * 0.02 * (r % 2 === 0 ? 1 : -1));

      ctx.beginPath();
      const pts = GhostPud.ATOM_RING;
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}

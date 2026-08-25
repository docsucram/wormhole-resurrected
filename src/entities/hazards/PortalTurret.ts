import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { Wormhole } from '../Wormhole';
import { Powerup } from '../Powerup';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

/**
 * Authentic legacy PortalTurretSprite:
 * - Swept 7-vertex crescent satellite hull
 * - Dual tracking turret pods at (0, -11) and (0, 11) with targeting arcs
 * - Orbits wormhole at 115px distance with 3 trailing orbital beads
 * - Fires synchronized dual lead-predicted shots within 260px range
 * - Drops 2 powerups on destruction
 */
export class PortalTurret implements Hazard {
  public x = 0;
  public y = 0;
  public radius = 24;
  public health = 50;
  public maxHealth = 50;
  public damage = 7;
  public isAlive = true;
  public color = '#00ffcc';
  public slot = 1;
  public powerupType = 7;

  public parentWormhole: Wormhole;
  public hullAngle = 0;
  public orbitAngle = 0;
  public aimAngle = 0;
  private shotCooldown = 0;

  // Authentic 7-point crescent drone polygon from PortalTurretSprite.java:100
  private static readonly HULL_POINTS: [number, number][] = [
    [-28, 0],
    [-7, -25],
    [30, -40],
    [15, -10],
    [15, 10],
    [30, 40],
    [-7, 25],
  ];

  constructor(parentWormhole: Wormhole, slot = 1) {
    this.parentWormhole = parentWormhole;
    this.slot = slot;
    this.color = PLAYER_COLORS[slot % PLAYER_COLORS.length].primary;
    this.hullAngle = Math.random() * Math.PI * 2;
    this.updatePosition();
  }

  private updatePosition(): void {
    const orbitDist = 115;
    // Orbit angle is tangential to hull angle (legacy PortalTurretSprite.java:29)
    this.orbitAngle = this.hullAngle + Math.PI / 2;
    this.x = this.parentWormhole.x + Math.cos(this.orbitAngle) * orbitDist;
    this.y = this.parentWormhole.y + Math.sin(this.orbitAngle) * orbitDist;
  }

  public update(
    dt: number,
    player: PlayerShip,
    bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine
  ): boolean {
    if (!this.isAlive) return false;
    if (this.parentWormhole && !this.parentWormhole.isAlive) {
      this.isAlive = false;
      particles.createExplosion(this.x, this.y, this.color, 18);
      sound.playExplosion(false);
      return false;
    }

    // Advance orbital rotation (1.0 deg/tick = ~57.3 deg/sec at 60 FPS)
    this.hullAngle += dt * 1.0;
    this.updatePosition();

    // Aim calculation with lead prediction matching legacy calcLead()
    const pLeadX = player.x + (player.vx || 0) * 15.0;
    const pLeadY = player.y + (player.vy || 0) * 15.0;
    const dx = pLeadX - this.x;
    const dy = pLeadY - this.y;
    this.aimAngle = Math.atan2(dy, dx);

    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

    if (this.shotCooldown > 0) {
      this.shotCooldown -= dt;
    } else if (distToPlayer < 260 && player.isAlive) {
      // Synchronized dual volley from twin pods every 16 frames (~0.35s)
      this.shotCooldown = 0.35;
      sound.playLaser(0);

      const cosH = Math.cos(this.hullAngle);
      const sinH = Math.sin(this.hullAngle);
      const bSpeed = 8.0;
      const bVx = Math.cos(this.aimAngle) * bSpeed;
      const bVy = Math.sin(this.aimAngle) * bSpeed;

      // Pod 1 (0, -11)
      const p1x = this.x + sinH * 11;
      const p1y = this.y - cosH * 11;
      bullets.push(
        new Bullet(
          p1x,
          p1y,
          bVx,
          bVy,
          1,
          4,
          '#ffffff',
          this.color,
          this.slot
        )
      );

      // Pod 2 (0, 11)
      const p2x = this.x - sinH * 11;
      const p2y = this.y + cosH * 11;
      bullets.push(
        new Bullet(
          p2x,
          p2y,
          bVx,
          bVy,
          1,
          4,
          '#ffffff',
          this.color,
          this.slot
        )
      );
    }

    // Ship body collision
    if (Collision.testCircleCircle(this.x, this.y, this.radius, player.x, player.y, 16)) {
      player.takeDamage(this.damage, particles, sound);
      this.takeDamage(20, particles, sound);
    }

    return true;
  }

  public takeDamage(
    dmg: number,
    particles: ParticleSystem,
    sound: SoundEngine,
    powerups?: Powerup[]
  ): void {
    this.health -= dmg;
    particles.createExplosion(this.x, this.y, this.color, 4);

    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      particles.createExplosion(this.x, this.y, this.color, 24);
      sound.playExplosion();

      // Authentic double powerup loot drop (PortalTurretSprite.java:94-95)
      if (powerups) {
        powerups.push(Powerup.spawnRandom(this.x - 12, this.y));
        powerups.push(Powerup.spawnRandom(this.x + 12, this.y));
      }
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;
    const ctx = renderer.ctx;

    // 1. Trailing orbital ion beads along the 115px orbit track
    if (this.parentWormhole) {
      for (let i = 1; i <= 3; i++) {
        const beadAngle = this.orbitAngle - i * 0.12;
        const bx = this.parentWormhole.x + Math.cos(beadAngle) * 115;
        const by = this.parentWormhole.y + Math.sin(beadAngle) * 115;
        renderer.drawGlowCircle(bx, by, 3, '#ffffff', this.color, 1.5);
      }
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.hullAngle);

    // 2. Swept Crescent Hull Polygon
    ctx.beginPath();
    for (let i = 0; i < PortalTurret.HULL_POINTS.length; i++) {
      const [px, py] = PortalTurret.HULL_POINTS[i];
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 20, 30, 0.7)';
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 3. Dual Tracking Turret Pods at (0, -11) and (0, 11)
    const podYOffsets = [-11, 11];
    const localAim = this.aimAngle - this.hullAngle;

    for (const podY of podYOffsets) {
      // Filled Turret Ball (radius 8)
      renderer.drawGlowCircle(0, podY, 8, this.color, this.color, 1.5, true, this.color);

      // Dark Targeting Cutout Notch facing the player (matches legacy WHUtil.fillCenteredArc)
      ctx.beginPath();
      ctx.arc(0, podY, 8, localAim - 0.45, localAim + 0.45);
      ctx.lineTo(0, podY);
      ctx.closePath();
      ctx.fillStyle = '#000000';
      ctx.fill();

      // Glowing Center Hub
      renderer.drawGlowCircle(0, podY, 2.5, '#ffffff', '#ffffff', 1);
    }

    ctx.restore();
  }
}

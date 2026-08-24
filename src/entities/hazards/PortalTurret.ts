import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { Wormhole } from '../Wormhole';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

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
  public orbitAngle = 0;
  public turretAngle = 0;
  private shotCooldown = 0;

  constructor(parentWormhole: Wormhole, slot = 1) {
    this.parentWormhole = parentWormhole;
    this.slot = slot;
    this.color = PLAYER_COLORS[slot % PLAYER_COLORS.length].primary;
    this.updatePosition();
  }

  private updatePosition(): void {
    const orbitDist = 115;
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

    // Orbit around wormhole at 1 deg / frame (60 deg / sec)
    this.orbitAngle += dt * 1.0;
    this.updatePosition();

    // Aim at player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.turretAngle = Math.atan2(dy, dx);

    if (this.shotCooldown > 0) {
      this.shotCooldown -= dt;
    } else if (dist < 320 && player.isAlive) {
      // Fire double turret volley
      this.shotCooldown = 0.45;
      sound.playLaser(0);

      const perpX = -Math.sin(this.turretAngle) * 11;
      const perpY = Math.cos(this.turretAngle) * 11;
      const bSpeed = 8.0;

      // Barrel 1
      bullets.push(
        new Bullet(
          this.x + perpX,
          this.y + perpY,
          Math.cos(this.turretAngle) * bSpeed,
          Math.sin(this.turretAngle) * bSpeed,
          1,
          4,
          '#ffffff',
          this.color,
          this.slot
        )
      );

      // Barrel 2
      bullets.push(
        new Bullet(
          this.x - perpX,
          this.y - perpY,
          Math.cos(this.turretAngle) * bSpeed,
          Math.sin(this.turretAngle) * bSpeed,
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

  public takeDamage(dmg: number, particles: ParticleSystem, sound: SoundEngine): void {
    this.health -= dmg;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      particles.createExplosion(this.x, this.y, this.color, 20);
      sound.playExplosion();
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    renderer.ctx.save();
    renderer.ctx.translate(this.x, this.y);

    // Turret base
    renderer.drawGlowCircle(0, 0, 16, this.color, this.color, 2, true, 'rgba(0, 20, 30, 0.6)');

    // Rotating twin barrels
    const perpX = -Math.sin(this.turretAngle) * 8;
    const perpY = Math.cos(this.turretAngle) * 8;
    const bLen = 14;

    const b1x = perpX + Math.cos(this.turretAngle) * bLen;
    const b1y = perpY + Math.sin(this.turretAngle) * bLen;
    const b2x = -perpX + Math.cos(this.turretAngle) * bLen;
    const b2y = -perpY + Math.sin(this.turretAngle) * bLen;

    renderer.drawGlowLine(perpX, perpY, b1x, b1y, '#ffffff', this.color, 2);
    renderer.drawGlowLine(-perpX, -perpY, b2x, b2y, '#ffffff', this.color, 2);

    renderer.ctx.restore();
  }
}

import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { Powerup } from '../Powerup';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

export class Artillery implements Hazard {
  public x: number;
  public y: number;
  public angle = 0;
  public radius = 22;
  public health = 35;
  public maxHealth = 35;
  public damage = 5;
  public isAlive = true;
  public color = '#ff3344';
  public slot = 1;
  public powerupType = 19;

  private shotCooldown = 0;
  private teleportTimer = 0;
  private isWarping = false;
  public bound = 650;

  constructor(x: number, y: number, slot = 1, bound = 650, customColor?: string) {
    this.x = x;
    this.y = y;
    this.slot = slot;
    this.bound = bound;
    this.color = customColor || (PLAYER_COLORS[slot % PLAYER_COLORS.length] || PLAYER_COLORS[0]).primary;
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
    this.teleportTimer += dt;

    // Track player
    this.angle = Math.atan2(player.y - this.y, player.x - this.x);

    // Fire heavy mortar shell every 1.5s
    if (this.shotCooldown >= 1.5 && !this.isWarping && player.isAlive) {
      this.shotCooldown = 0;
      sound.playLaser(1);
      const bSpeed = 9.0;
      bullets.push(
        new Bullet(
          this.x,
          this.y,
          Math.cos(this.angle) * bSpeed,
          Math.sin(this.angle) * bSpeed,
          2,
          6,
          '#ffffff',
          this.color,
          this.slot
        )
      );
    }

    // Teleport every 5s
    if (this.teleportTimer >= 5.0) {
      this.teleportTimer = 0;
      particles.createExplosion(this.x, this.y, this.color, 12);
      const spawnRange = Math.max(100, this.bound - 100);
      this.x = (Math.random() - 0.5) * spawnRange * 2;
      this.y = (Math.random() - 0.5) * spawnRange * 2;
      particles.createExplosion(this.x, this.y, '#ffffff', 12);
      sound.playSpecial(0);
    }

    if (Collision.testCircleCircle(this.x, this.y, this.radius, player.x, player.y, 16)) {
      player.takeDamage(this.damage, particles, sound, { weapon: 'Heavy Artillery' });
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

      // Legacy ArtillerySprite.java drops 1 powerup on death!
      if (powerups) {
        powerups.push(Powerup.spawnRandom(this.x, this.y));
      }
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    renderer.ctx.save();
    renderer.ctx.translate(this.x, this.y);

    // 4 Heavy Gun Mortar Mounts
    renderer.drawGlowCircle(0, 0, 18, this.color, this.color, 2, true, 'rgba(40, 0, 10, 0.6)');

    // Rotating main barrel
    renderer.ctx.rotate(this.angle);
    renderer.drawGlowLine(0, 0, 26, 0, '#ffffff', this.color, 3);
    renderer.drawGlowCircle(26, 0, 4, '#ffffff', this.color, 1.5, true, '#ffffff');

    renderer.ctx.restore();
  }
}

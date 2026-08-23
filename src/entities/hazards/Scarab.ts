import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { Powerup } from '../Powerup';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

export class Scarab implements Hazard {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public angle = 0;
  public radius = 18;
  public health = 25;
  public maxHealth = 25;
  public damage = 20;
  public isAlive = true;
  public color = '#ffaa00';
  public slot = 1;
  public powerupType = 13;

  public bound = 650;

  constructor(x: number, y: number, slot = 1, bound = 650) {
    this.x = x;
    this.y = y;
    this.slot = slot;
    this.bound = bound;
    this.color = PLAYER_COLORS[slot % PLAYER_COLORS.length].primary;
  }

  public update(
    dt: number,
    player: PlayerShip,
    _bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine
  ): boolean {
    if (!this.isAlive) return false;

    // Aggressive homing ram toward player
    const dx = player.x - this.x;
    const dy = player.y - this.y;

    this.angle = Math.atan2(dy, dx);
    const speed = 4.8;
    this.vx += (Math.cos(this.angle) * speed - this.vx) * 0.08;
    this.vy += (Math.sin(this.angle) * speed - this.vy) * 0.08;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Bounds rebound matching Sprite.java handleRebound()
    const effectiveBound = Math.max(100, this.bound - this.radius);
    if (Math.abs(this.x) > effectiveBound) {
      this.x = Math.sign(this.x) * effectiveBound;
      this.vx *= -0.5;
    }
    if (Math.abs(this.y) > effectiveBound) {
      this.y = Math.sign(this.y) * effectiveBound;
      this.vy *= -0.5;
    }

    if (Collision.testCircleCircle(this.x, this.y, this.radius, player.x, player.y, 16)) {
      player.takeDamage(this.damage, particles, sound);
      this.takeDamage(30, particles, sound);
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
      particles.createExplosion(this.x, this.y, this.color, 16);
      sound.playExplosion();

      if (powerups) {
        powerups.push(Powerup.spawnRandom(this.x, this.y));
      }
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    renderer.ctx.save();
    renderer.ctx.translate(this.x, this.y);
    renderer.ctx.rotate(this.angle);

    // Insectoid Mandibles & Pincer Wings
    renderer.drawGlowLine(-12, -10, 14, -6, this.color, this.color, 2);
    renderer.drawGlowLine(-12, 10, 14, 6, this.color, this.color, 2);
    renderer.drawGlowLine(14, -6, 20, -12, '#ffffff', this.color, 2);
    renderer.drawGlowLine(14, 6, 20, 12, '#ffffff', this.color, 2);

    // Carapace
    renderer.drawGlowCircle(0, 0, 10, this.color, this.color, 2, true, 'rgba(40, 20, 0, 0.6)');

    renderer.ctx.restore();
  }
}

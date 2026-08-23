import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

export class Mine implements Hazard {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public radius = 15;
  public health = 5;
  public maxHealth = 5;
  public damage = 20;
  public isAlive = true;
  public color = '#ff3344';
  public slot = 1;
  public powerupType = 8;
  private cycle = 0;
  private isArming = true;
  private armTimer = 0.65; // 40 frames

  constructor(x: number, y: number, vx = 0, vy = 0, slot = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.slot = slot;
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

    this.cycle += dt * 60;

    if (this.isArming) {
      this.armTimer -= dt;
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      if (this.armTimer <= 0) {
        this.isArming = false;
        this.vx = 0;
        this.vy = 0;
      }
    }

    // Check collision with player
    if (!this.isArming && Collision.testCircleCircle(this.x, this.y, this.radius, player.x, player.y, 16)) {
      player.takeDamage(this.damage, particles, sound);
      this.takeDamage(10, particles, sound);
      return false;
    }

    return true;
  }

  public takeDamage(
    dmg: number,
    particles: ParticleSystem,
    sound: SoundEngine,
    _powerups?: import('../Powerup').Powerup[]
  ): void {
    this.health -= dmg;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      particles.createExplosion(this.x, this.y, this.color, 14);
      sound.playExplosion();
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    renderer.ctx.save();
    renderer.ctx.translate(this.x, this.y);

    const pulseColor = this.isArming ? '#ffffff' : this.color;

    // Cross spikes
    renderer.drawGlowLine(-15, 0, 15, 0, this.color, this.color, 1.5);
    renderer.drawGlowLine(0, -15, 0, 15, this.color, this.color, 1.5);
    renderer.drawGlowLine(-11, -11, 11, 11, this.color, this.color, 1.5);
    renderer.drawGlowLine(-11, 11, 11, -11, this.color, this.color, 1.5);

    // Center pulsating box
    renderer.ctx.fillStyle = pulseColor;
    renderer.ctx.fillRect(-5, -5, 10, 10);

    renderer.ctx.restore();
  }
}

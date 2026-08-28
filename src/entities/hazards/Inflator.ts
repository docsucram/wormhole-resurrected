import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { Powerup } from '../Powerup';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

export class Inflator implements Hazard {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public radius = 20;
  public health = 30;
  public maxHealth = 45;
  public damage = 15;
  public isAlive = true;
  public color = '#ff3344';
  public slot = 1;
  public powerupType = 10;

  private perceivedSize = 20;
  private cycle = 0;
  private growthPauseTimer = 0;
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
    _bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine
  ): boolean {
    if (!this.isAlive) return false;

    this.cycle += dt * 60;

    // Authentic fast growth (+16.0 HP/sec) up to massive radius 240px, paused when actively damaged
    if (this.growthPauseTimer > 0) {
      this.growthPauseTimer -= dt;
    } else {
      this.health = Math.min(240, this.health + dt * 16.0);
      this.maxHealth = Math.max(this.maxHealth, this.health);
    }

    // Catch up perceivedSize with health smoothly and rapidly
    if (this.perceivedSize > this.health) {
      this.perceivedSize = Math.max(8, this.perceivedSize - dt * 45);
    } else if (this.perceivedSize < this.health) {
      this.perceivedSize = Math.min(this.health, this.perceivedSize + dt * 20);
    }

    this.radius = 10 + this.perceivedSize;

    // Gentle floating drift
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Rebound
    const effectiveBound = Math.max(100, this.bound - this.radius);
    if (Math.abs(this.x) > effectiveBound) {
      this.x = Math.sign(this.x) * effectiveBound;
      this.vx *= -0.5;
    }
    if (Math.abs(this.y) > effectiveBound) {
      this.y = Math.sign(this.y) * effectiveBound;
      this.vy *= -0.5;
    }

    // Collision with player
    if (Collision.testCircleCircle(this.x, this.y, this.radius, player.x, player.y, 16)) {
      player.takeDamage(this.damage, particles, sound);
      this.takeDamage(40, particles, sound);
    }

    return true;
  }

  public takeDamage(
    dmg: number,
    particles: ParticleSystem,
    sound: SoundEngine,
    powerups?: Powerup[]
  ): void {
    // Interruption stun window: pause growth on hit so continuous fire deflates it
    this.growthPauseTimer = 0.5;
    this.health -= dmg;
    this.perceivedSize = Math.max(8, this.health);
    particles.createExplosion(this.x, this.y, this.color, 5);

    // Pops when health drops to or below 8 (matches legacy InflatorSprite.java)
    if (this.health <= 8) {
      this.health = 0;
      this.isAlive = false;
      particles.createExplosion(this.x, this.y, this.color, 35);
      sound.playExplosion(true);

      if (powerups) {
        powerups.push(Powerup.spawnRandom(this.x, this.y));
      }
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Rotate slowly
    ctx.rotate(this.cycle * 0.01);

    // Symmetrical 8-sided geometric polygon (Octagon) matching WHUtil.symPolygon(8, 10 + perceivedSize, 15)
    const sides = 8;
    const r = this.radius;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;
    ctx.fillStyle = 'rgba(255, 51, 68, 0.12)';

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i * Math.PI * 2) / sides;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner pulsating geometric diamond
    const innerR = r * 0.5;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI * 2) / 4 + this.cycle * 0.03;
      const px = Math.cos(a) * innerR;
      const py = Math.sin(a) * innerR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

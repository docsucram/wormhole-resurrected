import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { HeatSeekerMissile } from '../HeatSeekerMissile';
import { PlayerShip } from '../PlayerShip';
import { Powerup } from '../Powerup';
import { Wormhole } from '../Wormhole';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

export class UFO implements Hazard {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public radius = 24;
  public health = 40;
  public maxHealth = 40;
  public damage = 16;
  public isAlive = true;
  public color = '#00ffcc';
  public slot = 1;
  public powerupType = 9;

  private attackTimer = 0;
  private cycle = 0;
  public bound = 505;

  constructor(x: number, y: number, slot = 1, bound = 505, customColor?: string) {
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
    sound: SoundEngine,
    missiles?: HeatSeekerMissile[],
    _wormholes?: Wormhole[]
  ): boolean {
    if (!this.isAlive) return false;

    this.cycle += dt * 60;
    this.attackTimer += dt;

    // Orbit/track around player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    const targetAngle = Math.atan2(dy, dx) + (dist > 200 ? 0 : Math.PI / 2);
    const speed = 4.5;
    this.vx += (Math.cos(targetAngle) * speed - this.vx) * 0.05;
    this.vy += (Math.sin(targetAngle) * speed - this.vy) * 0.05;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Bounds rebound matching legacy Sprite.java handleRebound()
    if (Math.abs(this.x) > this.bound) {
      this.x = Math.sign(this.x) * this.bound;
      this.vx *= -0.5;
    }
    if (Math.abs(this.y) > this.bound) {
      this.y = Math.sign(this.y) * this.bound;
      this.vy *= -0.5;
    }

    // Firing 3 Heat-Seeker Missiles triad every 3.0s
    if (this.attackTimer >= 3.0 && dist < 600 && player.isAlive && missiles) {
      this.attackTimer = 0;
      sound.playLaser(0);

      for (let i = 0; i < 3; i++) {
        const fireAngle = (i * 120 * Math.PI) / 180;
        missiles.push(
          new HeatSeekerMissile(
            this.x,
            this.y,
            fireAngle,
            0.15 * i,
            this.color
          )
        );
      }
    }

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

      // Legacy UFOSprite.java drops 2 powerups on death!
      if (powerups) {
        powerups.push(Powerup.spawnRandom(this.x - 12, this.y));
        powerups.push(Powerup.spawnRandom(this.x + 12, this.y));
      }
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Authentic Flat Saucer Oval (60x26) from UFOSprite.java
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;
    ctx.fillStyle = 'rgba(10, 25, 45, 0.85)';

    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Inner Cockpit Saucer Dome (36x12)
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -2, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotating perimeter beacon lights
    for (let i = 0; i < 4; i++) {
      const a = this.cycle * 0.08 + (i * Math.PI) / 2;
      const bx = Math.cos(a) * 24;
      const by = Math.sin(a) * 8;
      renderer.drawGlowCircle(bx, by, 2, '#ffffff', this.color, 1);
    }

    ctx.restore();
  }
}

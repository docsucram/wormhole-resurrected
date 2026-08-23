import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { Powerup } from '../Powerup';
import { Mine } from './Mine';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

export class MineLayer implements Hazard {
  public x: number;
  public y: number;
  public vx = 4.0;
  public vy = 0;
  public radius = 28;
  public health = 50;
  public maxHealth = 50;
  public damage = 20;
  public isAlive = true;
  public color = '#ff3344';
  public slot = 1;
  public powerupType = 11;

  private dropCooldown = 0;
  private changeDirTimer = 0;
  private minesRef: Mine[];

  public bound = 650;

  constructor(x: number, y: number, minesRef: Mine[], slot = 1, bound = 650) {
    this.x = x;
    this.y = y;
    this.minesRef = minesRef;
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

    this.dropCooldown += dt;
    this.changeDirTimer += dt;

    // Drop mine every 1.0s
    if (this.dropCooldown >= 1.0) {
      this.dropCooldown = 0;
      this.minesRef.push(new Mine(this.x, this.y, 0, 0, this.slot));
    }

    // Change cardinal direction every 3s
    if (this.changeDirTimer >= 3.0) {
      this.changeDirTimer = 0;
      const dirs = [
        { vx: 4.0, vy: 0 },
        { vx: -4.0, vy: 0 },
        { vx: 0, vy: 4.0 },
        { vx: 0, vy: -4.0 },
      ];
      const next = dirs[Math.floor(Math.random() * dirs.length)];
      this.vx = next.vx;
      this.vy = next.vy;
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Bounds rebound matching legacy Sprite.java handleRebound()
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
      particles.createExplosion(this.x, this.y, this.color, 25);
      sound.playExplosion();

      // Legacy MineLayerSprite.java drops 2 powerups on death!
      if (powerups) {
        powerups.push(Powerup.spawnRandom(this.x - 10, this.y));
        powerups.push(Powerup.spawnRandom(this.x + 10, this.y));
      }
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    renderer.ctx.save();
    renderer.ctx.translate(this.x, this.y);

    // 8-sided octagonal hull
    renderer.drawGlowCircle(0, 0, 24, this.color, this.color, 2, true, 'rgba(30, 10, 0, 0.6)');

    // Minelayer cross hatch
    renderer.drawGlowLine(-24, 0, 24, 0, this.color, this.color, 1.5);
    renderer.drawGlowLine(0, -24, 0, 24, this.color, this.color, 1.5);

    // Flashing center bay
    renderer.drawGlowCircle(0, 0, 12, '#ffffff', this.color, 1.5, true, this.color);

    renderer.ctx.restore();
  }
}

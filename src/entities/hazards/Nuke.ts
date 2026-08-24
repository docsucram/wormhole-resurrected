import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { HeatSeekerMissile } from '../HeatSeekerMissile';
import { PlayerShip } from '../PlayerShip';
import { Wormhole } from '../Wormhole';
import { PLAYER_COLORS } from '../../core/Constants';

export class Nuke implements Hazard {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public radius = 30;
  public health = 100;
  public maxHealth = 100;
  public damage = 80;
  public isAlive = true;
  public color = '#ff3344';
  public slot = 1;
  public powerupType = 14;

  public countdown = 8;
  public isDetonating = false;
  public hasBeenPunted = false;
  private blastRadius = 0;
  private hasDamagedPlayer = false;
  private cycle = 0;
  public bound = 505;

  constructor(x: number, y: number, slot = 1, bound = 505) {
    this.x = x;
    this.y = y;
    this.slot = slot;
    this.bound = bound;
    this.color = PLAYER_COLORS[slot % PLAYER_COLORS.length].primary;

    // Drifts slowly inward toward center (0, 0)
    const angle = Math.atan2(-y, -x);
    this.vx = Math.cos(angle) * 0.8;
    this.vy = Math.sin(angle) * 0.8;
  }

  public update(
    dt: number,
    player: PlayerShip,
    _bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine,
    _missiles?: HeatSeekerMissile[],
    wormholes?: Wormhole[]
  ): boolean {
    if (!this.isAlive) return false;

    this.cycle += dt * 60;

    if (!this.isDetonating) {
      this.countdown -= dt;
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;

      // Arena wall bounds rebound
      if (Math.abs(this.x) > this.bound) {
        this.x = Math.sign(this.x) * this.bound;
        this.vx *= -0.7;
      }
      if (Math.abs(this.y) > this.bound) {
        this.y = Math.sign(this.y) * this.bound;
        this.vy *= -0.7;
      }

      // Check if punted into an opponent's wormhole!
      if (this.hasBeenPunted && wormholes) {
        for (const wh of wormholes) {
          const dist = Math.hypot(wh.x - this.x, wh.y - this.y);
          if (dist < 70) {
            // Warped into wormhole!
            particles.createExplosion(this.x, this.y, '#00ffcc', 20);
            sound.playSpecial(1);
            this.isAlive = false;
            return false;
          }
        }
      }

      if (this.countdown <= 0) {
        this.isDetonating = true;
        sound.playExplosion(true);
        particles.createExplosion(this.x, this.y, '#ffffff', 30);
      }
    } else {
      // Authentic NukeSprite.java shockwave expanding to 1000px
      this.blastRadius += dt * 600;
      if (this.blastRadius >= 1000) {
        this.isAlive = false;
        return false;
      }

      // High base damage (90 near epicenter) with controlled falloff down to 35 at arena edge
      this.damage = Math.max(35, Math.floor(90 - (this.blastRadius / 1000) * 55));

      // Tight safe eye (dist <= 30px) - dead center eye of the storm
      // Only the outward moving shockwave ring hits the player once
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist <= this.blastRadius && dist > this.blastRadius - 65 && dist > 30 && !this.hasDamagedPlayer) {
        this.hasDamagedPlayer = true;
        player.takeDamage(this.damage, particles, sound, { weapon: 'TACTICAL NUKE', slot: this.slot });

        // Impart powerful outward blast impulse to ship momentum
        const blastAngle = Math.atan2(player.y - this.y, player.x - this.x);
        const pushForce = Math.max(6.0, 16.0 * (1 - this.blastRadius / 1200));
        player.vx += Math.cos(blastAngle) * pushForce;
        player.vy += Math.sin(blastAngle) * pushForce;

        particles.createExplosion(player.x, player.y, '#ffaa00', 16);
      }
    }

    return true;
  }

  /**
   * Shooting the nuke transfers bullet momentum and punts it without destroying it!
   */
  public onHitByBullet(bullet: Bullet, particles: ParticleSystem, sound: SoundEngine): void {
    if (this.isDetonating) return;
    // AI bots cannot shoot/punt the Nuke in its first 2 seconds
    if (this.countdown > 6.0 && bullet.ownerSlot !== 0) return;

    this.hasBeenPunted = true;
    // Transfer bullet momentum (matching legacy NukeSprite.java line 85)
    this.vx += bullet.vx * 0.35;
    this.vy += bullet.vy * 0.35;

    particles.createExplosion(this.x, this.y, this.color, 4);
    sound.playShield();
  }

  public takeDamage(dmg: number, particles: ParticleSystem, sound: SoundEngine): void {
    // Only non-bullet mass shockwaves (e.g. Turtle cannon) can disarm the nuke
    this.health -= dmg;
    particles.createExplosion(this.x, this.y, this.color, 4);

    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      particles.createExplosion(this.x, this.y, '#00ffcc', 25);
      sound.playExplosion(false);
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    renderer.ctx.save();
    renderer.ctx.translate(this.x, this.y);

    if (!this.isDetonating) {
      // Radiation Trefoil Symbol
      renderer.drawGlowCircle(0, 0, 26, this.color, this.color, 2, true, 'rgba(40, 0, 10, 0.7)');

      for (let i = 0; i < 3; i++) {
        const a = (this.cycle * 0.05 + (i * Math.PI * 2) / 3) % (Math.PI * 2);
        renderer.drawGlowArc(0, 0, 20, a, a + Math.PI / 3, '#ffffff', this.color, 3);
      }

      // Countdown text in center
      renderer.drawGlowText(
        `${Math.ceil(this.countdown)}`,
        0,
        0,
        'bold 18px "Courier New", monospace',
        '#ffffff',
        this.color,
        'center'
      );
    } else {
      // Expanding nuclear shockwave rings
      const alpha = Math.max(0, 1 - this.blastRadius / 1000);
      renderer.ctx.globalAlpha = alpha;

      // Outer blast boundary
      renderer.drawGlowCircle(0, 0, this.blastRadius, '#ffffff', this.color, 3);
      // Inner hollow boundary (safe eye inner edge)
      if (this.blastRadius > 50) {
        renderer.drawGlowCircle(0, 0, this.blastRadius - 50, this.color, this.color, 1.5);
      }
      // Safe core eye indicator
      renderer.drawGlowCircle(0, 0, 75, 'rgba(0, 255, 204, 0.5)', '#00ffcc', 1);
    }

    renderer.ctx.restore();
  }
}

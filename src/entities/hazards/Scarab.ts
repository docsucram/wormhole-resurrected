import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { Powerup } from '../Powerup';
import { Wormhole } from '../Wormhole';
import { HeatSeekerMissile } from '../HeatSeekerMissile';
import { PLAYER_COLORS } from '../../core/Constants';
import { Collision } from '../../math/Collision';

export class Scarab implements Hazard {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public angle = 0;
  public radius = 22;
  public health = 20;
  public maxHealth = 20;
  public damage = 5; // Authentic ScarabSprite.java:31: setHealth(20, 5)
  public isAlive = true;
  public color = '#ffaa00';
  public slot = 1;
  public powerupType = 13;

  public bound = 650;
  public parentWormhole?: Wormhole;
  public onDeployHazard?: (hazardType: number, sourceWormhole: Wormhole) => void;

  public hasPowerup = false;
  public storedPowerup: Powerup | null = null;
  private wanderTimer = 0;
  private wanderAngle = 0;
  private cycle = 0;

  // Authentic vector geometry from ScarabSprite.java:
  private static readonly MANDIBLE_POINTS: [number, number][] = [
    [20, -3], [29, -12], [35, -11], [40, -10], [48, -5],
    [40, -12], [35, -17], [29, -17], [15, -5], [15, 5],
    [29, 17], [35, 17], [40, 10], [48, 5], [40, 12],
    [35, 11], [29, 12], [20, 3]
  ];

  private static readonly BODY_POINTS: [number, number][] = [
    [20, -4], [17, -11], [13, -15], [15, -30], [13, -15],
    [10, -16], [0, -18], [2, -28], [0, -18], [-20, -13],
    [-25, -10], [-23, -15], [-25, -10], [-27, 0], [-25, 10],
    [-23, 15], [-25, 10], [-20, 13], [0, 18], [2, 28],
    [0, 18], [10, 16], [13, 15], [15, 30], [13, 15],
    [17, 11], [20, 4]
  ];

  constructor(
    x: number,
    y: number,
    parentWormhole?: Wormhole,
    slot = 1,
    bound = 650,
    onDeployHazard?: (hazardType: number, sourceWormhole: Wormhole) => void,
    customColor?: string
  ) {
    this.x = x;
    this.y = y;
    this.parentWormhole = parentWormhole;
    this.slot = slot;
    this.bound = bound;
    this.onDeployHazard = onDeployHazard;
    this.color = customColor || parentWormhole?.color || (PLAYER_COLORS[slot % PLAYER_COLORS.length] || PLAYER_COLORS[0]).primary;
    this.wanderAngle = Math.random() * Math.PI * 2;
  }

  public update(
    dt: number,
    player: PlayerShip,
    _bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine,
    _missiles?: HeatSeekerMissile[],
    wormholes?: Wormhole[],
    powerups?: Powerup[]
  ): boolean {
    if (!this.isAlive) return false;
    this.cycle += dt * 60;

    if (this.hasPowerup && this.storedPowerup) {
      // 1. CARRYING POWERUP: Fly back to sender's wormhole to deposit and deploy hazard against player!
      const targetWh = (this.parentWormhole && this.parentWormhole.isAlive) 
        ? this.parentWormhole 
        : (wormholes && wormholes.find(w => w.isAlive) ? wormholes.find(w => w.isAlive)! : null);

      if (targetWh) {
        const dx = targetWh.x - this.x;
        const dy = targetWh.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.angle = Math.atan2(dy, dx);

        const speed = 2.5; // Authentic ScarabSprite.java:29 maxThrust = 5.0 at 30Hz (2.5 px/frame at 60Hz)
        this.vx += (Math.cos(this.angle) * speed - this.vx) * 0.08;
        this.vy += (Math.sin(this.angle) * speed - this.vy) * 0.08;

        if (dist < 45) {
          // Deposit stolen powerup into wormhole -> immediately deploys hazard into current arena against player!
          const stolenType = this.storedPowerup.type;
          targetWh.absorbPowerupShot(stolenType, particles, sound);
          sound.playWormholeCharge();

          if (this.onDeployHazard) {
            this.onDeployHazard(stolenType, targetWh);
          }

          particles.createExplosion(this.x, this.y, this.color, 24);
          particles.createExplosion(this.x, this.y, '#ffffff', 16);
          sound.playExplosion(false);

          this.isAlive = false;
          return false;
        }
      } else {
        // No living wormholes left - wander off
        this.vx = Math.cos(this.angle) * 2.2;
        this.vy = Math.sin(this.angle) * 2.2;
      }
    } else {
      // 2. SEEKING POWERUP: Scan screen for nearest sendable offensive powerup (type >= 6)
      let closestPup: Powerup | null = null;
      let closestDist = Infinity;

      if (powerups && powerups.length > 0) {
        for (const pup of powerups) {
          if (pup.isAlive && pup.type >= 6) {
            const d = Math.hypot(pup.x - this.x, pup.y - this.y);
            if (d < closestDist) {
              closestDist = d;
              closestPup = pup;
            }
          }
        }
      }

      if (closestPup) {
        // Track closest powerup
        const dx = closestPup.x - this.x;
        const dy = closestPup.y - this.y;
        this.angle = Math.atan2(dy, dx);

        const speed = 2.6; // Authentic travel speed
        this.vx += (Math.cos(this.angle) * speed - this.vx) * 0.08;
        this.vy += (Math.sin(this.angle) * speed - this.vy) * 0.08;

        if (closestDist < 26) {
          // Snatch powerup!
          this.hasPowerup = true;
          this.storedPowerup = closestPup;
          closestPup.isAlive = false;

          // Remove from arena powerup array
          if (powerups) {
            const pIdx = powerups.indexOf(closestPup);
            if (pIdx >= 0) powerups.splice(pIdx, 1);
          }

          particles.createExplosion(this.x, this.y, '#ffffff', 14);
          sound.playPowerup();
        }
      } else {
        // No offensive powerups on screen: graceful perimeter sweep / reverse patrol
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderTimer = 1.5 + Math.random() * 1.5;
          this.wanderAngle += (Math.random() - 0.5) * 1.5;
        }
        this.angle = this.wanderAngle;
        this.vx += (Math.cos(this.angle) * 1.8 - this.vx) * 0.05;
        this.vy += (Math.sin(this.angle) * 1.8 - this.vy) * 0.05;
      }
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Bounds rebound matching Sprite.java handleRebound()
    const effectiveBound = Math.max(100, this.bound - this.radius);
    if (Math.abs(this.x) > effectiveBound) {
      this.x = Math.sign(this.x) * effectiveBound;
      this.vx *= -0.6;
      this.wanderAngle = Math.atan2(this.vy, this.vx);
    }
    if (Math.abs(this.y) > effectiveBound) {
      this.y = Math.sign(this.y) * effectiveBound;
      this.vy *= -0.6;
      this.wanderAngle = Math.atan2(this.vy, this.vx);
    }

    // Player contact collision
    if (player.isAlive && Collision.testCircleCircle(this.x, this.y, this.radius, player.x, player.y, 16)) {
      player.takeDamage(this.damage, particles, sound, { weapon: 'Scarab' });
      this.takeDamage(20, particles, sound, powerups);
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
      particles.createExplosion(this.x, this.y, '#ffffff', 14);
      sound.playExplosion();

      if (powerups) {
        if (this.hasPowerup && this.storedPowerup) {
          // Drop stolen powerup back onto the field!
          this.storedPowerup.x = this.x;
          this.storedPowerup.y = this.y;
          this.storedPowerup.isAlive = true;
          this.storedPowerup.vx = (Math.random() - 0.5) * 3;
          this.storedPowerup.vy = (Math.random() - 0.5) * 3;
          powerups.push(this.storedPowerup);
        }
        // Plus generate extra bonus powerup drop
        powerups.push(Powerup.spawnRandom(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20));
      }
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;
    const ctx = renderer.ctx;

    // 1. Draw Stolen Powerup carried in mandibles
    if (this.hasPowerup && this.storedPowerup) {
      this.storedPowerup.x = this.x + Math.cos(this.angle) * 26;
      this.storedPowerup.y = this.y + Math.sin(this.angle) * 26;
      this.storedPowerup.draw(renderer);
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 2. Draw Authentic Scarab Carapace & Segmented Legs
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.6;
    ctx.fillStyle = 'rgba(10, 6, 2, 0.7)';

    // Carapace outline
    ctx.beginPath();
    for (let i = 0; i < Scarab.BODY_POINTS.length; i++) {
      const [px, py] = Scarab.BODY_POINTS[i];
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mandibles / Head Pincers
    ctx.beginPath();
    for (let i = 0; i < Scarab.MANDIBLE_POINTS.length; i++) {
      const [px, py] = Scarab.MANDIBLE_POINTS[i];
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Glowing core eye
    ctx.fillStyle = this.hasPowerup ? '#00ffcc' : '#ff3344';
    ctx.beginPath();
    ctx.arc(10, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
}

import { VectorRenderer } from '../graphics/VectorRenderer';
import { PLAYER_COLORS } from '../core/Constants';
import { Powerup } from './Powerup';
import { ParticleSystem } from './Particle';
import { SoundEngine } from '../audio/SoundEngine';

export class Wormhole {
  public ownerName: string;
  public slot: number;
  public color: string;
  public glowColor: string;

  public currentDegrees: number;
  public orbitRadius: number;
  public x = 0;
  public y = 0;

  // Warp-in state
  public isWarpingIn = true;
  public warpDist = 0;

  // Hitbox & damage
  public width = 120;
  public height = 60;
  public damageTaken = 0;
  public readonly damageThreshold = 150;

  private cycle = 0;

  constructor(
    ownerName: string,
    slot = 0,
    startDegrees = 0,
    orbitRadius = 270,
    warpIn = true
  ) {
    this.ownerName = ownerName;
    this.slot = slot;
    this.currentDegrees = startDegrees;
    this.orbitRadius = orbitRadius;
    this.isWarpingIn = warpIn;
    this.warpDist = warpIn ? 0 : orbitRadius;

    const colorProfile = PLAYER_COLORS[slot % PLAYER_COLORS.length];
    this.color = colorProfile.primary;
    this.glowColor = colorProfile.glow;

    this.updatePosition();
  }

  private updatePosition(): void {
    const rad = (this.currentDegrees * Math.PI) / 180;
    const dist = this.isWarpingIn ? this.warpDist : this.orbitRadius;
    this.x = Math.cos(rad) * dist;
    this.y = Math.sin(rad) * dist;
  }

  public update(dt: number, particles: ParticleSystem, sound: SoundEngine): void {
    this.cycle += dt * 60;

    if (this.isWarpingIn) {
      if (this.warpDist < this.orbitRadius) {
        this.warpDist += Math.max(6.0, (this.orbitRadius - this.warpDist) / 3.0);
      } else {
        this.isWarpingIn = false;
        this.warpDist = this.orbitRadius;
        particles.createExplosion(this.x, this.y, this.color, 12);
        sound.playSpecial(0);
      }
    } else {
      // Authentic orbit speed from PortalSprite.java: ARC_SPEED = 0.5 deg/frame at 30Hz = 15.0 deg/sec
      this.currentDegrees = (this.currentDegrees + dt * 15.0) % 360;
    }

    this.updatePosition();
  }

  public absorbDamage(
    dmg: number,
    powerups: Powerup[],
    particles: ParticleSystem,
    sound: SoundEngine,
    playerContext?: { hasRetros?: boolean; bulletLevel?: number; isMaxThrust?: boolean }
  ): void {
    this.damageTaken += dmg;
    particles.createExplosion(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 10, this.color, 4);
    sound.playExplosion(false); // Authentic hit explosion sound on wormhole impact

    if (this.damageTaken >= this.damageThreshold) {
      this.damageTaken = 0;
      // Eject a fresh powerup with smart max-upgrade filtering!
      const pup = Powerup.spawnRandom(this.x, this.y, playerContext);
      powerups.push(pup);

      particles.createExplosion(this.x, this.y, '#ffffff', 22);
      sound.playExplosion(true);
      sound.playPowerup();
    }
  }

  public absorbPowerupShot(
    _powerupType: number,
    particles: ParticleSystem,
    sound: SoundEngine
  ): void {
    particles.createWormholeImplosion(this.x, this.y, this.color);
    sound.playExplosion(false);
    sound.playSpecial(0);
  }

  /**
   * Draws magnetic gravitational suction flux curve connecting to a swallowed object
   */
  public drawSuctionBeam(renderer: VectorRenderer, targetX: number, targetY: number): void {
    const ctx = renderer.ctx;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;

    // Curved vortex flux line into center of singularity
    const midX = (this.x + targetX) / 2 + Math.sin(this.cycle * 0.2) * 16;
    const midY = (this.y + targetY) / 2 + Math.cos(this.cycle * 0.2) * 16;

    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.quadraticCurveTo(midX, midY, this.x, this.y);
    ctx.stroke();

    // White-hot suction core beam
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.quadraticCurveTo(midX, midY, this.x, this.y);
    ctx.stroke();

    ctx.restore();
  }

  public draw(renderer: VectorRenderer): void {
    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);

    const time = this.cycle * 0.012; // Majestic cosmic rotation

    // 1. Deep Cosmic Cauldron Vortex Streams (Graceful, Powerful Gravitational Inflow)
    ctx.save();
    for (let arm = 0; arm < 6; arm++) {
      const baseAngle = arm * (Math.PI / 3) + time * 1.2;
      ctx.beginPath();
      for (let s = 0; s < 26; s++) {
        const theta = baseAngle + s * 0.14;
        const rx = 18 + s * 2.0;
        const ry = rx * 0.48; // flat 2:1 accretion plane
        const px = Math.cos(theta) * rx;
        const py = Math.sin(theta) * ry;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      const isMajor = arm % 2 === 0;
      ctx.strokeStyle = isMajor ? this.color : '#ffffff';
      ctx.lineWidth = isMajor ? 2.0 : 1.2;
      ctx.globalAlpha = isMajor ? 0.6 : 0.35;
      ctx.stroke();
    }
    ctx.restore();

    // 2. Central Pitch-Black Event Horizon Void Shadow
    ctx.fillStyle = '#010206';
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Razor-Sharp Scorching Photon Sphere Boundary
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 18, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Tight Event-Horizon Powerup Harvest Damage Indicator Arc
    const dmgRatio = Math.min(1.0, this.damageTaken / this.damageThreshold);
    if (dmgRatio > 0) {
      ctx.strokeStyle = dmgRatio > 0.8 ? '#ff3344' : '#00ffcc';
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.ellipse(0, 0, 26.5, 19.5, 0, -Math.PI / 2, -Math.PI / 2 + dmgRatio * Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;

    // Wormhole Pilot Label
    renderer.drawGlowText(
      `${this.ownerName.toUpperCase()}'S WORMHOLE`,
      0,
      46,
      'bold 11px "Courier New", monospace',
      this.color,
      this.glowColor,
      'center'
    );

    ctx.restore();
  }
}

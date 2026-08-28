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
  public isAlive = true;

  private cycle = 0;

  constructor(
    ownerName: string,
    slot = 0,
    startDegrees = 0,
    orbitRadius = 270,
    warpIn = true,
    customColor?: string
  ) {
    this.ownerName = ownerName;
    this.slot = slot;
    this.currentDegrees = startDegrees;
    this.orbitRadius = orbitRadius;
    this.isWarpingIn = warpIn;
    this.warpDist = warpIn ? 0 : orbitRadius;
    this.isAlive = true;

    if (customColor) {
      this.color = customColor;
      this.glowColor = customColor;
    } else {
      const colorProfile = PLAYER_COLORS[slot % PLAYER_COLORS.length] || PLAYER_COLORS[0];
      this.color = colorProfile.primary;
      this.glowColor = colorProfile.glow;
    }

    this.updatePosition();
  }

  public killSelf(particles?: ParticleSystem, sound?: SoundEngine): void {
    if (!this.isAlive) return;
    this.isAlive = false;
    if (particles) {
      particles.createExplosion(this.x, this.y, this.color, 45);
      particles.createExplosion(this.x, this.y, '#ffffff', 25);
    }
    if (sound) {
      sound.playExplosion(true);
      sound.playSpecial(1);
    }
  }

  private updatePosition(): void {
    const rad = (this.currentDegrees * Math.PI) / 180;
    const dist = this.isWarpingIn ? this.warpDist : this.orbitRadius;
    this.x = Math.cos(rad) * dist;
    this.y = Math.sin(rad) * dist;
  }

  public update(dt: number, particles: ParticleSystem, sound: SoundEngine): void {
    if (!this.isAlive) return;
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
      // Authentic orbit speed from PortalSprite.java & WormholeModel.java (15ms sleep = ~45-50 Hz loop)
      // 0.5 deg/frame at 45Hz = 22.5 deg/sec (exact 16.0s per revolution)
      this.currentDegrees = (this.currentDegrees + dt * 22.5) % 360;
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

  public forceEjectPowerup(
    powerups: Powerup[],
    particles: ParticleSystem,
    sound: SoundEngine,
    specificType?: number
  ): void {
    const pup = specificType !== undefined ? new Powerup(this.x, this.y, specificType) : Powerup.spawnRandom(this.x, this.y);
    powerups.push(pup);
    particles.createExplosion(this.x, this.y, '#ffffff', 22);
    sound.playExplosion(true);
    sound.playPowerup();
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
    if (!this.isAlive) return;
    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);

    const time = this.cycle * 0.012; // Majestic cosmic rotation
    const intensity = renderer.options.glowIntensity !== undefined ? renderer.options.glowIntensity : (renderer.options.enableGlow ? 1.0 : 0.0);
    const isGlowActive = renderer.options.enableGlow && intensity > 0.05;

    // 1. Deep Cosmic Cauldron Vortex Streams (Graceful, Powerful Gravitational Inflow)
    // Pre-calculate stream arm paths for multi-pass rendering
    const armPaths: Path2D[] = [];
    for (let arm = 0; arm < 6; arm++) {
      const baseAngle = arm * (Math.PI / 3) + time * 1.2;
      const path = new Path2D();
      for (let s = 0; s < 26; s++) {
        const theta = baseAngle + s * 0.14;
        const rx = 18 + s * 2.0;
        const ry = rx * 0.48; // flat 2:1 accretion plane
        const px = Math.cos(theta) * rx;
        const py = Math.sin(theta) * ry;
        if (s === 0) path.moveTo(px, py);
        else path.lineTo(px, py);
      }
      armPaths.push(path);
    }

    // Pass 1: Outer Radiant Saturated Aura (GPU Additive Blending, 0% CPU Blur Stall)
    if (isGlowActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let arm = 0; arm < 6; arm++) {
        const isMajor = arm % 2 === 0;
        ctx.strokeStyle = isMajor ? this.color : '#ffffff';
        ctx.lineWidth = isMajor ? (2.0 + 4.5 * intensity) : (1.2 + 3.0 * intensity);
        ctx.globalAlpha = isMajor ? Math.min(0.65, 0.35 * intensity) : Math.min(0.40, 0.20 * intensity);
        ctx.stroke(armPaths[arm]);
      }
      ctx.restore();
    }

    // Pass 2: Main Vivid Vector Inflow Arms
    ctx.save();
    for (let arm = 0; arm < 6; arm++) {
      const isMajor = arm % 2 === 0;
      ctx.strokeStyle = isMajor ? this.color : '#ffffff';
      ctx.lineWidth = isMajor ? 2.0 : 1.2;
      ctx.globalAlpha = isMajor ? 0.90 : 0.60;
      ctx.stroke(armPaths[arm]);
    }
    ctx.restore();

    // 2. Central Pitch-Black Event Horizon Void Shadow
    ctx.fillStyle = '#010206';
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Razor-Sharp Scorching Photon Sphere Boundary
    if (isGlowActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.0 + 4.0 * intensity;
      ctx.globalAlpha = Math.min(0.60, 0.30 * intensity);
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 17, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.8;
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

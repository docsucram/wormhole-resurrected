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
    warpIn = true
  ) {
    this.ownerName = ownerName;
    this.slot = slot;
    this.currentDegrees = startDegrees;
    this.orbitRadius = orbitRadius;
    this.isWarpingIn = warpIn;
    this.warpDist = warpIn ? 0 : orbitRadius;
    this.isAlive = true;

    const colorProfile = PLAYER_COLORS[slot % PLAYER_COLORS.length];
    this.color = colorProfile.primary;
    this.glowColor = colorProfile.glow;

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

  private hexToRgb(hex: string): [number, number, number] {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16) || 0;
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  private getTierColor(hex: string, sat: number): string {
    const [r, g, b] = this.hexToRgb(hex);
    const nr = Math.round(r * sat + 255 * (1 - sat));
    const ng = Math.round(g * sat + 255 * (1 - sat));
    const nb = Math.round(b * sat + 255 * (1 - sat));
    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;
    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);

    const time = this.cycle * 0.012; // Majestic cosmic rotation

    // 1. Deep Cosmic Cauldron Vortex Streams (3 Tiers of 3 Arms: Vibrant -> Mid-Saturation -> Pastel Glow)
    ctx.save();
    const tiers = [
      { sat: 1.0, width: 2.2, alpha: 0.85, offset: 0, steps: 28, maxDist: 2.1 },
      { sat: 0.65, width: 1.8, alpha: 0.6, offset: (Math.PI * 2) / 9, steps: 25, maxDist: 1.9 },
      { sat: 0.35, width: 1.3, alpha: 0.42, offset: (Math.PI * 4) / 9, steps: 22, maxDist: 1.7 },
    ];

    for (const tier of tiers) {
      ctx.strokeStyle = this.getTierColor(this.color, tier.sat);
      ctx.lineWidth = tier.width;
      ctx.globalAlpha = tier.alpha;

      for (let arm = 0; arm < 3; arm++) {
        const baseAngle = arm * ((Math.PI * 2) / 3) + tier.offset + time * 1.2;
        ctx.beginPath();
        for (let s = 0; s < tier.steps; s++) {
          const theta = baseAngle + s * 0.14;
          const rx = 18 + s * tier.maxDist;
          const ry = rx * 0.48; // flat 2:1 accretion plane
          const px = Math.cos(theta) * rx;
          const py = Math.sin(theta) * ry;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
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

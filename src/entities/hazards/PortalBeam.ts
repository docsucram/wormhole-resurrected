import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { Wormhole } from '../Wormhole';
import { PLAYER_COLORS } from '../../core/Constants';

export class PortalBeam implements Hazard {
  public x = 0;
  public y = 0;
  public radius = 10;
  public health = 99999;
  public maxHealth = 99999;
  public damage = 1;
  public isAlive = true;
  public color = '#00ffcc';
  public slot = 1;
  public powerupType = 16;

  public parentWormhole: Wormhole;
  public beamAngle = 0;
  public beamSpeed = 0.008;
  public beamLength = 1400;
  private life = 5.5; // ~320 frames

  constructor(parentWormhole: Wormhole, slot = 1) {
    this.parentWormhole = parentWormhole;
    this.slot = slot;
    this.color = PLAYER_COLORS[slot % PLAYER_COLORS.length].primary;
    this.x = parentWormhole.x;
    this.y = parentWormhole.y;
    this.beamAngle = Math.random() * Math.PI * 2;
  }

  private cycle = 0;
  private beamRad = 14;
  private damageTimer = 0;

  public update(
    dt: number,
    player: PlayerShip,
    _bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine
  ): boolean {
    if (!this.isAlive) return false;

    this.life -= dt;
    this.cycle += dt * 60;
    if (this.damageTimer > 0) this.damageTimer -= dt;

    if (this.life <= 0) {
      this.isAlive = false;
      return false;
    }

    this.x = this.parentWormhole.x;
    this.y = this.parentWormhole.y;

    // Sweep beam angle
    this.beamAngle += this.beamSpeed * dt * 60;

    // Beam Line-Circle collision check with player
    const bx2 = this.x + Math.cos(this.beamAngle) * this.beamLength;
    const by2 = this.y + Math.sin(this.beamAngle) * this.beamLength;

    // Distance from player point to segment
    const dx = bx2 - this.x;
    const dy = by2 - this.y;
    const l2 = dx * dx + dy * dy;
    let t = ((player.x - this.x) * dx + (player.y - this.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = this.x + t * dx;
    const projY = this.y + t * dy;
    const distToBeam = Math.hypot(player.x - projX, player.y - projY);

    if (distToBeam < this.beamRad + 10 && this.damageTimer <= 0) {
      this.damageTimer = 0.05; // 20 Hz damage tick
      player.takeDamage(this.damage, particles, sound, {
        name: this.parentWormhole.ownerName,
        weapon: 'SWEEPING BEAM',
        slot: this.slot,
      });
    }

    return true;
  }

  public takeDamage(): void {
    // Beams are energy rays, not destructible by normal bullets
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    const ctx = renderer.ctx;
    const dx = Math.cos(this.beamAngle) * this.beamLength;
    const dy = Math.sin(this.beamAngle) * this.beamLength;

    ctx.save();
    ctx.translate(this.x, this.y);

    const numLines = 10;
    const cycle = this.cycle;
    const perpAngle = this.beamAngle + Math.PI / 2;
    const cosPerp = Math.cos(perpAngle);
    const sinPerp = Math.sin(perpAngle);

    // 1. Batch Outer colored beam lines in a single stroke call
    ctx.beginPath();
    for (let i = 0; i < numLines; i++) {
      const angle = (i * ((Math.PI * 2) / numLines)) + cycle * 0.06;
      const ox = cosPerp * (Math.cos(angle) * this.beamRad);
      const oy = sinPerp * (Math.sin(angle) * this.beamRad * 0.75);

      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + dx, oy + dy);
    }
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;
    ctx.globalAlpha = 0.75;
    ctx.stroke();

    // 2. Batch Inner high-energy white core lines in a single stroke call
    ctx.beginPath();
    for (let i = 0; i < numLines; i += 2) {
      const angle = (i * ((Math.PI * 2) / numLines)) + cycle * 0.06;
      const ox = cosPerp * (Math.cos(angle) * this.beamRad);
      const oy = sinPerp * (Math.sin(angle) * this.beamRad * 0.75);

      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + dx, oy + dy);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    ctx.globalAlpha = 0.95;
    ctx.stroke();

    ctx.restore();
  }
}

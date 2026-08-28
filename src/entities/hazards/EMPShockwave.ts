import { Hazard } from './Hazard';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { PlayerShip } from '../PlayerShip';
import { PLAYER_COLORS } from '../../core/Constants';

export class EMPShockwave implements Hazard {
  public x: number;
  public y: number;
  public radius = 0;
  public health = 99999;
  public maxHealth = 99999;
  public damage = 0;
  public isAlive = true;
  public color = '#00ffcc';
  public slot = 1;
  public powerupType = 17;

  private maxRadius = 350;
  private life = 2.0;

  constructor(x: number, y: number, slot = 1, customColor?: string) {
    this.x = x;
    this.y = y;
    this.slot = slot;
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

    this.life -= dt;
    this.radius += dt * 240;

    if (this.radius >= this.maxRadius || this.life <= 0) {
      this.isAlive = false;
      return false;
    }

    // Check hit with player (Any player inside the expanding shockwave disc)
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist <= this.radius && !player.isUnderEMP) {
      player.isUnderEMP = true;
      player.empTime = 5.0; // 5.0 seconds duration
      player.empType = Math.floor(Math.random() * 3);
      particles.createExplosion(player.x, player.y, '#ffffff', 16);
      sound.playSpecial(1);
    }

    return true;
  }

  public takeDamage(): void {}

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    // Electric shockwave rings
    renderer.drawGlowCircle(this.x, this.y, this.radius, '#ffffff', this.color, 3);
    renderer.drawGlowCircle(this.x, this.y, Math.max(0, this.radius - 15), this.color, this.color, 1.5);
  }
}

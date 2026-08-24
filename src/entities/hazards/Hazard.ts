import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { HeatSeekerMissile } from '../HeatSeekerMissile';
import { PlayerShip } from '../PlayerShip';
import { Powerup } from '../Powerup';
import { Wormhole } from '../Wormhole';

export interface Hazard {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  damage: number;
  isAlive: boolean;
  color: string;
  slot: number;
  powerupType: number;

  update(
    dt: number,
    player: PlayerShip,
    bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine,
    missiles?: HeatSeekerMissile[],
    wormholes?: Wormhole[],
    powerups?: Powerup[]
  ): boolean;

  draw(renderer: VectorRenderer): void;
  takeDamage(dmg: number, particles: ParticleSystem, sound: SoundEngine, powerups?: Powerup[]): void;
  onHitByBullet?(bullet: Bullet, particles: ParticleSystem, sound: SoundEngine, powerups?: Powerup[]): void;
}

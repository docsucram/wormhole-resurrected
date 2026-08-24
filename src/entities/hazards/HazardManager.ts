import { Hazard } from './Hazard';
import { Mine } from './Mine';
import { PortalTurret } from './PortalTurret';
import { UFO } from './UFO';
import { Inflator } from './Inflator';
import { MineLayer } from './MineLayer';
import { Gunship } from './Gunship';
import { Scarab } from './Scarab';
import { Nuke } from './Nuke';
import { WallCrawler } from './WallCrawler';
import { PortalBeam } from './PortalBeam';
import { EMPShockwave } from './EMPShockwave';
import { GhostPud } from './GhostPud';
import { Artillery } from './Artillery';
import { HeatSeekerSwarm } from './HeatSeekerSwarm';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { ParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { Bullet } from '../Bullet';
import { HeatSeekerMissile } from '../HeatSeekerMissile';
import { PlayerShip } from '../PlayerShip';
import { Wormhole } from '../Wormhole';
import { Powerup } from '../Powerup';
import { Collision } from '../../math/Collision';

export class HazardManager {
  public hazards: Hazard[] = [];
  public mines: Mine[] = [];
  public arenaBound = 505;
  public onWarpHazard?: (hazardType: number, targetSlot: number) => void;

  constructor(arenaBound = 505) {
    this.arenaBound = arenaBound;
  }

  public spawnHazard(
    powerupType: number,
    sourceWormhole: Wormhole,
    _targetPlayer: PlayerShip,
    missiles: HeatSeekerMissile[]
  ): void {
    const slot = sourceWormhole.slot;
    const x = sourceWormhole.x;
    const y = sourceWormhole.y;

    switch (powerupType) {
      case 6: {
        // Heat Seeker Swarm (12 missiles)
        HeatSeekerSwarm.spawnSwarm(x, y, missiles, sourceWormhole.color);
        break;
      }
      case 7: {
        // Portal Turret
        this.hazards.push(new PortalTurret(sourceWormhole, slot));
        break;
      }
      case 8: {
        // Wormhole Mines (Circle of 8 mines)
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI * 2) / 8;
          this.mines.push(new Mine(x, y, Math.cos(a) * 3.5, Math.sin(a) * 3.5, slot));
        }
        break;
      }
      case 9: {
        // UFO Squadron (authentic ratio = 3 from legacy PowerupSprite.g_enemyRatios)
        for (let i = 0; i < 3; i++) {
          const offsetX = (Math.random() - 0.5) * 60;
          const offsetY = (Math.random() - 0.5) * 60;
          this.hazards.push(new UFO(x + offsetX, y + offsetY, slot, this.arenaBound));
        }
        break;
      }
      case 10: {
        // Inflator Cluster (authentic ratio = 4 from legacy PowerupSprite.g_enemyRatios)
        for (let i = 0; i < 4; i++) {
          const offsetX = (Math.random() - 0.5) * 60;
          const offsetY = (Math.random() - 0.5) * 60;
          this.hazards.push(new Inflator(x + offsetX, y + offsetY, slot, this.arenaBound));
        }
        break;
      }
      case 11: {
        // MineLayer Pair (authentic ratio = 2 from legacy PowerupSprite.g_enemyRatios)
        for (let i = 0; i < 2; i++) {
          const offsetX = (Math.random() - 0.5) * 50;
          const offsetY = (Math.random() - 0.5) * 50;
          this.hazards.push(new MineLayer(x + offsetX, y + offsetY, this.mines, slot, this.arenaBound));
        }
        break;
      }
      case 12: {
        // Gunship Cruiser
        this.hazards.push(new Gunship(x, y, slot, this.arenaBound));
        break;
      }
      case 13: {
        // Scarab Pair (authentic ratio = 2 from legacy PowerupSprite.g_enemyRatios)
        for (let i = 0; i < 2; i++) {
          const offsetX = (Math.random() - 0.5) * 40;
          const offsetY = (Math.random() - 0.5) * 40;
          this.hazards.push(new Scarab(x + offsetX, y + offsetY, slot, this.arenaBound));
        }
        break;
      }
      case 14: {
        // Nuke
        this.hazards.push(new Nuke(x, y, slot, this.arenaBound));
        break;
      }
      case 15: {
        // WallCrawler on exact perimeter walls
        this.hazards.push(new WallCrawler(x, y, this.arenaBound, slot));
        break;
      }
      case 16: {
        // Sweep Beam
        this.hazards.push(new PortalBeam(sourceWormhole, slot));
        break;
      }
      case 17: {
        // EMP Shockwave
        this.hazards.push(new EMPShockwave(x, y, slot));
        break;
      }
      case 18: {
        // Ghost-Pud (spawn slightly outside the event horizon with outward velocity)
        const outwardAngle = Math.atan2(y, x) + (Math.random() - 0.5) * 0.5;
        const spawnX = x + Math.cos(outwardAngle) * 60;
        const spawnY = y + Math.sin(outwardAngle) * 60;
        this.hazards.push(new GhostPud(spawnX, spawnY, outwardAngle, slot, this.arenaBound));
        break;
      }
      case 19: {
        // Artillery Pair (authentic ratio = 2 from legacy PowerupSprite.g_enemyRatios)
        for (let i = 0; i < 2; i++) {
          const offsetX = (Math.random() - 0.5) * 50;
          const offsetY = (Math.random() - 0.5) * 50;
          this.hazards.push(new Artillery(x + offsetX, y + offsetY, slot, this.arenaBound));
        }
        break;
      }
    }
  }

  public ambientSpawnTimer = 20.0;

  public update(
    dt: number,
    player: PlayerShip,
    bullets: Bullet[],
    particles: ParticleSystem,
    sound: SoundEngine,
    powerups?: Powerup[],
    missiles?: HeatSeekerMissile[],
    wormholes?: Wormhole[]
  ): void {
    // 1. Ambient Rogue Hazard Spawning (authentic arcade behavior)
    if (wormholes && wormholes.length > 0 && player.isAlive) {
      this.ambientSpawnTimer -= dt;
      if (this.ambientSpawnTimer <= 0) {
        this.ambientSpawnTimer = 20.0 + Math.random() * 10.0;
        if (this.hazards.length < 3) {
          const ambientTypes = [8, 9, 10, 11, 13, 18]; // Mines, UFO, Inflator, Minelayer, Scarab, GhostPud
          const randomType = ambientTypes[Math.floor(Math.random() * ambientTypes.length)];
          const randomWh = wormholes[Math.floor(Math.random() * wormholes.length)];
          this.spawnHazard(randomType, randomWh, player, missiles || []);
        }
      }
    }

    // 2. Soft mutual repulsion between overlapping Inflators so they don't clump inside each other
    for (let i = 0; i < this.hazards.length; i++) {
      const h1 = this.hazards[i];
      if (!h1.isAlive || !(h1 instanceof Inflator)) continue;
      for (let j = i + 1; j < this.hazards.length; j++) {
        const h2 = this.hazards[j];
        if (!h2.isAlive || !(h2 instanceof Inflator)) continue;
        const dx = h2.x - h1.x;
        const dy = h2.y - h1.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = (h1.radius + h2.radius) * 0.85;
        if (dist < minDist) {
          const push = ((minDist - dist) / minDist) * dt * 30;
          h1.x -= (dx / dist) * push;
          h1.y -= (dy / dist) * push;
          h2.x += (dx / dist) * push;
          h2.y += (dy / dist) * push;
        }
      }
    }

    // 3. Update active hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (!h.update(dt, player, bullets, particles, sound, missiles, wormholes) || !h.isAlive) {
        this.hazards.splice(i, 1);
        continue;
      }

      // Authentic Ghost Pud wormhole ingestion (only after 2.5s and punted by player lasers)
      if (wormholes && wormholes.length > 0 && h instanceof GhostPud && h.isAlive && h.age > 2.5 && h.wasPuntedByPlayer) {
        for (const wh of wormholes) {
          const dx = (h.x - wh.x) / (wh.width / 2);
          const dy = (h.y - wh.y) / (wh.height / 2);
          const distSq = dx * dx + dy * dy;

          // Gravitational suction if near wormhole
          if (distSq < 2.5) {
            const pull = dt * 10.0;
            h.vx += (wh.x - h.x) * pull;
            h.vy += (wh.y - h.y) * pull;
          }

          // Absorbed into wormhole event horizon
          if (distSq <= 1.0) {
            h.isAlive = false;
            particles.createHazardIngestion(h.x, h.y, wh.x, wh.y, 18, h.color, () => {
              wh.absorbPowerupShot(18, particles, sound);
              sound.playWormholeCharge();
              if (this.onWarpHazard) {
                this.onWarpHazard(18, wh.slot);
              }
            });
            this.hazards.splice(i, 1);
            break;
          }
        }
      }
    }

    // 4. Update active mines
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      if (!m.update(dt, player, bullets, particles, sound) || !m.isAlive) {
        this.mines.splice(i, 1);
      }
    }

    // 5. Bullet collisions against all hazards
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.ownerSlot !== player.slot) continue; // Only player bullets hit hostile hazards

      let hit = false;
      for (const h of this.hazards) {
        // AI bullets cannot shoot/punt Nuke during its first 2 seconds
        if (h.powerupType === 14 && b.ownerSlot !== 0) {
          const nukeObj = h as unknown as { countdown?: number };
          if (nukeObj.countdown !== undefined && nukeObj.countdown > 6.0) {
            continue;
          }
        }

        if (h.isAlive && Collision.testCircleCircle(b.x, b.y, b.size, h.x, h.y, h.radius)) {
          if (h.onHitByBullet) {
            h.onHitByBullet(b, particles, sound, powerups);
          } else {
            h.takeDamage(b.damage, particles, sound, powerups);
          }
          // If Inflator, also apply splash damage to overlapping Inflators in cluster
          if (h instanceof Inflator) {
            for (const other of this.hazards) {
              if (other !== h && other.isAlive && other instanceof Inflator) {
                if (Collision.testCircleCircle(b.x, b.y, b.size + 20, other.x, other.y, other.radius)) {
                  other.takeDamage(b.damage * 0.5, particles, sound, powerups);
                }
              }
            }
          }
          hit = true;
          break;
        }
      }

      if (!hit) {
        for (const m of this.mines) {
          if (m.isAlive && Collision.testCircleCircle(b.x, b.y, b.size, m.x, m.y, m.radius)) {
            m.takeDamage(b.damage, particles, sound, powerups);
            hit = true;
            break;
          }
        }
      }

      if (hit) {
        bullets.splice(i, 1);
      }
    }
  }

  public clearAll(particles: ParticleSystem, sound: SoundEngine): void {
    for (const h of this.hazards) {
      particles.createExplosion(h.x, h.y, '#ffffff', 6);
    }
    for (const m of this.mines) {
      particles.createExplosion(m.x, m.y, '#ffffff', 4);
    }
    this.hazards = [];
    this.mines = [];
    sound.playExplosion(true);
  }

  public draw(renderer: VectorRenderer): void {
    for (const m of this.mines) {
      m.draw(renderer);
    }
    for (const h of this.hazards) {
      h.draw(renderer);
    }
  }
}

import { PlayerShip } from '../PlayerShip';
import { Wormhole } from '../Wormhole';
import { Powerup } from '../Powerup';
import { Bullet } from '../Bullet';
import { HeatSeekerMissile } from '../HeatSeekerMissile';
import { ParticleSystem, NullParticleSystem } from '../Particle';
import { SoundEngine } from '../../audio/SoundEngine';
import { HazardManager } from '../hazards/HazardManager';
import { BotController, BotDifficulty } from './BotController';
import { Collision } from '../../math/Collision';
import { VectorRenderer } from '../../graphics/VectorRenderer';
import { RealmSnapshot } from '../../net/NetworkManager';

import { PLAYER_COLORS } from '../../core/Constants';

class SilentSoundEngine extends SoundEngine {
  override playLaser(): void {}
  override setThrust(): void {}
  override playExplosion(): void {}
  override playSpecial(): void {}
  override playShield(): void {}
  override playPowerup(): void {}
  override playZap(): void {}
  override playCountdownBeep(): void {}
  override playVictoryFanfare(): void {}
  override playDefeatFanfare(): void {}
  override playWormholeCharge(): void {}
}

export interface BotRealmInstance {
  slot: number;
  name: string;
  botShip: PlayerShip;
  botController: BotController;
  wormholes: Wormhole[];
  wormholeToPlayer1?: Wormhole;
  hazardManager: HazardManager;
  powerups: Powerup[];
  bullets: Bullet[];
  missiles: HeatSeekerMissile[];
  particles: ParticleSystem;
  kills: number;
  deaths: number;
}

export class SimulatedRealm {
  public botShip: PlayerShip;
  public botController: BotController;
  public wormholes: Wormhole[] = [];
  public get wormholeToPlayer1(): Wormhole {
    return this.wormholes[0] || new Wormhole('PLAYER 1', 0, 0, this.orbitDistance, true);
  }
  public hazardManager: HazardManager;
  public powerups: Powerup[] = [];
  public bullets: Bullet[] = [];
  public missiles: HeatSeekerMissile[] = [];
  public particles: ParticleSystem;
  private silentSound: SoundEngine;

  // Multiple Bot Realm map for multi-CPU matches
  public botRealms: Map<number, BotRealmInstance> = new Map();

  public isRemotePlayer = false;
  public remoteTargetX = 0;
  public remoteTargetY = 0;
  public remoteTargetAngle = 0;
  public remoteBullets: Array<{ x: number; y: number; color: string }> = [];

  public botRespawnTimer = 0;
  public kills = 0;
  public deaths = 0;
  public arenaBound = 505;
  public orbitDistance = 180;

  // Callbacks: (powerupType, sourceBotSlot, targetSlot)
  public onSendHazardToParticipant?: (powerupType: number, sourceBotSlot: number, targetSlot: number) => void;
  public onSendHazardToPlayer1?: (powerupType: number, sourceBotSlot?: number) => void;
  public onBotDeath?: (slot?: number) => void;

  constructor(
    botShipId = 0,
    botSlot = 1,
    difficulty: BotDifficulty = 'medium',
    orbitDistance = 180,
    arenaBound = 505
  ) {
    this.arenaBound = arenaBound;
    this.orbitDistance = orbitDistance;
    this.silentSound = new SilentSoundEngine();
    this.botShip = new PlayerShip(botShipId, botSlot, 0, orbitDistance);
    this.botController = new BotController(difficulty);
    const wh = new Wormhole('PLAYER 1', 0, 0, orbitDistance, true);
    this.wormholes = [wh];
    this.hazardManager = new HazardManager(arenaBound);
    this.particles = new NullParticleSystem();
  }

  public clearAllBots(): void {
    this.botRealms.clear();
    this.isRemotePlayer = false;
    this.wormholes = [];
    this.bullets = [];
    this.missiles = [];
    this.powerups = [];
    this.remoteBullets = [];
  }

  public addBotRealm(
    slot: number,
    name: string,
    shipId = 0,
    difficulty: BotDifficulty = 'medium',
    colorIdx?: number
  ): BotRealmInstance {
    const assignedSlot = colorIdx !== undefined ? colorIdx : slot;
    const ship = new PlayerShip(shipId, assignedSlot, 0, this.orbitDistance);
    const controller = new BotController(difficulty);
    const wh = new Wormhole('PLAYER 1', 0, 0, this.orbitDistance, true);
    const hazards = new HazardManager(this.arenaBound);
    ship.onClearScreen = () => {
      hazards.clearAll(new NullParticleSystem(), this.silentSound);
    };
    hazards.onWarpHazard = (hazardType: number, targetSlot: number) => {
      if (this.onSendHazardToParticipant) {
        this.onSendHazardToParticipant(hazardType, slot, targetSlot);
      } else if (targetSlot === 0) {
        if (this.onSendHazardToPlayer1) this.onSendHazardToPlayer1(hazardType, slot);
      } else {
        const destRealm = this.botRealms.get(targetSlot);
        if (destRealm) {
          const destWh = destRealm.wormholes.find((w) => w.slot === slot) || destRealm.wormholes[0];
          destRealm.hazardManager.spawnHazard(hazardType, destWh, destRealm.botShip, destRealm.missiles);
        }
      }
    };
    const particles = new NullParticleSystem();

    const instance: BotRealmInstance = {
      slot,
      name,
      botShip: ship,
      botController: controller,
      wormholes: [wh],
      wormholeToPlayer1: wh,
      hazardManager: hazards,
      powerups: [],
      bullets: [],
      missiles: [],
      particles,
      kills: 0,
      deaths: 0,
    };

    this.botRealms.set(slot, instance);
    if (slot === 1) {
      this.botShip = ship;
      this.botController = controller;
      this.wormholes = instance.wormholes;
      this.hazardManager = hazards;
      this.powerups = instance.powerups;
      this.bullets = instance.bullets;
      this.missiles = instance.missiles;
      this.particles = particles;
    }
    return instance;
  }

  public rebuildTableWormholes(
    tablePlayers: Array<{ name: string; slot: number; color?: string; team?: 'A' | 'B'; isAlive?: boolean; isSpectating?: boolean } | null>,
    orbitDistance = this.orbitDistance,
    isTeamMode = false,
    filterDead = false
  ): void {
    this.orbitDistance = orbitDistance;

    // Distribute wormholes in each bot's realm for all ENEMY / OTHER table participants
    for (const [slot, realm] of this.botRealms.entries()) {
      realm.wormholes = [];
      const botPlayer = tablePlayers[slot];
      const botTeam = botPlayer?.team || (slot % 2 === 0 ? 'A' : 'B');

      const otherPlayers: Array<{ name: string; slot: number; color?: string; team?: 'A' | 'B' }> = [];
      for (let i = 0; i < tablePlayers.length; i++) {
        const p = tablePlayers[i];
        if (p && p.slot !== slot) {
          if (filterDead && (p.isSpectating || p.isAlive === false)) {
            continue;
          }
          if (isTeamMode) {
            if (p.team !== botTeam) {
              otherPlayers.push(p);
            }
          } else {
            otherPlayers.push(p);
          }
        }
      }

      if (otherPlayers.length === 0) {
        realm.wormholes.push(new Wormhole('OPPONENT', 0, 0, orbitDistance, true));
      } else {
        const angleStep = 360 / otherPlayers.length;
        otherPlayers.forEach((other, idx) => {
          const angle = idx * angleStep;
          realm.wormholes.push(
            new Wormhole(other.name, other.slot, angle, orbitDistance, true, other.color)
          );
        });
      }
      realm.wormholeToPlayer1 = realm.wormholes.find((w) => w.slot === 0) || realm.wormholes[0];

      if (slot === 1) {
        this.wormholes = realm.wormholes;
      }
    }
  }

  public removeBotRealm(slot: number): void {
    this.botRealms.delete(slot);
  }

  public resetForNewRound(): void {
    for (const realm of this.botRealms.values()) {
      realm.botShip.respawn(0, this.orbitDistance);
      realm.hazardManager.clearAll(realm.particles, this.silentSound);
      realm.bullets = [];
      realm.missiles = [];
      realm.powerups = [];
    }
    this.botShip.respawn(0, this.orbitDistance);
    this.hazardManager.clearAll(this.particles, this.silentSound);
    this.bullets = [];
    this.missiles = [];
    this.remoteBullets = [];
  }

  public applyRemoteSnapshot(snapshot: RealmSnapshot): void {
    this.isRemotePlayer = true;
    const wasAlive = this.botShip.isAlive;
    this.remoteTargetX = snapshot.x;
    this.remoteTargetY = snapshot.y;
    this.remoteTargetAngle = snapshot.angle;
    this.botShip.health = snapshot.hp;
    this.botShip.maxHealth = snapshot.maxHp;
    this.botShip.isAlive = snapshot.isAlive;
    this.botShip.slot = snapshot.slot;
    this.remoteBullets = snapshot.bullets || [];

    if (wasAlive && !snapshot.isAlive) {
      if (this.onBotDeath) this.onBotDeath(1);
    }
  }

  public receiveHazardFromPlayer1(powerupType: number, targetSlot = 1, fromSlot = 0): void {
    // Spawns hazard out of the sender's wormhole inside the specified bot realm
    const realm = this.botRealms.get(targetSlot) || this.botRealms.get(1);
    if (!realm) return;

    const destWh = realm.wormholes.find((w) => w.slot === fromSlot) || realm.wormholes[0] || this.wormholeToPlayer1;
    realm.hazardManager.spawnHazard(
      powerupType,
      destWh,
      realm.botShip,
      realm.missiles
    );
  }

  public handleParticipantElimination(slot: number): void {
    // Detonate/remove the eliminated participant's wormhole across all simulated bot realms
    for (const realm of this.botRealms.values()) {
      const deadWh = realm.wormholes.find((w) => w.slot === slot);
      if (deadWh) {
        deadWh.killSelf(realm.particles, this.silentSound);
      }
    }
  }

  public update(dt: number, _sound?: SoundEngine, isRoundActive = true): void {
    const sound = this.silentSound;
    const boundX = this.arenaBound;
    const boundY = this.arenaBound;
    const wallHalfW = this.arenaBound + 20;
    const wallHalfH = this.arenaBound + 20;

    if (!this.isRemotePlayer && this.botRealms.size === 0) {
      return;
    }

    // Update all active bot realms in parallel
    for (const realm of this.botRealms.values()) {
      // If round is in countdown or standby, freeze AI bots completely
      if (!isRoundActive) {
        realm.botShip.vx = 0;
        realm.botShip.vy = 0;
        for (const wh of realm.wormholes) {
          if (wh && wh.isAlive) {
            wh.update(dt, realm.particles, sound);
          }
        }
        continue;
      }

      const wasAlive = realm.botShip.isAlive;

      // 1. Update Autonomous Bot Ship & AI Input
      if (realm.botShip.isAlive) {
        const botInput = realm.botController.update(
          dt,
          realm.botShip,
          realm.wormholes,
          realm.powerups,
          realm.bullets,
          realm.hazardManager.hazards,
          realm.hazardManager.mines
        );

        const botTargets = [
          ...realm.wormholes.map((wh) => ({ x: wh.x, y: wh.y })),
          ...realm.hazardManager.hazards.map((h) => ({ x: h.x, y: h.y })),
          ...realm.missiles.map((m) => ({ x: m.x, y: m.y })),
        ];

        realm.botShip.update(
          dt,
          botInput,
          realm.particles,
          sound,
          realm.bullets,
          realm.missiles,
          botTargets,
          boundX,
          boundY
        );
      }

      if (wasAlive && !realm.botShip.isAlive) {
        realm.deaths++;
        this.deaths++;
        if (this.onBotDeath) this.onBotDeath(realm.slot);
      }

      // 2. Update All Wormholes in Realm
      for (const wh of realm.wormholes) {
        if (wh && wh.isAlive) {
          wh.update(dt, realm.particles, sound);
        }
      }

      // 3. Update Hazards
      if (realm.botShip.isAlive && realm.botShip.isAttractorActive) {
        for (const h of realm.hazardManager.hazards) {
          if (h.isAlive) {
            const dx = h.x - realm.botShip.x;
            const dy = h.y - realm.botShip.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 380 && dist > 1) {
              const push = 0.3 * ((380 - dist) / 380) * 140 * dt;
              h.x += (dx / dist) * push * 60 * dt;
              h.y += (dy / dist) * push * 60 * dt;
              if ('vx' in h) (h as any).vx += (dx / dist) * push;
              if ('vy' in h) (h as any).vy += (dy / dist) * push;
            }
          }
        }
      }

      realm.hazardManager.update(
        dt,
        realm.botShip,
        realm.bullets,
        realm.particles,
        sound,
        realm.powerups,
        realm.missiles,
        realm.wormholes
      );

      // 4. Update Powerups
      for (let i = realm.powerups.length - 1; i >= 0; i--) {
        const pup = realm.powerups[i];

        if (realm.botShip.isAlive && realm.botShip.isAttractorActive) {
          const dx = realm.botShip.x - pup.x;
          const dy = realm.botShip.y - pup.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 450 && dist > 1) {
            const factor = 0.3 * ((450 - dist) / 450);
            pup.vx += (dx / dist) * factor * 160 * dt;
            pup.vy += (dy / dist) * factor * 160 * dt;
          }
        }

        if (!pup.update(dt, boundX, boundY)) {
          realm.powerups.splice(i, 1);
          continue;
        }

        if (
          realm.botShip.isAlive &&
          !pup.isInvulnerable &&
          Collision.testCircleCircle(
            realm.botShip.x,
            realm.botShip.y,
            18,
            pup.x,
            pup.y,
            pup.radius
          )
        ) {
          realm.botShip.givePowerup(pup.type, sound, []);
          realm.particles.createExplosion(pup.x, pup.y, pup.color, 12);
          realm.powerups.splice(i, 1);
        }
      }

      // 5. Update Bullets
      for (let i = realm.bullets.length - 1; i >= 0; i--) {
        const b = realm.bullets[i];
        if (!b.update(dt)) {
          realm.bullets.splice(i, 1);
          continue;
        }

        if (Math.abs(b.x) >= wallHalfW) {
          b.x = Math.sign(b.x) * wallHalfW;
          b.vx *= -0.5;
          realm.particles.createExplosion(b.x, b.y, b.glowColor, 3);
        }
        if (Math.abs(b.y) >= wallHalfH) {
          b.y = Math.sign(b.y) * wallHalfH;
          b.vy *= -0.5;
          realm.particles.createExplosion(b.x, b.y, b.glowColor, 3);
        }

        // Bullet vs floating Powerup capsules
        if (!b.isPowerup) {
          for (let pIdx = realm.powerups.length - 1; pIdx >= 0; pIdx--) {
            const pup = realm.powerups[pIdx];
            if (!pup.isInvulnerable && Collision.testCircleCircle(b.x, b.y, b.size, pup.x, pup.y, pup.radius)) {
              pup.takeDamage(b.damage, realm.particles, sound);
              if (!pup.isAlive) {
                realm.powerups.splice(pIdx, 1);
              }
              realm.bullets.splice(i, 1);
              break;
            }
          }
        }

        if (b.ownerSlot !== realm.botShip.slot && realm.botShip.isAlive) {
          if (Collision.testCircleCircle(b.x, b.y, b.size, realm.botShip.x, realm.botShip.y, 16)) {
            realm.botShip.takeDamage(b.damage, realm.particles, sound, { weapon: 'Pulse Cannon', slot: b.ownerSlot });
            realm.bullets.splice(i, 1);
            continue;
          }
        }

        // Gravity & Absorption across all orbital wormholes in realm (Player/Bot shots only)
        let bulletAbsorbed = false;
        if (!b.isEnemyBullet) {
          for (const wh of realm.wormholes) {
            if (!wh.isAlive) continue;
            if (b.isPowerup || b.ownerSlot === realm.botShip.slot) {
              const pullDx = wh.x - b.x;
              const pullDy = wh.y - b.y;
              const dist = Math.hypot(pullDx, pullDy);
              const gravityRadius = b.isPowerup ? 130 : 70;

              if (dist > 0 && dist < gravityRadius) {
                const pullStrength = ((gravityRadius - dist) / gravityRadius) * (b.isPowerup ? 4.5 : 1.5) * dt * 60;
                b.vx += (pullDx / dist) * pullStrength;
                b.vy += (pullDy / dist) * pullStrength;
              }
            }

            const dx = (b.x - wh.x) / (wh.width / 2);
            const dy = (b.y - wh.y) / (wh.height / 2);
            if (dx * dx + dy * dy <= 1.0) {
              bulletAbsorbed = true;
              if (b.isPowerup && b.powerupType >= 6) {
                wh.absorbPowerupShot(b.powerupType, realm.particles, sound);
                if (this.onSendHazardToParticipant) {
                  this.onSendHazardToParticipant(b.powerupType, realm.slot, wh.slot);
                } else if (wh.slot === 0) {
                  // Forward hazard into Player 1 realm
                  if (this.onSendHazardToPlayer1) {
                    this.onSendHazardToPlayer1(b.powerupType, realm.slot);
                  }
                } else {
                  // Forward hazard into target Bot realm (FFA!)
                  const targetRealm = this.botRealms.get(wh.slot);
                  if (targetRealm) {
                    const destWh = targetRealm.wormholes.find((w) => w.slot === realm.slot) || targetRealm.wormholes[0];
                    targetRealm.hazardManager.spawnHazard(
                      b.powerupType,
                      destWh,
                      targetRealm.botShip,
                      targetRealm.missiles
                    );
                  }
                }
              } else {
                wh.absorbDamage(b.damage, realm.powerups, realm.particles, sound, {
                  hasRetros: realm.botShip.hasRetros,
                  bulletLevel: realm.botShip.bulletLevel,
                  isMaxThrust: realm.botShip.maxThrust >= 11,
                });
              }
              break;
            }
          }
        }

        if (bulletAbsorbed) {
          realm.bullets.splice(i, 1);
        }
      }

      // 6. Update Missiles
      for (let i = realm.missiles.length - 1; i >= 0; i--) {
        const m = realm.missiles[i];
        if (m.isPlayerWeapon) {
          // Bot-fired missile: seeks closest active hostile hazard or enemy wormhole
          let targetX: number | undefined;
          let targetY: number | undefined;
          let bestDist = Infinity;

          for (const h of realm.hazardManager.hazards) {
            if (!h.isAlive) continue;
            const d = Math.hypot(h.x - m.x, h.y - m.y);
            if (d < bestDist) {
              bestDist = d;
              targetX = h.x;
              targetY = h.y;
            }
          }

          if (targetX === undefined) {
            for (const wh of realm.wormholes) {
              if (!wh.isAlive) continue;
              const d = Math.hypot(wh.x - m.x, wh.y - m.y);
              if (d < bestDist) {
                bestDist = d;
                targetX = wh.x;
                targetY = wh.y;
              }
            }
          }

          if (!m.update(dt, targetX, targetY)) {
            realm.missiles.splice(i, 1);
            continue;
          }

          let missileDestroyed = false;
          for (const h of realm.hazardManager.hazards) {
            if (!h.isAlive) continue;
            const r = (h as unknown as { radius?: number }).radius || 15;
            if (Collision.testCircleCircle(m.x, m.y, 6, h.x, h.y, r)) {
              h.takeDamage(m.damage, realm.particles, sound);
              realm.particles.createExplosion(m.x, m.y, '#ffaa00', 16);
              realm.missiles.splice(i, 1);
              missileDestroyed = true;
              break;
            }
          }
          if (missileDestroyed) continue;

          if (m.wormholeImmunity <= 0) {
            for (const wh of realm.wormholes) {
              if (!wh.isAlive) continue;
              const dist = Math.hypot(wh.x - m.x, wh.y - m.y);
              if (dist < 35) {
                wh.absorbDamage(m.damage, realm.powerups, realm.particles, sound);
                realm.particles.createExplosion(m.x, m.y, '#00ffcc', 16);
                realm.missiles.splice(i, 1);
                break;
              }
            }
          }
        } else {
          // Hostile hazard missile: tracks bot ship (never collides with or damages wormholes)
          if (!m.update(dt, realm.botShip.isAlive ? realm.botShip.x : undefined, realm.botShip.isAlive ? realm.botShip.y : undefined)) {
            realm.missiles.splice(i, 1);
            continue;
          }

          if (realm.botShip.isAlive && Collision.testCircleCircle(m.x, m.y, 6, realm.botShip.x, realm.botShip.y, 16)) {
            realm.botShip.takeDamage(m.damage, realm.particles, sound, { weapon: 'Heat Seeker' });
            realm.particles.createExplosion(m.x, m.y, '#ffaa00', 16);
            realm.missiles.splice(i, 1);
            continue;
          }
        }
      }

      // 7. Update Particles
      realm.particles.update(dt);
    }
  }

  public drawMiniView(
    renderer: VectorRenderer,
    x: number,
    y: number,
    w: number,
    h: number,
    targetSlot = 1,
    showAiBrainOverlay = false,
    overrideColor?: string
  ): void {
    const ctx = renderer.ctx;
    ctx.save();

    // Clipping region for Mini-Cam
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // Background
    ctx.fillStyle = 'rgba(5, 7, 15, 0.95)';
    ctx.fillRect(x, y, w, h);

    const realm = this.botRealms.get(targetSlot) || (this.botRealms.size > 0 ? this.botRealms.values().next().value : null);

    if (!realm && !this.isRemotePlayer) {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      // Arena outline in standby
      const scale = w / (this.arenaBound * 2 + 80);
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(scale, scale);
      const half = this.arenaBound + 20;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-half, -half, half * 2, half * 2);
      ctx.restore();

      // Standby text
      ctx.font = '900 11px Orbitron, sans-serif';
      ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('STANDBY // NO OPPONENT', x + w / 2, y + h / 2 - 8);
      ctx.font = '600 9px Orbitron, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('WAITING FOR PILOT OR + BOT', x + w / 2, y + h / 2 + 10);
      ctx.restore();
      return;
    }

    const defaultBorder = (PLAYER_COLORS[targetSlot % PLAYER_COLORS.length] || PLAYER_COLORS[1]).primary;
    const borderColor = overrideColor || (this.isRemotePlayer ? '#00ffcc' : defaultBorder);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Disable glow temporarily for ultra-fast sub-viewport rendering
    const prevGlow = renderer.options.enableGlow;
    renderer.options.enableGlow = false;

    // Transform coordinate system to opponent realm
    const scale = w / (this.arenaBound * 2 + 80);
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(scale, scale);

    // Arena perimeter outline
    const half = this.arenaBound + 20;
    ctx.strokeStyle = `${borderColor}66`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-half, -half, half * 2, half * 2);

    // Wormhole Orbital Ring
    const orbitDist = this.orbitDistance || 270;
    ctx.save();
    ctx.strokeStyle = `${borderColor}38`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, orbitDist, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (realm) {
      // Wormholes (only active living wormholes)
      for (const wh of (realm.wormholes || [realm.wormholeToPlayer1])) {
        if (wh.isAlive) {
          wh.draw(renderer);
        }
      }

      // Hazards
      realm.hazardManager.draw(renderer);

      // Powerups
      for (const pup of realm.powerups) {
        pup.draw(renderer);
      }

      // Bullets & Missiles
      for (const b of realm.bullets) {
        b.draw(renderer);
      }
      for (const m of realm.missiles) {
        m.draw(renderer);
      }

      // Bot Ship
      realm.botShip.draw(renderer);

      // AI Brain Debug Overlay
      if (showAiBrainOverlay && realm.botShip.isAlive) {
        realm.botController.drawDebug(renderer, realm.botShip);
      }
    }

    for (const rb of this.remoteBullets) {
      renderer.drawGlowCircle(rb.x, rb.y, 3, rb.color, rb.color, 1, true, rb.color);
    }

    if (this.isRemotePlayer && !realm) {
      this.botShip.draw(renderer);
    }

    renderer.options.enableGlow = prevGlow;
    ctx.restore();

    // Title label
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = this.isRemotePlayer ? '#00ffcc' : borderColor;
    ctx.fillText(
      this.isRemotePlayer
        ? 'REALM 2 // REMOTE HUMAN'
        : `REALM ${targetSlot + 1} // ${realm?.botShip?.compiled?.config?.name?.toUpperCase() || 'OPPONENT'}`,
      x + 8,
      y + 14
    );
    ctx.restore();
  }
}

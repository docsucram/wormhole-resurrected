import { PlayerShip } from '../PlayerShip';
import { Wormhole } from '../Wormhole';
import { Powerup } from '../Powerup';
import { Bullet } from '../Bullet';
import { Hazard } from '../hazards/Hazard';
import { InputState } from '../../core/InputManager';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  thinkInterval: number;
  reactionDelay: number;
  aimErrorRad: number;
  deadZone: number;
  powerupPerceptionRadius: number;
  hazardEngagementRadius: number;
  launchCooldownTime: number;
  specialAbilityChance: number;
}

const DIFFICULTY_CONFIGS: Record<BotDifficulty, DifficultyConfig> = {
  easy: {
    thinkInterval: 0.16,
    reactionDelay: 0.50,
    aimErrorRad: 0.18,
    deadZone: 0.08,
    powerupPerceptionRadius: 240,
    hazardEngagementRadius: 240,
    launchCooldownTime: 4.5,
    specialAbilityChance: 0.45,
  },
  medium: {
    thinkInterval: 0.08,
    reactionDelay: 0.25,
    aimErrorRad: 0.08,
    deadZone: 0.045,
    powerupPerceptionRadius: 360,
    hazardEngagementRadius: 340,
    launchCooldownTime: 3.0,
    specialAbilityChance: 0.85,
  },
  hard: {
    thinkInterval: 0.04,
    reactionDelay: 0.10,
    aimErrorRad: 0.02,
    deadZone: 0.025,
    powerupPerceptionRadius: 520,
    hazardEngagementRadius: 480,
    launchCooldownTime: 1.8,
    specialAbilityChance: 1.0,
  },
};

export class BotController {
  public difficulty: BotDifficulty = 'medium';
  public isEnabled = true;

  private thinkTimer = 0;
  private launchCooldown = 0;
  private targetWormholeIndex = 0;
  private totalTime = 0;
  private inventoryHoldTimer = 0;
  private lastInventoryCount = 0;
  private currentInput: InputState = {
    up: false,
    left: false,
    right: false,
    fire: false,
    secondaryFire: false,
    tertiaryFire: false,
  };

  private targetAngle = 0;
  private seenHazardTimestamps: Map<Hazard, number> = new Map();

  constructor(difficulty: BotDifficulty = 'medium') {
    this.difficulty = difficulty;
    this.launchCooldown = 1.0 + Math.random() * 2.0;
  }

  public update(
    dt: number,
    botShip: PlayerShip,
    wormholes: Wormhole[],
    powerups: Powerup[],
    bullets: Bullet[],
    hazards: Hazard[] = [],
    mines: Hazard[] = []
  ): InputState {
    if (!this.isEnabled || !botShip.isAlive) {
      return {
        up: false,
        left: false,
        right: false,
        fire: false,
        secondaryFire: false,
        tertiaryFire: false,
      };
    }

    this.totalTime += dt;

    if (this.launchCooldown > 0) {
      this.launchCooldown -= dt;
    }

    // Track inventory changes & hold timer
    const currentInvCount = botShip.powerupInventory.length;
    if (currentInvCount > this.lastInventoryCount) {
      // Just collected a new offensive hazard! Reset 8s timer
      this.inventoryHoldTimer = 0;
    } else if (currentInvCount >= 3) {
      this.inventoryHoldTimer += dt;
    } else {
      this.inventoryHoldTimer = 0;
    }
    this.lastInventoryCount = currentInvCount;

    const allThreats = [...hazards, ...mines];

    // Clean up dead hazards from reaction tracking
    for (const [h] of this.seenHazardTimestamps) {
      if (!h.isAlive) {
        this.seenHazardTimestamps.delete(h);
      }
    }

    // Track newly emerged hazards
    for (const h of allThreats) {
      if (h.isAlive && !this.seenHazardTimestamps.has(h)) {
        this.seenHazardTimestamps.set(h, this.totalTime);
      }
    }

    const cfg = DIFFICULTY_CONFIGS[this.difficulty] || DIFFICULTY_CONFIGS.medium;

    this.thinkTimer -= dt;
    if (this.thinkTimer <= 0) {
      this.thinkTimer = cfg.thinkInterval;
      this.decideStrategy(botShip, wormholes, powerups, bullets, allThreats, cfg);
    }

    // Smooth steering towards targetAngle
    let angleDiff = this.targetAngle - botShip.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    this.currentInput.left = angleDiff < -cfg.deadZone;
    this.currentInput.right = angleDiff > cfg.deadZone;

    return { ...this.currentInput };
  }

  private isPowerupInFiringLine(
    botShip: PlayerShip,
    powerups: Powerup[],
    targetAngle: number,
    maxDistance = 450
  ): boolean {
    const safetyCone = 0.32; // ~18 degrees safety cone
    for (const pup of powerups) {
      if (!pup.isAlive) continue;
      const dx = pup.x - botShip.x;
      const dy = pup.y - botShip.y;
      const dist = Math.hypot(dx, dy);
      if (dist > maxDistance) continue;

      const pupAngle = Math.atan2(dy, dx);
      let diff = pupAngle - targetAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (Math.abs(diff) < safetyCone) {
        return true; // Powerup is in danger of being shot!
      }
    }
    return false;
  }

  /**
   * Checks if an obstacle (like a giant Inflator, Asteroid, or Mine) blocks the direct flight path.
   * If blocked, returns a tangent detour angle around the obstacle.
   */
  private findClearNavigationAngle(
    botShip: PlayerShip,
    targetX: number,
    targetY: number,
    hazards: Hazard[]
  ): number {
    const dx = targetX - botShip.x;
    const dy = targetY - botShip.y;
    const targetDist = Math.hypot(dx, dy);
    const directAngle = Math.atan2(dy, dx);
    if (targetDist < 30) return directAngle;

    const travelDirX = dx / targetDist;
    const travelDirY = dy / targetDist;

    for (const h of hazards) {
      if (!h.isAlive || h.powerupType === 16) continue;
      const toHazX = h.x - botShip.x;
      const toHazY = h.y - botShip.y;
      const hazDist = Math.hypot(toHazX, toHazY);

      if (hazDist > targetDist + 50) continue;

      // Project hazard onto travel vector
      const projection = toHazX * travelDirX + toHazY * travelDirY;

      if (projection > 0 && projection < targetDist) {
        // Perpendicular distance from hazard to travel line
        const perpDist = Math.abs(toHazX * travelDirY - toHazY * travelDirX);
        const requiredClearance = h.radius + 38;

        if (perpDist < requiredClearance) {
          // Obstacle blocks flight corridor! Calculate tangent detour
          const hazAngle = Math.atan2(toHazY, toHazX);
          const side = (toHazX * travelDirY - toHazY * travelDirX) >= 0 ? -1 : 1;
          return hazAngle + (side * (Math.PI / 2.3));
        }
      }
    }
    return directAngle;
  }

  private decideStrategy(
    botShip: PlayerShip,
    wormholes: Wormhole[],
    powerups: Powerup[],
    bullets: Bullet[],
    hazards: Hazard[],
    cfg: DifficultyConfig
  ): void {
    // Reset inputs
    this.currentInput.fire = false;
    this.currentInput.secondaryFire = false;
    this.currentInput.tertiaryFire = false;
    this.currentInput.up = false;

    const bound = 370;

    // 1. EMERGENCY: Evade perimeter walls & corners
    if (Math.abs(botShip.x) > bound || Math.abs(botShip.y) > bound) {
      this.targetAngle = Math.atan2(-botShip.y, -botShip.x);
      this.currentInput.up = true;
      return;
    }

    // 2. EMERGENCY: Evade hostile incoming bullets
    for (const b of bullets) {
      if (b.ownerSlot !== botShip.slot) {
        const dist = Math.hypot(b.x - botShip.x, b.y - botShip.y);
        if (dist < 110) {
          const bAngle = Math.atan2(botShip.y - b.y, botShip.x - b.x);
          this.targetAngle = bAngle + Math.PI / 2;
          this.currentInput.up = true;
          return;
        }
      }
    }

    // 2.5 EMERGENCY: Evade lethal collision with giant hazards (Inflators, Asteroids, Mines, Puds)
    for (const h of hazards) {
      if (!h.isAlive || h.powerupType === 16) continue;
      const dist = Math.hypot(h.x - botShip.x, h.y - botShip.y);
      const safeDist = h.radius + (this.difficulty === 'hard' ? 55 : 40);
      if (dist < safeDist) {
        // Immediate escape vector directly away from hazard body
        this.targetAngle = Math.atan2(botShip.y - h.y, botShip.x - h.x);
        this.currentInput.up = true;
        // Fire into the hazard while backing away to pop or shrink it
        if (!this.isPowerupInFiringLine(botShip, powerups, this.targetAngle, dist)) {
          this.currentInput.fire = true;
        }
        return;
      }
    }

    // 3. TACTICAL SPECIAL ABILITY ACTIVATION (tertiaryFire)
    if (botShip.specialCooldown <= 0 && Math.random() < cfg.specialAbilityChance) {
      // Turtle (1): Turtle Cannon defensive blast when swarmed or low HP
      if (botShip.specialType === 1) {
        const nearThreats = hazards.filter((h) => h.isAlive && Math.hypot(h.x - botShip.x, h.y - botShip.y) < 180);
        if (nearThreats.length >= 2 || botShip.health <= 60) {
          this.currentInput.tertiaryFire = true;
        }
      }
      // ShapeShifter (2): Phase shift when under heavy fire
      else if (botShip.specialType === 2) {
        const hostileBulletsNear = bullets.filter((b) => b.ownerSlot !== botShip.slot && Math.hypot(b.x - botShip.x, b.y - botShip.y) < 120);
        if (hostileBulletsNear.length >= 2) {
          this.currentInput.tertiaryFire = true;
        }
      }
      // HeatSeeker (3): Launch salvo if target aligned
      else if (botShip.specialType === 3 && botShip.heatSeekerRounds > 0) {
        const targetThreat = hazards.find((h) => h.isAlive && Math.hypot(h.x - botShip.x, h.y - botShip.y) < 320);
        if (targetThreat || wormholes.length > 0) {
          this.currentInput.tertiaryFire = true;
        }
      }
      // Flagship (4): Activate tractor beam if powerups exist in arena
      else if (botShip.specialType === 4 && powerups.length > 0 && !botShip.isAttractorActive) {
        this.currentInput.tertiaryFire = true;
      }
    }

    // 4. POWERUP HARVESTING (High Priority! Intercept moving powerups with trajectory lead)
    const validPowerups = powerups.filter((p) => p.isAlive);
    if (validPowerups.length > 0) {
      let bestPup: Powerup | null = null;
      let bestScore = -Infinity;

      for (const pup of validPowerups) {
        const dist = Math.hypot(pup.x - botShip.x, pup.y - botShip.y);
        if (dist > cfg.powerupPerceptionRadius) continue;

        let score = 500 - dist;

        // Urgent health / defensive pickups when damaged
        const healthPct = botShip.health / (botShip.maxHealth || 200);
        if (healthPct < 0.60) {
          if (pup.type === 5) score += 400; // +HP
          if (pup.type === 3) score += 300; // SHIELD
          if (pup.type === 4) score += 350; // ZAP
        }

        // Essential ship upgrades
        if (pup.type === 0 && (botShip.bulletLevel ?? 1) < 3) score += 180; // GUN
        if (pup.type === 1) score += 120; // THRUST
        if (pup.type === 2 && !botShip.hasRetros) score += 200; // RETROS

        // Intercept powerup if a Scarab (hazard type 17) is heading for it
        const competingScarab = hazards.find((h) => h.isAlive && h.powerupType === 17 && Math.hypot(h.x - pup.x, h.y - pup.y) < 220);
        if (competingScarab) score += 250;

        if (score > bestScore) {
          bestScore = score;
          bestPup = pup;
        }
      }

      if (bestPup) {
        const rawDist = Math.hypot(bestPup.x - botShip.x, bestPup.y - botShip.y);
        const currentSpeed = Math.hypot(botShip.vx, botShip.vy);

        // Calculate trajectory intercept point for moving powerups
        const leadWeight = this.difficulty === 'hard' ? 1.0 : this.difficulty === 'medium' ? 0.6 : 0.0;
        const leadFrames = Math.min(rawDist / Math.max(currentSpeed, 4.5), 35.0) * leadWeight;
        const targetX = bestPup.x + (bestPup.vx || 0) * leadFrames;
        const targetY = bestPup.y + (bestPup.vy || 0) * leadFrames;

        // Path around any obstacle hazards blocking the way to the intercept point
        this.targetAngle = this.findClearNavigationAngle(botShip, targetX, targetY, hazards);

        // Retro Braking: If bot has retros and is close, release thrust to stop drifting past it
        if (botShip.hasRetros && rawDist < 70 && currentSpeed > 1.8) {
          this.currentInput.up = false;
        } else if (rawDist > 35 || currentSpeed < 2.0) {
          this.currentInput.up = true;
        }

        // STRICT TRIGGER DISCIPLINE: Never shoot when pursuing powerups!
        this.currentInput.fire = false;
        return;
      }
    }

    // 5. DEFEND AGAINST HOSTILE HAZARDS & CLEAR MINEFIELDS
    if (hazards.length > 0) {
      let targetHazard: Hazard | null = null;
      let minThreatDist = Infinity;

      for (const h of hazards) {
        if (!h.isAlive || h.powerupType === 16) continue;

        // Mines (Type 8) have high clearance priority if nearby
        const isMine = h.powerupType === 8;
        const maxRange = isMine ? 240 : cfg.hazardEngagementRadius;

        // Human-like Target Acquisition Reaction Delay
        const firstSeen = this.seenHazardTimestamps.get(h) ?? this.totalTime;
        if (this.totalTime - firstSeen < (isMine ? cfg.reactionDelay * 0.5 : cfg.reactionDelay)) {
          continue; // Has not reacted to this newly emerged hazard yet!
        }

        // AI ignores Nuke in its first 2 seconds
        if (h.powerupType === 14) {
          const nukeObj = h as unknown as { countdown?: number };
          if (nukeObj.countdown !== undefined && nukeObj.countdown > 6.0) {
            continue;
          }
        }

        const d = Math.hypot(h.x - botShip.x, h.y - botShip.y);
        if (d < maxRange && d < minThreatDist) {
          minThreatDist = d;
          targetHazard = h;
        }
      }

      if (targetHazard) {
        const bulletSpeed = 12.0;
        const timeToHit = minThreatDist / (bulletSpeed * 60);
        const hazObj = targetHazard as unknown as { vx?: number; vy?: number };
        const leadX = targetHazard.x + (hazObj.vx || 0) * timeToHit * 60;
        const leadY = targetHazard.y + (hazObj.vy || 0) * timeToHit * 60;

        const baseAngle = Math.atan2(leadY - botShip.y, leadX - botShip.x);

        // Add difficulty-scaled aim jitter (smooth human hand tremor)
        const jitter = Math.sin(this.totalTime * 4.0 + (botShip.slot || 1)) * cfg.aimErrorRad;
        this.targetAngle = baseAngle + jitter;

        let angleDiff = this.targetAngle - botShip.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (minThreatDist > 160) {
          this.currentInput.up = true;
        }

        // Fire if aligned and NO powerups are in line-of-fire
        if (Math.abs(angleDiff) < 0.35 && minThreatDist < cfg.hazardEngagementRadius) {
          if (!this.isPowerupInFiringLine(botShip, powerups, botShip.angle, minThreatDist)) {
            this.currentInput.fire = true;
          }
        }
        return;
      }
    }

    // 6. LAUNCH STORED HAZARDS: Stockpile and burst launch into opponent wormholes
    const invCount = botShip.powerupInventory.length;
    let shouldLaunch = false;

    if (invCount > 0 && wormholes.length > 0 && this.launchCooldown <= 0) {
      if (this.difficulty === 'hard') {
        // Hard AI aims to stockpile 5 items, but launches if 3+ held for 8 seconds, or if full (5), or no powerups left in arena
        if (invCount >= 5) {
          shouldLaunch = true;
        } else if (invCount >= 3 && this.inventoryHoldTimer >= 8.0) {
          shouldLaunch = true;
        } else if (invCount >= 1 && validPowerups.length === 0 && this.inventoryHoldTimer >= 10.0) {
          shouldLaunch = true;
        }
      } else if (this.difficulty === 'medium') {
        if (invCount >= 3 || (invCount >= 2 && this.inventoryHoldTimer >= 6.0) || (invCount >= 1 && validPowerups.length === 0)) {
          shouldLaunch = true;
        }
      } else {
        // Easy AI launches as soon as it has an item
        shouldLaunch = true;
      }

      if (shouldLaunch) {
        const whIndex = this.targetWormholeIndex % wormholes.length;
        const wh = wormholes[whIndex];
        const directAngle = this.findClearNavigationAngle(botShip, wh.x, wh.y, hazards);
        const dist = Math.hypot(wh.x - botShip.x, wh.y - botShip.y);

        this.targetAngle = directAngle;
        let angleDiff = this.targetAngle - botShip.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (dist > 200) {
          this.currentInput.up = true;
        }

        if (Math.abs(angleDiff) < 0.25 && dist < 400) {
          this.currentInput.secondaryFire = true;
          this.currentInput.fire = false;
          // Rapid volley fire rate for stockpiled barrage
          this.launchCooldown = this.difficulty === 'hard' ? 0.35 : this.difficulty === 'medium' ? 0.50 : 1.2;
          if (invCount <= 1) {
            this.launchCooldown = cfg.launchCooldownTime;
            this.targetWormholeIndex = (this.targetWormholeIndex + 1) % wormholes.length;
            this.inventoryHoldTimer = 0;
          }
        }
        return;
      }
    }

    // 7. ATTACK ORBITAL WORMHOLE: Shoot primary lasers to spawn fresh powerups
    if (wormholes.length > 0) {
      const wh = wormholes[this.targetWormholeIndex % wormholes.length] || wormholes[0];
      const dist = Math.hypot(wh.x - botShip.x, wh.y - botShip.y);

      this.targetAngle = this.findClearNavigationAngle(botShip, wh.x, wh.y, hazards);
      let angleDiff = this.targetAngle - botShip.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      if (dist > 220) {
        this.currentInput.up = true;
      }

      // Fire at wormhole only if safe and aligned
      if (Math.abs(angleDiff) < 0.28 && dist < 420) {
        if (!this.isPowerupInFiringLine(botShip, powerups, botShip.angle, dist)) {
          this.currentInput.fire = true;
        }
      }
      return;
    }

    // 8. GRACEFUL ORBITAL PATROL
    this.targetAngle += (Math.random() - 0.5) * 0.3;
    this.currentInput.up = true;
  }
}


import { PlayerShip } from '../PlayerShip';
import { Wormhole } from '../Wormhole';
import { Powerup } from '../Powerup';
import { Bullet } from '../Bullet';
import { Hazard } from '../hazards/Hazard';
import { InputState } from '../../core/InputManager';

export type BotDifficulty = 'easy' | 'medium' | 'hard' | 'insane';

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
  insane: {
    thinkInterval: 0.016, // 60 FPS frame-perfect thinking
    reactionDelay: 0.02,  // Superhuman near-instant reflex
    aimErrorRad: 0.005,   // Pinpoint rail-lock accuracy
    deadZone: 0.012,      // Ultra-crisp steering responsiveness
    powerupPerceptionRadius: 750,
    hazardEngagementRadius: 550,
    launchCooldownTime: 1.0,
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
  private isUnloadingBarrage = false;
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
    const validPowerups = powerups.filter((p) => p.isAlive);

    if (currentInvCount > this.lastInventoryCount) {
      // Just collected a new offensive hazard! Reset timer
      this.inventoryHoldTimer = 0;
    } else if (currentInvCount >= 3) {
      this.inventoryHoldTimer += dt;
    } else {
      this.inventoryHoldTimer = 0;
    }
    this.lastInventoryCount = currentInvCount;

    // Manage continuous barrage state: once triggered, keep firing until 0 held
    if (currentInvCount === 0) {
      this.isUnloadingBarrage = false;
    } else if (this.difficulty === 'hard' || this.difficulty === 'insane') {
      if (currentInvCount >= 5 || (currentInvCount >= 3 && this.inventoryHoldTimer >= 6.0) || (currentInvCount >= 1 && validPowerups.length === 0 && this.inventoryHoldTimer >= 6.0)) {
        this.isUnloadingBarrage = true;
      }
    } else if (this.difficulty === 'medium') {
      if (currentInvCount >= 3 || (currentInvCount >= 2 && this.inventoryHoldTimer >= 6.0) || (currentInvCount >= 1 && validPowerups.length === 0)) {
        this.isUnloadingBarrage = true;
      }
    } else {
      this.isUnloadingBarrage = currentInvCount > 0;
    }

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
          const clearanceAngle = h.powerupType === 10 ? (Math.PI / 2.0) : (Math.PI / 2.3);
          return hazAngle + (side * clearanceAngle);
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

    // 2.4 EMERGENCY: Evade Imminent Nuke Blast Wave
    if (this.difficulty === 'hard' || this.difficulty === 'insane') {
      for (const h of hazards) {
        if (!h.isAlive || h.powerupType !== 14) continue;
        const nukeObj = h as unknown as { countdown?: number };
        if (nukeObj.countdown !== undefined && nukeObj.countdown <= 3.2) {
          const dist = Math.hypot(h.x - botShip.x, h.y - botShip.y);
          if (dist < 460) {
            // Immediate escape vector directly away from detonating nuclear core
            this.targetAngle = Math.atan2(botShip.y - h.y, botShip.x - h.x);
            this.currentInput.up = true;
            this.currentInput.fire = false;
            return;
          }
        }
      }
    }

    // 2.5 EMERGENCY: Evade lethal collision with giant hazards (Inflators, Asteroids, Mines, Puds)
    for (const h of hazards) {
      if (!h.isAlive || h.powerupType === 16) continue;
      const dist = Math.hypot(h.x - botShip.x, h.y - botShip.y);
      const safeDist = h.radius + (h.powerupType === 10 ? 85 : (this.difficulty === 'insane' ? 70 : this.difficulty === 'hard' ? 55 : 40));
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

    // 2.6 PREDICTIVE RAMMING ANTICIPATION & DEFENSIVE EVASION (Insane & Hard AI)
    // Projects forward flight trajectory 20-30 frames to detect impending collisions with Mines, Inflators, Puds, and Asteroids.
    // Uses rapid pulse fire to pop the threat and tangent thrust bursts to divert around it.
    if (this.difficulty === 'insane' || this.difficulty === 'hard') {
      const currentSpeed = Math.hypot(botShip.vx, botShip.vy);
      const lookAheadDist = Math.max(100, currentSpeed * 24);

      for (const h of hazards) {
        if (!h.isAlive || h.powerupType === 16) continue;
        const toHazX = h.x - botShip.x;
        const toHazY = h.y - botShip.y;
        const hazDist = Math.hypot(toHazX, toHazY);

        if (hazDist > lookAheadDist + h.radius + 40) continue;

        // Project hazard onto velocity vector
        const travelDirX = currentSpeed > 0.5 ? botShip.vx / currentSpeed : Math.cos(botShip.angle);
        const travelDirY = currentSpeed > 0.5 ? botShip.vy / currentSpeed : Math.sin(botShip.angle);
        const projection = toHazX * travelDirX + toHazY * travelDirY;

        if (projection > 0 && projection < lookAheadDist) {
          const perpDist = Math.abs(toHazX * travelDirY - toHazY * travelDirX);
          const collisionMargin = h.radius + (this.difficulty === 'insane' ? 38 : 28);

          if (perpDist < collisionMargin) {
            // Imminent impact trajectory detected!
            const hazAngle = Math.atan2(toHazY, toHazX);
            const side = (toHazX * travelDirY - toHazY * travelDirX) >= 0 ? -1 : 1;

            // 1. Evasive steering & thrust burst: veer tangent to hazard
            this.targetAngle = hazAngle + (side * (Math.PI / 2.1));
            this.currentInput.up = true;

            // 2. Retro braking if drifting dangerously fast right at it
            if (botShip.hasRetros && hazDist < h.radius + 60 && currentSpeed > 2.0) {
              this.currentInput.up = false;
            }

            // 3. Defensive weapon blast: if ship is aimed near the obstacle, fire pulse cannons to pop it before impact!
            let aimDiff = hazAngle - botShip.angle;
            while (aimDiff < -Math.PI) aimDiff += Math.PI * 2;
            while (aimDiff > Math.PI) aimDiff -= Math.PI * 2;

            if (Math.abs(aimDiff) < 0.45 && !this.isPowerupInFiringLine(botShip, powerups, botShip.angle, hazDist)) {
              this.currentInput.fire = true;
            }
            return;
          }
        }
      }
    }

    // 3. HIGH PRIORITY COMBAT THREAT: Active Inflator Suppression & Destruction
    // Inflators (Type 10) expand continuously and will overwhelm the arena if left unchecked.
    // Lock on, maintain safe standoff distance (160px - 240px), and pump sustained laser fire until destroyed!
    const activeInflator = hazards.find(
      (h) => h.isAlive && h.powerupType === 10 && Math.hypot(h.x - botShip.x, h.y - botShip.y) < 480
    );

    if (activeInflator) {
      const infDist = Math.hypot(activeInflator.x - botShip.x, activeInflator.y - botShip.y);
      const toInfAngle = Math.atan2(activeInflator.y - botShip.y, activeInflator.x - botShip.x);

      // Add difficulty-calibrated aim precision
      const jitter = Math.sin(this.totalTime * 4.0 + (botShip.slot || 1)) * (cfg.aimErrorRad * 0.35);
      this.targetAngle = toInfAngle + jitter;

      let angleDiff = this.targetAngle - botShip.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      // Safe standoff distance kiting: keep 160-240px distance
      const minSafeDistance = Math.max(160, activeInflator.radius + 75);
      if (infDist < minSafeDistance) {
        // Too close to expanding inflator! Back away while keeping distance
        this.targetAngle = Math.atan2(botShip.y - activeInflator.y, botShip.x - activeInflator.x);
        this.currentInput.up = true;
      } else if (infDist > minSafeDistance + 60) {
        // Approach into optimal laser range
        this.currentInput.up = true;
      } else {
        // In sweet spot range: maintain steady firing stance
        this.currentInput.up = false;
      }

      // Continuously fire pulse cannons into the inflator until it is completely popped
      if (Math.abs(angleDiff) < 0.45) {
        if (!this.isPowerupInFiringLine(botShip, powerups, botShip.angle, infDist)) {
          this.currentInput.fire = true;
        }
      }
      return;
    }

    // 4. TACTICAL SPECIAL ABILITY ACTIVATION (tertiaryFire)
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

    // 4. POWERUP HARVESTING VS WORMHOLE SHOOTING
    // Hard & Insane AI Rule: If there are fewer than 6 powerups in the arena, prioritize shooting the opponent wormhole
    // to extract a flood of powerups rather than chasing down individual ones (unless needing emergency HP).
    const validPowerups = powerups.filter((p) => p.isAlive);
    const isApexAi = this.difficulty === 'hard' || this.difficulty === 'insane';
    const isLowHealth = botShip.health < botShip.maxHealth * 0.50;
    const hasHealthPowerup = validPowerups.some((p) => p.type === 5);
    const needsUrgentHealth = isLowHealth && hasHealthPowerup;
    const preferShootingWormhole = isApexAi && validPowerups.length < 6 && !needsUrgentHealth && wormholes.length > 0;

    if (!this.isUnloadingBarrage && !preferShootingWormhole && validPowerups.length > 0) {
      let bestPup: Powerup | null = null;
      let bestScore = -Infinity;
      const activeThreatCount = hazards.filter((h) => h.isAlive && h.powerupType !== 16).length;

      for (const pup of validPowerups) {
        const dist = Math.hypot(pup.x - botShip.x, pup.y - botShip.y);
        if (dist > cfg.powerupPerceptionRadius) continue;

        // Rule: DO NOT go for health (+HP, type 5) if already at full health!
        if (pup.type === 5 && botShip.health >= botShip.maxHealth) {
          continue;
        }

        // Rule: DO NOT go for ZAP (type 4) if there are no enemies/hazards in the arena!
        if (pup.type === 4 && activeThreatCount === 0) {
          continue;
        }

        let score = 500 - dist;

        // Urgent health / defensive pickups when damaged
        const healthPct = botShip.health / (botShip.maxHealth || 200);
        if (healthPct < 0.60) {
          if (pup.type === 5) {
            // Insane AI focuses aggressively on health when low
            score += this.difficulty === 'insane' ? 2500 : 450;
          }
          if (pup.type === 3) score += 300; // SHIELD
          if (pup.type === 4 && activeThreatCount > 0) score += 350; // ZAP
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
        const leadWeight = this.difficulty === 'insane' ? 1.4 : this.difficulty === 'hard' ? 1.0 : this.difficulty === 'medium' ? 0.6 : 0.0;
        const leadFrames = Math.min(rawDist / Math.max(currentSpeed, 4.5), 38.0) * leadWeight;
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

    // 5. DEFEND AGAINST HOSTILE HAZARDS & CLEAR MINEFIELDS / MINELAYERS
    if (hazards.length > 0) {
      let targetHazard: Hazard | null = null;
      let minThreatDist = Infinity;

      for (const h of hazards) {
        if (!h.isAlive || h.powerupType === 16) continue;

        const isMine = h.powerupType === 8;
        const isMineLayer = h.powerupType === 11;
        const isApex = this.difficulty === 'hard' || this.difficulty === 'insane';

        // Expanded engagement range for MineLayers (crucial to eliminate before arena gets flooded) and Mines
        const maxRange = isMineLayer && isApex ? 480 : isMine ? (isApex ? 320 : 240) : cfg.hazardEngagementRadius;

        // Human-like Target Acquisition Reaction Delay
        const firstSeen = this.seenHazardTimestamps.get(h) ?? this.totalTime;
        if (this.totalTime - firstSeen < ((isMine || isMineLayer) ? cfg.reactionDelay * 0.4 : cfg.reactionDelay)) {
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
        // Weighted threat distance: MineLayers and Mines are prioritized heavily
        const threatScore = isMineLayer ? d * 0.45 : isMine ? d * 0.65 : d;
        if (d < maxRange && threatScore < minThreatDist) {
          minThreatDist = threatScore;
          targetHazard = h;
        }
      }

      if (targetHazard) {
        const actualDist = Math.hypot(targetHazard.x - botShip.x, targetHazard.y - botShip.y);
        const bulletSpeed = 10.0;
        const timeToHit = actualDist / (bulletSpeed * 60);
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

        if (actualDist > 160) {
          this.currentInput.up = true;
        }

        // Fire if aligned and NO powerups are in line-of-fire
        if (Math.abs(angleDiff) < 0.35 && actualDist < cfg.hazardEngagementRadius) {
          if (!this.isPowerupInFiringLine(botShip, powerups, botShip.angle, actualDist)) {
            this.currentInput.fire = true;
          }
        }
        return;
      }
    }

    // 6. LAUNCH STORED HAZARDS: Stockpile and burst launch into opponent wormholes
    const invCount = botShip.powerupInventory.length;
    let shouldLaunch = this.isUnloadingBarrage;

    if (invCount > 0 && wormholes.length > 0) {
      if (!shouldLaunch && this.launchCooldown <= 0) {
        if (this.difficulty === 'insane') {
          shouldLaunch = invCount >= 5 || (invCount >= 3 && this.inventoryHoldTimer >= 5.0) || (invCount >= 1 && validPowerups.length === 0 && this.inventoryHoldTimer >= 5.0);
        } else if (this.difficulty === 'hard') {
          shouldLaunch = invCount >= 5 || (invCount >= 3 && this.inventoryHoldTimer >= 8.0) || (invCount >= 1 && validPowerups.length === 0 && this.inventoryHoldTimer >= 8.0);
        } else if (this.difficulty === 'medium') {
          shouldLaunch = invCount >= 3 || (invCount >= 2 && this.inventoryHoldTimer >= 6.0) || (invCount >= 1 && validPowerups.length === 0);
        } else {
          shouldLaunch = true;
        }
      }

      if (shouldLaunch) {
        this.isUnloadingBarrage = true;
        const whIndex = this.targetWormholeIndex % wormholes.length;
        const wh = wormholes[whIndex];

        // Wormhole orbital velocity & predictive lead calculation
        const whOrbitAngle = Math.atan2(wh.y, wh.x);
        const whSpeed = (wh.orbitRadius || 270) * (22.5 * Math.PI / 180) / 60;
        const whVx = -Math.sin(whOrbitAngle) * whSpeed;
        const whVy = Math.cos(whOrbitAngle) * whSpeed;

        const rawDist = Math.hypot(wh.x - botShip.x, wh.y - botShip.y);
        const isApex = this.difficulty === 'hard' || this.difficulty === 'insane';
        const bulletSpeed = 10.0;
        const timeToHitFrames = isApex ? (rawDist / bulletSpeed) : 0;

        const targetX = wh.x + whVx * timeToHitFrames;
        const targetY = wh.y + whVy * timeToHitFrames;

        this.targetAngle = this.findClearNavigationAngle(botShip, targetX, targetY, hazards);
        let angleDiff = this.targetAngle - botShip.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        // Pacing & Standoff Distance Control (avoid overshooting)
        const toWhDirX = (wh.x - botShip.x) / Math.max(1, rawDist);
        const toWhDirY = (wh.y - botShip.y) / Math.max(1, rawDist);
        const closingVelocity = (botShip.vx - whVx) * toWhDirX + (botShip.vy - whVy) * toWhDirY;

        if (rawDist > 250) {
          this.currentInput.up = true;
        } else if (rawDist < 175) {
          this.currentInput.up = false;
        } else {
          if (closingVelocity > 1.2) {
            this.currentInput.up = false;
          } else if (closingVelocity < -0.6) {
            this.currentInput.up = true;
          }
        }

        if (Math.abs(angleDiff) < (isApex ? 0.35 : 0.28) && rawDist < 440 && rawDist > 120) {
          if (this.launchCooldown <= 0) {
            this.currentInput.secondaryFire = true;
            this.currentInput.fire = false;
            // Rapid-fire sequence to empty all powerups down to 0
            this.launchCooldown = this.difficulty === 'insane' ? 0.16 : this.difficulty === 'hard' ? 0.25 : this.difficulty === 'medium' ? 0.45 : 0.9;
            if (invCount <= 1) {
              this.launchCooldown = cfg.launchCooldownTime;
              this.targetWormholeIndex = (this.targetWormholeIndex + 1) % wormholes.length;
              this.inventoryHoldTimer = 0;
              this.isUnloadingBarrage = false;
            }
          }
        }
        return;
      }
    }

    // 7. ATTACK ORBITAL WORMHOLE: Shoot primary lasers to spawn fresh powerups
    if (wormholes.length > 0) {
      const wh = wormholes[this.targetWormholeIndex % wormholes.length] || wormholes[0];

      // Wormhole orbital velocity & predictive lead calculation
      const whOrbitAngle = Math.atan2(wh.y, wh.x);
      const whSpeed = (wh.orbitRadius || 270) * (22.5 * Math.PI / 180) / 60;
      const whVx = -Math.sin(whOrbitAngle) * whSpeed;
      const whVy = Math.cos(whOrbitAngle) * whSpeed;

      const rawDist = Math.hypot(wh.x - botShip.x, wh.y - botShip.y);
      const isApex = this.difficulty === 'hard' || this.difficulty === 'insane';
      const bulletSpeed = 10.0;
      const timeToHitFrames = isApex ? (rawDist / bulletSpeed) : 0;

      const targetX = wh.x + whVx * timeToHitFrames;
      const targetY = wh.y + whVy * timeToHitFrames;

      this.targetAngle = this.findClearNavigationAngle(botShip, targetX, targetY, hazards);
      let angleDiff = this.targetAngle - botShip.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      // Smart Standoff Distance & Speed Matching:
      // Keep ~180px - 250px standoff distance so the ship continuously paces the orbiting wormhole without overshooting
      const toWhDirX = (wh.x - botShip.x) / Math.max(1, rawDist);
      const toWhDirY = (wh.y - botShip.y) / Math.max(1, rawDist);
      const closingVelocity = (botShip.vx - whVx) * toWhDirX + (botShip.vy - whVy) * toWhDirY;

      if (rawDist > 250) {
        this.currentInput.up = true;
      } else if (rawDist < 175) {
        // Too close to event horizon: release thrust
        this.currentInput.up = false;
      } else {
        // In sweet spot (175px - 250px): match pace with orbiting wormhole
        if (closingVelocity > 1.2) {
          this.currentInput.up = false;
        } else if (closingVelocity < -0.6) {
          this.currentInput.up = true;
        }
      }

      // Fire at wormhole continuously if aligned and safe
      if (Math.abs(angleDiff) < (isApex ? 0.38 : 0.28) && rawDist < 440 && rawDist > 100) {
        if (!this.isPowerupInFiringLine(botShip, powerups, botShip.angle, rawDist)) {
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


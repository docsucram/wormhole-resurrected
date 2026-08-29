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
  private prevHazardPositions: Map<Hazard, { x: number; y: number; time: number; vx: number; vy: number }> = new Map();

  // AI Brain Telemetry & Real-time Debug Vectors
  public debugState = 'IDLE';
  public debugTargetPos: { x: number; y: number } | null = null;
  public debugThreatPos: { x: number; y: number } | null = null;
  public debugThreatRadius = 0;

  // Perimeter avoidance configuration
  public static globalAvoidPerimeter = true;
  public avoidPerimeter = true;

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
      // Medium AI holds until 4 hazards or 3 hazards held for 7.0s
      if (currentInvCount >= 4 || (currentInvCount >= 3 && this.inventoryHoldTimer >= 7.0) || (currentInvCount >= 1 && validPowerups.length === 0 && this.inventoryHoldTimer >= 5.0)) {
        this.isUnloadingBarrage = true;
      }
    } else {
      this.isUnloadingBarrage = currentInvCount > 0;
    }

    const allThreats = [...hazards, ...mines];

    // Clean up dead hazards from reaction tracking & velocity caches
    for (const [h] of this.seenHazardTimestamps) {
      if (!h.isAlive) {
        this.seenHazardTimestamps.delete(h);
      }
    }
    for (const [h] of this.prevHazardPositions) {
      if (!h.isAlive) {
        this.prevHazardPositions.delete(h);
      }
    }

    // Track newly emerged hazards and calculate smoothed velocities
    for (const h of allThreats) {
      if (h.isAlive) {
        if (!this.seenHazardTimestamps.has(h)) {
          this.seenHazardTimestamps.set(h, this.totalTime);
        }

        const prev = this.prevHazardPositions.get(h);
        let hazVx = (h as any).vx !== undefined ? (h as any).vx : 0;
        let hazVy = (h as any).vy !== undefined ? (h as any).vy : 0;
        if (prev && (h as any).vx === undefined) {
          const dtPos = this.totalTime - prev.time;
          if (dtPos > 0.001) {
            hazVx = (h.x - prev.x) / dtPos;
            hazVy = (h.y - prev.y) / dtPos;
          }
        }
        this.prevHazardPositions.set(h, { x: h.x, y: h.y, time: this.totalTime, vx: hazVx, vy: hazVy });
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

  /**
   * Calculates the exact predictive leading intercept point for moving targets (UFOs, Scarabs, Gunships, etc.)
   */
  private calculatePredictiveIntercept(
    originX: number,
    originY: number,
    targetX: number,
    targetY: number,
    targetVx: number,
    targetVy: number,
    bulletSpeed: number,
    originVx = 0,
    originVy = 0
  ): { x: number; y: number } {
    // Relative velocity accounting for inherited ship velocity (bullets inherit 0.25 of ship velocity)
    const relVx = targetVx - originVx * 0.25;
    const relVy = targetVy - originVy * 0.25;

    const rx = targetX - originX;
    const ry = targetY - originY;
    const targetSpeedSq = relVx * relVx + relVy * relVy;
    const bulletSpeedSq = bulletSpeed * bulletSpeed;

    if (targetSpeedSq < 0.01) {
      return { x: targetX, y: targetY };
    }

    const a = targetSpeedSq - bulletSpeedSq;
    const b = 2 * (rx * relVx + ry * relVy);
    const c = rx * rx + ry * ry;

    let t = 0;
    if (Math.abs(a) < 0.0001) {
      t = Math.max(0, -c / (b || 0.001));
    } else {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const sqrtDisc = Math.sqrt(disc);
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);
        if (t1 > 0 && t2 > 0) t = Math.min(t1, t2);
        else if (t1 > 0) t = t1;
        else if (t2 > 0) t = t2;
      }
    }

    // t is in frames (ticks). Clamp to realistic intercept window of up to 60 frames (1.0 second)
    const fallbackT = Math.hypot(rx, ry) / bulletSpeed;
    const clampedT = Math.max(0, Math.min(t > 0 ? t : fallbackT, 60));
    return {
      x: targetX + targetVx * clampedT,
      y: targetY + targetVy * clampedT,
    };
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
    // Reset inputs & telemetry
    this.currentInput.fire = false;
    this.currentInput.secondaryFire = false;
    this.currentInput.tertiaryFire = false;
    this.currentInput.up = false;

    this.debugState = 'ORBITAL PATROL';
    this.debugTargetPos = null;
    this.debugThreatPos = null;
    this.debugThreatRadius = 0;

    const bound = 370;

    // 1. EMERGENCY: Evade perimeter walls & corners (Easy / Novice ONLY)
    if (this.difficulty === 'easy' && this.avoidPerimeter && BotController.globalAvoidPerimeter) {
      if (Math.abs(botShip.x) > bound || Math.abs(botShip.y) > bound) {
        this.debugState = 'AVOID PERIMETER';
        this.targetAngle = Math.atan2(-botShip.y, -botShip.x);
        this.currentInput.up = true;
        return;
      }
    }

    // 2. EMERGENCY: Evade hostile incoming bullets
    for (const b of bullets) {
      if (b.ownerSlot !== botShip.slot) {
        const dist = Math.hypot(b.x - botShip.x, b.y - botShip.y);
        if (dist < 110) {
          this.debugState = 'EVADE BULLETS';
          this.debugThreatPos = { x: b.x, y: b.y };
          this.debugThreatRadius = 14;
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
            this.debugState = 'EVADE NUKE BLAST';
            this.debugThreatPos = { x: h.x, y: h.y };
            this.debugThreatRadius = 240;
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
      const safeDist = h.radius + (h.powerupType === 10 ? 90 : (this.difficulty === 'insane' ? 75 : this.difficulty === 'hard' ? 65 : this.difficulty === 'medium' ? 55 : 40));
      if (dist < safeDist) {
        this.debugState = `EVADE HAZARD (#${h.powerupType})`;
        this.debugThreatPos = { x: h.x, y: h.y };
        this.debugThreatRadius = h.radius;
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

    // 2.6 PREDICTIVE RAMMING ANTICIPATION & DEFENSIVE EVASION (Insane, Hard, & Medium AI)
    if (this.difficulty === 'insane' || this.difficulty === 'hard' || this.difficulty === 'medium') {
      const currentSpeed = Math.hypot(botShip.vx, botShip.vy);
      const lookAheadFrames = this.difficulty === 'insane' ? 28 : (this.difficulty === 'hard' ? 24 : 18);
      const lookAheadDist = Math.max(85, currentSpeed * lookAheadFrames);

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
          const collisionMargin = h.radius + (this.difficulty === 'insane' ? 38 : this.difficulty === 'hard' ? 30 : 22);

          if (perpDist < collisionMargin) {
            this.debugState = `PREDICTIVE EVADE (#${h.powerupType})`;
            this.debugThreatPos = { x: h.x, y: h.y };
            this.debugThreatRadius = h.radius;
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

    // 3. LAUNCH STORED HAZARDS: Stockpile and burst launch into opponent wormholes (High Priority)
    const invCount = botShip.powerupInventory.length;
    let shouldLaunch = this.isUnloadingBarrage;

    if (invCount > 0 && wormholes.length > 0) {
      if (!shouldLaunch && this.launchCooldown <= 0) {
        if (this.difficulty === 'insane') {
          shouldLaunch = invCount >= 5 || (invCount >= 3 && this.inventoryHoldTimer >= 5.0) || (invCount >= 1 && powerups.length === 0 && this.inventoryHoldTimer >= 5.0);
        } else if (this.difficulty === 'hard') {
          shouldLaunch = invCount >= 5 || (invCount >= 3 && this.inventoryHoldTimer >= 8.0) || (invCount >= 1 && powerups.length === 0 && this.inventoryHoldTimer >= 8.0);
        } else if (this.difficulty === 'medium') {
          shouldLaunch = invCount >= 4 || (invCount >= 3 && this.inventoryHoldTimer >= 7.0) || (invCount >= 1 && powerups.length === 0 && this.inventoryHoldTimer >= 5.0);
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

        this.debugState = `LAUNCH HAZARD (#${botShip.powerupInventory[0]})`;
        this.debugTargetPos = { x: targetX, y: targetY };

        this.targetAngle = this.findClearNavigationAngle(botShip, targetX, targetY, hazards);
        let angleDiff = this.targetAngle - botShip.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (rawDist > 260) {
          this.currentInput.up = true;
        } else if (rawDist < 140) {
          this.currentInput.up = false;
        }

        if (Math.abs(angleDiff) < (isApex ? 0.35 : 0.25) && rawDist < 420 && rawDist > 80) {
          this.currentInput.secondaryFire = true;
          this.launchCooldown = isApex ? 0.25 : (this.difficulty === 'medium' ? 0.45 : 0.70);
          this.targetWormholeIndex = (this.targetWormholeIndex + 1) % wormholes.length;
        }
        return;
      }
    }

    // 4. COMBAT & DESTROY HOSTILE HAZARDS (Prioritized OVER shooting the wormhole for Hard & Insane)
    // 4.1 Active Inflator Suppression & Destruction (Type 10)
    const activeInflator = hazards.find(
      (h) => h.isAlive && h.powerupType === 10 && Math.hypot(h.x - botShip.x, h.y - botShip.y) < 480
    );

    if (activeInflator) {
      this.debugState = 'SUPPRESS INFLATOR';
      this.debugTargetPos = { x: activeInflator.x, y: activeInflator.y };
      this.debugThreatPos = { x: activeInflator.x, y: activeInflator.y };
      this.debugThreatRadius = activeInflator.radius;

      const infDist = Math.hypot(activeInflator.x - botShip.x, activeInflator.y - botShip.y);
      const toInfAngle = Math.atan2(activeInflator.y - botShip.y, activeInflator.x - botShip.x);

      const jitter = Math.sin(this.totalTime * 4.0 + (botShip.slot || 1)) * (cfg.aimErrorRad * 0.35);
      this.targetAngle = toInfAngle + jitter;

      let angleDiff = this.targetAngle - botShip.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      const minSafeDistance = Math.max(160, activeInflator.radius + 75);
      if (infDist < minSafeDistance) {
        this.targetAngle = Math.atan2(botShip.y - activeInflator.y, botShip.x - activeInflator.x);
        this.currentInput.up = true;
      } else if (infDist > minSafeDistance + 60) {
        this.currentInput.up = true;
      } else {
        this.currentInput.up = false;
      }

      if (Math.abs(angleDiff) < 0.45) {
        if (!this.isPowerupInFiringLine(botShip, powerups, botShip.angle, infDist)) {
          this.currentInput.fire = true;
        }
      }
      return;
    }

    // 4.2 Defend against & destroy hostile hazards (MineLayers, Mines, UFOs, Scarabs, Gunships, etc.)
    if (hazards.length > 0) {
      let targetHazard: Hazard | null = null;
      let minThreatDist = Infinity;

      for (const h of hazards) {
        if (!h.isAlive || h.powerupType === 16) continue;

        const isMine = h.powerupType === 8;
        const isMineLayer = h.powerupType === 11;
        const isApex = this.difficulty === 'hard' || this.difficulty === 'insane';

        const maxRange = isMineLayer && isApex ? 520 : isMine ? (isApex ? 340 : 240) : cfg.hazardEngagementRadius;

        const firstSeen = this.seenHazardTimestamps.get(h) ?? this.totalTime;
        if (this.totalTime - firstSeen < ((isMine || isMineLayer) ? cfg.reactionDelay * 0.4 : cfg.reactionDelay)) {
          continue;
        }

        // AI ignores Nuke in its first 2 seconds
        if (h.powerupType === 14) {
          const nukeObj = h as unknown as { countdown?: number };
          if (nukeObj.countdown !== undefined && nukeObj.countdown > 6.0) {
            continue;
          }
        }

        const d = Math.hypot(h.x - botShip.x, h.y - botShip.y);
        const threatScore = isMineLayer ? d * 0.45 : isMine ? d * 0.65 : d;
        if (d < maxRange && threatScore < minThreatDist) {
          minThreatDist = threatScore;
          targetHazard = h;
        }
      }

      if (targetHazard) {
        const actualDist = Math.hypot(targetHazard.x - botShip.x, targetHazard.y - botShip.y);
        const bulletSpeed = 10.0;
        const isApex = this.difficulty === 'hard' || this.difficulty === 'insane';
        const hazData = this.prevHazardPositions.get(targetHazard) || { vx: (targetHazard as any).vx || 0, vy: (targetHazard as any).vy || 0 };

        let leadX = targetHazard.x;
        let leadY = targetHazard.y;

        if (isApex) {
          const intercept = this.calculatePredictiveIntercept(
            botShip.x,
            botShip.y,
            targetHazard.x,
            targetHazard.y,
            hazData.vx,
            hazData.vy,
            bulletSpeed,
            botShip.vx,
            botShip.vy
          );
          leadX = intercept.x;
          leadY = intercept.y;
        } else if (this.difficulty === 'medium') {
          const timeToHit = Math.min(1.0, actualDist / (bulletSpeed * 60));
          leadX = targetHazard.x + hazData.vx * timeToHit * 60;
          leadY = targetHazard.y + hazData.vy * timeToHit * 60;
        }

        this.debugState = `ENGAGE HAZARD (#${targetHazard.powerupType})`;
        this.debugTargetPos = { x: leadX, y: leadY };
        this.debugThreatPos = { x: targetHazard.x, y: targetHazard.y };
        this.debugThreatRadius = targetHazard.radius;

        const baseAngle = Math.atan2(leadY - botShip.y, leadX - botShip.x);
        const jitter = Math.sin(this.totalTime * 4.0 + (botShip.slot || 1)) * cfg.aimErrorRad;
        this.targetAngle = baseAngle + jitter;

        let angleDiff = this.targetAngle - botShip.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        const currentSpeed = Math.hypot(botShip.vx, botShip.vy);
        if (isApex && currentSpeed > 2.0) {
          const moveAngle = Math.atan2(botShip.vy, botShip.vx);
          let travelAimDiff = Math.abs(this.targetAngle - moveAngle);
          while (travelAimDiff > Math.PI) travelAimDiff = Math.abs(travelAimDiff - 2 * Math.PI);

          if (travelAimDiff > 0.75 && actualDist > 130) {
            this.currentInput.up = false;
          } else if (actualDist > 160) {
            this.currentInput.up = true;
          }
        } else if (actualDist > 160) {
          this.currentInput.up = true;
        }

        const fireTolerance = this.difficulty === 'insane' ? 0.20 : (this.difficulty === 'hard' ? 0.28 : 0.35);
        if (Math.abs(angleDiff) < fireTolerance && actualDist < cfg.hazardEngagementRadius) {
          if (!this.isPowerupInFiringLine(botShip, powerups, botShip.angle, actualDist)) {
            this.currentInput.fire = true;
          }
        }
        return;
      }
    }

    // 4.3 Ghost-Pud Punting (Easy / Novice ONLY - disabled for Medium, Hard, Insane)
    if (this.difficulty === 'easy') {
      const activeGhostPud = hazards.find((h) => h.isAlive && h.powerupType === 18);
      if (activeGhostPud && wormholes.length > 0) {
        const targetWh = wormholes[this.targetWormholeIndex % wormholes.length];
        const pudDist = Math.hypot(activeGhostPud.x - botShip.x, activeGhostPud.y - botShip.y);

        if (pudDist < 360) {
          this.debugState = 'PUNT GHOST-PUD';
          this.debugTargetPos = { x: activeGhostPud.x, y: activeGhostPud.y };
          this.debugThreatPos = { x: activeGhostPud.x, y: activeGhostPud.y };
          this.debugThreatRadius = activeGhostPud.radius;

          const toWhAngle = Math.atan2(targetWh.y - activeGhostPud.y, targetWh.x - activeGhostPud.x);
          const standoffDist = 110;
          const alignSpotX = activeGhostPud.x - Math.cos(toWhAngle) * standoffDist;
          const alignSpotY = activeGhostPud.y - Math.sin(toWhAngle) * standoffDist;

          const distToAlignSpot = Math.hypot(alignSpotX - botShip.x, alignSpotY - botShip.y);

          if (distToAlignSpot > 45) {
            this.targetAngle = this.findClearNavigationAngle(botShip, alignSpotX, alignSpotY, hazards);
            this.currentInput.up = true;
          } else {
            const toPudAngle = Math.atan2(activeGhostPud.y - botShip.y, activeGhostPud.x - botShip.x);
            this.targetAngle = toPudAngle;

            let angleDiff = this.targetAngle - botShip.angle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) < 0.28) {
              if (!this.isPowerupInFiringLine(botShip, powerups, botShip.angle, pudDist)) {
                this.currentInput.fire = true;
              }
            }
          }
          return;
        }
      }
    }

    // 5. POWERUP HARVESTING vs WORMHOLE SHOOTING
    // Hard (Ace) and Insane (Cyborg) wait until at least 5-6 powerups spawn in the arena before sweeping the field,
    // unless low health forces an emergency heal or no wormholes exist.
    const allAlivePowerups = powerups.filter((p) => p.isAlive);
    const isApex = this.difficulty === 'hard' || this.difficulty === 'insane';
    const isMedium = this.difficulty === 'medium';
    const isLowHealth = botShip.health < botShip.maxHealth * 0.55;
    const hasEmergencyDefensive = allAlivePowerups.some((p) => (p.type === 3 || p.type === 4 || p.type === 5));
    const needsUrgentHealth = isLowHealth && hasEmergencyDefensive;

    const minPowerupThreshold = this.difficulty === 'insane' ? 6 : (this.difficulty === 'hard' ? 5 : (isMedium ? 4 : 1));
    const shouldHarvestPowerups = (allAlivePowerups.length >= minPowerupThreshold || needsUrgentHealth || wormholes.length === 0);

    if (shouldHarvestPowerups) {
      const visiblePowerups = allAlivePowerups.filter((p) => {
        const d = Math.hypot(p.x - botShip.x, p.y - botShip.y);
        return d < cfg.powerupPerceptionRadius;
      });

      if (visiblePowerups.length > 0) {
        let bestPup: Powerup | null = null;
        let minScore = Infinity;

        for (const pup of visiblePowerups) {
          const d = Math.hypot(pup.x - botShip.x, pup.y - botShip.y);
          let score = d;

          // Cluster / Proximity Bonus: heavily prioritize powerups that are clustered near other powerups
          let clusterBonus = 0;
          for (const other of allAlivePowerups) {
            if (other !== pup) {
              const distToOther = Math.hypot(other.x - pup.x, other.y - pup.y);
              if (distToOther < 180) {
                clusterBonus += (180 - distToOther) * 0.65;
              }
            }
          }
          score -= clusterBonus;

          // Defensive items (Repair, Shield, Zap)
          if (pup.type === 3 || pup.type === 4 || pup.type === 5) {
            score *= (isLowHealth ? 0.35 : 0.65);
          }

          // Avoid powerups sitting dangerously close to deadly hazards
          let nearHazard = false;
          for (const h of hazards) {
            if (h.isAlive && Math.hypot(h.x - pup.x, h.y - pup.y) < (h.radius + 35)) {
              nearHazard = true;
              break;
            }
          }
          if (nearHazard) score *= 2.5;

          if (score < minScore) {
            minScore = score;
            bestPup = pup;
          }
        }

        if (bestPup) {
          const directDist = Math.hypot(bestPup.x - botShip.x, bestPup.y - botShip.y);

          // Exit collect powerup mode if the remaining powerup is isolated far away (> 350px) and arena count is low
          const isIsolatedFar = allAlivePowerups.length < 3 && directDist > 340 && !needsUrgentHealth && wormholes.length > 0;

          if (!isIsolatedFar) {
            this.debugState = `COLLECT PUP (#${bestPup.type})`;
            this.debugTargetPos = { x: bestPup.x, y: bestPup.y };

            const navAngle = this.findClearNavigationAngle(botShip, bestPup.x, bestPup.y, hazards);
            const targetDirX = Math.cos(navAngle);
            const targetDirY = Math.sin(navAngle);

            const currentSpeed = Math.hypot(botShip.vx, botShip.vy);
            const dotToTarget = currentSpeed > 0.05 ? (botShip.vx * targetDirX + botShip.vy * targetDirY) / currentSpeed : 0;
            const lateralSpeed = currentSpeed > 0.05 ? Math.abs(botShip.vx * (-targetDirY) + botShip.vy * targetDirX) : 0;

            if (isApex) {
              // Proportional Navigation & Drift Vector Compensation:
              // Scale desired speed by distance to prevent overshoot
              const targetSpeed = Math.min(5.2, Math.max(2.4, directDist * 0.032));
              const desVx = targetDirX * targetSpeed;
              const desVy = targetDirY * targetSpeed;

              // Correction vector to cancel lateral drift and thrust toward target
              const corrX = desVx - botShip.vx;
              const corrY = desVy - botShip.vy;
              const corrMag = Math.hypot(corrX, corrY);

              if (corrMag > 0.45) {
                this.targetAngle = Math.atan2(corrY, corrX);
              } else {
                this.targetAngle = navAngle;
              }

              let angleDiff = this.targetAngle - botShip.angle;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

              // Thrust modulation:
              // Coast cleanly if already heading straight into the powerup at sufficient speed
              const isMovingFastTowards = directDist < 95 && dotToTarget > 0.82 && currentSpeed > 2.0 && lateralSpeed < 1.1;
              if (isMovingFastTowards || directDist < 26) {
                this.currentInput.up = false;
              } else if (Math.abs(angleDiff) < 0.45) {
                this.currentInput.up = true;
              } else {
                this.currentInput.up = false;
              }
            } else {
              this.targetAngle = navAngle;
              let angleDiff = this.targetAngle - botShip.angle;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

              if (Math.abs(angleDiff) < 0.6) {
                if (directDist > 25 && !(directDist < 60 && currentSpeed > 3.0)) {
                  this.currentInput.up = true;
                } else {
                  this.currentInput.up = false;
                }
              } else {
                this.currentInput.up = false;
              }
            }

            this.currentInput.fire = false;
            return;
          }
        }
      }
    }

    // 6. ATTACK ORBITAL WORMHOLE: Shoot primary lasers to spawn fresh powerups
    if (wormholes.length > 0) {
      const whIndex = this.targetWormholeIndex % wormholes.length;
      const wh = wormholes[whIndex];

      // Wormhole orbital velocity & predictive lead calculation
      const whOrbitAngle = Math.atan2(wh.y, wh.x);
      const whSpeed = (wh.orbitRadius || 270) * (22.5 * Math.PI / 180) / 60;
      const whVx = -Math.sin(whOrbitAngle) * whSpeed;
      const whVy = Math.cos(whOrbitAngle) * whSpeed;

      const rawDist = Math.hypot(wh.x - botShip.x, wh.y - botShip.y);
      const bulletSpeed = 10.0;
      const timeToHitFrames = isApex ? (rawDist / bulletSpeed) : 0;

      const targetX = wh.x + whVx * timeToHitFrames;
      const targetY = wh.y + whVy * timeToHitFrames;

      this.debugState = 'ATTACK WORMHOLE';
      this.debugTargetPos = { x: targetX, y: targetY };

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
        this.currentInput.up = false;
      } else {
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

    // 7. GRACEFUL ORBITAL PATROL
    this.debugState = 'ORBITAL PATROL';
    this.targetAngle += (Math.random() - 0.5) * 0.3;
    this.currentInput.up = true;
  }

  public drawDebug(renderer: any, botShip: PlayerShip): void {
    if (!botShip || !botShip.isAlive || !renderer || !renderer.ctx) return;
    const ctx = renderer.ctx;
    ctx.save();

    // 1. Draw Aim / Lead Line & Crosshair (Cyan)
    if (this.debugTargetPos) {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(botShip.x, botShip.y);
      ctx.lineTo(this.debugTargetPos.x, this.debugTargetPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target Crosshair
      const tx = this.debugTargetPos.x;
      const ty = this.debugTargetPos.y;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, Math.PI * 2);
      ctx.moveTo(tx - 9, ty); ctx.lineTo(tx + 9, ty);
      ctx.moveTo(tx, ty - 9); ctx.lineTo(tx, ty + 9);
      ctx.stroke();
    }

    // 2. Draw Threat Line & Danger Bubble (Red/Orange)
    if (this.debugThreatPos) {
      ctx.strokeStyle = 'rgba(255, 51, 68, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(botShip.x, botShip.y);
      ctx.lineTo(this.debugThreatPos.x, this.debugThreatPos.y);
      ctx.stroke();

      // Threat danger radius
      ctx.strokeStyle = 'rgba(255, 51, 68, 0.4)';
      ctx.fillStyle = 'rgba(255, 51, 68, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.debugThreatPos.x, this.debugThreatPos.y, Math.max(16, this.debugThreatRadius || 24), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 3. Draw Velocity / Steering Vector (Green)
    const speed = Math.hypot(botShip.vx, botShip.vy);
    if (speed > 0.2) {
      const headingLen = Math.min(60, Math.max(20, speed * 8));
      const hx = botShip.x + (botShip.vx / speed) * headingLen;
      const hy = botShip.y + (botShip.vy / speed) * headingLen;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(botShip.x, botShip.y);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    }

    // 4. Floating Tactical State Billboard over ship
    const label = `[AI ${this.difficulty.toUpperCase()}]: ${this.debugState}`;
    ctx.font = 'bold 8.5px "Orbitron", monospace, sans-serif';
    const textWidth = ctx.measureText(label).width;
    const boxX = botShip.x - textWidth / 2 - 5;
    const boxY = botShip.y - 30;
    const boxW = textWidth + 10;
    const boxH = 14;

    ctx.fillStyle = 'rgba(2, 6, 18, 0.88)';
    ctx.strokeStyle = this.debugState.includes('EVAD') ? '#ff3344' : this.debugState.includes('COLLECT') ? '#00ff88' : this.debugState.includes('LAUNCH') ? '#ff00ff' : '#00e5ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(boxX, boxY, boxW, boxH, 3);
    } else {
      ctx.rect(boxX, boxY, boxW, boxH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ctx.strokeStyle;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, botShip.x, boxY + boxH / 2);

    ctx.restore();
  }
}

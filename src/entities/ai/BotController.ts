import { PlayerShip } from '../PlayerShip';
import { Wormhole } from '../Wormhole';
import { Powerup } from '../Powerup';
import { Bullet } from '../Bullet';
import { Hazard } from '../hazards/Hazard';
import { InputState } from '../../core/InputManager';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export class BotController {
  public difficulty: BotDifficulty = 'medium';
  public isEnabled = true;

  private thinkTimer = 0;
  private launchCooldown = 0;
  private targetWormholeIndex = 0;
  private currentInput: InputState = {
    up: false,
    left: false,
    right: false,
    fire: false,
    secondaryFire: false,
    tertiaryFire: false,
  };

  private targetAngle = 0;

  constructor(difficulty: BotDifficulty = 'medium') {
    this.difficulty = difficulty;
    // Initial random launch stagger
    this.launchCooldown = 1.0 + Math.random() * 2.0;
  }

  public update(
    dt: number,
    botShip: PlayerShip,
    wormholes: Wormhole[],
    powerups: Powerup[],
    bullets: Bullet[],
    hazards: Hazard[] = []
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

    if (this.launchCooldown > 0) {
      this.launchCooldown -= dt;
    }

    this.thinkTimer -= dt;
    const thinkInterval = this.difficulty === 'hard' ? 0.04 : this.difficulty === 'medium' ? 0.08 : 0.15;

    if (this.thinkTimer <= 0) {
      this.thinkTimer = thinkInterval;
      this.decideStrategy(botShip, wormholes, powerups, bullets, hazards);
    }

    // Smooth steering towards targetAngle
    let angleDiff = this.targetAngle - botShip.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    const deadZone = this.difficulty === 'hard' ? 0.03 : 0.06;
    this.currentInput.left = angleDiff < -deadZone;
    this.currentInput.right = angleDiff > deadZone;

    return { ...this.currentInput };
  }

  private decideStrategy(
    botShip: PlayerShip,
    wormholes: Wormhole[],
    powerups: Powerup[],
    bullets: Bullet[],
    hazards: Hazard[]
  ): void {
    // Reset fire flags
    this.currentInput.fire = false;
    this.currentInput.secondaryFire = false;
    this.currentInput.tertiaryFire = false;
    this.currentInput.up = false;

    const bound = 380;

    // 1. EMERGENCY: Evade perimeter walls
    if (Math.abs(botShip.x) > bound || Math.abs(botShip.y) > bound) {
      this.targetAngle = Math.atan2(-botShip.y, -botShip.x);
      this.currentInput.up = true;
      this.currentInput.fire = true; // suppressive fire
      return;
    }

    // 2. EMERGENCY: Evade incoming hostile bullets
    for (const b of bullets) {
      if (b.ownerSlot !== botShip.slot) {
        const dist = Math.hypot(b.x - botShip.x, b.y - botShip.y);
        if (dist < 120) {
          const bAngle = Math.atan2(botShip.y - b.y, botShip.x - b.x);
          this.targetAngle = bAngle + Math.PI / 2;
          this.currentInput.up = true;
          this.currentInput.fire = true;
          return;
        }
      }
    }

    // 3. DEFEND & ATTACK HOSTILE HAZARDS FIRST (Survive threats in realm)
    if (hazards.length > 0) {
      let closestHazard: Hazard | null = null;
      let minDist = Infinity;

      for (const h of hazards) {
        if (!h.isAlive || h.powerupType === 16) continue;
        // AI cannot shoot or target Nuke during its first 2 seconds
        if (h.powerupType === 14) {
          const nukeObj = h as unknown as { countdown?: number };
          if (nukeObj.countdown !== undefined && nukeObj.countdown > 6.0) {
            continue;
          }
        }
        const d = Math.hypot(h.x - botShip.x, h.y - botShip.y);
        if (d < minDist) {
          minDist = d;
          closestHazard = h;
        }
      }

      if (closestHazard) {
        const bulletSpeed = 12.0;
        const timeToHit = minDist / (bulletSpeed * 60);
        const hazObj = closestHazard as unknown as { vx?: number; vy?: number };
        const leadX = closestHazard.x + (hazObj.vx || 0) * timeToHit * 60;
        const leadY = closestHazard.y + (hazObj.vy || 0) * timeToHit * 60;

        const dx = leadX - botShip.x;
        const dy = leadY - botShip.y;
        this.targetAngle = Math.atan2(dy, dx);

        let angleDiff = this.targetAngle - botShip.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (minDist > 160) {
          this.currentInput.up = true;
        }

        if (Math.abs(angleDiff) < 0.4 && minDist < 500) {
          this.currentInput.fire = true; // Actively destroy incoming hazards with lead aiming!
        }
        return;
      }
    }

    // 4. LAUNCH STORED POWERUPS: Tactically transmit offensive hazards through selected wormhole
    if (botShip.powerupInventory.length > 0 && wormholes.length > 0 && this.launchCooldown <= 0) {
      const whIndex = this.targetWormholeIndex % wormholes.length;
      const wh = wormholes[whIndex];
      const dx = wh.x - botShip.x;
      const dy = wh.y - botShip.y;
      const dist = Math.hypot(dx, dy);

      this.targetAngle = Math.atan2(dy, dx);
      let angleDiff = this.targetAngle - botShip.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      if (dist > 180) {
        this.currentInput.up = true;
      }

      // Fire powerup capsule bullet into wormhole with human-like cooldown
      if (Math.abs(angleDiff) < 0.20 && dist < 380) {
        this.currentInput.secondaryFire = true;
        this.currentInput.fire = false;
        // Reset launch cooldown based on AI difficulty tier
        this.launchCooldown = this.difficulty === 'hard' ? 2.0 : this.difficulty === 'medium' ? 3.2 : 4.8;
        this.targetWormholeIndex = (this.targetWormholeIndex + 1) % wormholes.length;
      }
      return;
    }

    // 5. ATTACK ORBITAL WORMHOLE: Shoot primary lasers into wormhole
    if (wormholes.length > 0 && Math.random() < 0.6) {
      const wh = wormholes[0];
      const dx = wh.x - botShip.x;
      const dy = wh.y - botShip.y;
      const dist = Math.hypot(dx, dy);

      this.targetAngle = Math.atan2(dy, dx);
      let angleDiff = this.targetAngle - botShip.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      if (dist > 180) {
        this.currentInput.up = true;
      }

      if (Math.abs(angleDiff) < 0.3 && dist < 450) {
        this.currentInput.fire = true; // Actively shoot lasers at wormhole!
      }
      return;
    }

    // 6. HARVEST POWERUPS: Seek floating items
    if (powerups.length > 0) {
      let closestPup: Powerup | null = null;
      let minDist = Infinity;

      for (const pup of powerups) {
        const d = Math.hypot(pup.x - botShip.x, pup.y - botShip.y);
        if (d < minDist) {
          minDist = d;
          closestPup = pup;
        }
      }

      if (closestPup) {
        const dx = closestPup.x - botShip.x;
        const dy = closestPup.y - botShip.y;
        this.targetAngle = Math.atan2(dy, dx);

        const currentSpeed = Math.hypot(botShip.vx, botShip.vy);
        if (minDist > 40 || currentSpeed < 2.5) {
          this.currentInput.up = true;
        }

        // Random opportunistic shots
        if (Math.random() < 0.3) {
          this.currentInput.fire = true;
        }
        return;
      }
    }

    // 7. PATROL ARENA & SPRAY FIRE
    this.targetAngle += (Math.random() - 0.5) * 0.4;
    this.currentInput.up = true;
    if (Math.random() < 0.4) {
      this.currentInput.fire = true;
    }
  }
}

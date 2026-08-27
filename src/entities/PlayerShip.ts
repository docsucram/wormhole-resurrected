import { Point2D } from '../math/RotationalPolygon';
import { VectorRenderer } from '../graphics/VectorRenderer';
import { ShipCatalog, CompiledShip } from './ShipCatalog';
import { Bullet } from './Bullet';
import { HeatSeekerMissile } from './HeatSeekerMissile';
import { ParticleSystem, ThrustParticle } from './Particle';
import { TextPopup } from './TextPopup';
import { SoundEngine } from '../audio/SoundEngine';
import { InputState } from '../core/InputManager';
import { PLAYER_COLORS, GAME_CONSTANTS, POWERUP_NAMES } from '../core/Constants';

export interface DamageSourceInfo {
  name?: string;
  weapon?: string;
  slot?: number;
}

export class PlayerShip {
  public shipId: number;
  public slot: number;
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public angle = -Math.PI / 2; // Face upward initially

  // Dynamic Ship Attributes (modified by ship class & powerups)
  public health: number;
  public maxHealth: number;
  public thrust: number;
  public maxThrust: number;
  public rotateSpeed: number;
  public hasRetros = false;
  public bulletLevel = 0; // 0..3

  // Offensive Powerup Inventory (up to 5 stacked)
  public powerupInventory: number[] = [];

  // Compiled mesh & hitboxes
  public compiled: CompiledShip;

  // Combat State
  public shieldTime = 0; // seconds remaining
  public shotCooldown = 0;
  public specialCooldown = 0;
  public heatSeekerRounds = 3;
  private hsRegenTimer = 20.0;

  // Special Ship Mechanics
  public specialType = 0;
  public shapeShifterState = 0; // 0=Tank, 2=Squid for Flash
  public isAttractorActive = false;

  // EMP Effect
  public isUnderEMP = false;
  public empTime = 0;
  public empType = 0;

  // Turrets for Rabbit / Flagship
  public trackingTurrets: { x: number; y: number; angle: number }[] = [];
  private trackingTarget: Point2D | null = null;
  private trackingCooldown = 0;

  public isThrusting = false;
  private thrustCount = 0;
  public isAlive = true;
  public onDeath?: () => void;
  public colorIndex = 0;

  constructor(shipId = 1, slot = 0, x = 0, y = 0, colorIndex = slot) {
    this.shipId = shipId;
    this.slot = slot;
    this.colorIndex = colorIndex;
    this.x = x;
    this.y = y;
    this.compiled = ShipCatalog.get(shipId);

    const cfg = this.compiled.config;
    this.maxHealth = cfg.hitPoints;
    this.health = this.maxHealth;
    this.thrust = cfg.accel;
    this.maxThrust = cfg.maxThrust;
    this.rotateSpeed = (cfg.rotateSpeed * Math.PI) / 180;
    this.bulletLevel = cfg.startGunLevel;
    this.specialType = cfg.specialType;

    this.initTurrets();
  }

  public setShip(shipId: number): void {
    this.shipId = shipId;
    this.compiled = ShipCatalog.get(shipId);

    const cfg = this.compiled.config;
    this.maxHealth = cfg.hitPoints;
    this.health = this.maxHealth;
    this.thrust = cfg.accel;
    this.maxThrust = cfg.maxThrust;
    this.rotateSpeed = (cfg.rotateSpeed * Math.PI) / 180;
    this.bulletLevel = cfg.startGunLevel;
    this.specialType = cfg.specialType;

    this.initTurrets();
  }

  private initTurrets(): void {
    this.trackingTurrets = [];
    if (this.shipId === 3) {
      // The Rabbit - 2 Rear auto-targeting tracking turrets
      this.trackingTurrets.push({ x: -10, y: 8, angle: Math.PI });
      this.trackingTurrets.push({ x: 10, y: 8, angle: Math.PI });
    } else if (this.shipId === 7) {
      // The Flagship - 2 Forward heavy tracking turrets
      this.trackingTurrets.push({ x: -12, y: -4, angle: 0 });
      this.trackingTurrets.push({ x: 12, y: -4, angle: 0 });
    }
  }

  public update(
    dt: number,
    input: InputState,
    particles: ParticleSystem,
    sound: SoundEngine,
    bullets: Bullet[],
    missiles: HeatSeekerMissile[],
    targets: Point2D[],
    boundX = 420,
    boundY = 420
  ): void {
    if (!this.isAlive) return;

    // Cooldown timers
    if (this.shotCooldown > 0) this.shotCooldown -= dt;
    if (this.specialCooldown > 0) this.specialCooldown -= dt;
    if (this.shieldTime > 0) this.shieldTime -= dt;

    // EMP Timer & handling
    if (this.isUnderEMP) {
      this.empTime -= dt;
      if (this.empTime <= 0) {
        this.isUnderEMP = false;
      }
    }

    // Heat Seeker regeneration for Hunter
    if (this.specialType === 3 && this.heatSeekerRounds < 3) {
      this.hsRegenTimer -= dt;
      if (this.hsRegenTimer <= 0) {
        this.heatSeekerRounds++;
        this.hsRegenTimer = 20.0;
      }
    }

    // EMP Control Scramble mapping (matches legacy PlayerSprite.java:616-642)
    let effLeft = input.left;
    let effRight = input.right;
    let effUp = input.up;
    let effFire = input.fire;
    let effSecondary = input.secondaryFire;

    if (this.isUnderEMP) {
      // Invert steering
      effLeft = input.right;
      effRight = input.left;

      switch (this.empType) {
        case 0:
          // Thrust and Primary Fire swapped
          effUp = input.fire;
          effFire = input.up;
          break;
        case 1:
          // Secondary Fire [F] and Primary Fire swapped
          effSecondary = input.fire;
          effFire = input.secondaryFire;
          break;
        case 2:
          // Complete button scramble
          effUp = input.left;
          effLeft = input.fire;
          effRight = input.up;
          effFire = input.right;
          break;
      }
    }

    // Flight controls - calibrated to 60 FPS standard
    const frameScale = Math.min(dt * 60, 2.0);

    if (effLeft) {
      this.angle -= this.rotateSpeed * frameScale;
    }
    if (effRight) {
      this.angle += this.rotateSpeed * frameScale;
    }

    const throttle = input.throttle !== undefined ? input.throttle : 1.0;
    this.isThrusting = effUp && !this.isAttractorActive && throttle > 0.05;
    if (this.isThrusting) {
      this.thrustCount++;
      // Accelerate forward with analog throttle
      const ax = Math.cos(this.angle) * this.thrust * frameScale * throttle;
      const ay = Math.sin(this.angle) * this.thrust * frameScale * throttle;
      this.vx += ax;
      this.vy += ay;

      const speed = Math.hypot(this.vx, this.vy);
      if (speed > this.maxThrust) {
        this.vx = (this.vx / speed) * this.maxThrust;
        this.vy = (this.vy / speed) * this.maxThrust;
      }

      // Spawn thruster flare particles (matches legacy PlayerSprite.drawThrust)
      const tailOffset = 15;
      const tailX = this.x - Math.cos(this.angle) * tailOffset;
      const tailY = this.y - Math.sin(this.angle) * tailOffset;

      // Central exhaust burst
      particles.add(new ThrustParticle(tailX, tailY, -this.vx * 1.5, -this.vy * 1.5));

      // Dual side flares when at sustained thrust (matches legacy PlayerSprite.java)
      if (this.thrustCount > 3) {
        const spread = 0.25;
        const leftAngle = this.angle + Math.PI - spread;
        const rightAngle = this.angle + Math.PI + spread;
        particles.add(new ThrustParticle(tailX, tailY, Math.cos(leftAngle) * 3 - this.vx * 0.5, Math.sin(leftAngle) * 3 - this.vy * 0.5));
        particles.add(new ThrustParticle(tailX, tailY, Math.cos(rightAngle) * 3 - this.vx * 0.5, Math.sin(rightAngle) * 3 - this.vy * 0.5));
      }

      sound.setThrust(true);
    } else {
      this.thrustCount = 0;
      sound.setThrust(false);
      // Retros deceleration braking
      if (this.hasRetros && !this.isUnderEMP) {
        const decel = Math.pow(GAME_CONSTANTS.DECEL_RETROS, frameScale);
        this.vx *= decel;
        this.vy *= decel;
        if (Math.abs(this.vx) < 0.04) this.vx = 0;
        if (Math.abs(this.vy) < 0.04) this.vy = 0;
      }
    }

    // Position integration
    this.x += this.vx * frameScale;
    this.y += this.vy * frameScale;

    // Bounds rebound clamp matching legacy Sprite.java handleRebound()
    if (Math.abs(this.x) > boundX) {
      this.x = Math.sign(this.x) * boundX;
      this.vx *= -0.5;
      particles.createExplosion(this.x, this.y, '#ffffff', 4);
    }
    if (Math.abs(this.y) > boundY) {
      this.y = Math.sign(this.y) * boundY;
      this.vy *= -0.5;
      particles.createExplosion(this.x, this.y, '#ffffff', 4);
    }

    // Secondary offensive powerup fire (Key F / Bot Secondary)
    if (effSecondary && this.powerupInventory.length > 0 && this.shotCooldown <= 0) {
      this.firePowerupShot(bullets, sound, particles);
    } else if (effFire && this.shotCooldown <= 0 && !this.isAttractorActive) {
      // Primary laser fire
      this.firePrimary(bullets, sound, particles);
    }

    // Tertiary Special Ability trigger (Key R / D)
    if (input.tertiaryFire && this.specialCooldown <= 0) {
      this.triggerSpecial(sound, missiles);
    }

    // Auto-tracking turrets update
    this.updateTurrets(dt, targets, bullets);
  }

  private firePrimary(bullets: Bullet[], sound: SoundEngine, particles?: ParticleSystem): void {
    this.shotCooldown = 0.14;
    const speed = 10.0; // Exactly matching legacy PlayerSprite.java:439 (10.0 px/tick)
    const color = (PLAYER_COLORS[this.colorIndex] || PLAYER_COLORS[this.slot] || PLAYER_COLORS[0]).primary;
    const glow = (PLAYER_COLORS[this.colorIndex] || PLAYER_COLORS[this.slot] || PLAYER_COLORS[0]).glow;

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const noseX = this.x + cos * 16;
    const noseY = this.y + sin * 16;
    const shipVx = this.vx * 0.25;
    const shipVy = this.vy * 0.25;

    if (particles) {
      particles.createMuzzleSparks(noseX, noseY, this.angle, color);
    }

    if (this.bulletLevel === 0) {
      // Level 0: Single center laser (10 dmg)
      bullets.push(
        new Bullet(noseX, noseY, cos * speed + shipVx, sin * speed + shipVy, 10, 5, color, glow, this.slot)
      );
    } else if (this.bulletLevel === 1) {
      // Level 1: Dual parallel lasers (7 dmg each = 14 total)
      const perpX = -sin * 7;
      const perpY = cos * 7;
      bullets.push(
        new Bullet(noseX + perpX, noseY + perpY, cos * speed + shipVx, sin * speed + shipVy, 7, 5, color, glow, this.slot),
        new Bullet(noseX - perpX, noseY - perpY, cos * speed + shipVx, sin * speed + shipVy, 7, 5, color, glow, this.slot)
      );
    } else if (this.bulletLevel === 2) {
      // Level 2: Triple diverging spread lasers (6 dmg each = 18 total)
      const spread = 0.10;
      bullets.push(
        new Bullet(noseX, noseY, cos * speed + shipVx, sin * speed + shipVy, 6, 6, color, glow, this.slot),
        new Bullet(
          noseX,
          noseY,
          Math.cos(this.angle - spread) * speed + shipVx,
          Math.sin(this.angle - spread) * speed + shipVy,
          6,
          6,
          color,
          glow,
          this.slot
        ),
        new Bullet(
          noseX,
          noseY,
          Math.cos(this.angle + spread) * speed + shipVx,
          Math.sin(this.angle + spread) * speed + shipVy,
          6,
          6,
          color,
          glow,
          this.slot
        )
      );
    } else {
      // Level 3: Quad heavy diverging spread cannons (6 dmg each = 24 total)
      const innerSpread = 0.06;
      const outerSpread = 0.16;
      bullets.push(
        new Bullet(
          noseX,
          noseY,
          Math.cos(this.angle - outerSpread) * speed * 1.1 + shipVx,
          Math.sin(this.angle - outerSpread) * speed * 1.1 + shipVy,
          6,
          7,
          '#ffffff',
          glow,
          this.slot
        ),
        new Bullet(
          noseX,
          noseY,
          Math.cos(this.angle - innerSpread) * speed * 1.1 + shipVx,
          Math.sin(this.angle - innerSpread) * speed * 1.1 + shipVy,
          6,
          7,
          color,
          glow,
          this.slot
        ),
        new Bullet(
          noseX,
          noseY,
          Math.cos(this.angle + innerSpread) * speed * 1.1 + shipVx,
          Math.sin(this.angle + innerSpread) * speed * 1.1 + shipVy,
          6,
          7,
          color,
          glow,
          this.slot
        ),
        new Bullet(
          noseX,
          noseY,
          Math.cos(this.angle + outerSpread) * speed * 1.1 + shipVx,
          Math.sin(this.angle + outerSpread) * speed * 1.1 + shipVy,
          6,
          7,
          '#ffffff',
          glow,
          this.slot
        )
      );
    }

    sound.playLaser(this.bulletLevel);
  }

  private firePowerupShot(bullets: Bullet[], sound: SoundEngine, particles?: ParticleSystem): void {
    if (this.powerupInventory.length === 0) return;
    this.shotCooldown = 0.25;

    const pType = this.powerupInventory.shift()!;
    const speed = 8.5;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const noseX = this.x + cos * 20;
    const noseY = this.y + sin * 20;

    if (particles) {
      particles.createMuzzleSparks(noseX, noseY, this.angle, '#ff00ff');
    }

    // Creates a glowing powerup container projectile (transfers hazard on entering enemy wormhole)
    const pBullet = new Bullet(
      noseX,
      noseY,
      cos * speed + this.vx * 0.3,
      sin * speed + this.vy * 0.3,
      20,
      8,
      '#ff00ff',
      '#ff00ff',
      this.slot,
      true,
      pType
    );

    bullets.push(pBullet);
    sound.playSpecial(1);
  }

  private triggerSpecial(sound: SoundEngine, missiles: HeatSeekerMissile[]): void {
    if (this.specialType === 1) {
      // The Turtle - Turtle Cannon: 360-degree omni-directional blast
      this.specialCooldown = 12.0;
      sound.playSpecial(1);
    } else if (this.specialType === 2) {
      // The Flash - Shapeshifter: swap between Tank / Squid modes
      this.specialCooldown = 1.0;
      this.shapeShifterState = (this.shapeShifterState + 1) % 3;
      sound.playSpecial(2);
    } else if (this.specialType === 3) {
      // The Hunter - Heat Seeker Missile
      if (this.heatSeekerRounds > 0) {
        this.heatSeekerRounds--;
        this.specialCooldown = 0.5;
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        missiles.push(
          new HeatSeekerMissile(
            this.x + cos * 20,
            this.y + sin * 20,
            this.angle,
            0,
            (PLAYER_COLORS[this.slot] || PLAYER_COLORS[0]).primary
          )
        );
        sound.playSpecial(3);
      }
    } else if (this.specialType === 4) {
      // The Flagship - Attractor / Repulser Gravity Well
      this.isAttractorActive = !this.isAttractorActive;
      sound.playSpecial(4);
    }
  }

  public givePowerup(type: number, sound: SoundEngine, popups: TextPopup[]): boolean {
    if (type === 0) {
      this.bulletLevel = Math.min(3, this.bulletLevel + 1);
      popups.push(new TextPopup(this.x, this.y, 'GUN UPGRADE!', '#00ffff'));
      sound.playPowerup();
    } else if (type === 1) {
      this.maxThrust = Math.min(12, this.maxThrust + 1.5);
      this.thrust += 0.08;
      popups.push(new TextPopup(this.x, this.y, 'THRUST UPGRADE!', '#00ffaa'));
      sound.playPowerup();
    } else if (type === 2) {
      this.hasRetros = true;
      popups.push(new TextPopup(this.x, this.y, 'RETROS ONLINE!', '#ffaa00'));
      sound.playPowerup();
    } else if (type === 3) {
      this.shieldTime = 8.0;
      popups.push(new TextPopup(this.x, this.y, 'SHIELD ACTIVE!', '#ffff00'));
      sound.playShield();
    } else if (type === 4) {
      sound.playZap();
      popups.push(new TextPopup(this.x, this.y, 'ZAP SCREEN!', '#ffffff'));
      return true; // Screen zap clears all hazards
    } else if (type === 5) {
      this.health = Math.min(this.maxHealth, this.health + 75);
      popups.push(new TextPopup(this.x, this.y, '+75 HP', '#33ff33'));
      sound.playPowerup();
    } else {
      // Offensive Hazard Powerup (Type 6..19)
      if (this.powerupInventory.length < 5) {
        this.powerupInventory.push(type);
        const itemName = POWERUP_NAMES[type] || 'HAZARD';
        popups.push(new TextPopup(this.x, this.y, `+ ${itemName} [F]`, '#ff00ff'));
        sound.playPowerup();
      }
    }
    return false;
  }

  private updateTurrets(dt: number, targets: Point2D[], bullets: Bullet[]): void {
    if (this.trackingTurrets.length === 0 || targets.length === 0) {
      this.trackingTarget = null;
      return;
    }

    // Find closest target within 450px
    let closestTarget: Point2D | null = null;
    let closestDist = 450;

    for (const t of targets) {
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d < closestDist) {
        closestDist = d;
        closestTarget = t;
      }
    }

    this.trackingTarget = closestTarget;

    if (closestTarget) {
      for (const turret of this.trackingTurrets) {
        // Rotate turret angle towards target
        const targetAngle = Math.atan2(closestTarget.y - this.y, closestTarget.x - this.x);
        let diff = targetAngle - turret.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        turret.angle += diff * Math.min(1.0, dt * 10.0);
      }

      this.trackingCooldown -= dt;
      if (this.trackingCooldown <= 0) {
        this.trackingCooldown = 0.35;
        for (const turret of this.trackingTurrets) {
          const cos = Math.cos(this.angle);
          const sin = Math.sin(this.angle);
          const worldX = this.x + (turret.x * cos - turret.y * sin);
          const worldY = this.y + (turret.x * sin + turret.y * cos);

          const bvx = Math.cos(turret.angle) * 10.0;
          const bvy = Math.sin(turret.angle) * 10.0;
          bullets.push(
            new Bullet(worldX, worldY, bvx, bvy, 10, 4, '#ffffff', (PLAYER_COLORS[this.slot] || PLAYER_COLORS[0]).primary, this.slot)
          );
        }
      }
    }
  }

  public lastDamagedBy: DamageSourceInfo | null = null;

  public takeDamage(
    dmg: number,
    particles: ParticleSystem,
    sound: SoundEngine,
    sourceInfo?: DamageSourceInfo
  ): void {
    if (this.shieldTime > 0) {
      sound.playShield();
      return;
    }

    if (sourceInfo) {
      this.lastDamagedBy = sourceInfo;
    }

    this.health -= dmg;
    particles.createExplosion(this.x, this.y, (PLAYER_COLORS[this.slot] || PLAYER_COLORS[0]).primary, 6);

    if (this.health <= 0) {
      this.health = 0;
      if (this.isAlive) {
        this.isAlive = false;
        particles.createExplosion(this.x, this.y, '#ff3344', 30);
        sound.playExplosion(true);
        if (this.onDeath) this.onDeath();
      }
    }
  }

  public respawn(x = 0, y = -150): void {
    this.lastDamagedBy = null;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.shieldTime = 3.5; // 3.5s spawn shield
    this.isUnderEMP = false;
    this.powerupInventory = [];
    this.bulletLevel = this.compiled.config.startGunLevel;
    this.thrust = this.compiled.config.accel;
    this.maxThrust = this.compiled.config.maxThrust;
    this.hasRetros = false;
    this.heatSeekerRounds = 3;
    this.isAttractorActive = false;
    this.shotCooldown = 0;
    this.specialCooldown = 0;
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    const color = PLAYER_COLORS[this.colorIndex] || PLAYER_COLORS[this.slot] || PLAYER_COLORS[0];

    // 1. Draw Attractor / Repulser Field if Flagship special is active
    if (this.isAttractorActive) {
      const time = Date.now() / 1000;
      for (let i = 0; i < 3; i++) {
        const r = (time * 120 + i * 80) % 250;
        renderer.drawGlowCircle(
          this.x,
          this.y,
          r,
          color.primary,
          color.glow,
          1.5
        );
      }
    }

    // 2. Draw Target Reticle for Hunter
    if (this.specialType === 3) {
      const targetDist = 200;
      const tx = this.x + Math.cos(this.angle) * targetDist;
      const ty = this.y + Math.sin(this.angle) * targetDist;
      renderer.drawCrosshair(tx, ty, 10, this.heatSeekerRounds > 0 ? color.primary : '#556677');
    }

    // 3. Draw Tracking Turret Target Reticle
    if (this.trackingTarget) {
      renderer.drawCrosshair(this.trackingTarget.x, this.trackingTarget.y, 14, color.primary);
    }

    // 4. Draw Main Ship Mesh
    const poly = this.compiled.visualPoly;
    // Align visual rotation: angle + 90 deg (Math.PI / 2) to orient ship forward
    poly.setAngle(this.angle + Math.PI / 2);

    renderer.drawRotationalPolygon(
      poly,
      this.x,
      this.y,
      1.0,
      color.primary,
      color.glow,
      2.0,
      true,
      'rgba(0, 20, 30, 0.4)'
    );

    // 5. Draw Tracking Turrets on ship
    for (const turret of this.trackingTurrets) {
      const cos = Math.cos(this.angle);
      const sin = Math.sin(this.angle);
      const tx = this.x + (turret.x * cos - turret.y * sin);
      const ty = this.y + (turret.x * sin + turret.y * cos);

      renderer.drawGlowCircle(tx, ty, 3.5, color.primary, color.glow, 1.5, true, color.primary);
      const barrelX = tx + Math.cos(turret.angle) * 6;
      const barrelY = ty + Math.sin(turret.angle) * 6;
      renderer.drawGlowLine(tx, ty, barrelX, barrelY, '#ffffff', color.glow, 2);
    }

    // 6. Draw Invulnerability Shield
    if (this.shieldTime > 0) {
      const shieldColor = this.shieldTime > 4 ? '#33ff33' : this.shieldTime > 2 ? '#ffee00' : '#ff3344';
      renderer.drawGlowCircle(this.x, this.y, 26, shieldColor, shieldColor, 2);
      renderer.drawGlowCircle(this.x, this.y, 23, shieldColor, shieldColor, 1);
    }

    // 7. Draw EMP Electric Arc Glitch
    if (this.isUnderEMP) {
      for (let i = 0; i < 4; i++) {
        const arcAngle = Math.random() * Math.PI * 2;
        const arcDist = 12 + Math.random() * 14;
        const ax = this.x + Math.cos(arcAngle) * arcDist;
        const ay = this.y + Math.sin(arcAngle) * arcDist;
        renderer.drawGlowLine(this.x, this.y, ax, ay, '#ffffff', '#00e5ff', 1.5);
      }
    }

    // 8. Draw Authentic Vertical Green Health Indicator Bar floating beside the ship
    const hpRatio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    const barW = 4;
    const barH = 22;
    const barX = this.x + 18;
    const barY = this.y - barH / 2;

    const ctx = renderer.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 30, 10, 0.7)';
    ctx.fillRect(barX, barY, barW, barH);

    const fillCol = hpRatio > 0.4 ? '#33ff33' : hpRatio > 0.2 ? '#ffee00' : '#ff3344';
    ctx.fillStyle = fillCol;
    const fillH = barH * hpRatio;
    ctx.fillRect(barX, barY + (barH - fillH), barW, fillH);
    ctx.restore();
  }
}

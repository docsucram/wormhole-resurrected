import { VectorRenderer } from '../graphics/VectorRenderer';
import { POWERUP_NAMES } from '../core/Constants';

export class Powerup {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public type: number; // 0..5 for self-buffs, 6..19 for offensive sendables
  public name: string;
  public radius = 17;
  public health = 20;
  public maxHealth = 20;
  public isDamaged = false;
  public isInvulnerable = true; // 20 frames (~0.66s) initial ejection immunity matching PowerupSprite.java
  public life = 80.0;
  public maxLife = 80.0;
  public isAlive = true;
  public cycle = 0;
  public color: string;
  public shortTag: string;

  constructor(x: number, y: number, type: number, vx?: number, vy?: number) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.name = POWERUP_NAMES[type] || 'POWERUP';

    // Zap (4) and Extra Health (5) have 50% of standard lifespan (40.0s vs 80.0s)
    if (type === 4 || type === 5) {
      this.maxLife = 40.0;
      this.life = 40.0;
    }

    const defaultSpeed = 4.5 + Math.random() * 3.0; // Authentic high velocity matching legacy PowerupSprite.java (270 - 450 px/sec)
    const defaultAngle = Math.random() * Math.PI * 2;
    this.vx = vx !== undefined ? vx : Math.cos(defaultAngle) * defaultSpeed;
    this.vy = vy !== undefined ? vy : Math.sin(defaultAngle) * defaultSpeed;

    // Distinct vibrant color & short tag per powerup
    const configMap: Record<number, { col: string; tag: string }> = {
      0: { col: '#ff3344', tag: 'GUN' },
      1: { col: '#ffaa00', tag: 'THRUST' },
      2: { col: '#00e5ff', tag: 'RETROS' },
      3: { col: '#33ff33', tag: 'SHIELD' },
      4: { col: '#ffffff', tag: 'ZAP' },
      5: { col: '#ff33aa', tag: '+HP' },
      6: { col: '#00ffff', tag: 'HS' },
      7: { col: '#00ff88', tag: 'TURRET' },
      8: { col: '#ffaa00', tag: 'MINES' },
      9: { col: '#ff00cc', tag: 'UFO' },
      10: { col: '#ff3344', tag: 'INFLATOR' },
      11: { col: '#ffff00', tag: 'MINELAYER' },
      12: { col: '#ff6600', tag: 'GUNSHIP' },
      13: { col: '#33ff99', tag: 'SCARAB' },
      14: { col: '#ff0033', tag: 'NUKE' },
      15: { col: '#ff00ff', tag: 'CRAWLER' },
      16: { col: '#00e5ff', tag: 'BEAM' },
      17: { col: '#ffffff', tag: 'EMP' },
      18: { col: '#9966ff', tag: 'GHOST' },
      19: { col: '#ffcc00', tag: 'ARTILLERY' },
    };

    const cfg = configMap[type] || { col: '#00e5ff', tag: 'ITEM' };
    if (Powerup.powerupRule === 'STANDARD' && type <= 2) {
      this.color = '#ffaa00';
      this.shortTag = 'UPGRADE';
    } else {
      this.color = cfg.col;
      this.shortTag = cfg.tag;
    }
  }

  public takeDamage(dmg: number, particles?: any, sound?: any): boolean {
    if (this.isInvulnerable) return false;

    // Powerup survives the first hit (takes 2 hits to destroy)
    const effectiveDmg = Math.min(10, Math.max(10, dmg));
    this.health -= effectiveDmg;

    if (this.health > 0) {
      this.isDamaged = true;
      if (particles && particles.createExplosion) {
        particles.createExplosion(this.x, this.y, '#ffffff', 8);
      }
      if (sound && sound.playWormholeHit) {
        sound.playWormholeHit();
      }
      return false;
    }

    this.isAlive = false;
    if (particles && particles.createExplosion) {
      particles.createExplosion(this.x, this.y, this.color, 22);
    }
    if (sound && sound.playExplosion) {
      sound.playExplosion(false);
    }
    return true;
  }

  public update(dt: number, boundX = 420, boundY = 420): boolean {
    this.life -= dt;
    this.cycle += dt * 60;

    if (this.cycle > 27) {
      this.isInvulnerable = false;
    }

    if (this.life <= 0) {
      this.isAlive = false;
      return false;
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Bounds rebound matching legacy Sprite.java handleRebound() (REBOUND_COEFF = -0.5)
    if (Math.abs(this.x) > boundX) {
      this.x = Math.sign(this.x) * boundX;
      this.vx *= -0.5;
    }
    if (Math.abs(this.y) > boundY) {
      this.y = Math.sign(this.y) * boundY;
      this.vy *= -0.5;
    }

    return true;
  }

  public draw(renderer: VectorRenderer): void {
    const pulse = Math.sin(this.cycle * 0.08) * 2;
    const currentRadius = this.radius + pulse;

    renderer.ctx.save();
    renderer.ctx.translate(this.x, this.y);

    // Visual decay / expiration warning (final 8 seconds)
    if (this.life < 8.0) {
      // Rapid strobe blink in final 3 seconds, steady pulse between 3-8s
      const blinkFreq = this.life < 3.0 ? 18 : 8;
      const alpha = Math.sin(this.life * blinkFreq) > 0 ? 1.0 : 0.25;
      renderer.ctx.globalAlpha = alpha;

      // Expiration warning countdown arc
      const frac = Math.max(0, this.life / 8.0);
      renderer.ctx.strokeStyle = '#ff3344';
      renderer.ctx.lineWidth = 1.8;
      renderer.ctx.beginPath();
      renderer.ctx.arc(0, 0, currentRadius + 3, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      renderer.ctx.stroke();
    }

    // 1. Glowing outer powerup circular shield
    renderer.drawGlowCircle(
      0,
      0,
      currentRadius,
      this.isDamaged ? '#ff5533' : this.color,
      this.isDamaged ? '#ff3300' : this.color,
      this.isDamaged ? 1.4 : 2.0,
      true,
      this.isDamaged ? 'rgba(30, 8, 8, 0.85)' : 'rgba(4, 10, 24, 0.75)'
    );

    // If damaged from 1st hit, draw cracked shield fracture lines
    if (this.isDamaged) {
      renderer.ctx.strokeStyle = '#ffcc00';
      renderer.ctx.lineWidth = 1.4;
      renderer.ctx.beginPath();
      renderer.ctx.moveTo(-6, -currentRadius + 2);
      renderer.ctx.lineTo(-2, -3);
      renderer.ctx.lineTo(3, -1);
      renderer.ctx.lineTo(1, 6);
      renderer.ctx.lineTo(5, currentRadius - 2);
      renderer.ctx.stroke();
    }

    // Inner orbital dash ring
    renderer.ctx.save();
    renderer.ctx.rotate(this.cycle * 0.02);
    renderer.ctx.strokeStyle = this.isDamaged ? '#ff6633' : this.color;
    renderer.ctx.lineWidth = 1.0;
    renderer.ctx.setLineDash([4, 4]);
    renderer.ctx.beginPath();
    renderer.ctx.arc(0, 0, currentRadius - 3, 0, Math.PI * 2);
    renderer.ctx.stroke();
    renderer.ctx.restore();

    // 2. Vector Glyph Icon in center
    renderer.ctx.strokeStyle = '#ffffff';
    renderer.ctx.lineWidth = 2.0;

    switch (this.type) {
      case 0:
      case 1:
      case 2: {
        if (Powerup.powerupRule === 'STANDARD') {
          // Shared Ship Upgrade (Standard Arsenal Mode: Gun / Thrust / Retros)
          // Classic golden/amber starburst & chevron token from legacy Image 0
          renderer.drawGlowLine(-7, 4, 0, -5, '#ffffff', '#ffaa00', 2.5);
          renderer.drawGlowLine(0, -5, 7, 4, '#ffffff', '#ffaa00', 2.5);
          renderer.drawGlowLine(-5, 8, 0, 0, '#ffffff', '#ffaa00', 2);
          renderer.drawGlowLine(0, 0, 5, 8, '#ffffff', '#ffaa00', 2);
          renderer.drawGlowCircle(0, -5, 2.5, '#ffffff', '#ffcc00', 1.5);
          break;
        }

        // Extended Arsenal Mode: Distinct Individual Icons
        if (this.type === 0) {
          // Gun Upgrade: Crosshair
          renderer.drawGlowLine(-7, 0, 7, 0, '#ffffff', this.color, 2);
          renderer.drawGlowLine(0, -7, 0, 7, '#ffffff', this.color, 2);
          renderer.drawGlowCircle(0, 0, 3, '#ffffff', this.color, 1.5);
        } else if (this.type === 1) {
          // Thrust Upgrade: Upward double chevrons
          renderer.drawGlowLine(-6, 5, 0, -1, '#ffffff', this.color, 2.5);
          renderer.drawGlowLine(0, -1, 6, 5, '#ffffff', this.color, 2.5);
          renderer.drawGlowLine(-6, 0, 0, -6, '#ffffff', this.color, 2.5);
          renderer.drawGlowLine(0, -6, 6, 0, '#ffffff', this.color, 2.5);
        } else {
          // Retros: Opposing braking arrows
          renderer.drawGlowLine(-6, -3, 0, -7, '#ffffff', this.color, 2);
          renderer.drawGlowLine(0, -7, 6, -3, '#ffffff', this.color, 2);
          renderer.drawGlowLine(-6, 3, 0, 7, '#ffffff', this.color, 2);
          renderer.drawGlowLine(0, 7, 6, 3, '#ffffff', this.color, 2);
        }
        break;
      }
      case 3: {
        // Invulnerability Shield: Hexagon shield emblem
        renderer.drawGlowCircle(0, 0, 8, '#33ff33', '#33ff33', 2);
        renderer.drawGlowCircle(0, 0, 3, '#ffffff', '#33ff33', 1.5);
        break;
      }
      case 4: {
        // Zap Attack: Lightning bolt
        renderer.drawGlowLine(-3, -8, 4, -1, '#ffffff', '#ffffff', 2.5);
        renderer.drawGlowLine(4, -1, -3, 1, '#ffffff', '#ffffff', 2.5);
        renderer.drawGlowLine(-3, 1, 4, 8, '#ffffff', '#ffffff', 2.5);
        break;
      }
      case 5: {
        // Extra Health: Plus Cross
        renderer.drawGlowLine(-7, 0, 7, 0, '#ff33aa', '#ff33aa', 3);
        renderer.drawGlowLine(0, -7, 0, 7, '#ff33aa', '#ff33aa', 3);
        break;
      }
      case 6: {
        // Heat Seeker
        renderer.drawGlowLine(-6, 0, 6, 0, '#00ffff', '#00ffff', 2.5);
        renderer.drawGlowCircle(5, 0, 2.5, '#ffffff', '#00ffff', 1.5);
        break;
      }
      case 7: {
        // Portal Turret: Swept crescent station with twin turret pods
        renderer.ctx.save();
        renderer.ctx.beginPath();
        const pts: [number, number][] = [
          [-6, 0],
          [-2, -5],
          [6, -7],
          [3, -2],
          [3, 2],
          [6, 7],
          [-2, 5],
        ];
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) renderer.ctx.moveTo(pts[i][0], pts[i][1]);
          else renderer.ctx.lineTo(pts[i][0], pts[i][1]);
        }
        renderer.ctx.closePath();
        renderer.ctx.strokeStyle = this.color;
        renderer.ctx.lineWidth = 1.8;
        renderer.ctx.stroke();

        // Twin glowing turret pods
        renderer.drawGlowCircle(0, -2.5, 2, '#ffffff', this.color, 1);
        renderer.drawGlowCircle(0, 2.5, 2, '#ffffff', this.color, 1);
        renderer.ctx.restore();
        break;
      }
      case 8: {
        // Mines
        renderer.drawGlowLine(-6, -6, 6, 6, this.color, this.color, 2);
        renderer.drawGlowLine(-6, 6, 6, -6, this.color, this.color, 2);
        renderer.drawGlowCircle(0, 0, 3, '#ffffff', this.color, 1.5);
        break;
      }
      case 9: {
        // UFO
        renderer.ctx.strokeStyle = this.color;
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(0, 1, 8, 4, 0, 0, Math.PI * 2);
        renderer.ctx.stroke();
        renderer.drawGlowCircle(0, -2, 3, '#ffffff', this.color, 1.5);
        break;
      }
      case 10: {
        // Inflator
        renderer.drawGlowCircle(0, -1, 7, this.color, this.color, 2);
        renderer.drawGlowLine(0, 6, 0, 9, '#ffffff', this.color, 1.5);
        break;
      }
      case 11: {
        // MineLayer
        renderer.drawGlowLine(-7, 0, 7, 0, this.color, this.color, 2.5);
        renderer.drawGlowLine(0, -7, 0, 7, this.color, this.color, 2.5);
        renderer.drawGlowCircle(-5, 0, 2, '#ffffff', this.color, 1);
        renderer.drawGlowCircle(5, 0, 2, '#ffffff', this.color, 1);
        break;
      }
      case 12: {
        // Gunship
        renderer.drawGlowLine(-6, 6, 0, -7, this.color, this.color, 2.5);
        renderer.drawGlowLine(0, -7, 6, 6, this.color, this.color, 2.5);
        renderer.drawGlowLine(-4, 2, 4, 2, '#ffffff', this.color, 1.5);
        break;
      }
      case 13: {
        // Scarab
        renderer.drawGlowLine(-5, 0, 5, 0, this.color, this.color, 2.5);
        renderer.drawGlowLine(4, -5, 7, -7, '#ffffff', this.color, 2);
        renderer.drawGlowLine(4, 5, 7, 7, '#ffffff', this.color, 2);
        break;
      }
      case 14: {
        // Nuke: Radiation trefoil
        renderer.drawGlowCircle(0, 0, 3, '#ffffff', this.color, 1.5);
        renderer.drawGlowLine(0, -2, 0, -7, this.color, this.color, 2.5);
        renderer.drawGlowLine(-2, 2, -6, 6, this.color, this.color, 2.5);
        renderer.drawGlowLine(2, 2, 6, 6, this.color, this.color, 2.5);
        break;
      }
      case 15: {
        // WallCrawler: Authentic mechanical wall sled turret
        renderer.drawGlowLine(-6, -7, -6, 7, this.color, this.color, 2); // Wall rail
        renderer.drawGlowLine(-4, -6, 2, -6, this.color, this.color, 1.5); // Top clamp hook
        renderer.drawGlowLine(-4, 6, 2, 6, this.color, this.color, 1.5); // Bottom clamp hook
        renderer.drawGlowLine(-4, -6, -4, 6, this.color, this.color, 1.5); // Sled rail base
        renderer.drawGlowLine(-4, -3, 5, 0, '#ffffff', this.color, 2); // Turret cannon
        renderer.drawGlowLine(5, 0, -4, 3, '#ffffff', this.color, 2);
        break;
      }
      case 16: {
        // Sweep Beam
        renderer.drawGlowLine(-7, -4, 7, 4, this.color, this.color, 3);
        renderer.drawGlowCircle(0, 0, 4, '#ffffff', this.color, 1.5);
        break;
      }
      case 17: {
        // EMP
        renderer.drawGlowCircle(0, 0, 6, '#ffffff', this.color, 2);
        renderer.drawGlowLine(-6, 0, 6, 0, '#ffffff', this.color, 1.5);
        break;
      }
      case 18: {
        // Ghost Pud
        renderer.drawGlowCircle(0, 0, 5, this.color, this.color, 1.5);
        renderer.drawGlowLine(-5, 0, 5, 0, '#ffffff', this.color, 1.5);
        break;
      }
      case 19: {
        // Artillery
        renderer.drawGlowLine(-6, 4, 6, 4, this.color, this.color, 2.5);
        renderer.drawGlowLine(0, 4, 0, -6, '#ffffff', this.color, 2.5);
        renderer.drawGlowCircle(0, -6, 2.5, '#ffffff', this.color, 1.5);
        break;
      }
      default: {
        renderer.drawGlowCircle(0, 0, 4, '#ffffff', this.color, 1.5);
      }
    }

    // 3. Clear Floating Label Below Powerup
    renderer.ctx.font = 'bold 9px Orbitron, sans-serif';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillStyle = '#ffffff';
    renderer.ctx.fillText(this.shortTag, 0, currentRadius + 11);

    renderer.ctx.restore();
  }

  public static powerupRule: 'STANDARD' | 'EXTENDED' = 'STANDARD';
  public static allPowerupsAllowed = true;

  public static spawnRandom(
    x: number,
    y: number,
    playerContext?: { hasRetros?: boolean; bulletLevel?: number; isMaxThrust?: boolean },
    elapsedSec = 0,
    vx?: number,
    vy?: number
  ): Powerup {
    let type = 0;

    if (Math.random() < 0.333) {
      // 33.3% Chance: Defensive & Upgrade pool (0..5)
      let candidate = 0;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 10) {
        attempts++;
        candidate = Math.floor(Math.random() * 6);

        // Smart reroll check matching legacy PowerupSprite.java:136-146
        if (candidate === 0 && playerContext && (playerContext.bulletLevel ?? 1) >= 3) {
          continue;
        }
        if (candidate === 1 && playerContext && playerContext.isMaxThrust) {
          continue;
        }
        if (candidate === 2 && playerContext && playerContext.hasRetros) {
          continue;
        }

        // Emergency escalation depending on match time (legacy PowerupSprite.java:148-171)
        if (candidate === 3) {
          if (elapsedSec > 120) candidate = 6; // Escalates into HeatSeeker
          else if (elapsedSec > 80 && Math.random() < 0.75) candidate = 14; // Escalates into Nuke
        } else if (candidate === 4) {
          if (elapsedSec > 120) candidate = 7; // Escalates into Turret
        } else if (candidate === 5) {
          if (elapsedSec > 60) candidate = 14; // Escalates into Nuke
        }

        valid = true;
      }

      type = candidate;
    } else {
      // 66.7% Chance: Offensive Hazards (11 in Standard: 6..16; 14 in Extended: 6..19)
      const hazardCount = Powerup.powerupRule === 'EXTENDED' ? 14 : 11;
      type = 6 + Math.floor(Math.random() * hazardCount);

      // Authentic Nuke rarity damping (legacy PowerupSprite.java:178):
      if (type === 14 && Math.random() < 0.5) {
        type = 6 + Math.floor(Math.random() * hazardCount);
      }
    }

    if (vx === undefined || vy === undefined) {
      // Authentic high-velocity dispersion from PowerupSprite.java:183 & WHUtil.randInt(10)
      // Launches outward at speed 4.5 to 7.5 px/frame (270 - 450 px/sec at 60 FPS)
      const angle = Math.random() * Math.PI * 2;
      const speed = 4.5 + Math.random() * 3.0;
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    }

    return new Powerup(x, y, type, vx, vy);
  }
}

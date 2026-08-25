import { VectorRenderer } from '../graphics/VectorRenderer';

export interface Particle {
  update(dt: number): boolean; // returns false if dead
  draw(renderer: VectorRenderer): void;
}

export class ThrustParticle implements Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public maxLife: number;
  public life: number;
  public color: string;

  constructor(x: number, y: number, vx: number, vy: number, color?: string) {
    this.x = x;
    this.y = y;
    this.vx = vx + (Math.random() - 0.5) * 0.8;
    this.vy = vy + (Math.random() - 0.5) * 0.8;
    this.radius = 8 + Math.random() * 4; // Starts large (8-12px)
    this.maxLife = 0.50 + Math.random() * 0.12; // 30-36 frames long trail (~0.5s)
    this.life = this.maxLife;

    // Authentic original colors: orange, yellow, red, white-hot
    const flameColors = ['#ffcc00', '#ff9900', '#ff4400', '#ff2200', '#ffffff'];
    this.color = color || flameColors[Math.floor(Math.random() * flameColors.length)];
  }

  public update(dt: number): boolean {
    this.life -= dt;
    if (this.life <= 0) return false;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    return true;
  }

  public draw(renderer: VectorRenderer): void {
    const ratio = Math.max(0, this.life / this.maxLife);
    const r = Math.max(2, this.radius * (0.3 + 0.7 * ratio));
    const ctx = renderer.ctx;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.min(1.0, ratio * 0.85);
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Explosion implements Particle {
  public x: number;
  public y: number;
  public radius = 0;
  public maxRadius = 45;
  public life = 0.35;
  public maxLife = 0.35;
  public color: string;

  constructor(x: number, y: number, color = '#ffaa00', maxRadius = 45) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.maxRadius = maxRadius;
  }

  public update(dt: number): boolean {
    this.life -= dt;
    if (this.life <= 0) return false;

    const progress = 1 - this.life / this.maxLife;
    this.radius = progress * this.maxRadius;
    return true;
  }

  public draw(renderer: VectorRenderer): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    const ctx = renderer.ctx;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, 2.0 * alpha);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export class Shrapnel implements Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public angle: number;
  public vAngle: number;
  public length: number;
  public life: number;
  public maxLife: number;
  public color: string;

  constructor(x: number, y: number, color = '#00ffcc', vx?: number, vy?: number) {
    this.x = x;
    this.y = y;
    if (vx !== undefined && vy !== undefined) {
      this.vx = vx;
      this.vy = vy;
    } else {
      const speed = 2.0 + Math.random() * 4.0;
      const dir = Math.random() * Math.PI * 2;
      this.vx = Math.cos(dir) * speed;
      this.vy = Math.sin(dir) * speed;
    }
    this.angle = Math.random() * Math.PI * 2;
    this.vAngle = (Math.random() - 0.5) * 6;
    this.length = 3 + Math.random() * 6;
    this.maxLife = 0.35 + Math.random() * 0.25;
    this.life = this.maxLife;
    this.color = color;
  }

  public update(dt: number): boolean {
    this.life -= dt;
    if (this.life <= 0) return false;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.angle += this.vAngle * dt;
    return true;
  }

  public draw(renderer: VectorRenderer): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    const hx = (Math.cos(this.angle) * this.length) / 2;
    const hy = (Math.sin(this.angle) * this.length) / 2;
    const ctx = renderer.ctx;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(this.x - hx, this.y - hy);
    ctx.lineTo(this.x + hx, this.y + hy);
    ctx.stroke();
  }
}

export class HazardIngestionVortex implements Particle {
  public x: number;
  public y: number;
  public startX: number;
  public startY: number;
  public targetWhX: number;
  public targetWhY: number;
  public life = 0.35;
  public maxLife = 0.35;
  public color: string;
  public powerupType: number;
  public onIngest?: () => void;
  private trail: Array<{ x: number; y: number }> = [];

  constructor(
    startX: number,
    startY: number,
    targetWhX: number,
    targetWhY: number,
    powerupType: number,
    color = '#ffaa00',
    onIngest?: () => void
  ) {
    this.startX = startX;
    this.startY = startY;
    this.x = startX;
    this.y = startY;
    this.targetWhX = targetWhX;
    this.targetWhY = targetWhY;
    this.powerupType = powerupType;
    this.color = color;
    this.onIngest = onIngest;
  }

  public update(dt: number): boolean {
    this.life -= dt;
    const progress = 1.0 - Math.max(0, this.life / this.maxLife); // 0 -> 1

    // Spiral accretion trajectory curving into target wormhole singularity
    const ease = progress * progress * (3 - 2 * progress); // smoothstep
    const currentDist = 1.0 - ease;
    const startAngle = Math.atan2(this.startY - this.targetWhY, this.startX - this.targetWhX);
    const spiralAngle = startAngle + progress * Math.PI * 4.0; // 2 accelerating spiral rotations

    const startRadius = Math.hypot(this.startX - this.targetWhX, this.startY - this.targetWhY);
    const r = startRadius * currentDist;

    this.x = this.targetWhX + Math.cos(spiralAngle) * r;
    this.y = this.targetWhY + Math.sin(spiralAngle) * (r * 0.5); // flat accretion ellipse

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();

    if (this.life <= 0) {
      if (this.onIngest) this.onIngest();
      return false;
    }
    return true;
  }

  public draw(renderer: VectorRenderer): void {
    const ctx = renderer.ctx;
    const alpha = Math.max(0, this.life / this.maxLife);
    const progress = 1.0 - alpha;

    ctx.save();

    // 1. Spaghettification suction energy streak
    if (this.trail.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, 4 * (1 - progress));
      ctx.globalAlpha = alpha * 0.8;
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 2. Swallowed hazard capsule / core orb
    const size = Math.max(2, 10 * (1 - progress * 0.7));
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

export class WormholeImplosion implements Particle {
  public x: number;
  public y: number;
  public radius = 60;
  public life = 0.35;
  public maxLife = 0.35;
  public color: string;

  constructor(x: number, y: number, color = '#00e5ff') {
    this.x = x;
    this.y = y;
    this.color = color;
  }

  public update(dt: number): boolean {
    this.life -= dt;
    this.radius = Math.max(2, 60 * (this.life / this.maxLife));
    return this.life > 0;
  }

  public draw(renderer: VectorRenderer): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    const ctx = renderer.ctx;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 0.45, this.radius * 0.225, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class SparkShard implements Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public length: number;
  public life: number;
  public maxLife: number;
  public color: string;

  constructor(x: number, y: number, color = '#ffaa00', vx?: number, vy?: number) {
    this.x = x;
    this.y = y;
    if (vx !== undefined && vy !== undefined) {
      this.vx = vx;
      this.vy = vy;
    } else {
      const speed = 4.0 + Math.random() * 6.5;
      const dir = Math.random() * Math.PI * 2;
      this.vx = Math.cos(dir) * speed;
      this.vy = Math.sin(dir) * speed;
    }
    this.length = 6 + Math.random() * 8;
    this.maxLife = 0.30 + Math.random() * 0.20;
    this.life = this.maxLife;
    this.color = color;
  }

  public update(dt: number): boolean {
    this.life -= dt;
    if (this.life <= 0) return false;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= 0.96;
    this.vy *= 0.96;
    return true;
  }

  public draw(renderer: VectorRenderer): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    const speed = Math.hypot(this.vx, this.vy);
    const trailLen = Math.max(this.length, speed * 2.2);
    const angle = Math.atan2(this.vy, this.vx);
    const tx = this.x - Math.cos(angle) * trailLen;
    const ty = this.y - Math.sin(angle) * trailLen;
    const ctx = renderer.ctx;

    // 1. Neon Saturated Tail
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    // 2. White-Hot Searing Needle Head
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - Math.cos(angle) * (trailLen * 0.4), this.y - Math.sin(angle) * (trailLen * 0.4));
    ctx.stroke();
  }
}

export class ParticleSystem {
  public particles: Particle[] = [];
  public enableSparkShards = true;

  public add(p: Particle): void {
    if (this.particles.length < 240) {
      this.particles.push(p);
    }
  }

  public createThrust(x: number, y: number, vx: number, vy: number, color?: string): void {
    this.add(new ThrustParticle(x, y, vx, vy, color));
    if (this.enableSparkShards && Math.random() < 0.35) {
      this.add(new SparkShard(x, y, color || '#ffaa00', vx * 1.5 + (Math.random() - 0.5) * 1.2, vy * 1.5 + (Math.random() - 0.5) * 1.2));
    }
  }

  public createExplosion(x: number, y: number, color = '#ffaa00', shrapnelCount = 8): void {
    this.add(new Explosion(x, y, color));
    const count = Math.min(shrapnelCount, 8);
    for (let i = 0; i < count; i++) {
      if (this.enableSparkShards && Math.random() < 0.6) {
        this.add(new SparkShard(x, y, color));
      } else {
        this.add(new Shrapnel(x, y, color));
      }
    }
  }

  public createWormholeImplosion(x: number, y: number, color = '#00e5ff'): void {
    this.add(new WormholeImplosion(x, y, color));
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const speed = 3.5 + Math.random() * 3.0;
      this.add(new Shrapnel(x, y, color, Math.cos(angle) * speed, Math.sin(angle) * speed));
    }
  }

  public createHazardIngestion(
    startX: number,
    startY: number,
    targetWhX: number,
    targetWhY: number,
    powerupType: number,
    color = '#ffaa00',
    onIngest?: () => void
  ): void {
    this.add(
      new HazardIngestionVortex(
        startX,
        startY,
        targetWhX,
        targetWhY,
        powerupType,
        color,
        onIngest
      )
    );
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(dt)) {
        this.particles.splice(i, 1);
      }
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (this.particles.length === 0) return;

    const ctx = renderer.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // Hardware accelerated additive blending

    for (const p of this.particles) {
      p.draw(renderer);
    }

    ctx.restore();
  }
}

/**
 * Headless zero-cost particle system for off-screen AI realms
 */
export class NullParticleSystem extends ParticleSystem {
  public override add(_p: Particle): void {}
  public override createExplosion(_x: number, _y: number, _color = '#ffaa00', _shrapnelCount = 8): void {}
  public override update(_dt: number): void {}
  public override draw(_renderer: VectorRenderer): void {}
}

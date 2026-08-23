import { VectorRenderer } from '../graphics/VectorRenderer';
import { ParticleSystem } from './Particle';
import { SoundEngine } from '../audio/SoundEngine';

export class TargetDummy {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public angle = 0;
  public radius = 18;
  public health = 50;
  public maxHealth = 50;
  public isAlive = true;
  public color = '#ff3344';
  public orbitAngle: number;
  public orbitRadius: number;

  constructor(orbitRadius = 270, orbitAngle = 0, color = '#ff3344') {
    this.orbitRadius = orbitRadius;
    this.orbitAngle = orbitAngle;
    this.color = color;
    this.x = Math.cos(orbitAngle) * orbitRadius;
    this.y = Math.sin(orbitAngle) * orbitRadius;
    this.vx = 0;
    this.vy = 0;
  }

  public update(dt: number): void {
    if (!this.isAlive) return;

    this.orbitAngle += dt * 0.4;
    this.x = Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = Math.sin(this.orbitAngle) * this.orbitRadius;
    this.angle += dt * 1.5;
  }

  public takeDamage(dmg: number, particles: ParticleSystem, sound: SoundEngine): void {
    this.health -= dmg;
    particles.createExplosion(this.x, this.y, this.color, 4);

    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      particles.createExplosion(this.x, this.y, this.color, 16);
      sound.playExplosion();

      // Respawn after 3 seconds
      setTimeout(() => {
        this.health = this.maxHealth;
        this.isAlive = true;
      }, 3000);
    }
  }

  public draw(renderer: VectorRenderer): void {
    if (!this.isAlive) return;

    renderer.ctx.save();
    renderer.ctx.translate(this.x, this.y);
    renderer.ctx.rotate(this.angle);

    // Drone polygon wireframe
    renderer.drawGlowCircle(0, 0, this.radius, this.color, this.color, 1.5, true, 'rgba(40, 0, 10, 0.4)');
    renderer.drawCrosshair(0, 0, this.radius * 0.8, this.color);

    // Drone health bar
    renderer.ctx.rotate(-this.angle);
    renderer.drawHealthBar(0, this.radius + 6, this.health, this.maxHealth, 24, 3, this.color);

    renderer.ctx.restore();
  }
}

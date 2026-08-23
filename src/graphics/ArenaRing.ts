import { VectorRenderer } from './VectorRenderer';

export class ArenaRing {
  public orbitRadius: number;
  public arenaWidth: number;
  public arenaHeight: number;
  public gridSpacing = 80;
  public pulsePhase = 0;

  constructor(orbitRadius = 270, arenaWidth = 1400, arenaHeight = 1400) {
    this.orbitRadius = orbitRadius;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
  }

  public setDimensions(orbitRadius: number, arenaWidth: number, arenaHeight: number): void {
    this.orbitRadius = orbitRadius;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
  }

  public update(dt: number): void {
    this.pulsePhase = (this.pulsePhase + dt * 1.5) % (Math.PI * 2);
  }

  public draw(renderer: VectorRenderer, borderColor = '#00ffcc'): void {
    const halfW = this.arenaWidth / 2;
    const halfH = this.arenaHeight / 2;

    // 1. Subtle background grid
    const ctx = renderer.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(30, 60, 90, 0.25)';
    ctx.lineWidth = 1;

    for (let x = -halfW; x <= halfW; x += this.gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, -halfH);
      ctx.lineTo(x, halfH);
      ctx.stroke();
    }
    for (let y = -halfH; y <= halfH; y += this.gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(-halfW, y);
      ctx.lineTo(halfW, y);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Central Orbital Track Ring
    const pulseAlpha = 0.35 + Math.sin(this.pulsePhase) * 0.1;
    renderer.drawGlowCircle(
      0,
      0,
      this.orbitRadius,
      `rgba(100, 200, 255, ${pulseAlpha.toFixed(2)})`,
      'rgba(0, 150, 255, 0.4)',
      1.5
    );

    // Center focal point
    renderer.drawGlowCircle(0, 0, 8, 'rgba(0, 255, 204, 0.4)', 'rgba(0, 255, 204, 0.2)', 1);
    renderer.drawCrosshair(0, 0, 14, 'rgba(0, 255, 204, 0.3)');

    // 3. Multi-layer boundary borders with corner accents
    renderer.drawGlowLine(-halfW, -halfH, halfW, -halfH, borderColor, borderColor, 2);
    renderer.drawGlowLine(halfW, -halfH, halfW, halfH, borderColor, borderColor, 2);
    renderer.drawGlowLine(halfW, halfH, -halfW, halfH, borderColor, borderColor, 2);
    renderer.drawGlowLine(-halfW, halfH, -halfW, -halfH, borderColor, borderColor, 2);

    // Corner brackets
    const bracketSize = 40;
    // Top-Left
    renderer.drawGlowLine(-halfW, -halfH + bracketSize, -halfW, -halfH, borderColor, borderColor, 3);
    renderer.drawGlowLine(-halfW, -halfH, -halfW + bracketSize, -halfH, borderColor, borderColor, 3);
    // Top-Right
    renderer.drawGlowLine(halfW - bracketSize, -halfH, halfW, -halfH, borderColor, borderColor, 3);
    renderer.drawGlowLine(halfW, -halfH, halfW, -halfH + bracketSize, borderColor, borderColor, 3);
    // Bottom-Right
    renderer.drawGlowLine(halfW, halfH - bracketSize, halfW, halfH, borderColor, borderColor, 3);
    renderer.drawGlowLine(halfW, halfH, halfW - bracketSize, halfH, borderColor, borderColor, 3);
    // Bottom-Left
    renderer.drawGlowLine(-halfW + bracketSize, halfH, -halfW, halfH, borderColor, borderColor, 3);
    renderer.drawGlowLine(-halfW, halfH, -halfW, halfH - bracketSize, borderColor, borderColor, 3);
  }
}

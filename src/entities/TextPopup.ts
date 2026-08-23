import { VectorRenderer } from '../graphics/VectorRenderer';

export class TextPopup {
  public x: number;
  public y: number;
  public text: string;
  public color: string;
  public life = 1.6; // ~100 frames
  public maxLife = 1.6;
  public vy = -0.6; // Slowly floats upwards

  constructor(x: number, y: number, text: string, color = '#ffffff') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
  }

  public update(dt: number): boolean {
    this.life -= dt;
    if (this.life <= 0) return false;

    this.y += this.vy * dt * 60;
    return true;
  }

  public draw(renderer: VectorRenderer): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    renderer.ctx.save();
    renderer.ctx.globalAlpha = alpha;
    renderer.drawGlowText(
      this.text,
      this.x,
      this.y,
      'bold 12px "Courier New", monospace',
      this.color,
      this.color,
      'center'
    );
    renderer.ctx.restore();
  }
}

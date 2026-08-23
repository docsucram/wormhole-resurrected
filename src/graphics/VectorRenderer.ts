import { Point2D, RotationalPolygon } from '../math/RotationalPolygon';

export interface RenderOptions {
  enableGlow?: boolean;
  glowBlur?: number;
  bloomPasses?: number;
  lineWidthScale?: number;
}

export class VectorRenderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public dpr = 1;
  public width = 800;
  public height = 600;
  public options: RenderOptions = {
    enableGlow: true,
    glowBlur: 6,
    bloomPasses: 1,
    lineWidthScale: 1,
  };

  constructor(canvas: HTMLCanvasElement, options?: Partial<RenderOptions>) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context');
    }
    this.ctx = ctx;
    if (options) {
      this.options = { ...this.options, ...options };
    }
    this.resize();
  }

  public resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width > 0 ? rect.width : window.innerWidth;
    this.height = rect.height > 0 ? rect.height : window.innerHeight;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public beginFrame(bgColor = '#030610'): void {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public endFrame(): void {
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
  }

  /**
   * Translates the canvas context to camera / world coordinates
   */
  public pushCamera(cx: number, cy: number, zoom = 1, rotation = 0): void {
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(zoom, zoom);
    if (rotation !== 0) {
      this.ctx.rotate(rotation);
    }
    this.ctx.translate(-cx, -cy);
  }

  public popCamera(): void {
    this.ctx.restore();
  }

  /**
   * Draws arbitrary point-list polygon with neon vector styling
   */
  public drawPolygon(
    points: Point2D[],
    color: string,
    glowColor = color,
    lineWidth = 2,
    filled = false,
    fillColor = 'rgba(0, 0, 0, 0.4)'
  ): void {
    if (points.length < 2) return;

    this.ctx.save();

    if (filled) {
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
      this.ctx.closePath();
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
    }

    if (this.options.enableGlow) {
      this.ctx.shadowBlur = this.options.glowBlur || 6;
      this.ctx.shadowColor = glowColor;
    } else {
      this.ctx.shadowBlur = 0;
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth * this.options.lineWidthScale!;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
    this.ctx.restore();
  }

  /**
   * Draws a RotationalPolygon at position (cx, cy) and scale
   */
  public drawRotationalPolygon(
    poly: RotationalPolygon,
    cx = 0,
    cy = 0,
    scale = 1,
    color = '#00ffcc',
    glowColor = color,
    lineWidth = 2,
    filled = false,
    fillColor = 'rgba(0, 0, 0, 0.4)'
  ): void {
    const transformed = poly.getTransformedPoints(cx, cy, scale);
    this.drawPolygon(transformed, color, glowColor, lineWidth, filled, fillColor);
  }

  /**
   * Draws a neon glowing circle
   */
  public drawGlowCircle(
    cx: number,
    cy: number,
    radius: number,
    color: string,
    glowColor = color,
    lineWidth = 2,
    filled = false,
    fillColor = 'rgba(0, 0, 0, 0.4)'
  ): void {
    if (filled) {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
    }

    if (this.options.enableGlow) {
      this.ctx.shadowBlur = this.options.glowBlur || 6;
      this.ctx.shadowColor = glowColor;
    } else {
      this.ctx.shadowBlur = 0;
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth * this.options.lineWidthScale!;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
  }

  /**
   * Draws a glowing arc
   */
  public drawGlowArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: string,
    glowColor = color,
    lineWidth = 2
  ): void {
    if (this.options.enableGlow) {
      this.ctx.shadowBlur = this.options.glowBlur || 6;
      this.ctx.shadowColor = glowColor;
    } else {
      this.ctx.shadowBlur = 0;
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth * this.options.lineWidthScale!;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, startAngle, endAngle);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
  }

  /**
   * Draws a neon vector line
   */
  public drawGlowLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    glowColor = color,
    lineWidth = 2
  ): void {
    if (this.options.enableGlow) {
      this.ctx.shadowBlur = this.options.glowBlur || 6;
      this.ctx.shadowColor = glowColor;
    } else {
      this.ctx.shadowBlur = 0;
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth * this.options.lineWidthScale!;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
  }

  /**
   * Draws centered glowing text with vector aesthetic
   */
  public drawGlowText(
    text: string,
    x: number,
    y: number,
    font = '12px "Courier New", monospace',
    color = '#00ffcc',
    _glowColor = color,
    align: CanvasTextAlign = 'center'
  ): void {
    this.ctx.save();
    this.ctx.font = font;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
  }

  /**
   * Draws compact floating health bar
   */
  public drawHealthBar(
    cx: number,
    cy: number,
    current: number,
    max: number,
    width = 30,
    height = 3,
    color = '#00ffcc'
  ): void {
    if (current <= 0 || max <= 0) return;
    this.ctx.save();
    const halfW = width / 2;
    // Background bar
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(cx - halfW, cy, width, height);

    // Foreground health fill
    const pct = Math.max(0, Math.min(1, current / max));
    this.ctx.fillStyle = color;
    this.ctx.fillRect(cx - halfW, cy, width * pct, height);

    // Border
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(cx - halfW, cy, width, height);
    this.ctx.restore();
  }

  /**
   * Draws crosshair targeting reticle
   */
  public drawCrosshair(x: number, y: number, size = 12, color = '#00ffcc'): void {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;

    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.moveTo(x - size - 4, y);
    this.ctx.lineTo(x - size + 3, y);
    this.ctx.moveTo(x + size - 3, y);
    this.ctx.lineTo(x + size + 4, y);
    this.ctx.moveTo(x, y - size - 4);
    this.ctx.lineTo(x, y - size + 3);
    this.ctx.moveTo(x, y + size - 3);
    this.ctx.lineTo(x, y + size + 4);
    this.ctx.stroke();
    this.ctx.restore();
  }
}

import { VectorRenderer } from './VectorRenderer';

export interface Star {
  x: number;
  y: number;
  size: number;
  baseBrightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
  layer: number; // 0=far (slow), 1=mid, 2=near
}

export class Starfield {
  public stars: Star[] = [];
  public count = 160;
  public arenaWidth = 2400;
  public arenaHeight = 2400;
  public showVectorGrid = true;

  constructor(arenaWidth = 2400, arenaHeight = 2400, count = 160) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.count = count;
    this.init();
  }

  public init(): void {
    this.stars = [];
    for (let i = 0; i < this.count; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * this.arenaWidth,
        y: (Math.random() - 0.5) * this.arenaHeight,
        size: Math.random() < 0.6 ? 1.2 : Math.random() < 0.85 ? 1.8 : 2.4,
        baseBrightness: 0.35 + Math.random() * 0.55,
        twinkleSpeed: 0.8 + Math.random() * 2.0,
        twinklePhase: Math.random() * Math.PI * 2,
        layer: Math.random() < 0.5 ? 0 : Math.random() < 0.8 ? 1 : 2,
      });
    }
  }

  public update(dt: number): void {
    for (const star of this.stars) {
      star.twinklePhase += star.twinkleSpeed * dt;
    }
  }

  public draw(target: VectorRenderer | CanvasRenderingContext2D, camX = 0, camY = 0): void {
    const ctx = target instanceof CanvasRenderingContext2D ? target : target.ctx;
    const w = target instanceof VectorRenderer ? target.width : window.innerWidth;
    const h = target instanceof VectorRenderer ? target.height : window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    ctx.save();

    // 1. Retro Vector Grid (Geometry Wars ambient grid)
    if (this.showVectorGrid) {
      const gridSize = 90;
      const offsetX = (cx - camX * 0.2) % gridSize;
      const offsetY = (cy - camY * 0.2) % gridSize;

      ctx.strokeStyle = 'rgba(0, 210, 255, 0.08)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();

      for (let x = offsetX - gridSize; x <= w + gridSize; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = offsetY - gridSize; y <= h + gridSize; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }
    // Use fast pre-defined alpha buckets to eliminate 160 string allocations per frame
    const bucketFar: number[][] = [];
    const bucketMid: number[][] = [];
    const bucketNear: number[][] = [];

    for (const star of this.stars) {
      const factor = star.layer === 0 ? 0.15 : star.layer === 1 ? 0.4 : 0.75;
      const drawX = cx + star.x - camX * factor;
      const drawY = cy + star.y - camY * factor;

      if (drawX < 0 || drawX > w || drawY < 0 || drawY > h) continue;

      if (star.layer === 0) {
        bucketFar.push([drawX, drawY, star.size]);
      } else if (star.layer === 1) {
        bucketMid.push([drawX, drawY, star.size]);
      } else {
        bucketNear.push([drawX, drawY, star.size]);
      }
    }

    ctx.fillStyle = 'rgba(200, 230, 255, 0.35)';
    for (const s of bucketFar) {
      ctx.fillRect(s[0], s[1], s[2], s[2]);
    }
    ctx.fillStyle = 'rgba(220, 240, 255, 0.65)';
    for (const s of bucketMid) {
      ctx.fillRect(s[0], s[1], s[2], s[2]);
    }
    ctx.fillStyle = 'rgba(240, 250, 255, 0.95)';
    for (const s of bucketNear) {
      ctx.fillRect(s[0], s[1], s[2], s[2]);
    }

    ctx.restore();
  }
}

import { VectorRenderer } from '../graphics/VectorRenderer';
import { ShipCatalog, CompiledShip } from '../entities/ShipCatalog';

export class HangarView {
  private canvas: HTMLCanvasElement;
  private renderer: VectorRenderer;
  public selectedShipIndex = 0; // Default to The Tank
  public selectedColorIndex = 0; // Default to Cyan
  private rotationAngle = 0;
  private isAnimating = false;
  private animFrameId: number | null = null;
  private uiPrefix: string;

  constructor(canvasId: string, uiPrefix = 'hangar-') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.uiPrefix = uiPrefix;
    this.renderer = new VectorRenderer(this.canvas, {
      enableGlow: true,
      glowBlur: 10,
      lineWidthScale: 1,
    });
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const w = rect && rect.width > 0 ? rect.width : 130;
    const h = rect && rect.height > 0 ? rect.height : 130;

    this.canvas.width = Math.floor(w * (window.devicePixelRatio || 1));
    this.canvas.height = Math.floor(h * (window.devicePixelRatio || 1));
    this.renderer.resize();
  }

  public setShip(index: number): void {
    this.selectedShipIndex = index;
    this.updateStatsUI();
  }

  public setColor(index: number): void {
    this.selectedColorIndex = index;
  }

  public getSelectedShip(): CompiledShip {
    return ShipCatalog.get(this.selectedShipIndex);
  }

  public startPreview(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.resize();
    this.animate();
  }

  public stopPreview(): void {
    this.isAnimating = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private animate(): void {
    if (!this.isAnimating) return;

    this.rotationAngle += 0.012; // Smooth and graceful rotation speed
    this.render();

    this.animFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  public render(): void {
    this.renderer.beginFrame('#020612');

    const cx = this.renderer.width / 2;
    const cy = this.renderer.height / 2;

    const ship = this.getSelectedShip();
    const neonGreen = '#00ff88';

    // 1. Draw 3D Rotating Ship Mesh in pure neon green wireframe
    const poly = ship.visualPoly.clone();
    poly.setAngle(this.rotationAngle);

    // Scale calibrated for prominent showcase
    const scale = this.uiPrefix === 'modal-' ? 2.4 : 3.4;
    this.renderer.drawRotationalPolygon(
      poly,
      cx,
      cy,
      scale,
      neonGreen,
      neonGreen,
      2.4,
      true,
      'rgba(0, 255, 136, 0.04)'
    );

    this.renderer.endFrame();
  }

  public updateStatsUI(): void {
    const ship = this.getSelectedShip();
    const cfg = ship.config;

    const nameEl = document.getElementById(`${this.uiPrefix}ship-name`);
    if (nameEl) nameEl.innerText = cfg.name;

    // Description
    const descEl = document.getElementById(`${this.uiPrefix}ship-desc`);
    if (descEl) descEl.innerText = cfg.description.join(' ');

    // Stat bars (normalized to 100%)
    const hpPct = Math.min(100, (cfg.hitPoints / 300) * 100);
    const speedPct = Math.min(100, (cfg.maxThrust / 11) * 100);
    const agilPct = Math.min(100, (cfg.rotateSpeed / 12) * 100);

    const barHp = document.getElementById(`${this.uiPrefix}bar-hp`);
    if (barHp) barHp.style.width = `${hpPct}%`;
    const barSpeed = document.getElementById(`${this.uiPrefix}bar-speed`);
    if (barSpeed) barSpeed.style.width = `${speedPct}%`;
    const barAgil = document.getElementById(`${this.uiPrefix}bar-agil`);
    if (barAgil) barAgil.style.width = `${agilPct}%`;

    // Special Ability
    const specialNames = ['NONE', 'TURTLE CANNON', 'SHAPESHIFTER', 'HEAT SEEKER MISSILES', 'ATTRACTOR / REPULSER'];
    const specEl = document.getElementById(`${this.uiPrefix}special-name`) || document.getElementById(`${this.uiPrefix}ship-special`);
    if (specEl) specEl.innerText = specialNames[cfg.specialType] || 'NONE';
  }
}

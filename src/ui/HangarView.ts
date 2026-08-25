import { VectorRenderer } from '../graphics/VectorRenderer';
import { ShipCatalog, CompiledShip } from '../entities/ShipCatalog';
import { PLAYER_COLORS } from '../core/Constants';

export class HangarView {
  public canvas: HTMLCanvasElement;
  public renderer: VectorRenderer;
  public selectedShipIndex = 0; // Default to The Tank
  public selectedColorIndex = 0; // Default to Cyan
  private rotationAngle = 0;
  public isAnimating = false;
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
    this.isAnimating = true;
    this.resize();
    this.render();
  }

  public stopPreview(): void {
    this.isAnimating = false;
  }

  public updateAndRender(dt: number): void {
    if (!this.isAnimating) return;
    this.rotationAngle += dt * 0.75; // Smooth 60FPS calibrated rotation speed
    this.render();
  }

  public render(): void {
    this.renderer.beginFrame('#020612');

    const cx = this.renderer.width / 2;
    const cy = this.renderer.height / 2;

    const ship = this.getSelectedShip();
    const colorProfile = PLAYER_COLORS[this.selectedColorIndex % PLAYER_COLORS.length] || PLAYER_COLORS[0];
    const shipColor = colorProfile.primary;
    const shipGlow = colorProfile.glow;

    // 1. Draw 3D Rotating Ship Mesh in selected player color wireframe
    const poly = ship.visualPoly.clone();
    poly.setAngle(this.rotationAngle);

    // Scale calibrated for prominent showcase
    const scale = this.uiPrefix === 'modal-' ? 2.4 : 3.4;
    this.renderer.drawRotationalPolygon(
      poly,
      cx,
      cy,
      scale,
      shipColor,
      shipGlow,
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

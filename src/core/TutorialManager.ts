import { VectorRenderer } from '../graphics/VectorRenderer';
import { PlayerShip } from '../entities/PlayerShip';
import { Wormhole } from '../entities/Wormhole';
import { Powerup } from '../entities/Powerup';
import { InputManager } from './InputManager';

export type TutorialStep =
  | 'SHOOT_WORMHOLE'
  | 'COLLECT_DEFENSIVE'
  | 'COLLECT_OFFENSIVE'
  | 'INVENTORY_AND_LAUNCH'
  | 'OBJECTIVE_WIN'
  | 'COMPLETED';

export class TutorialManager {
  public isActive = false;
  public currentStep: TutorialStep = 'SHOOT_WORMHOLE';
  public stepTimer = 0;
  public bannerTimer = 0;
  private hasSeenDefensive = false;
  public hasCollectedOffensive = false;
  public hasLaunchedOffensive = false;

  public start(): void {
    this.isActive = true;
    this.currentStep = 'SHOOT_WORMHOLE';
    this.stepTimer = 0;
    this.bannerTimer = 0;
    this.hasSeenDefensive = false;
    this.hasCollectedOffensive = false;
    this.hasLaunchedOffensive = false;
  }

  public stop(): void {
    this.isActive = false;
    this.currentStep = 'COMPLETED';
  }

  public onPowerupSpawned(pupType: number): void {
    if (!this.isActive) return;

    if (pupType < 6) {
      this.hasSeenDefensive = true;
      if (this.currentStep === 'SHOOT_WORMHOLE') {
        this.currentStep = 'COLLECT_DEFENSIVE';
      }
    } else {
      if (this.currentStep === 'SHOOT_WORMHOLE' || (this.currentStep === 'COLLECT_DEFENSIVE' && !this.hasSeenDefensive)) {
        this.currentStep = 'COLLECT_OFFENSIVE';
      }
    }
  }

  public onPowerupCollected(pupType: number): void {
    if (!this.isActive) return;

    if (pupType < 6) {
      if (this.currentStep === 'COLLECT_DEFENSIVE') {
        this.currentStep = 'COLLECT_OFFENSIVE';
      }
    } else {
      this.hasCollectedOffensive = true;
      this.currentStep = 'INVENTORY_AND_LAUNCH';
    }
  }

  public onOffensiveLaunched(): void {
    if (!this.isActive) return;
    this.hasLaunchedOffensive = true;
    this.currentStep = 'OBJECTIVE_WIN';
    this.bannerTimer = 6.0;
  }

  public update(dt: number, powerups: Powerup[], player: PlayerShip): void {
    if (!this.isActive || this.currentStep === 'COMPLETED') return;

    this.stepTimer += dt;

    if (this.currentStep === 'OBJECTIVE_WIN') {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.stop();
      }
      return;
    }

    if (this.currentStep === 'SHOOT_WORMHOLE') {
      const defPup = powerups.find((p) => p.isAlive && p.type < 6);
      const offPup = powerups.find((p) => p.isAlive && p.type >= 6);
      if (defPup) {
        this.currentStep = 'COLLECT_DEFENSIVE';
      } else if (offPup) {
        this.currentStep = 'COLLECT_OFFENSIVE';
      }
    } else if (this.currentStep === 'COLLECT_DEFENSIVE') {
      const defPup = powerups.find((p) => p.isAlive && p.type < 6);
      const offPup = powerups.find((p) => p.isAlive && p.type >= 6);
      if (!defPup && offPup) {
        this.currentStep = 'COLLECT_OFFENSIVE';
      } else if (player.powerupInventory.length > 0) {
        this.currentStep = 'INVENTORY_AND_LAUNCH';
      }
    } else if (this.currentStep === 'COLLECT_OFFENSIVE') {
      if (player.powerupInventory.length > 0) {
        this.currentStep = 'INVENTORY_AND_LAUNCH';
      }
    }
  }

  public draw(
    renderer: VectorRenderer,
    player: PlayerShip,
    wormholes: Wormhole[],
    powerups: Powerup[],
    camX: number,
    camY: number,
    zoom: number,
    isMobile: boolean,
    input: InputManager
  ): void {
    if (!this.isActive || this.currentStep === 'COMPLETED') return;

    const ctx = renderer.ctx;
    const w = renderer.width;
    const h = renderer.height;
    const cx = w / 2;
    const cy = h / 2;

    const fireKey = isMobile ? '[FIRE]' : input.getKeyPrompt('fire', isMobile);
    const launchKey = isMobile ? '[LAUNCH]' : input.getKeyPrompt('secondaryFire', isMobile);

    const time = Date.now() * 0.005;
    const pulse = 0.85 + Math.sin(time * 3) * 0.15;

    ctx.save();

    if (this.currentStep === 'SHOOT_WORMHOLE') {
      const wh = wormholes.find((w) => w.slot === player.slot) || wormholes[0];
      if (wh && wh.isAlive) {
        const sx = cx + (wh.x - camX) * zoom;
        const sy = cy + (wh.y - camY) * zoom;

        this.drawTargetBeacon(ctx, sx, sy, 34 * zoom, '#00e5ff', pulse);

        const badgeX = Math.max(140, Math.min(w - 140, sx));
        const badgeY = Math.max(90, Math.min(h - 120, sy - 75));
        this.drawBadgeWithLeader(
          ctx,
          badgeX,
          badgeY,
          sx,
          sy,
          `SHOOT WORMHOLE WITH ${fireKey} TO RELEASE POWERUPS`,
          '#00e5ff'
        );
      }
    } else if (this.currentStep === 'COLLECT_DEFENSIVE') {
      const defPup = powerups.find((p) => p.isAlive && p.type < 6) || powerups.find((p) => p.isAlive);
      if (defPup) {
        const sx = cx + (defPup.x - camX) * zoom;
        const sy = cy + (defPup.y - camY) * zoom;

        this.drawTargetBeacon(ctx, sx, sy, 22 * zoom, '#00ff88', pulse);

        const badgeX = Math.max(160, Math.min(w - 160, sx));
        const badgeY = Math.max(90, Math.min(h - 120, sy - 60));
        this.drawBadgeWithLeader(
          ctx,
          badgeX,
          badgeY,
          sx,
          sy,
          'COLLECT DEFENSIVE POWERUPS TO PROTECT & UPGRADE SHIP',
          '#00ff88'
        );
      }
    } else if (this.currentStep === 'COLLECT_OFFENSIVE') {
      const offPup = powerups.find((p) => p.isAlive && p.type >= 6) || powerups.find((p) => p.isAlive);
      if (offPup) {
        const sx = cx + (offPup.x - camX) * zoom;
        const sy = cy + (offPup.y - camY) * zoom;

        this.drawTargetBeacon(ctx, sx, sy, 22 * zoom, '#ffaa00', pulse);

        const badgeX = Math.max(160, Math.min(w - 160, sx));
        const badgeY = Math.max(90, Math.min(h - 120, sy - 60));
        this.drawBadgeWithLeader(
          ctx,
          badgeX,
          badgeY,
          sx,
          sy,
          'COLLECT OFFENSIVE POWERUPS TO STRIKE AT OPPONENTS',
          '#ffaa00'
        );
      }
    } else if (this.currentStep === 'INVENTORY_AND_LAUNCH') {
      const invCenterX = w / 2;
      const invCenterY = isMobile ? 55 : 45;
      this.drawBadgeWithLeader(
        ctx,
        invCenterX,
        invCenterY + 45,
        invCenterX,
        invCenterY,
        'YOU CAN STORE UP TO 5 OFFENSIVE POWERUPS IN YOUR INVENTORY',
        '#00e5ff'
      );

      const wh = wormholes.find((w) => w.slot === player.slot) || wormholes[0];
      if (wh && wh.isAlive) {
        const sx = cx + (wh.x - camX) * zoom;
        const sy = cy + (wh.y - camY) * zoom;

        this.drawTargetBeacon(ctx, sx, sy, 34 * zoom, '#ff3344', pulse);

        const badgeX = Math.max(160, Math.min(w - 160, sx));
        const badgeY = Math.max(140, Math.min(h - 120, sy - 75));
        this.drawBadgeWithLeader(
          ctx,
          badgeX,
          badgeY,
          sx,
          sy,
          `LAUNCH OFFENSIVE THROUGH WORMHOLE WITH ${launchKey} TO SEND HAZARDS`,
          '#ff3344'
        );
      }
    } else if (this.currentStep === 'OBJECTIVE_WIN') {
      const bannerX = w / 2;
      const bannerY = 110;
      this.drawObjectiveBanner(
        ctx,
        bannerX,
        bannerY,
        "REDUCE YOUR OPPONENT'S HEALTH TO 0 TO WIN!",
        '#00ff88',
        pulse
      );
    }

    ctx.restore();
  }

  private drawTargetBeacon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    pulse: number
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * pulse;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(x, y, radius * (0.9 + pulse * 0.2), 0, Math.PI * 2);
    ctx.stroke();

    const arm = 8;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - radius - arm, y);
    ctx.lineTo(x - radius + 2, y);
    ctx.moveTo(x + radius - 2, y);
    ctx.lineTo(x + radius + arm, y);
    ctx.moveTo(x, y - radius - arm);
    ctx.lineTo(x, y - radius + 2);
    ctx.moveTo(x, y + radius - 2);
    ctx.lineTo(x, y + radius + arm);
    ctx.stroke();

    ctx.restore();
  }

  private drawBadgeWithLeader(
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    tx: number,
    ty: number,
    text: string,
    color: string
  ): void {
    ctx.save();

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx, ty, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 11px "Courier New", monospace';
    const textW = ctx.measureText(text).width;
    const padX = 12;
    const badgeW = textW + padX * 2;
    const badgeH = 26;
    const rectX = bx - badgeW / 2;
    const rectY = by - badgeH / 2;

    ctx.fillStyle = 'rgba(2, 6, 18, 0.90)';
    ctx.fillRect(rectX, rectY, badgeW, badgeH);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rectX, rectY, badgeW, badgeH);

    ctx.fillStyle = color;
    const tabSize = 3;
    ctx.fillRect(rectX, rectY, tabSize, tabSize);
    ctx.fillRect(rectX + badgeW - tabSize, rectY, tabSize, tabSize);
    ctx.fillRect(rectX, rectY + badgeH - tabSize, tabSize, tabSize);
    ctx.fillRect(rectX + badgeW - tabSize, rectY + badgeH - tabSize, tabSize, tabSize);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx, by + 1);

    ctx.restore();
  }

  private drawObjectiveBanner(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string,
    pulse: number
  ): void {
    ctx.save();
    ctx.font = '900 13px "Orbitron", sans-serif';
    const textW = ctx.measureText(text).width;
    const badgeW = textW + 36;
    const badgeH = 34;
    const rectX = x - badgeW / 2;
    const rectY = y - badgeH / 2;

    ctx.fillStyle = 'rgba(2, 6, 18, 0.92)';
    ctx.fillRect(rectX, rectY, badgeW, badgeH);

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16 * pulse;
    ctx.lineWidth = 2;
    ctx.strokeRect(rectX, rectY, badgeW, badgeH);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);

    ctx.restore();
  }
}

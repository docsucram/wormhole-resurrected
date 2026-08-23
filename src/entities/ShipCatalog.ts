import { RotationalPolygon } from '../math/RotationalPolygon';
import { SHIP_CONFIGS, RAW_SHIP_POINTS, ShipConfig } from '../core/Constants';

export interface CompiledShip {
  config: ShipConfig;
  visualPoly: RotationalPolygon;
  collisionPoly: RotationalPolygon;
}

export class ShipCatalog {
  private static ships: CompiledShip[] = [];

  public static initialize(): void {
    if (this.ships.length > 0) return;

    for (let i = 0; i < SHIP_CONFIGS.length; i++) {
      const config = SHIP_CONFIGS[i];
      const raw = RAW_SHIP_POINTS[i];

      const visualPoly = RotationalPolygon.constructPolygon(raw, true);
      const collisionPoly = RotationalPolygon.constructPolygon(raw, false);

      this.ships.push({
        config,
        visualPoly,
        collisionPoly,
      });
    }
  }

  public static getAll(): CompiledShip[] {
    this.initialize();
    return this.ships;
  }

  public static get(shipId: number): CompiledShip {
    this.initialize();
    const ship = this.ships.find((s) => s.config.id === shipId);
    if (!ship) {
      return this.ships[1]; // Default to The Wing
    }
    return ship;
  }

  public static isShipUnlocked(shipId: number, totalWins = 0): boolean {
    const config = SHIP_CONFIGS[shipId];
    if (!config) return false;
    if (config.unlockedByDefault) return true;
    if (shipId === 3) return totalWins >= 1;
    if (shipId === 4) return totalWins >= 2;
    if (shipId === 5) return totalWins >= 3;
    if (shipId === 6) return totalWins >= 4;
    if (shipId === 7) return totalWins >= 5;
    return false;
  }
}

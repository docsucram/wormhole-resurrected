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

  public static isShipUnlocked(_shipId: number, _totalWins = 0): boolean {
    return true; // All 8 fighter classes immediately unlocked for full tactical variety
  }
}

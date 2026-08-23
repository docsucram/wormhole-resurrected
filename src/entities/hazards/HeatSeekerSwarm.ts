import { HeatSeekerMissile } from '../HeatSeekerMissile';

export class HeatSeekerSwarm {
  public static spawnSwarm(
    originX: number,
    originY: number,
    missiles: HeatSeekerMissile[],
    color = '#00ffff'
  ): void {
    const count = 12; // Authentic 12-missile swarm from PortalSprite.java
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count + (Math.random() - 0.5) * 0.3;
      const delay = Math.floor(Math.random() * 8);
      missiles.push(
        new HeatSeekerMissile(
          originX + (Math.random() - 0.5) * 20,
          originY + (Math.random() - 0.5) * 20,
          angle,
          delay,
          color
        )
      );
    }
  }
}

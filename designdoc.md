# Wormhole Resurrected — Design \& Architecture Document

\---

## 1\. Core Design Principle \& Vision

The overarching directive of **Wormhole Resurrected** is to preserve **100% faithful replication of the original Java arcade gameplay mechanics, physics, and balance** while modernizing the game for the modern web:

1. **Uncompromised Legacy Gameplay Fidelity** referring back to original code.

   * Authentic physics and balance
   * Every ship class, hazard, powerup, damage value, collision algorithm, and orbital dynamic must mathematically match the original 2000s Java client (legacy/src/client/).
   * Authentic weapons, movement, and powerups
* Authentic hazard AI behaviors (independent dual deck turrets on Gunships, 12-point WallCrawler seated on perimeter wall, expanding/shrinking octagonal Inflators, 12-missile radial HeatSeeker bursts, indestructible Ghost-Pud bumper).
2. **Modernized HD  Graphics**:

   * High-definition neon cyber vector aesthetic rendered via HTML5 Canvas.
   * Update to keep spirit of original look but updated
* Smooth 60 FPS sub-pixel physics and camera interpolation.
* Dynamic bloom glow filters, particle spark bursts, and warp event horizon shaders.
* Update, clear,  modern, UI
3. **Clean Modern TypeScript Codebase**:

   * Clean, modular object-oriented architecture without monolithic legacy baggage.
   * Fully typed entity hierarchy, strict math collision utilities, and sound audio engine with Web Audio API.
4. **Modern P2P Networking \& Multiplayer Table Lobby**:

   * WebRTC P2P multiplayer via PeerJS for zero-latency LAN and online matches.
   * Support for up to 8 table pilot slots (mixing local pilots, remote peers, and autonomous AI bots).
   * Live Picture-in-Picture (PiP) feed switching and expandable inspection viewport.

\---

## 2\. Gameplay Mechanics \& Hazard Calibration

|Entity / System|Legacy Implementation (`legacy/`)|Resurrected Implementation (`src/`)|
|-|-|-|
|**Wormhole Orbit**|Revolves along orbit radius; drops powerup upon threshold damage|Radius 180–320px depending on table size; 150 damage threshold|
|**Powerup Capsules**|`PowerupSprite.java`: 10 HP, 0.66s immunity, indestructible = false after cycle 20|Destructible via lasers and explosions with 20 particle sparks|
|**Nuke Hazard**|`NukeSprite.java`: 8-second countdown, expanding blast wave dealing radial proximity damage|Authentic countdown timer, expanding blast wave, core/hollow eye safety|
|**UFO**|`g\\\_enemyRatios\\\[9] = 3`: Spawns squadron of 3 saucers|Spawns 3 UFO saucers with positional scatter|
|**Inflator**|`g\\\_enemyRatios\\\[10] = 4`: Cluster of 4 octagons|Spawns 4 expanding/shrinking octagons|
|**Gunship**|Dual independently rotating deck turrets|Dual 360° auto-tracking turrets targeting player|
|**Ghost-Pud**|Indestructible bumper entity deflecting lasers|Reflects pulse lasers, vulnerable only to Zap/Shields|
|**WallCrawler**|12-point polygon seated on wall perimeter|Anchored on exact arena perimeter line|




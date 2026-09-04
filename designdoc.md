# Wormhole Resurrected — Design & Architecture Document

---

## 1. Core Design Principle & Vision

The overarching directive of **Wormhole Resurrected** is to preserve **100% faithful replication of the original Java arcade gameplay mechanics, physics, and balance** (Centerfleet / Centerscore, circa 2000–2002) while modernizing the game for modern desktop and mobile browsers:

1. **Uncompromised Legacy Gameplay Fidelity**:
   * Authentic physics, acceleration, friction, angular velocity, and collision mechanics mathematically matching the original Java client (`legacy/src/client/`).
   * Authentic weapons, multi-stage ship upgrades, and powerup ejection mechanics.
   * Faithful hazard AI behaviors:
     - Independent dual deck turrets on Gunships targeting the active player.
     - 12-point WallCrawler polygon seated precisely on the arena perimeter wall.
     - Expanding and contracting octagonal Inflators.
     - 12-missile radial HeatSeeker bursts.
     - Indestructible Ghost-Pud bumper deflecting pulse lasers.
     - Thermonuclear Nuke countdown with expanding blast wave and core hollow eye evasion.
2. **Modernized HD Vector Graphics**:
   * High-definition neon cyber vector aesthetic rendered via HTML5 Canvas 2D.
   * Smooth 60 FPS sub-pixel physics and camera interpolation.
   * Dynamic bloom glow filters, chromatic thruster trails, and particle spark bursts.
   * Crisp, high-contrast, modern cybernetic UI typography (`Orbitron` and `Rajdhani`).
3. **Clean Modern TypeScript Codebase**:
   * Modular object-oriented architecture built on ES Modules and Vite without heavy external runtime frameworks.
   * Fully typed entity hierarchy, rotational polygon math utilities, and Web Audio API engine.
4. **Hybrid P2P & WebSocket Networking**:
   * Zero-latency Peer-to-Peer WebRTC multiplayer via PeerJS for online matches.
   * Standalone zero-dependency Node.js WebSocket relay server (`server.cjs`) for LAN and cloud hosting fallback.
   * Up to 8 concurrent table pilot slots supporting local pilots, remote peers, and autonomous AI bots.
   * Live Picture-in-Picture (PiP) feed switching allowing real-time observation of any opponent or bot simulation realm.

---

## 2. Gameplay Mechanics & Hazard Calibration Reference

| Entity / System | Legacy Implementation (`legacy/`) | Resurrected Implementation (`src/`) |
| :--- | :--- | :--- |
| **Wormhole Orbit** | Revolves along orbit radius; drops powerup upon threshold damage | Radius 180–320px depending on arena scale; 150 damage threshold |
| **Powerup Capsules** | `PowerupSprite.java`: 10 HP, 0.66s immunity, destructible after cycle 20 | Destructible via lasers and explosions with 20 particle sparks |
| **Nuke Hazard** | `NukeSprite.java`: 8-second countdown, expanding blast wave dealing radial proximity damage | Authentic countdown timer, expanding blast wave, core/hollow eye safety |
| **UFO** | `g_enemyRatios[9] = 3`: Spawns squadron of 3 saucers | Spawns 3 UFO saucers with positional scatter and pulse lasers |
| **Inflator** | `g_enemyRatios[10] = 4`: Cluster of 4 octagons | Spawns 4 expanding/shrinking octagons |
| **Gunship** | Dual independently rotating deck turrets | Dual 360° auto-tracking turrets targeting player |
| **Ghost-Pud** | Indestructible bumper entity deflecting lasers | Reflects pulse lasers, vulnerable only to Zap / Shields |
| **WallCrawler** | 12-point polygon seated on wall perimeter | Anchored on exact arena perimeter ring line |
| **HeatSeekers** | Radial homing missile swarm tracking closest player | Predictive angular steering homing on target exhaust trails |
| **Mine Layer** | Drops explosive proximity mines along patrol trajectory | Lays timed armed mines dealing heavy radial splash damage |

---

## 3. Frontend Architecture & Technology Stack

### 3.1 Core Technologies
* **Language**: TypeScript 5.4+ (Strict type checking, ES2022 target).
* **Build Tooling & Bundler**: Vite 5 (Fast HMR development, optimized production tree-shaking).
* **UI Layer**: Native Vanilla DOM & CSS3 (Zero React/Vue/Angular overhead ensuring minimal bundle footprint and dedicated 60 FPS main thread execution).
* **Canvas Engine**: HTML5 Canvas 2D Context driven by a high-performance requestAnimationFrame game loop.

### 3.2 Graphics & Rendering Pipeline (`src/graphics/`)
* **`VectorRenderer.ts`**:
  - Custom vector graphics engine wrapping Canvas 2D operations.
  - Procedural drawing routines for neon vector wireframe ships, wormholes, lasers, hazard polygons, and floating combat text popups.
  - Layered rendering pipeline:
    1. Background starfield with multi-speed parallax depth (`Starfield.ts`).
    2. Arena boundary ring (`ArenaRing.ts`) scaled dynamically across 4 arena presets (`SMALL` 2P, `MEDIUM` 4P, `LARGE` 6P, `HUGE` 8P).
    3. Wormhole gravitational wells with rotating vortex accretion rings.
    4. Hazard entities and projectiles.
    5. Player ships with dynamic thruster plumes, shield envelopes, and status indicators.
    6. Particle systems (explosions, warp sparks, laser impacts).
* **Camera Tracking & Viewport**:
  - Sub-pixel linear interpolation (lerp) tracking the player ship.
  - Adaptive zoom scaling (`1.65` on desktop for wide tactical view, `1.15` on mobile devices for optimized spatial awareness).
  - Procedural screen shake with directional impulse damping on explosive impacts and nuke detonations.
* **Picture-in-Picture (PiP) Secondary Viewport**:
  - Dedicated secondary canvas overlay rendering the live feed of any selected opponent or autonomous bot realm in real-time.
  - Cycle controls allowing seamless inspection of all 8 table slots.

### 3.3 Audio Engine (`src/audio/SoundEngine.ts`)
* Built on the native Web Audio API with zero external audio library dependencies.
* Caches and plays low-latency WAV sound effects for pulse lasers, thruster bursts, explosions, and powerup collection.
* Programmatic fallback sound synthesizers (oscillator nodes, white noise generators, biquad filters) ensuring sound plays even if asset fetching is delayed.
* Persistent volume controls and mute toggles stored in browser `localStorage`.

### 3.4 Unified Input Management (`src/core/InputManager.ts`)
* **Multi-Device Abstraction**:
  - **Keyboard**: WASD, Arrow keys, Numpad, Space (Primary Fire), F/E (Launch Powerup), R/Shift (Special Ability). Fully remappable key bindings persisted in `localStorage`.
  - **Gamepad**: Standard Gamepad API polling with analog stick steering, analog trigger acceleration, and bumper action mapping.
  - **Mobile Touch**:
    - Left-hand dynamic floating steering & thrust zone (`#mob-steer-zone`).
    - Right-hand action pads: `[FIRE]`, `[LAUNCH]`, `[SPECIAL]` with cooldown indicator.
    - **Dynamic Launch State**: The `[LAUNCH]` button automatically applies a greyscale/dimmed empty state when `powerupInventory` has 0 launchable items, immediately illuminating in vibrant magenta upon collecting a powerup.
    - Customization options: Southpaw (left-handed swap), button scale slider, opacity slider (default 70%), and portrait vertical height offset slider.
    - Haptic feedback trigger integration via `navigator.vibrate`.

---

## 4. User Interface (UI) Design & Layout Architecture

The user interface follows a responsive cybernetic vector aesthetic utilizing CSS custom variables (`--neon-cyan`, `--neon-magenta`, `--neon-green`, `--neon-amber`) and high-legibility HUD fonts (`Orbitron` and `Rajdhani`).

### 4.1 Front-End Lobby Screen (`#screen-front-end`)
* **Desktop Mode**:
  - Split two-column cockpit layout:
    - **Left Column**: Pilot profile card, active callsign configuration, and Pilot Comms & Roster panel.
    - **Right Column**: Live Matches browser with instant search filtering, match creation modal, and solo practice launcher.
* **Mobile Portrait Mode**:
  - Smart single-column vertical flow with locked outer viewport scrolling (`overflow: hidden`).
  - Top utility action bar right-aligned with safe-area notch padding (`env(safe-area-inset-top)`).
  - Centered multi-line *Wormhole Resurrected* title logo.
  - **Segmented Tab Switcher (`.lobby-portrait-tabs`)**: A unified, cyber-framed segmented control dock toggling between `MATCHES` and `LOUNGE & COMMS` with glowing active indicator and neon underline.
  - **Match Cards Hierarchy**:
    - Match Title with subtle muted host attribution (`Hosted by [Name]`).
    - High-prominence badges: Mode (`[FFA]` / `[TEAM]`), Capacity (`[X/Y SLOTS]`), Security (`[🔒 PRIVATE]`), and Status (`[IN MATCH]` / `[FULL]`).
    - Low-prominence secondary metadata: Subtle muted pills for powerup rules (`[STANDARD]` / `[EXTENDED]`) and win criteria (`[FIRST TO X]`).
    - Full-width `[JOIN MATCH]` / `[SPECTATE]` CTA button pinned below details.
  - **Persistent Thumb-Zone Bottom Action Bar (`.matches-action-footer`)**: Pins `[HOST NEW MATCH]` and `[SOLO PRACTICE]` across both tabs above the navigation bar.
* **Mobile Landscape Mode**:
  - Zero-overflow horizontal cockpit dashboard with fixed height calculation (`100dvh`).
  - Minified top header, compact pilots list, and scrollable match browser.

### 4.2 In-Arena Combat HUD
* **Desktop Arena HUD**:
  - Top Unified HUD bar (`.arena-top-hud`): Pilot hull integrity meter, retromonitor badges, match score, and powerup inventory tray.
  - Left dock: Opponent radar and status pips.
  - Right dock: Secondary live PiP viewport with slot switching buttons.
* **Mobile Portrait In-Arena HUD**:
  - Minified top-left pilot health card with hull bar and retros status.
  - Centered top match score (`0 - 0`).
  - Right-aligned stacked enemy mini roster strip beneath pause/fullscreen buttons.
  - Bottom touch thumb controls with customizable vertical offset.
  - Collapsible bottom communications drawer (`#mob-chat-drawer`).
* **Mobile Landscape In-Arena HUD**:
  - Centered score display (`.mob-score-box`) pinned at the top center matching portrait behavior.
  - Right-aligned enemy health roster (`.mob-roster-strip`) stacked along the right edge.
  - Unobstructed center screen play area.

### 4.3 Modals & Menus
* **Tactical Flight Manual (`#manual-modal`) & System Options (`#options-modal`)**:
  - Desktop: Sidebar tab navigation with expansive content card panes.
  - Mobile: Horizontally scrolling chip bar (`overflow-x: auto`) with 100% modal width article view.
  - **Mobile-First Options Ordering**: On mobile devices, the `TOUCH` configuration tab is automatically placed immediately after `GRAPHICS` (before `KEYBOARD` and `CONTROLLER`).
* **In-Game Test Control Panel (`#spawner-modal`)**:
  - Integrated diagnostic testbed available in solo practice and host test matches.
  - Mobile Portrait: Single scrollable vertical sheet.
  - Mobile Landscape: Two-column responsive side-by-side grid (`.spawner-cols-wrap`) optimizing short viewport heights (`max-height: 90dvh`).
  - Features: Direct hazard spawning (12+ types), powerup ejection, ship class switching, AI overlay toggle, and HP God Mode.
* **15-Minute Match Timeout Modal (`#timeout-modal`)**:
  - Controlled alert modal providing an `[ACKNOWLEDGE]` button to dismiss, replacing intrusive screen-wide flashing banners.

---

## 5. Backend & Networking Architecture

### 5.1 Portable Dedicated Relay Server (`server.cjs`)
Wormhole Resurrected includes a lightweight, zero-dependency Node.js server script designed for instant local execution or cloud container hosting:
* **Static File Server**:
  - Delivers compiled production assets (`dist/`) with appropriate MIME type headers (`text/html`, `application/javascript`, `image/png`, `audio/wav`, etc.).
  - Security protections against directory traversal attacks (`path.startsWith(DIST_DIR)`).
  - Health check endpoint (`/healthz` and `/health`) returning HTTP 200 and active connection stats for uptime monitors and container orchestrators.
* **Automated Local LAN Discovery**:
  - Queries `os.networkInterfaces()` upon startup, automatically identifying physical IPv4 network adapters (filtering out loopback and link-local `169.254.x.x` addresses).
  - Prints local and Wi-Fi network URLs to the console for frictionless LAN multiplayer hosting on shared routers.
* **Cloud Platform Compatibility**:
  - Fully compatible with Render, Railway, Fly.io, Heroku, and containerized VPS environments.
  - Binds dynamically to environment port (`process.env.PORT || 3000`) on `0.0.0.0`.
  - Disables auto-browser launch in cloud container runtimes (`process.env.RENDER || process.env.PORT`).

### 5.2 Native RFC6455 WebSocket Relay Protocol
* Implemented natively without bulky third-party dependencies (zero socket.io / ws npm bloat on server runtime).
* Handles WebSocket upgrade handshakes via SHA-1 Sec-WebSocket-Key hashing.
* Full binary framing parser supporting:
  - Client-to-server 4-byte masking decoding.
  - Frame length boundaries: 7-bit, 16-bit extended (`0x7E`), and 64-bit BigInt (`0x7F`).
  - Ping / Pong control frame keep-alives (`0x09` / `0x0A`).
  - Connection teardown cleanup on close opcode (`0x08`).
* Serves as the global message bus for:
  - Real-time match lobby discovery (`MATCH_LIST_ANNOUNCE`).
  - Player presence and callsign announcements (`PILOT_JOIN`, `PILOT_HEARTBEAT`).
  - Global lobby communications chat stream.
  - LAN multiplayer fallback relay when WebRTC signaling is blocked.

### 5.3 Hybrid Multiplayer Architecture (`src/net/`)
```
+-------------------------------------------------------------+
|                      MATCH LOBBY RELAY                      |
|                  (WebSocket / server.cjs)                   |
+------------------------------+------------------------------+
                               | (Lobby discovery, Comms chat)
         +---------------------+---------------------+
         |                                           |
+--------v--------+                         +--------v--------+
|   HOST BROWSER  |<======= WebRTC P2P =====>| CLIENT BROWSER  |
|  (Authoritative)|       (PeerJS Data)     |  (Inputs/Sync)  |
+-----------------+                         +-----------------+
```
* **Host-Authoritative State Synchronization**:
  - The hosting player runs the authoritative physics and game loop, simulating wormholes, hazard trajectories, collision resolution, and powerup trays.
  - Remote clients capture local inputs (`up`, `left`, `right`, `fire`, `secondaryFire`, `tertiaryFire`) and transmit compressed input states to the host.
  - Host broadcasts compact state updates (ship positions, velocities, health, active hazards, scores) to all connected clients at 30–60 Hz.
* **WebRTC Direct P2P Channels**:
  - Utilizes PeerJS for peer connection brokerage, establishing direct browser-to-browser UDP-like DataChannels with minimal latency.
* **LAN WebSocket Fallback**:
  - In environments where WebRTC STUN/TURN traffic is restricted by strict NATs or offline LAN routers, the game automatically routes multiplayer packets through the local `server.cjs` relay endpoint (`/lan-relay`).

---

## 6. Autonomous AI & Off-Screen Simulation

### 6.1 AI Bot Controller (`src/entities/ai/BotController.ts`)
* Implements 4 heuristic difficulty levels:
  - **Novice (Easy)**: Relaxed aiming tolerance, intermittent thrust bursts, slow reaction times.
  - **Pilot (Medium)**: Steady target tracking, regular wormhole harassment, reactive hazard evasion.
  - **Ace (Hard)**: Lead-pursuit targeting, aggressive powerup collection, active special ability utilization.
  - **Cyborg (Insane)**: Predictive ballistic deflection, optimal orbit positioning, instant emergency countermeasures.
* Behaviors:
  - **Target Acquisition**: Alternates between targeting the opponent ship and bombarding enemy wormholes to generate powerups.
  - **Perimeter Avoidance**: Mathematical repulsion vectors preventing ships from slamming into the outer arena boundary ring.
  - **Hazard Evasion**: Scans nearby projectile fields (missiles, mines, mortar shells) and executes evasive maneuvers.

### 6.2 Simulated Realm Engine (`src/entities/ai/SimulatedRealm.ts`)
* Autonomous headless physics loops simulating off-screen bot matches.
* When 4, 6, or 8 players occupy a match, non-local bot battles run within isolated `SimulatedRealm` containers.
* Feeds real-time combat data, health ratios, and visual output into the player's Picture-in-Picture (PiP) viewport and match score counters.

---

## 7. Project Structure & Codebase Map

```
├── dist/                     # Compiled production web bundle (HTML, JS, CSS, audio assets)
├── legacy/                   # Reference decompiled Java arcade source code (circa 2000–2002)
├── src/
│   ├── audio/
│   │   └── SoundEngine.ts    # Web Audio API engine & synthesizer fallbacks
│   ├── core/
│   │   ├── Constants.ts      # Game balance constants, colors, ship configs, powerup tables
│   │   ├── GameState.ts      # Match score states, round timers, win conditions
│   │   ├── InputManager.ts   # Keyboard, Gamepad, and Virtual Touch input bindings
│   │   └── TutorialManager.ts# Single-player training mode state machine
│   ├── entities/
│   │   ├── ai/
│   │   │   ├── BotController.ts   # Autonomous bot AI steering & combat heuristics
│   │   │   └── SimulatedRealm.ts  # Headless bot-vs-bot simulation realms
│   │   ├── hazards/          # 12+ authentic hazard entity classes (Nuke, Gunship, UFO, etc.)
│   │   ├── Bullet.ts         # Laser projectiles and ballistic physics
│   │   ├── Particle.ts       # Particle spark systems & explosions
│   │   ├── PlayerShip.ts     # Player ship dynamics, weapons, shields, and inventory
│   │   ├── Powerup.ts        # Destructible powerup capsules
│   │   ├── ShipCatalog.ts    # 8 distinct ship class presets (Tank, Wing, Hunter, Flagship, etc.)
│   │   └── Wormhole.ts       # Orbital dynamics, damage accumulation, and powerup ejection
│   ├── graphics/
│   │   ├── ArenaRing.ts      # Scalable arena perimeter ring geometry
│   │   ├── Starfield.ts      # Parallax multi-layered background stars
│   │   └── VectorRenderer.ts # Canvas 2D neon vector wireframe rendering engine
│   ├── math/
│   │   ├── Collision.ts      # Circle, line segment, and rotational polygon intersections
│   │   ├── RotationalPolygon.ts # Arbitrary n-vertex rotating polygon geometry
│   │   └── Vector2D.ts       # 2D vector mathematics utilities
│   ├── net/
│   │   ├── GlobalRelay.ts    # Lobby match discovery and global comms broker
│   │   └── NetworkManager.ts # WebRTC PeerJS connection manager & state synchronizer
│   └── main.ts               # Application entrypoint, lobby UI orchestrator, HUD manager
├── index.html                # Main application HTML & complete CSS3 cybernetic styling
├── package.json              # Project dependencies, build scripts (tsc && vite build)
├── server.cjs                # Portable Node.js HTTP + RFC6455 WebSocket relay server
└── designdoc.md              # Complete design, architecture, and calibration documentation
```

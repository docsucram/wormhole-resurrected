# Wormhole Resurrected

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)](https://vitejs.dev/)
[![HTML5 Canvas](https://img.shields.io/badge/Graphics-HTML5%20Vector%20Canvas-orange?logo=html5)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Multiplayer](https://img.shields.io/badge/Multiplayer-WebSocket%20Relay-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A modern HTML5 Canvas and TypeScript remake of the classic early-2000s vector arcade space combat game **Wormhole**, originally created by **Centerfleet** (and preserved by the community at [Wormhole Redux](https://www.wormholeredux.com/)).

---

## About The Game

**Wormhole** is a fast-paced multiplayer vector arcade game of survival. Up to **8 pilots** dogfight across separate, parallel dimensions. 

Rather than shooting each other directly, pilots shoot their central orbital **Wormhole** to harvest powerups, upgrade their ship, and launch hostile interdimensional attacks (Turrets, Nukes, UFOs, EMP shockwaves, Sweeping Laser Beams, and Artillery) through portals into opponent arenas. The last pilot standing wins the match.

---

## Key Features

- **No Java Required**: Rebuilt from scratch using modern web standards (HTML5 Canvas 2D and TypeScript) running at a locked **120-144+ FPS** with crisp vector lines and optional CRT scanlines.
- **Zero-Config LAN and Web Multiplayer**: Native WebSocket relay server built into server.cjs alongside multi-tab BroadcastChannel and global web relay support. Run the launcher on one PC and any machine, tablet, or phone on your network can join from their web browser.
- **8 Fighter Classes**: Dart, Wedge, Vector, Cruiser, Stingray, Mantis, Nautilus, and Flagship.
- **20-Item Arsenal**: All utility ship upgrades (Gun Upgrade, Thrust Upgrade, Retro Thruster Upgrade, Shield, Super Shield, Cloak) and offensive sendable hazards (Mines, Mine Layers, Nukes, EMP Shockwaves, Inflators, Wall Crawlers, Ghost Puds, Scarabs, Heat Seeker Missiles, Heat Seeker Swarms, Portal Turrets, Gunships, UFOs, and Artillery).
- **Standard and Extended Match Rules**: Choose between classic Standard mode (shared ship upgrade token mechanics with 17 items) and Extended mode (discrete tokens with 20 items).
- **Match Modes**: Free-For-All and Team Battle modes with customizable arena sizes (2-Player Duel, 4-Player Battle, 6-Player Arena, 8-Player Mega).
- **Pilot Customization**: Selectable tactical pilot avatars (1 through 8) and customizable callsigns with persistent local settings.
- **Multi-Device Input Support**: Full gamepad support (Xbox / PlayStation controllers with analog flight and key remapping), keyboard and mouse controls, and dedicated mobile/tablet touch controls.
- **Adaptive AI Bots**: Single-player training and bot-filled multiplayer lobbies across Easy, Medium, Hard, and Insane combat directives.
- **Live Picture-in-Picture Feed**: Real-time Picture-in-Picture (PiP) monitoring of opponent dimensions.

---

## Controls

| Action | Keyboard | Gamepad (Xbox / PlayStation) | Mobile / Touch |
| :--- | :--- | :--- | :--- |
| **Steer / Rotate** | A / D or Left / Right Arrow | Left Stick / D-Pad | Left Touch Zone (Swipe / Drag) |
| **Forward Thrust** | W or Up Arrow | Right Trigger (RT) / A (Cross) | Thrust Button |
| **Retro Thrusters** | S or Down Arrow | Left Trigger (LT) / B (Circle) | Retro Button |
| **Fire Lasers** | Spacebar | Right Bumper (RB) / X (Square) | Fire Button |
| **Launch Hazard** | F or E | Left Bumper (LB) / Y (Triangle) | Launch Button |
| **Special Ability** | Q or Shift | Right Stick Click (RSB) | Special Button |
| **Pause Menu** | Escape or P | Start / Menu Button | Pause Button (Top Right) |

---

## Quick Start

### 1. Run Locally (Development Mode)

```bash
git clone https://github.com/docsucram/wormhole-resurrected.git
cd wormhole-resurrected
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 2. Build for Production

```bash
npm run build
npm run preview
```

### 3. Play LAN Multiplayer Across Your Network

1. Double-click **Launch_LAN_Server.bat** on your host PC (or run `node server.cjs`).
2. The server terminal will display your LAN IP address (for example `http://192.168.0.13:3000`).
3. Open that URL on other computers, laptops, or mobile devices on the same Wi-Fi or Ethernet network to join.

---

## Credits and History

- **Original Game**: Created by **Centerfleet** (later Centerscore) in the early 2000s.
- **Community Preservation**: Inspired by the community revival project at [Wormhole Redux](https://www.wormholeredux.com/).
- **Remake**: Modernized HTML5/TypeScript engine by docsucram.

---

## License

This project is open-source under the [MIT License](LICENSE).

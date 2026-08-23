# 🌀 Wormhole Resurrected

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)](https://vitejs.dev/)
[![HTML5 Canvas](https://img.shields.io/badge/Graphics-HTML5%20Vector%20Canvas-orange?logo=html5)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Multiplayer](https://img.shields.io/badge/LAN%20Multiplayer-WebSocket%20Relay-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A modern HTML5 Canvas & TypeScript remake of the classic early-2000s vector arcade space combat game **Wormhole** originally created by **Centerfleet** (and preserved by the community at [Wormhole Redux](https://www.wormholeredux.com/)).

---

## 🚀 About The Game

**Wormhole** is a fast-paced multiplayer vector arcade game of survival. Up to **8 pilots** dogfight across separate, parallel dimensions. 

Rather than shooting each other directly, pilots shoot their central orbital **Wormhole** to harvest powerups, upgrade their ship, and launch hostile interdimensional attacks (Turrets, Nukes, UFOs, EMP shockwaves, Sweeping Laser Beams, and Artillery) through portals into opponent arenas. The last pilot standing wins!

---

## ✨ What's New in This Remake

- **No Java Required**: Rebuilt from scratch using modern web standards (HTML5 Canvas 2D + TypeScript) running at a locked **120–144+ FPS** with crisp glowing vector lines and CRT scanlines.
- **Zero-Config LAN Multiplayer**: Native WebSocket relay server built directly into server.cjs. Run the launcher on one PC, and any machine or tablet on your local network can join from their web browser.
- **All Classic Fighter Classes**: Dart, Wedge, Vector, Cruiser, Stingray, Mantis, Nautilus, and Flagship.
- **Full 20-Item Arsenal**: All 6 utility upgrades and 14 offensive sendable hazards with authentic physics, discrete drop momentum, and portal ingestion.
- **Full Gamepad Support**: Xbox / PlayStation controller support with analog flight, custom deadzones, key remapping, and local state saving.
- **Adaptive AI Bots**: Single-player training and bot-filled multiplayer lobbies with Rookie, Veteran, and Ace difficulties.
- **Live PiP Feed**: Picture-in-Picture feed tracking of bot realms in real time.

---

## 🕹️ Controls

| Action | Keyboard | Gamepad (Xbox / PS) |
| :--- | :--- | :--- |
| **Steer / Rotate** | A / D or ← / → | **Left Stick** |
| **Forward Thrust** | W or ↑ | **Right Trigger (RT)** / A (✕) |
| **Retro Thrusters** | S or ↓ | **Left Trigger (LT)** / B (○) |
| **Fire Lasers** | Space | **Right Bumper (RB)** / X (□) |
| **Launch Powerup Hazard** | F or E | **Left Bumper (LB)** / Y (△) |
| **Ship Special Ability** | Q or Shift | **Right Stick Click (RSB)** |
| **Pause Menu** | Escape / P | **Start / Menu** |

---

## 📦 Quick Start

### 1. Run Locally (Dev Mode)
`ash
git clone https://github.com/docsucram/wormhole-resurrected.git
cd wormhole-resurrected
npm install
npm run dev
`
Open http://localhost:5173 in your browser.

### 2. Play LAN Multiplayer Across Your Network
1. Double-click **Launch_LAN_Server.bat** on your host PC (or run 
ode server.cjs).
2. The server terminal will show your LAN IP (e.g. http://192.168.0.13:3000).
3. Open that URL on other computers or laptops on the same Wi-Fi/Ethernet network to play together!

---

## 📜 Credits & History

- **Original Game**: Created by **Centerfleet** (later Centerscore) in the early 2000s.
- **Community Preservation**: Inspired by the community revival project at [Wormhole Redux](https://www.wormholeredux.com/).
- **Remake**: Modernized HTML5/TypeScript engine by docsucram.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

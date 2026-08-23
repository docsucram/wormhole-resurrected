# 🌀 Wormhole Resurrected

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)](https://vitejs.dev/)
[![HTML5 Canvas](https://img.shields.io/badge/Graphics-HTML5%20Vector%20Canvas-orange?logo=html5)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Multiplayer](https://img.shields.io/badge/LAN%20Multiplayer-WebSocket%20Relay-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A modern, high-octane HTML5 Canvas & TypeScript resurrection of the cult classic vector space combat arcade game **Wormhole** (originally created by Jeremy Alessi / Games2Gaze).

---

## 🚀 Overview

**Wormhole Resurrected** is a top-down, vector-drawn arcade dogfighter where up to **8 pilots** battle in enclosed orbital arenas. 

Instead of directly shooting opponents who reside in their own parallel dimensional realms, pilots shoot orbital **Wormholes** to harvest powerup capsules, upgrade their ship's weaponry and propulsion, and launch devastating interdimensional hazard attacks (Turrets, Nukes, UFOs, EMP waves, Sweeping Laser Beams, MineLayers, and Artillery) through the portals into their opponents' arenas!

---

## ✨ Features

- **⚡ Blazing Performance Vector Renderer**: Custom zero-dependency HTML5 2D vector renderer featuring crisp glowing lines, starfield parallax, particle shockwaves, and locked **120–144+ FPS**.
- **🌐 Zero-Config LAN Multiplayer**: Built-in native Node.js RFC6455 WebSocket relay server (server.cjs). Run Launch_LAN_Server.bat on one PC, and any machine on your Wi-Fi/Ethernet network can connect and play seamlessly from their web browser.
- **🛸 8 Unique Starfighter Classes**:
  - **Dart** (Interstellar Scout - Balanced)
  - **Wedge** (Heavy Assault - Rapid Fire)
  - **Vector** (Precision Interceptor - Turtle Cannon)
  - **Cruiser** (Armored Dreadnought - Shapeshifter)
  - **Stingray** (Stealth Sloop - Heat Seeker Barrage)
  - **Mantis** (Fast Gunship - Twin Lasers)
  - **Nautilus** (Sub-Space Fighter - Heavy Retros)
  - **Flagship** (Fleet Command - Attractor/Repulser Device)
- **💣 20 Authentic Powerup & Hazard Systems**:
  - **Defensive / Utility**: Gun Upgrades, Thrust Upgrades, Retro Thrusters, Invulnerability Shields, Screen Zap, and Emergency Repairs.
  - **Offensive Hazards**: Heat-Seeker Missiles, Orbital Turrets, Perimeter Mines, UFO Squadrons, Inflator Masses, Minelayers, Gunship Corvettes, Powerup-Stealing Scarabs, Thermonuclear Nukes, WallCrawlers, Sweeping Laser Beams, EMP Control Scramblers, Ghost-Puds, and Artillery Batteries.
- **🎮 Full Gamepad & Custom Controls**: Native Xbox / DualShock controller support with analog flight, deadzone customization, rebindable keyboard keys, and local state persistence (localStorage).
- **📺 Tactical Picture-in-Picture (PiP) Feed**: Live camera feed tracking opponent and AI bot realms, complete with full-screen expansion.
- **🤖 Autonomous AI Pilots**: Adaptive bot controllers with customizable difficulties (Rookie, Veteran, Ace).
- **📺 Retro CRT & Telemetry FX**: Toggleable scanline overlays, dynamic HUD telemetry, and in-game FPS counters.

---

## 🕹️ Controls

| Action | Keyboard | Xbox / Gamepad Controller |
| :--- | :--- | :--- |
| **Rotate Ship** | A / D or ← / → | **Left Analog Stick** (X-Axis) |
| **Forward Thrust** | W or ↑ | **Right Trigger (RT)** / A Button |
| **Retro Thrusters** | S or ↓ | **Left Trigger (LT)** / B Button |
| **Fire Main Lasers** | Space | **Right Bumper (RB)** / X Button |
| **Launch Powerup Hazard** | F or E | **Left Bumper (LB)** / Y Button |
| **Trigger Ship Special** | Q or Shift | **Right Stick Click (RSB)** |
| **Cycle Inventory / Target** | 1 – 5 / Tab | **D-Pad Left / Right** |
| **Pause / Tactical Menu** | Escape / P | **Start / Menu Button** |

---

## 📦 Quick Start & Local Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### 2. Installation
Clone the repository and install dependencies:
`ash
git clone https://github.com/docsucram/wormhole-resurrected.git
cd wormhole-resurrected
npm install
`

### 3. Development Server
Start the local Vite development server:
`ash
npm run dev
`
Open your browser at http://localhost:5173.

### 4. Production Build
Compile optimized production assets:
`ash
npm run build
`

---

## 🌐 Running a LAN Multiplayer Server

To host a cross-machine LAN match on your local network:

1. Double-click **Launch_LAN_Server.bat** (or run 
ode server.cjs).
2. The server script will display your local network IP (e.g. http://192.168.0.13:3000).
3. On any other PC, Mac, or tablet on your network, open that URL in a web browser.
4. Click **"HOST MATCH"** in the Lobby Lounge on one machine, and click **"JOIN"** on the other machine to start battling!

---

## 🛠️ Architecture & Tech Stack

- **Language**: TypeScript 5.5
- **Bundler & Dev Server**: Vite 5.4
- **Renderer**: Pure HTML5 Canvas 2D with custom polygon rendering and lighting mathematics
- **Audio**: Web Audio API with procedural pitch shifting and spatial stereo positioning
- **Networking**: Native RFC6455 WebSocket relay server (server.cjs) with zero external runtime dependencies

---

## 📜 Credits & History

- **Original Game Concept & Design**: Jeremy Alessi / Games2Gaze (*Wormhole*, *Wormhole 2*, *Wormhole: Subspace*).
- **Remake Engine & Architecture**: Rebuilt from the ground up in modern TypeScript and HTML5 Vector Canvas.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

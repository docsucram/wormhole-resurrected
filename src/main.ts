import { VectorRenderer } from './graphics/VectorRenderer';
import { Starfield } from './graphics/Starfield';
import { ArenaRing } from './graphics/ArenaRing';
import { ShipCatalog } from './entities/ShipCatalog';
import { PlayerShip } from './entities/PlayerShip';
import { Wormhole } from './entities/Wormhole';
import { Powerup } from './entities/Powerup';
import { TextPopup } from './entities/TextPopup';
import { Bullet } from './entities/Bullet';
import { HeatSeekerMissile } from './entities/HeatSeekerMissile';
import { ParticleSystem } from './entities/Particle';
import { SoundEngine } from './audio/SoundEngine';
import { InputManager, InputAction } from './core/InputManager';
import { HazardManager } from './entities/hazards/HazardManager';
import { SimulatedRealm } from './entities/ai/SimulatedRealm';
import { BotDifficulty } from './entities/ai/BotController';
import { GameStateManager } from './core/GameState';
import { HangarView } from './ui/HangarView';
import { NetworkManager, WarpPayload } from './net/NetworkManager';
import { PLAYER_COLORS, GAME_CONSTANTS, POWERUP_NAMES } from './core/Constants';
import { Collision } from './math/Collision';

export interface TablePlayer {
  slot: number;
  name: string;
  isLocal: boolean;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  shipId: number;
  health: number;
  maxHealth: number;
  isAlive: boolean;
  rank: number;
  wins: number;
  color: string;
}

export interface LobbyMatch {
  id: string;
  name: string;
  hostName: string;
  isPasswordProtected: boolean;
  password?: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'HUGE';
  targetWins: number;
  powerupRule: 'STANDARD' | 'EXTENDED' | 'NO_NUKES';
  shipRestriction: 'STANDARD' | 'ALL';
  botDifficulty: BotDifficulty | 'none';
  maxPlayers: number;
  currentPlayers: number;
  status: 'WAITING' | 'IN_MATCH';
  isCustom?: boolean;
}

export interface ConnectedPilot {
  id: string;
  callsign: string;
  isHost?: boolean;
  lastSeen: number;
}

class WormholeGame {
  private renderer: VectorRenderer;
  private pipRenderer: VectorRenderer | null = null;
  private starfield: Starfield;
  private arenaRing: ArenaRing;
  private input: InputManager;
  private sound: SoundEngine;
  private particles: ParticleSystem;
  private hazardManager: HazardManager;
  public gameState: GameStateManager;
  public network: NetworkManager;
  public hangarView: HangarView;
  private modalHangarView: HangarView;

  // Local Player
  private player: PlayerShip;
  public playerName = 'BrightNomad';
  public totalMatchWins = 0;
  private localClientId = Math.random().toString(36).substring(2, 9);

  // 8-Player Match Roster & Multi-Opponent PiP
  public tablePlayers: (TablePlayer | null)[] = new Array(8).fill(null);
  public currentArenaSize = 'MEDIUM'; // SMALL, MEDIUM, LARGE, HUGE
  public selectedOpponentSlot = 1;

  // Real LAN Discovery & Match State
  public lanWs: WebSocket | null = null;
  public lanChannel: BroadcastChannel | null = null;
  public connectedPilots: Map<string, ConnectedPilot> = new Map();
  public lobbyMatches: LobbyMatch[] = [];
  public currentMatchConfig: LobbyMatch | null = null;
  public isMatchWaitingForPilots = false;
  public isLanMatchHost = false;
  public isLanMatchClient = false;

  // Simulated Realm (for AI bot simulation)
  private simulatedRealm: SimulatedRealm;

  private wormholes: Wormhole[] = [];
  private powerups: Powerup[] = [];
  private popups: TextPopup[] = [];
  private bullets: Bullet[] = [];
  private missiles: HeatSeekerMissile[] = [];

  private selectedShipIndex = 0; // Default to The Tank
  private selectedColorIndex = 0; // Default to Cyan

  // State
  public inArena = false;

  // Camera Zoom (authentic zoomed-in viewport)
  private camX = 0;
  private camY = 0;
  private zoom = 1.65;
  private screenFlash = 0;
  private alertTimer = 0;
  private lastCountdownSec = -1;
  private snapshotTimer = 0;
  private rosterThrottleTimer = 0;

  // Real-time FPS Monitoring
  private frameCount = 0;
  private fpsTimer = 0;
  private currentFps = 60;
  private fpsElement: HTMLElement | null = null;
  private pipThrottleTimer = 0;

  private lastTime = 0;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new VectorRenderer(canvas);

    const pipCanvas = document.getElementById('pip-canvas') as HTMLCanvasElement;
    if (pipCanvas) {
      this.pipRenderer = new VectorRenderer(pipCanvas, { enableGlow: false });
    }

    const initialSize = GAME_CONSTANTS.SIZES.MEDIUM;
    this.starfield = new Starfield(3600, 3600, 240);
    this.arenaRing = new ArenaRing(initialSize.orbitDistance, initialSize.boardWidth, initialSize.boardHeight);
    this.input = new InputManager();
    this.sound = new SoundEngine();
    this.particles = new ParticleSystem();

    this.hazardManager = new HazardManager(initialSize.boardWidth / 2 - 20);
    this.gameState = new GameStateManager(5);
    this.network = new NetworkManager();
    this.hangarView = new HangarView('hangar-canvas', 'hangar-');
    this.modalHangarView = new HangarView('modal-ship-canvas', 'modal-');

    // Simulated Bot Realm
    this.simulatedRealm = new SimulatedRealm(0, 1, 'hard', initialSize.orbitDistance, initialSize.boardWidth / 2 - 20);

    // Load persisted wins
    const savedWins = localStorage.getItem('wh_total_wins');
    this.totalMatchWins = savedWins ? parseInt(savedWins, 10) : 0;

    ShipCatalog.initialize();

    // Create Local Player Ship in orbit
    this.player = new PlayerShip(
      this.selectedShipIndex,
      this.selectedColorIndex,
      0,
      -initialSize.orbitDistance
    );
    this.player.onDeath = () => this.handlePlayerElimination();

    // Initialize 8-Player Arena Roster with Slot 0 as Local Player
    this.initTableRoster();

    // Create Isolated Realm 2 for Simulated Player 2 Bot / Remote Human Player
    this.simulatedRealm.onSendHazardToPlayer1 = (powerupType: number, sourceBotSlot = 1) => {
      const sourceBot = this.tablePlayers[sourceBotSlot];
      const botName = sourceBot ? sourceBot.name : 'Opponent';
      this.showAlert(`INCOMING // ${POWERUP_NAMES[powerupType] || 'HAZARD'} FROM ${botName.toUpperCase()}!`);
      const targetWh = this.wormholes.find((w) => w.slot === sourceBotSlot) || this.wormholes[0] || new Wormhole(botName, sourceBotSlot, 0, initialSize.orbitDistance);
      this.hazardManager.spawnHazard(
        powerupType,
        targetWh,
        this.player,
        this.missiles
      );
      this.gameState.stats.p2HazardsSent++;
      this.addChatLog(`${botName} sent ${POWERUP_NAMES[powerupType]} -> Your Realm`, 'bot');
    };

    this.simulatedRealm.onBotDeath = (slot?: number) => {
      this.handleBotElimination(slot || 1);
    };

    this.player.onDeath = () => {
      this.handlePlayerElimination();
    };

    this.hazardManager.onWarpHazard = (hazardType: number, targetSlot: number) => {
      const warpPayload: WarpPayload = {
        hazardId: `haz-${Date.now()}-${Math.random()}`,
        hazardType: hazardType,
        fromSlot: this.player.slot,
        toSlot: targetSlot,
        angle: 0,
        speed: 12.0,
        seed: Math.floor(Math.random() * 10000),
      };

      if (this.isLanMatchHost || this.isLanMatchClient) {
        if (this.currentMatchConfig) {
          this.sendLanPacket({
            type: 'MATCH_PACKET',
            matchId: this.currentMatchConfig.id,
            fromSlot: this.player.slot,
            packet: {
              type: 'WARP_HAZARD',
              payload: warpPayload,
            },
          });
        }
      } else if (this.network.isConnected) {
        this.network.sendWarpHazard(warpPayload);
      } else {
        this.simulatedRealm.receiveHazardFromPlayer1(hazardType, targetSlot);
      }
      this.addChatLog(`Punted Ghost-Pud -> Slot ${targetSlot + 1}'s Wormhole!`, 'player');
    };

    // Rebuild Wormholes for current arena roster
    this.rebuildTableWormholes();

    this.setupMatchCallbacks();
    this.setupNetworkCallbacks();
    this.initLanComms();
    this.setupFrontEndUI();
    this.setupEventListeners();
    this.renderLobbyMatches();

    // Start on Command Dashboard
    this.setDeckActive(true);

    requestAnimationFrame(this.loop.bind(this));
  }

  private sendLanPacket(packet: any): void {
    if (this.lanWs && this.lanWs.readyState === WebSocket.OPEN) {
      this.lanWs.send(JSON.stringify(packet));
    } else if (this.lanChannel) {
      try {
        this.lanChannel.postMessage(packet);
      } catch (e) {
        // BroadcastChannel error ignored
      }
    }
  }

  private handleLanMessage(data: any): void {
    if (!data || !data.type) return;

    if (data.type === 'PRESENCE') {
      if (data.id === this.localClientId) return;
      this.connectedPilots.set(data.id, {
        id: data.id,
        callsign: data.callsign || 'Pilot',
        lastSeen: Date.now(),
      });
      this.renderConnectedPilots();
      // If we are hosting a match, inform the newly arrived pilot
      if (this.isLanMatchHost && this.currentMatchConfig) {
        this.broadcastMatches();
      }
    } else if (data.type === 'MATCH_QUERY') {
      // If we are hosting an active match, reply with current match list
      if (this.isLanMatchHost && this.currentMatchConfig) {
        this.broadcastMatches();
      }
    } else if (data.type === 'CHAT') {
      if (data.sender === this.playerName) return;
      this.appendLobbyChatMessage(data.sender, data.text, false);
    } else if (data.type === 'MATCH_UPDATE') {
      if (Array.isArray(data.matches)) {
        this.lobbyMatches = data.matches;
        this.renderLobbyMatches();
      }
    } else if (data.type === 'MATCH_JOIN_REQUEST') {
      // Host receives join request from another LAN pilot
      if (this.isLanMatchHost && this.currentMatchConfig && this.currentMatchConfig.id === data.matchId) {
        // Find first empty slot, or replace first existing bot slot
        let slot = -1;
        for (let i = 1; i < 8; i++) {
          if (!this.tablePlayers[i]) {
            slot = i;
            break;
          }
        }
        if (slot === -1) {
          for (let i = 1; i < 8; i++) {
            if (this.tablePlayers[i] && this.tablePlayers[i]!.isBot) {
              slot = i;
              this.simulatedRealm.removeBotRealm(i);
              break;
            }
          }
        }

        if (slot !== -1) {
          this.tablePlayers[slot] = {
            slot,
            name: data.playerName,
            isLocal: false,
            isBot: false,
            shipId: data.shipId || 0,
            health: 280,
            maxHealth: 280,
            isAlive: true,
            rank: 0,
            wins: 0,
            color: PLAYER_COLORS[slot % PLAYER_COLORS.length].primary,
          };

          this.isMatchWaitingForPilots = false;
          this.simulatedRealm.isRemotePlayer = true;
          this.rebuildTableWormholes();
          this.updateTableRosterUI();
          this.addChatLog(`${data.playerName} joined the match!`, 'system');
          this.sound.playPowerup();

          // Update match player count in lobby list
          const activeCount = this.tablePlayers.filter((p) => p !== null).length;
          this.currentMatchConfig.currentPlayers = activeCount;
          const matchInList = this.lobbyMatches.find((m) => m.id === this.currentMatchConfig!.id);
          if (matchInList) {
            matchInList.currentPlayers = activeCount;
          }
          this.broadcastMatches();

          const isCombatInProgress = this.gameState.phase === 'PLAYING' || this.gameState.phase === 'COUNTDOWN';

          // Send acceptance back to LAN
          this.sendLanPacket({
            type: 'MATCH_JOIN_ACCEPT',
            matchId: this.currentMatchConfig.id,
            joinedClientId: data.clientId,
            assignedSlot: slot,
            roster: this.tablePlayers,
            matchConfig: this.currentMatchConfig,
            targetWins: this.gameState.targetWins,
            currentRound: this.gameState.currentRound,
            inProgress: isCombatInProgress,
          });

          // If we were waiting in staging, notify host
          if (!isCombatInProgress) {
            const scoreEl = document.getElementById('round-modal-score');
            if (scoreEl) scoreEl.innerText = `${data.playerName.toUpperCase()} READY // CLICK ENGAGE TO START`;
          }
        }
      }
    } else if (data.type === 'MATCH_JOIN_ACCEPT') {
      if (this.currentMatchConfig && this.currentMatchConfig.id === data.matchId) {
        if (data.joinedClientId === this.localClientId) {
          // Local client was accepted into match!
          this.player.slot = data.assignedSlot;
          this.isLanMatchClient = true;
          this.isLanMatchHost = false;
          this.isMatchWaitingForPilots = false;
          this.currentMatchConfig = data.matchConfig;

          // Apply dimensions
          this.currentArenaSize = data.matchConfig.size;
          const sizeCfg = GAME_CONSTANTS.SIZES[data.matchConfig.size as keyof typeof GAME_CONSTANTS.SIZES] || GAME_CONSTANTS.SIZES.MEDIUM;
          this.arenaRing.setDimensions(sizeCfg.orbitDistance, sizeCfg.boardWidth, sizeCfg.boardHeight);
          this.hazardManager.arenaBound = sizeCfg.boardWidth / 2;
          this.simulatedRealm.arenaBound = sizeCfg.boardWidth / 2;
          this.simulatedRealm.orbitDistance = sizeCfg.orbitDistance;

          this.tablePlayers = data.roster.map((p: TablePlayer | null) => {
            if (!p) return null;
            return {
              ...p,
              isLocal: p.slot === data.assignedSlot,
            };
          });

          this.simulatedRealm.isRemotePlayer = true;
          this.rebuildTableWormholes();
          this.setDeckActive(false);
          this.respawnPlayer();
          this.simulatedRealm.resetForNewRound();
          this.gameState.startMatch(data.targetWins, false);
          this.gameState.currentRound = data.currentRound || 1;
          this.updateTableRosterUI();
          this.buildShipGrid();
          this.addChatLog(`Connected to Match: ${data.matchConfig.name}!`, 'system');
          this.sound.playPowerup();

          if (data.inProgress) {
            // Mid-match drop-in: spectate active round, spawn on next round
            this.showAlert('ROUND IN PROGRESS // DEPLOYING ON NEXT ROUND');
            this.addChatLog('Round currently active. Spawning next round...', 'system');
          } else {
            // Staging room: choose ship class and ready up
            const roundModal = document.getElementById('round-modal')!;
            const titleEl = document.getElementById('round-modal-title')!;
            const subEl = document.getElementById('round-modal-subtitle')!;
            const scoreEl = document.getElementById('round-modal-score')!;
            const btnNext = document.getElementById('btn-next-round')!;

            titleEl.innerText = 'TACTICAL MATCH STAGING';
            subEl.innerText = 'SELECT YOUR FIGHTER CLASS & READY UP';
            scoreEl.innerText = data.targetWins >= 999999 ? 'ENDLESS DUEL // STANDBY' : `ROUND ${this.gameState.currentRound} // STANDBY`;
            btnNext.innerText = 'READY TO DEPLOY';

            roundModal.classList.add('active');
            roundModal.style.display = 'block';
            this.modalHangarView.setShip(this.selectedShipIndex);
            this.modalHangarView.startPreview();
          }
        } else {
          // Other client joined our match
          this.tablePlayers = data.roster.map((p: TablePlayer | null) => {
            if (!p) return null;
            return {
              ...p,
              isLocal: p.slot === this.player.slot,
            };
          });
          this.simulatedRealm.isRemotePlayer = true;
          this.rebuildTableWormholes();
          this.updateTableRosterUI();
        }
      }
    } else if (data.type === 'MATCH_PACKET') {
      if (this.inArena && this.currentMatchConfig && this.currentMatchConfig.id === data.matchId) {
        const pkt = data.packet;
        if (!pkt) return;

        if (pkt.type === 'SNAPSHOT') {
          if (data.fromSlot !== this.player.slot) {
            this.simulatedRealm.applyRemoteSnapshot(pkt.snapshot);
            if (this.tablePlayers[data.fromSlot]) {
              this.tablePlayers[data.fromSlot]!.health = pkt.snapshot.hp;
              this.tablePlayers[data.fromSlot]!.maxHealth = pkt.snapshot.maxHp;
              this.tablePlayers[data.fromSlot]!.isAlive = pkt.snapshot.isAlive;
            }
          }
        } else if (pkt.type === 'WARP_HAZARD') {
          if (pkt.payload.toSlot === this.player.slot) {
            this.showAlert(`INCOMING // ${POWERUP_NAMES[pkt.payload.hazardType] || 'HAZARD'} FROM OPPONENT!`);
            const targetWh = this.wormholes.find((w) => w.slot === pkt.payload.fromSlot) || this.wormholes[0] || new Wormhole('OPPONENT', 1, 0, 240);
            this.hazardManager.spawnHazard(pkt.payload.hazardType, targetWh, this.player, this.missiles);
            this.gameState.stats.p2HazardsSent++;
            this.addChatLog(`Opponent sent ${POWERUP_NAMES[pkt.payload.hazardType]} -> Your Realm`, 'system');
            this.sound.playSpecial(1);
          }
        } else if (pkt.type === 'PLAYER_DEATH') {
          if (this.isLanMatchHost && this.gameState.phase === 'PLAYING') {
            if (pkt.slot !== this.player.slot) {
              this.gameState.registerPlayer1Kill();
              this.addChatLog('Opponent ship was destroyed!', 'system');
              this.sendLanPacket({
                type: 'MATCH_PACKET',
                matchId: this.currentMatchConfig.id,
                fromSlot: this.player.slot,
                packet: {
                  type: 'KILL_EVENT',
                  victimSlot: pkt.slot,
                  killerSlot: this.player.slot,
                  p1Score: this.gameState.player1Score,
                  p2Score: this.gameState.player2Score,
                },
              });
              if (this.gameState.player1Score < this.gameState.targetWins) {
                this.showVictoryModal();
              }
            }
          }
        } else if (pkt.type === 'KILL_EVENT') {
          this.gameState.player1Score = pkt.p1Score;
          this.gameState.player2Score = pkt.p2Score;
          if (this.gameState.onScoreUpdate) {
            this.gameState.onScoreUpdate(pkt.p1Score, pkt.p2Score);
          }

          const isLocalVictim = pkt.victimSlot === this.player.slot;
          const isP1 = this.isLanMatchHost || (!this.isLanMatchClient && !this.network.isConnected) || (this.network.isConnected && this.network.isHost);
          const roundWinner: 'PLAYER 1' | 'PLAYER 2' = isLocalVictim ? (isP1 ? 'PLAYER 2' : 'PLAYER 1') : (isP1 ? 'PLAYER 1' : 'PLAYER 2');

          if (pkt.p1Score >= this.gameState.targetWins || pkt.p2Score >= this.gameState.targetWins) {
            this.gameState.finishMatchManually(roundWinner);
          } else {
            this.gameState.phase = 'ROUND_OVER';
            this.gameState.roundOverTimer = 4.0;
            this.gameState.roundWinner = roundWinner;
            if (!isLocalVictim) {
              this.showVictoryModal();
            }
            if (this.gameState.onRoundEnd) this.gameState.onRoundEnd(roundWinner, pkt.p1Score, pkt.p2Score);
            if (this.gameState.onPhaseChange) this.gameState.onPhaseChange('ROUND_OVER');
          }
        } else if (pkt.type === 'MATCH_START') {
          this.setDeckActive(false);
          this.resetArenaForNewRound();
          this.gameState.targetWins = pkt.targetWins;
          this.gameState.currentRound = pkt.round || this.gameState.currentRound + 1;
          this.gameState.startCountdown();
        } else if (pkt.type === 'CLIENT_READY') {
          if (this.isLanMatchHost) {
            this.addChatLog(`${pkt.playerName || 'Opponent'} is ready for next round! [SPACE to start]`, 'system');
          }
        }
      }
    } else if (data.type === 'MATCH_TERMINATED') {
      if (this.currentMatchConfig && this.currentMatchConfig.id === data.matchId) {
        this.isLanMatchClient = false;
        this.isLanMatchHost = false;
        this.currentMatchConfig = null;
        this.setDeckActive(true);
        this.showAlert('HOST HAS LEFT THE MATCH // RETURNING TO LOBBY');
        this.addChatLog('Host left the match. Returned to lobby lounge.', 'system');
        this.sound.playDefeatFanfare();
      }
    }
  }

  private initLanComms(): void {
    // 1. Setup real WebSocket LAN relay
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/lan-relay`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          this.lanWs = ws;
          this.sendLanPacket({
            type: 'PRESENCE',
            id: this.localClientId,
            callsign: this.playerName,
            timestamp: Date.now(),
          });
          if (this.lobbyMatches.length > 0) {
            this.broadcastMatches();
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleLanMessage(data);
          } catch (e) {
            console.error('Failed to parse LAN relay message:', e);
          }
        };

        ws.onclose = () => {
          this.lanWs = null;
          setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        console.warn('LAN WebSocket relay not available, using BroadcastChannel fallback:', e);
      }
    };
    connectWebSocket();

    // 2. Setup BroadcastChannel as local fallback
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.lanChannel = new BroadcastChannel('wormhole_lan_hub');
      this.lanChannel.onmessage = (event) => {
        this.handleLanMessage(event.data);
      };
    }

    // Broadcast presence immediately and every 2s
    const sendPresence = () => {
      this.sendLanPacket({
        type: 'PRESENCE',
        id: this.localClientId,
        callsign: this.playerName,
        timestamp: Date.now(),
      });
    };
    sendPresence();
    setInterval(sendPresence, 2000);

    // Clean up stale pilots & their hosted matches every 3s
    setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, pilot] of this.connectedPilots.entries()) {
        if (id !== this.localClientId && now - pilot.lastSeen > 6000) {
          this.connectedPilots.delete(id);
          changed = true;
        }
      }
      if (changed) {
        this.renderConnectedPilots();
        // Prune custom matches hosted by pilots who have disconnected
        const activeHostNames = new Set(Array.from(this.connectedPilots.values()).map((p) => p.callsign));
        const prevCount = this.lobbyMatches.length;
        this.lobbyMatches = this.lobbyMatches.filter((m) => !m.isCustom || activeHostNames.has(m.hostName));
        if (this.lobbyMatches.length !== prevCount) {
          this.renderLobbyMatches();
        }
      }
    }, 3000);

    // Clean up hosted match if window is closed
    window.addEventListener('beforeunload', () => {
      if (this.isLanMatchHost && this.currentMatchConfig) {
        this.lobbyMatches = this.lobbyMatches.filter((m) => m.id !== this.currentMatchConfig!.id);
        this.broadcastMatches();
      }
    });

    // Always register self in pilots
    this.connectedPilots.set(this.localClientId, {
      id: this.localClientId,
      callsign: this.playerName,
      isHost: true,
      lastSeen: Date.now(),
    });
    this.renderConnectedPilots();
  }

  public renderConnectedPilots(): void {
    const pilotsListEl = document.getElementById('lobby-pilots-list');
    const onlineCountEl = document.getElementById('lobby-online-count');
    const selfNameEl = document.getElementById('lobby-self-name');

    if (selfNameEl) {
      selfNameEl.innerText = `${this.playerName} (YOU)`;
    }

    const count = Math.max(1, this.connectedPilots.size);
    if (onlineCountEl) {
      onlineCountEl.innerText = `${count} ${count === 1 ? 'PILOT' : 'PILOTS'} IN LOUNGE`;
    }

    if (!pilotsListEl) return;
    pilotsListEl.innerHTML = '';

    // Render self first
    const selfRow = document.createElement('div');
    selfRow.className = 'pilot-row self';
    selfRow.innerHTML = `
      <span>${this.playerName} (YOU)</span>
      <span class="pilot-ping-pill">LOCAL</span>
    `;
    pilotsListEl.appendChild(selfRow);

    // Render other connected LAN pilots
    for (const [id, pilot] of this.connectedPilots.entries()) {
      if (id === this.localClientId) continue;
      const row = document.createElement('div');
      row.className = 'pilot-row';
      row.innerHTML = `
        <span>${pilot.callsign}</span>
        <span class="pilot-ping-pill">LAN</span>
      `;
      pilotsListEl.appendChild(row);
    }
  }

  public sendLobbyChat(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    this.appendLobbyChatMessage(this.playerName, trimmed, true);

    this.sendLanPacket({
      type: 'CHAT',
      sender: this.playerName,
      text: trimmed,
      timestamp: Date.now(),
    });
  }

  private appendLobbyChatMessage(sender: string, text: string, isSelf = false): void {
    const chatLog = document.getElementById('lobby-chat-log');
    if (!chatLog) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg ${isSelf ? 'player' : 'bot'}`;
    msgEl.style.fontSize = '10px';
    msgEl.innerHTML = `<span style="color: #64748b;">[${timeStr}]</span> <strong style="color: ${isSelf ? 'var(--neon-cyan)' : '#ff55aa'};">${sender}:</strong> ${text}`;
    chatLog.appendChild(msgEl);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  private broadcastMatches(): void {
    this.sendLanPacket({
      type: 'MATCH_UPDATE',
      matches: this.lobbyMatches,
    });
  }

  public renderLobbyMatches(filter = ''): void {
    const listEl = document.getElementById('lobby-matches-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const q = filter.trim().toLowerCase();
    const filtered = this.lobbyMatches.filter((m) =>
      !q || m.name.toLowerCase().includes(q) || m.hostName.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: #64748b; font-family: 'Orbitron', sans-serif; font-size: 11px; letter-spacing: 1px;">
          NO ACTIVE LAN MATCHES FOUND.<br><br>CLICK <strong style="color: var(--neon-cyan);">'+ HOST NEW MATCH'</strong> TO CREATE ONE!
        </div>
      `;
      return;
    }

    filtered.forEach((match) => {
      const card = document.createElement('div');
      card.className = 'match-row-card';

      const sizeLabel = match.size === 'SMALL' ? '2-P DUEL' : match.size === 'MEDIUM' ? '4-P BATTLE' : match.size === 'LARGE' ? '6-P ARENA' : '8-P MEGA';
      const pupsLabel = match.powerupRule === 'STANDARD' ? 'STANDARD (14)' : match.powerupRule === 'EXTENDED' ? 'EXTENDED (20)' : 'NO NUKES';
      const isFull = match.currentPlayers >= match.maxPlayers;

      card.innerHTML = `
        <div class="match-info-col">
          <div class="match-title-line">
            <span>${match.isPasswordProtected ? '🔒 ' : ''}${match.name}</span>
            <span style="font-size: 10px; font-weight: 700; color: #88bbdd;">(HOST: ${match.hostName})</span>
          </div>
          <div class="match-meta-line">
            <span class="match-badge badge-size">${sizeLabel}</span>
            <span class="match-badge badge-size">${match.currentPlayers}/${match.maxPlayers} SLOTS</span>
            <span class="match-badge badge-rule">${pupsLabel}</span>
            <span class="match-badge badge-rule">FIRST TO ${match.targetWins}</span>
            <span class="match-badge ${isFull ? 'badge-status-busy' : 'badge-status-open'}">${isFull ? 'FULL' : 'OPEN'}</span>
          </div>
        </div>
        <div>
          <button class="btn-join-match">${isFull ? 'SPECTATE' : 'JOIN MATCH'}</button>
        </div>
      `;

      const joinBtn = card.querySelector('.btn-join-match') as HTMLButtonElement;
      joinBtn.onclick = () => {
        if (match.isPasswordProtected) {
          const pass = window.prompt(`Match "${match.name}" is password protected. Enter password:`);
          if (pass !== match.password) {
            alert('Incorrect match access code.');
            return;
          }
        }
        if (match.hostName === this.playerName) {
          this.isLanMatchHost = true;
          this.isLanMatchClient = false;
          this.joinLobbyMatch(match);
        } else {
          this.isLanMatchHost = false;
          this.isLanMatchClient = true;
          this.currentMatchConfig = match;
          this.sendLanPacket({
            type: 'MATCH_JOIN_REQUEST',
            matchId: match.id,
            clientId: this.localClientId,
            playerName: this.playerName,
            shipId: this.selectedShipIndex,
          });
          this.addChatLog(`Requesting entry into ${match.hostName}'s Match...`, 'system');
        }
      };

      listEl.appendChild(card);
    });
  }

  public joinLobbyMatch(match: LobbyMatch): void {
    this.currentMatchConfig = match;
    this.currentArenaSize = match.size;
    const sizeCfg = GAME_CONSTANTS.SIZES[this.currentArenaSize as keyof typeof GAME_CONSTANTS.SIZES] || GAME_CONSTANTS.SIZES.MEDIUM;
    this.arenaRing.setDimensions(sizeCfg.orbitDistance, sizeCfg.boardWidth, sizeCfg.boardHeight);
    this.hazardManager.arenaBound = sizeCfg.boardWidth / 2;
    this.simulatedRealm.arenaBound = sizeCfg.boardWidth / 2;
    this.simulatedRealm.orbitDistance = sizeCfg.orbitDistance;

    // Reset Match Players Roster
    this.initTableRoster();

    // Populate with Bots if selected
    if (match.botDifficulty && match.botDifficulty !== 'none') {
      const botsToAdd = Math.max(1, Math.min(match.currentPlayers, match.maxPlayers - 1));
      for (let i = 0; i < botsToAdd; i++) {
        this.addBotToTable(match.botDifficulty);
      }
      this.isMatchWaitingForPilots = false;
      const waitOverlay = document.getElementById('waiting-pilots-overlay');
      if (waitOverlay) waitOverlay.style.display = 'none';
    } else {
      // 0 Bots: Match waits for real pilots
      this.simulatedRealm.clearAllBots();
      this.isMatchWaitingForPilots = true;
      const waitOverlay = document.getElementById('waiting-pilots-overlay');
      if (waitOverlay) waitOverlay.style.display = 'block';
    }

    this.rebuildTableWormholes();
    this.setDeckActive(false);
    this.respawnPlayer();
    this.simulatedRealm.resetForNewRound();
    this.gameState.startMatch(match.targetWins, false);
    this.addChatLog(`Engaged Match: ${match.name} // Staging Active`, 'system');

    // Display Tactical Match Staging Screen
    this.buildShipGrid();
    const roundModal = document.getElementById('round-modal')!;
    const titleEl = document.getElementById('round-modal-title')!;
    const subEl = document.getElementById('round-modal-subtitle')!;
    const scoreEl = document.getElementById('round-modal-score')!;
    const btnNext = document.getElementById('btn-next-round')!;

    titleEl.innerText = 'TACTICAL MATCH STAGING';
    subEl.innerText = 'SELECT YOUR FIGHTER CLASS & ENGAGE WHEN READY';
    scoreEl.innerText = match.targetWins >= 999999 ? 'ENDLESS DUEL // STANDBY' : (match.targetWins <= 4 ? `BEST OF ${(match.targetWins * 2) - 1} // ROUND 1` : `FIRST TO ${match.targetWins} WINS // ROUND 1`);
    btnNext.innerText = this.isLanMatchHost ? 'ENGAGE MATCH [SPACE]' : 'READY TO DEPLOY';

    roundModal.classList.add('active');
    roundModal.style.display = 'block';
    this.modalHangarView.setShip(this.selectedShipIndex);
    this.modalHangarView.startPreview();

    this.updateTableRosterUI();
    this.sound.playPowerup();
  }

  private initTableRoster(): void {
    this.player.slot = 0;
    this.simulatedRealm.clearAllBots();
    this.tablePlayers = new Array(8).fill(null);
    // Slot 0: Local Player
    this.tablePlayers[0] = {
      slot: 0,
      name: this.playerName,
      isLocal: true,
      isBot: false,
      shipId: this.selectedShipIndex,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      isAlive: true,
      rank: 0,
      wins: this.totalMatchWins,
      color: PLAYER_COLORS[0].primary,
    };
  }

  private addBotToTable(difficulty: BotDifficulty = 'medium'): boolean {
    // Find first empty slot (1..7)
    let emptySlot = -1;
    for (let i = 1; i < 8; i++) {
      if (!this.tablePlayers[i]) {
        emptySlot = i;
        break;
      }
    }
    if (emptySlot === -1) {
      this.addChatLog('Arena is full (8/8 pilots).', 'system');
      return false;
    }

    this.isMatchWaitingForPilots = false;
    const waitOverlay = document.getElementById('waiting-pilots-overlay');
    if (waitOverlay) waitOverlay.style.display = 'none';

    const diffTag = difficulty === 'hard' ? 'HARD AI' : difficulty === 'easy' ? 'EASY AI' : 'MED AI';
    const botNames = ['Vector', 'Nova', 'Centurion', 'Viper', 'Aegis', 'Titan', 'Spectre'];
    const botName = `${botNames[(emptySlot - 1) % botNames.length]} [${diffTag}]`;
    const botShipId = (emptySlot - 1) % 8;
    const botColor = (PLAYER_COLORS[emptySlot] || PLAYER_COLORS[0]).primary;
    const botShip = ShipCatalog.get(botShipId);

    this.tablePlayers[emptySlot] = {
      slot: emptySlot,
      name: botName,
      isLocal: false,
      isBot: true,
      botDifficulty: difficulty,
      shipId: botShipId,
      health: botShip.config.hitPoints,
      maxHealth: botShip.config.hitPoints,
      isAlive: true,
      rank: 0,
      wins: 0,
      color: botColor,
    };

    this.addChatLog(`${botName} joined the arena.`, 'bot');
    this.simulatedRealm.addBotRealm(emptySlot, botName, botShipId, difficulty);
    this.rebuildTableWormholes();
    this.updateTableRosterUI();

    // If waiting in staging, update ready message
    const scoreEl = document.getElementById('round-modal-score');
    if (scoreEl && this.gameState.phase === 'STANDBY') {
      const activeCount = this.tablePlayers.filter((p) => p !== null).length;
      scoreEl.innerText = `${activeCount} PILOTS IN ARENA // READY TO ENGAGE`;
    }

    return true;
  }

  public removeBotFromTable(slot: number): void {
    if (slot <= 0 || slot >= 8) return;
    const bot = this.tablePlayers[slot];
    if (!bot || !bot.isBot) return;

    this.simulatedRealm.removeBotRealm(slot);
    this.tablePlayers[slot] = null;
    this.addChatLog(`${bot.name} was removed from the match.`, 'system');

    // If no opponents remain, update waiting state
    const remainingOpponents = this.tablePlayers.filter((p) => p !== null && !p.isLocal).length;
    if (remainingOpponents === 0) {
      if (this.isLanMatchHost || !this.network.isConnected) {
        this.isMatchWaitingForPilots = true;
        const waitOverlay = document.getElementById('waiting-pilots-overlay');
        if (waitOverlay) waitOverlay.style.display = 'block';
        const scoreEl = document.getElementById('round-modal-score');
        if (scoreEl && this.gameState.phase === 'STANDBY') {
          scoreEl.innerText = 'WAITING FOR OPPONENTS // CLICK + BOT TO ADD AI';
        }
      }
    }

    this.rebuildTableWormholes();
    this.updateTableRosterUI();

    // Update match count in lobby list if hosting
    if (this.isLanMatchHost && this.currentMatchConfig) {
      const activeCount = this.tablePlayers.filter((p) => p !== null).length;
      this.currentMatchConfig.currentPlayers = activeCount;
      const matchInList = this.lobbyMatches.find((m) => m.id === this.currentMatchConfig!.id);
      if (matchInList) matchInList.currentPlayers = activeCount;
      this.broadcastMatches();
    }
  }

  private cycleOpponent(direction: 1 | -1): void {
    const activeSlots: number[] = [];
    for (let i = 1; i < 8; i++) {
      if (this.tablePlayers[i]) activeSlots.push(i);
    }
    if (activeSlots.length === 0) return;

    let idx = activeSlots.indexOf(this.selectedOpponentSlot);
    if (idx === -1) idx = 0;
    idx = (idx + direction + activeSlots.length) % activeSlots.length;
    this.selectedOpponentSlot = activeSlots[idx];

    const opp = this.tablePlayers[this.selectedOpponentSlot];
    const nameEl = document.getElementById('pip-opponent-name');
    if (nameEl && opp) {
      nameEl.innerText = `FEED // ${opp.name.toUpperCase()}`;
    }
    this.updateTableRosterUI();
  }

  private rebuildTableWormholes(): void {
    this.wormholes = [];
    const sizeCfg = GAME_CONSTANTS.SIZES[this.currentArenaSize as keyof typeof GAME_CONSTANTS.SIZES] || GAME_CONSTANTS.SIZES.MEDIUM;
    const orbitDistance = sizeCfg.orbitDistance;

    // Active opponents are all players except local player
    const activeOpponents: TablePlayer[] = [];
    for (let i = 0; i < 8; i++) {
      const p = this.tablePlayers[i];
      if (p && p.slot !== this.player.slot) {
        activeOpponents.push(p);
      }
    }

    if (activeOpponents.length === 0) {
      const defaultOpponentSlot = this.player.slot === 0 ? 1 : 0;
      this.wormholes.push(
        new Wormhole('OPPONENT', defaultOpponentSlot, 0, orbitDistance, true)
      );
    } else {
      const angleStep = 360 / activeOpponents.length;
      activeOpponents.forEach((opp, idx) => {
        const angle = idx * angleStep;
        this.wormholes.push(
          new Wormhole(opp.name, opp.slot, angle, orbitDistance, true)
        );
      });
    }

    // Rebuild multi-wormholes across all simulated bot realms so they fight each other
    this.simulatedRealm.rebuildTableWormholes(this.tablePlayers, orbitDistance);
  }

  public resetArenaForNewRound(): void {
    const roundModal = document.getElementById('round-modal');
    if (roundModal) {
      roundModal.classList.remove('active');
      roundModal.style.display = 'none';
    }

    // 1. Wipe all arena hazards, mines, bullets, missiles, and floating powerups
    this.hazardManager.hazards = [];
    this.hazardManager.mines = [];
    this.bullets = [];
    this.missiles = [];
    this.powerups = [];

    // 2. Reset Player Ship & Upgrades
    this.respawnPlayer();

    // 3. Reset Wormholes
    for (const wh of this.wormholes) {
      wh.damageTaken = 0;
    }

    // 4. Reset All Opponent Bot / Remote Realms
    this.simulatedRealm.resetForNewRound();
    for (let i = 0; i < 8; i++) {
      if (this.tablePlayers[i] && this.tablePlayers[i]!.isBot) {
        const realm = this.simulatedRealm.botRealms.get(i);
        if (realm) {
          realm.botShip.respawn(0, this.simulatedRealm.orbitDistance);
          this.tablePlayers[i]!.health = realm.botShip.maxHealth;
          this.tablePlayers[i]!.isAlive = true;
        }
      } else if (this.tablePlayers[i] && !this.tablePlayers[i]!.isLocal) {
        this.tablePlayers[i]!.health = this.tablePlayers[i]!.maxHealth || 280;
        this.tablePlayers[i]!.isAlive = true;
      }
    }

    this.updateTableRosterUI();
  }

  private setDeckActive(active: boolean): void {
    this.inArena = !active;
    const deck = document.getElementById('screen-front-end')!;
    const hud = document.getElementById('ui-overlay')!;

    // 1. Hide all HUD and in-game modal elements
    const countdownEl = document.getElementById('countdown-overlay');
    if (countdownEl) {
      countdownEl.classList.remove('active');
      countdownEl.style.display = 'none';
    }
    const waitOverlay = document.getElementById('waiting-pilots-overlay');
    if (waitOverlay) {
      waitOverlay.style.display = 'none';
    }
    const alertBanner = document.getElementById('alert-banner');
    if (alertBanner) {
      alertBanner.classList.remove('active');
    }

    const roundModal = document.getElementById('round-modal');
    if (roundModal) {
      roundModal.classList.remove('active');
      roundModal.style.display = 'none';
    }
    const matchModal = document.getElementById('match-modal');
    if (matchModal) {
      matchModal.classList.remove('active');
      matchModal.style.display = 'none';
    }
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) {
      pauseModal.classList.remove('active');
    }
    const spawnerModal = document.getElementById('spawner-modal');
    if (spawnerModal) {
      spawnerModal.classList.remove('active');
    }
    const disconnectModal = document.getElementById('disconnect-modal');
    if (disconnectModal) {
      disconnectModal.classList.remove('active');
    }

    this.modalHangarView.stopPreview();

    if (active) {
      deck.classList.remove('hidden');
      hud.style.display = 'none';

      // 2. Clean up active match hosting state
      this.isMatchWaitingForPilots = false;
      this.gameState.phase = 'PLAYING';
      this.simulatedRealm.clearAllBots();

      if (this.isLanMatchHost && this.currentMatchConfig) {
        this.sendLanPacket({
          type: 'MATCH_TERMINATED',
          matchId: this.currentMatchConfig.id,
          reason: 'HOST_LEFT',
        });
        this.lobbyMatches = this.lobbyMatches.filter((m) => m.id !== this.currentMatchConfig!.id);
        this.broadcastMatches();
      }

      this.isLanMatchHost = false;
      this.isLanMatchClient = false;
      this.player.slot = 0;
      this.currentMatchConfig = null;
      this.network.disconnect();

      // 3. Query LAN to ensure lobby match browser is 100% synchronized
      this.sendLanPacket({ type: 'MATCH_QUERY' });
      this.renderLobbyMatches();

      setTimeout(() => this.hangarView.startPreview(), 50);
    } else {
      deck.classList.add('hidden');
      hud.style.display = 'grid';
      this.hangarView.stopPreview();
      this.renderer.resize();
      if (this.pipRenderer) this.pipRenderer.resize();
      this.resetArenaForNewRound();
    }
  }

  private addChatLog(text: string, type: 'system' | 'player' | 'bot' = 'system'): void {
    const chatLog = document.getElementById('match-chat-log') || document.getElementById('table-chat-log');
    if (!chatLog) return;

    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    div.innerText = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  private setupMatchCallbacks(): void {
    const countdownEl = document.getElementById('countdown-overlay')!;
    const matchModal = document.getElementById('match-modal')!;

    this.gameState.onRoundStart = () => {
      this.respawnPlayer();
      this.simulatedRealm.resetForNewRound();
      this.hazardManager.hazards = [];
      this.hazardManager.mines = [];
      this.bullets = [];
      this.missiles = [];
    };

    this.gameState.onScoreUpdate = (p1, p2) => {
      const winsEl = document.getElementById('hud-classic-wins');
      if (winsEl) winsEl.innerText = p1.toString();
      const lossesEl = document.getElementById('hud-classic-losses');
      if (lossesEl) lossesEl.innerText = p2.toString();
      if (this.tablePlayers[0]) this.tablePlayers[0]!.wins = p1;
      if (this.tablePlayers[1]) this.tablePlayers[1]!.wins = p2;
      this.updateTableRosterUI();
    };

    this.gameState.onRoundEnd = (roundWinner, p1Score, p2Score) => {
      const roundModal = document.getElementById('round-modal')!;
      const titleEl = document.getElementById('round-modal-title')!;
      const subEl = document.getElementById('round-modal-subtitle')!;
      const scoreEl = document.getElementById('round-modal-score')!;

      const isP1Local = !this.network.isConnected || this.network.isHost;
      const isLocalRoundWin = (roundWinner === 'PLAYER 1' && isP1Local) || (roundWinner === 'PLAYER 2' && !isP1Local);

      titleEl.innerText = isLocalRoundWin ? 'ROUND VICTORY!' : 'YOU DIED';
      titleEl.style.color = isLocalRoundWin ? 'var(--neon-cyan)' : '#ff3344';
      titleEl.style.textShadow = isLocalRoundWin ? '0 0 20px var(--neon-cyan)' : '0 0 20px #ff3344';

      subEl.innerText = isLocalRoundWin ? 'ENEMY SHIP ELIMINATED' : 'YOUR SHIP WAS DESTROYED';
      scoreEl.innerText = `${p1Score} - ${p2Score}`;

      roundModal.classList.add('active');
      roundModal.style.display = 'block';

      if (isLocalRoundWin) {
        this.sound.playVictoryFanfare();
      } else {
        this.sound.playDefeatFanfare();
      }
    };

    this.gameState.onPhaseChange = (phase) => {
      if (phase === 'COUNTDOWN') {
        const roundModal = document.getElementById('round-modal');
        if (roundModal) {
          roundModal.classList.remove('active');
          roundModal.style.display = 'none';
        }
        countdownEl.style.display = 'block';
        countdownEl.classList.add('active');
        this.lastCountdownSec = -1;
      } else if (phase === 'PLAYING') {
        countdownEl.innerText = 'ENGAGE!';
        countdownEl.style.display = 'block';
        countdownEl.classList.add('active');
        this.sound.playCountdownBeep(true);
        setTimeout(() => {
          countdownEl.classList.remove('active');
          countdownEl.style.display = 'none';
        }, 500);
        this.addChatLog(`ROUND ${this.gameState.currentRound} // ENGAGE!`, 'system');
      } else if (phase === 'ROUND_OVER') {
        this.addChatLog('Round complete.', 'system');
      } else if (phase === 'MATCH_OVER') {
        const roundModal = document.getElementById('round-modal');
        if (roundModal) {
          roundModal.classList.remove('active');
          roundModal.style.display = 'none';
        }
        countdownEl.classList.remove('active');
        countdownEl.style.display = 'none';
      }
    };

    this.gameState.onMatchEnd = (winner) => {
      matchModal.classList.add('active');
      matchModal.style.display = 'block';
      const isP1 = this.isLanMatchHost || (!this.isLanMatchClient && !this.network.isConnected) || (this.network.isConnected && this.network.isHost);
      const isLocalWin = (winner === 'PLAYER 1' && isP1) || (winner === 'PLAYER 2' && !isP1);

      if (isLocalWin) {
        this.totalMatchWins++;
        localStorage.setItem('wh_total_wins', this.totalMatchWins.toString());
        this.buildShipGrid();
      }

      document.getElementById('modal-title')!.innerText = isLocalWin ? 'VICTORY!' : 'DEFEAT!';
      document.getElementById('modal-title')!.style.color = isLocalWin ? 'var(--neon-cyan)' : '#ff3344';
      document.getElementById('modal-title')!.style.textShadow = isLocalWin ? '0 0 20px var(--neon-cyan)' : '0 0 20px #ff3344';
      document.getElementById('modal-subtitle')!.innerText = isLocalWin ? 'YOU WON THE MATCH!' : 'OPPONENT WON THE MATCH!';
      document.getElementById('stat-final-score')!.innerText = isP1 ? `${this.gameState.player1Score} - ${this.gameState.player2Score}` : `${this.gameState.player2Score} - ${this.gameState.player1Score}`;

      if (isLocalWin) {
        this.sound.playVictoryFanfare();
      } else {
        this.sound.playDefeatFanfare();
      }
    };
  }

  private handlePlayerElimination(): void {
    if (this.gameState.phase === 'ROUND_OVER' || this.gameState.phase === 'MATCH_OVER') {
      return;
    }

    this.addChatLog('Your ship was destroyed!', 'system');

    // 1. Register opponent kill so stats & scores are synchronized across all elements
    if (this.isLanMatchHost) {
      this.gameState.registerPlayer2Kill();
      if (this.currentMatchConfig) {
        this.sendLanPacket({
          type: 'MATCH_PACKET',
          matchId: this.currentMatchConfig.id,
          fromSlot: this.player.slot,
          packet: {
            type: 'KILL_EVENT',
            victimSlot: this.player.slot,
            killerSlot: 1,
            p1Score: this.gameState.player1Score,
            p2Score: this.gameState.player2Score,
          },
        });
      }
    } else if (this.isLanMatchClient) {
      if (this.currentMatchConfig) {
        this.sendLanPacket({
          type: 'MATCH_PACKET',
          matchId: this.currentMatchConfig.id,
          fromSlot: this.player.slot,
          packet: {
            type: 'PLAYER_DEATH',
            slot: this.player.slot,
          },
        });
      }
    } else if (!this.network.isConnected || this.network.isHost) {
      this.gameState.registerPlayer2Kill();
      if (this.network.isConnected && this.network.isHost) {
        this.network.sendKillEvent(0, 1, this.gameState.player1Score, this.gameState.player2Score);
      }
    } else {
      this.network.sendPlayerDeath(1);
    }

    // 2. If match is over, onMatchEnd already opened match-modal; otherwise open round-modal
    if ((this.gameState.phase as string) !== 'MATCH_OVER') {
      const roundModal = document.getElementById('round-modal')!;
      const titleEl = document.getElementById('round-modal-title')!;
      const subEl = document.getElementById('round-modal-subtitle')!;
      const scoreEl = document.getElementById('round-modal-score')!;
      const btnNext = document.getElementById('btn-next-round')!;

      titleEl.innerText = 'YOU DIED';
      titleEl.style.color = '#ff3344';
      titleEl.style.textShadow = '0 0 25px #ff3344';
      subEl.innerText = 'YOUR SHIP WAS DESTROYED';

      const killerEl = document.getElementById('round-modal-killer');
      if (killerEl) {
        const dmg = this.player.lastDamagedBy;
        if (dmg) {
          const killerName = dmg.name || (dmg.slot !== undefined && this.tablePlayers[dmg.slot] ? this.tablePlayers[dmg.slot]!.name : 'ENEMY PILOT');
          const weaponName = dmg.weapon || 'PRIMARY WEAPONS';
          killerEl.innerText = `KILLED BY ${killerName.toUpperCase()}'S ${weaponName.toUpperCase()}`;
          killerEl.style.display = 'block';
        } else {
          killerEl.innerText = 'KILLED BY ARENA HAZARD';
          killerEl.style.display = 'block';
        }
      }

      scoreEl.innerText = `${this.gameState.player1Score} - ${this.gameState.player2Score}`;
      btnNext.innerText = this.isLanMatchClient ? 'READY FOR NEXT ROUND' : 'NEXT ROUND [SPACE]';

      roundModal.classList.add('active');
      roundModal.style.display = 'block';
      this.buildShipGrid();
      this.modalHangarView.setShip(this.selectedShipIndex);
      this.modalHangarView.startPreview();
      this.sound.playDefeatFanfare();
    }
  }

  public showVictoryModal(): void {
    if (this.gameState.phase === 'MATCH_OVER') return;

    const roundModal = document.getElementById('round-modal')!;
    const titleEl = document.getElementById('round-modal-title')!;
    const subEl = document.getElementById('round-modal-subtitle')!;
    const killerEl = document.getElementById('round-modal-killer');
    const scoreEl = document.getElementById('round-modal-score')!;
    const btnNext = document.getElementById('btn-next-round')!;

    titleEl.innerText = 'ROUND VICTORY!';
    titleEl.style.color = 'var(--neon-cyan)';
    titleEl.style.textShadow = '0 0 25px var(--neon-cyan)';
    subEl.innerText = 'ENEMY FLEET ELIMINATED';
    if (killerEl) {
      killerEl.innerText = '';
      killerEl.style.display = 'none';
    }
    scoreEl.innerText = `${this.gameState.player1Score} - ${this.gameState.player2Score}`;
    btnNext.innerText = this.isLanMatchClient ? 'READY FOR NEXT ROUND' : 'NEXT ROUND [SPACE]';

    roundModal.classList.add('active');
    roundModal.style.display = 'block';
    this.buildShipGrid();
    this.modalHangarView.setShip(this.selectedShipIndex);
    this.modalHangarView.startPreview();
    this.sound.playVictoryFanfare();
  }

  private handleBotElimination(botSlot = 1): void {
    if (this.gameState.phase === 'ROUND_OVER' || this.gameState.phase === 'MATCH_OVER') {
      return;
    }

    const botPlayer = this.tablePlayers[botSlot];
    const botName = botPlayer ? botPlayer.name : 'Opponent';
    this.addChatLog(`${botName} was destroyed!`, 'system');
    this.sound.playExplosion(true);

    if (this.tablePlayers[botSlot]) {
      this.tablePlayers[botSlot]!.health = 0;
      this.tablePlayers[botSlot]!.isAlive = false;
    }
    this.updateTableRosterUI();

    // Check if any opponent remains alive
    let opponentsRemaining = false;
    for (let i = 1; i < 8; i++) {
      if (this.tablePlayers[i] && this.tablePlayers[i]!.isAlive) {
        opponentsRemaining = true;
        break;
      }
    }

    if (!opponentsRemaining) {
      if (!this.network.isConnected || this.network.isHost) {
        this.gameState.registerPlayer1Kill();
        if (this.network.isConnected && this.network.isHost) {
          this.network.sendKillEvent(1, 0, this.gameState.player1Score, this.gameState.player2Score);
        }
      }
      if ((this.gameState.phase as string) !== 'MATCH_OVER') {
        this.showVictoryModal();
      }
    }
  }

  public startNextRound(): void {
    if (this.isLanMatchClient) {
      const btnNext = document.getElementById('btn-next-round');
      if (btnNext) {
        btnNext.innerText = 'READY // WAITING FOR HOST...';
      }
      if (this.currentMatchConfig) {
        this.sendLanPacket({
          type: 'MATCH_PACKET',
          matchId: this.currentMatchConfig.id,
          fromSlot: this.player.slot,
          packet: {
            type: 'CLIENT_READY',
            slot: this.player.slot,
            playerName: this.playerName,
          },
        });
      }
      this.addChatLog('Signaled Ready to Host.', 'system');
      return;
    }

    // Guard: Prevent advancing if match has reached final conclusion
    if (this.gameState.phase === 'MATCH_OVER' || this.gameState.player1Score >= this.gameState.targetWins || this.gameState.player2Score >= this.gameState.targetWins) {
      return;
    }

    // Guard: Prevent launching when no opponents are present in the arena
    const activeOpponents = this.tablePlayers.filter((p) => p !== null && !p.isLocal).length;
    if (activeOpponents === 0) {
      this.showAlert('CANNOT ENGAGE: NO OPPONENTS IN ARENA! CLICK \'+ BOT\' OR WAIT FOR PLAYERS.');
      this.addChatLog('Cannot start match without opponents. Add a bot or wait for players to join.', 'system');
      const scoreEl = document.getElementById('round-modal-score');
      if (scoreEl) scoreEl.innerText = 'WAITING FOR OPPONENTS // CLICK + BOT TO ADD AI';
      return;
    }

    this.resetArenaForNewRound();

    if (this.gameState.phase === 'ROUND_OVER' || this.gameState.phase === 'STANDBY') {
      const roundModal = document.getElementById('round-modal');
      if (roundModal) {
        roundModal.classList.remove('active');
        roundModal.style.display = 'none';
      }
      this.modalHangarView.stopPreview();

      if (this.gameState.phase === 'STANDBY') {
        this.gameState.startCountdown();
      } else {
        this.gameState.nextRound();
      }

      if (this.isLanMatchHost && this.currentMatchConfig) {
        this.sendLanPacket({
          type: 'MATCH_PACKET',
          matchId: this.currentMatchConfig.id,
          fromSlot: this.player.slot,
          packet: {
            type: 'MATCH_START',
            targetWins: this.gameState.targetWins,
            round: this.gameState.currentRound,
            seed: Math.random(),
          },
        });
      } else if (this.network.isConnected && this.network.isHost) {
        this.network.sendMatchStart(this.gameState.targetWins, this.gameState.currentRound, Math.random());
      }
    }
  }

  private setupNetworkCallbacks(): void {
    const btnHost = document.getElementById('btn-create-host')!;

    this.network.onConnected = (isHost, roomId) => {
      this.simulatedRealm.isRemotePlayer = true;
      this.addChatLog(`P2P Connected to Room: ${roomId}`, 'system');

      this.tablePlayers[1] = {
        slot: 1,
        name: isHost ? 'Remote Client' : 'Host Player',
        isLocal: false,
        isBot: false,
        shipId: 1,
        health: 240,
        maxHealth: 240,
        isAlive: true,
        rank: 0,
        wins: 0,
        color: PLAYER_COLORS[1].primary,
      };

      this.rebuildTableWormholes();
      this.setDeckActive(false);
      this.respawnPlayer();
      this.simulatedRealm.resetForNewRound();
      this.gameState.startMatch(5);

      if (isHost) {
        btnHost.innerText = `ROOM: ${roomId} (CLICK TO COPY LINK)`;
        this.network.sendMatchStart(this.gameState.targetWins, this.gameState.currentRound, Math.random());
      }
    };

    this.network.onReceiveHazard = (payload: WarpPayload) => {
      this.showAlert(`INCOMING // ${POWERUP_NAMES[payload.hazardType] || 'HAZARD'} FROM OPPONENT!`);
      const targetWh = this.wormholes[0] || new Wormhole('PLAYER 2', 1, 0, 240);
      this.hazardManager.spawnHazard(payload.hazardType, targetWh, this.player, this.missiles);
      this.gameState.stats.p2HazardsSent++;
      this.addChatLog(`Opponent sent ${POWERUP_NAMES[payload.hazardType]} -> Your Realm`, 'system');
      this.sound.playSpecial(1);
    };

    this.network.onReceiveSnapshot = (snapshot) => {
      this.simulatedRealm.applyRemoteSnapshot(snapshot);
      if (this.tablePlayers[1]) {
        this.tablePlayers[1]!.health = snapshot.hp;
        this.tablePlayers[1]!.maxHealth = snapshot.maxHp;
        this.tablePlayers[1]!.isAlive = snapshot.isAlive;
      }
    };

    this.network.onReceivePlayerDeath = (slot) => {
      if (this.network.isHost && this.gameState.phase === 'PLAYING') {
        if (slot === 1) {
          this.gameState.registerPlayer1Kill();
          this.addChatLog('Remote Player Destroyed in Realm 2!', 'system');
          this.network.sendKillEvent(1, 0, this.gameState.player1Score, this.gameState.player2Score);
        }
      }
    };

    this.network.onReceiveKillEvent = (victimSlot, _killerSlot, p1Score, p2Score) => {
      this.gameState.player1Score = p1Score;
      this.gameState.player2Score = p2Score;
      if (this.gameState.onScoreUpdate) {
        this.gameState.onScoreUpdate(p1Score, p2Score);
      }

      const roundWinner = victimSlot === 0 ? 'PLAYER 2' : 'PLAYER 1';
      if (p1Score >= this.gameState.targetWins) {
        this.gameState.finishMatchManually('PLAYER 1');
      } else if (p2Score >= this.gameState.targetWins) {
        this.gameState.finishMatchManually('PLAYER 2');
      } else {
        this.gameState.phase = 'ROUND_OVER';
        this.gameState.roundOverTimer = 4.0;
        this.gameState.roundWinner = roundWinner;
        if (this.gameState.onRoundEnd) this.gameState.onRoundEnd(roundWinner, p1Score, p2Score);
        if (this.gameState.onPhaseChange) this.gameState.onPhaseChange('ROUND_OVER');
      }
    };

    this.network.onReceiveMatchStart = (targetWins, round) => {
      document.getElementById('round-modal')?.classList.remove('active');
      this.setDeckActive(false);
      this.respawnPlayer();
      this.simulatedRealm.resetForNewRound();
      this.gameState.targetWins = targetWins;
      this.gameState.currentRound = round || this.gameState.currentRound + 1;
      this.gameState.startCountdown();
      this.addChatLog(`Round ${this.gameState.currentRound} // Host Synchronized`, 'system');
    };

    this.network.onReceiveMatchReset = () => {
      this.gameState.startMatch();
      this.respawnPlayer();
      this.simulatedRealm.resetForNewRound();
      this.addChatLog('Match scores reset by host.', 'system');
    };

    this.network.onDisconnected = (reason) => {
      document.getElementById('disconnect-reason')!.innerText = reason.toUpperCase();
      document.getElementById('disconnect-modal')?.classList.add('active');
      this.simulatedRealm.isRemotePlayer = false;
      this.addChatLog('Multiplayer disconnected // Solo mode active', 'system');
    };
  }

  public static generateRandomCallsign(): string {
    const prefixes = [
      'Ghost', 'Viper', 'Nova', 'Echo', 'Apex', 'Phantom',
      'Vector', 'Titan', 'Shadow', 'Raven', 'Hyper', 'Solar',
      'Pulse', 'Aegis', 'Cyber', 'Striker', 'Blaze', 'Cosmo',
      'Orion', 'Zenith', 'Spectre', 'Vortex', 'Krypton', 'Zero',
      'Quantum', 'Omega', 'Astral', 'Nebula', 'Falcon', 'Raptor'
    ];
    const suffixes = [
      'Prime', 'Ace', 'Fox', 'Hawk', 'Wolf', 'Blade', 'Rogue',
      'Dash', 'Nomad', 'Fury', 'Ranger', 'Knight', 'Pilot',
      'Hunter', 'Vanguard', 'Specter', 'Striker', 'Reaper', 'Surfer', 'Runner'
    ];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    while (suffix === prefix) {
      suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    }
    return `${prefix}${suffix}`;
  }

  private setupFrontEndUI(): void {
    const callsignInput = document.getElementById('input-callsign') as HTMLInputElement;
    this.playerName = WormholeGame.generateRandomCallsign();
    callsignInput.value = this.playerName;
    if (this.tablePlayers[0]) {
      this.tablePlayers[0]!.name = this.playerName;
    }
    document.getElementById('hud-classic-callsign')!.innerText = this.playerName;

    callsignInput.addEventListener('input', () => {
      this.playerName = callsignInput.value.trim() || 'Pilot-1';
      if (this.tablePlayers[0]) {
        this.tablePlayers[0]!.name = this.playerName;
      }
      document.getElementById('hud-classic-callsign')!.innerText = this.playerName;
      this.renderConnectedPilots();
      this.updateTableRosterUI();
    });

    const btnRefreshCallsign = document.getElementById('btn-refresh-callsign');
    if (btnRefreshCallsign) {
      btnRefreshCallsign.onclick = () => {
        this.playerName = WormholeGame.generateRandomCallsign();
        callsignInput.value = this.playerName;
        if (this.tablePlayers[0]) {
          this.tablePlayers[0]!.name = this.playerName;
        }
        document.getElementById('hud-classic-callsign')!.innerText = this.playerName;
        this.renderConnectedPilots();
        this.updateTableRosterUI();
        this.sound.playPowerup();
      };
    }

    // Lobby Chat Message Input
    const inputLobbyChat = document.getElementById('input-lobby-chat') as HTMLInputElement | null;
    const btnLobbyChatSend = document.getElementById('btn-lobby-chat-send');
    if (inputLobbyChat && btnLobbyChatSend) {
      const sendLobbyMsg = () => {
        const text = inputLobbyChat.value.trim();
        if (!text) return;
        this.sendLobbyChat(text);
        inputLobbyChat.value = '';
      };
      btnLobbyChatSend.onclick = sendLobbyMsg;
      inputLobbyChat.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendLobbyMsg();
      });
    }

    // Live Match Browser Search Filter
    const inputMatchSearch = document.getElementById('input-match-search') as HTMLInputElement | null;
    if (inputMatchSearch) {
      inputMatchSearch.addEventListener('input', () => {
        this.renderLobbyMatches(inputMatchSearch.value);
      });
    }

    const btnRefreshMatches = document.getElementById('btn-refresh-matches');
    if (btnRefreshMatches) {
      btnRefreshMatches.onclick = () => {
        this.renderConnectedPilots();
        this.renderLobbyMatches(inputMatchSearch ? inputMatchSearch.value : '');
        this.sound.playPowerup();
      };
    }

    // Solo Practice Button (Quick 1v1 Launch with 1 Bot)
    document.getElementById('btn-main-engage')!.onclick = () => {
      this.joinLobbyMatch({
        id: 'match-practice',
        name: 'Solo Practice Simulation',
        hostName: 'System AI',
        isPasswordProtected: false,
        size: 'MEDIUM',
        targetWins: 5,
        powerupRule: 'STANDARD',
        shipRestriction: 'STANDARD',
        botDifficulty: 'medium',
        maxPlayers: 2,
        currentPlayers: 2,
        status: 'WAITING',
      });
    };

    // Host New Match Modal Triggers
    const createModal = document.getElementById('create-match-modal');
    const btnCreateHost = document.getElementById('btn-create-host')!;
    btnCreateHost.onclick = () => {
      if (createModal) {
        (document.getElementById('host-match-name') as HTMLInputElement).value = `${this.playerName}'s Match`;
        createModal.classList.add('active');
        createModal.style.display = 'block';
      }
    };

    const btnCancelCreate = document.getElementById('btn-create-match-cancel');
    if (btnCancelCreate && createModal) {
      btnCancelCreate.onclick = () => {
        createModal.classList.remove('active');
        createModal.style.display = 'none';
      };
    }

    const btnConfirmCreate = document.getElementById('btn-create-match-confirm');
    if (btnConfirmCreate && createModal) {
      btnConfirmCreate.onclick = () => {
        const nameInput = (document.getElementById('host-match-name') as HTMLInputElement).value.trim() || `${this.playerName}'s Match`;
        const sizeSelect = (document.getElementById('host-match-size') as HTMLSelectElement).value as 'SMALL' | 'MEDIUM' | 'LARGE' | 'HUGE';
        const winsSelect = parseInt((document.getElementById('host-target-wins') as HTMLSelectElement).value, 10) || 5;
        const pupsSelect = (document.getElementById('host-powerup-pool') as HTMLSelectElement).value as 'STANDARD' | 'EXTENDED' | 'NO_NUKES';
        const shipSelect = (document.getElementById('host-ship-restriction') as HTMLSelectElement).value as 'STANDARD' | 'ALL';
        const botDiff = (document.getElementById('host-bot-diff') as HTMLSelectElement).value as BotDifficulty | 'none';
        const passInput = (document.getElementById('host-match-password') as HTMLInputElement).value.trim();

        const maxSlots = sizeSelect === 'SMALL' ? 2 : sizeSelect === 'MEDIUM' ? 4 : sizeSelect === 'LARGE' ? 6 : 8;

        const newMatch: LobbyMatch = {
          id: `match-${Date.now()}`,
          name: nameInput,
          hostName: this.playerName,
          isPasswordProtected: passInput.length > 0,
          password: passInput || undefined,
          size: sizeSelect,
          targetWins: winsSelect,
          powerupRule: pupsSelect,
          shipRestriction: shipSelect,
          botDifficulty: botDiff,
          maxPlayers: maxSlots,
          currentPlayers: botDiff === 'none' ? 1 : maxSlots,
          status: 'WAITING',
          isCustom: true,
        };

        this.isLanMatchHost = true;
        this.isLanMatchClient = false;
        this.lobbyMatches.unshift(newMatch);
        this.broadcastMatches();
        createModal.classList.remove('active');
        createModal.style.display = 'none';
        this.joinLobbyMatch(newMatch);
      };
    }

    // Match In-Game Controls
    const btnMatchStart = document.getElementById('btn-match-start') || document.getElementById('btn-table-start');
    if (btnMatchStart) {
      btnMatchStart.onclick = () => {
        this.isMatchWaitingForPilots = false;
        const waitOverlay = document.getElementById('waiting-pilots-overlay');
        if (waitOverlay) waitOverlay.style.display = 'none';

        this.resetArenaForNewRound();
        this.gameState.startMatch(this.currentMatchConfig ? this.currentMatchConfig.targetWins : 5);
        this.addChatLog(`Match engaged! First to ${this.currentMatchConfig ? this.currentMatchConfig.targetWins : 5} wins!`, 'system');

        if (this.isLanMatchHost && this.currentMatchConfig) {
          this.sendLanPacket({
            type: 'MATCH_PACKET',
            matchId: this.currentMatchConfig.id,
            fromSlot: this.player.slot,
            packet: {
              type: 'MATCH_START',
              targetWins: this.gameState.targetWins,
              round: 1,
              seed: Math.random(),
            },
          });
        } else if (this.network.isConnected && this.network.isHost) {
          this.network.sendMatchReset();
        }
      };
    }

    const btnMatchLeave = document.getElementById('btn-match-leave') || document.getElementById('btn-table-leave');
    if (btnMatchLeave) {
      btnMatchLeave.onclick = () => {
        this.network.disconnect();
        // Remove hosted match if we were host
        if (this.currentMatchConfig && this.currentMatchConfig.hostName === this.playerName) {
          this.lobbyMatches = this.lobbyMatches.filter((m) => m.id !== this.currentMatchConfig!.id);
          this.broadcastMatches();
        }
        this.setDeckActive(true);
        this.renderLobbyMatches();
      };
    }

    const btnMatchSound = document.getElementById('btn-match-sound') || document.getElementById('btn-table-sound');
    if (btnMatchSound) {
      btnMatchSound.onclick = () => {
        const muted = this.sound.toggleMute();
        btnMatchSound.innerText = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
      };
    }

    // Add Bot Button
    const btnAddBot = document.getElementById('btn-add-cpu');
    if (btnAddBot) {
      btnAddBot.onclick = () => {
        const diffSelect = (document.getElementById('match-bot-diff') || document.getElementById('table-bot-diff')) as HTMLSelectElement | null;
        const diff = (diffSelect ? diffSelect.value : 'medium') as BotDifficulty;
        this.addBotToTable(diff);
      };
    }

    // PiP Opponent Navigation & Viewport Expansion
    document.getElementById('btn-pip-prev')!.onclick = () => this.cycleOpponent(-1);
    document.getElementById('btn-pip-next')!.onclick = () => this.cycleOpponent(1);

    const btnPipExpand = document.getElementById('btn-pip-expand');
    const pipCard = document.getElementById('pip-camera-card');
    if (btnPipExpand && pipCard) {
      btnPipExpand.onclick = () => {
        pipCard.classList.toggle('expanded');
        btnPipExpand.innerText = pipCard.classList.contains('expanded') ? '🗕' : '⛶';
        if (this.pipRenderer) this.pipRenderer.resize();
      };
    }

    // Match Comms Message Send
    const inputChat = document.getElementById('input-chat-msg') as HTMLInputElement;
    const sendChat = () => {
      const msg = inputChat.value.trim();
      if (!msg) return;
      this.addChatLog(`${this.playerName}: ${msg}`, 'player');
      inputChat.value = '';
    };
    document.getElementById('btn-chat-send')!.onclick = sendChat;
    inputChat.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChat();
    });

    document.getElementById('btn-emote-smile')!.onclick = () => {
      this.addChatLog(`${this.playerName}: 😄`, 'player');
    };

    document.getElementById('btn-chat-clear')!.onclick = () => {
      const logEl = document.getElementById('match-chat-log') || document.getElementById('table-chat-log');
      if (logEl) logEl.innerHTML = '';
    };

    // Next Round Button
    document.getElementById('btn-next-round')!.onclick = () => {
      this.startNextRound();
    };

    // Build Ship Selection Grid with Unlock Progression
    this.buildShipGrid();

    // Flight Manual & Controls Toggle
    document.getElementById('btn-manual-toggle')!.onclick = () => {
      document.getElementById('manual-modal')?.classList.add('active');
    };
    document.getElementById('btn-close-manual')!.onclick = () => {
      document.getElementById('manual-modal')?.classList.remove('active');
    };

    // Manual tab switching
    const manualTabBtns = document.querySelectorAll('.manual-tab-btn');
    manualTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        manualTabBtns.forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.manual-tab-pane').forEach((p) => p.classList.remove('active'));

        btn.classList.add('active');
        const tabId = (btn as HTMLElement).dataset.tab;
        if (tabId) {
          document.getElementById(tabId)?.classList.add('active');
        }
      });
    });

    // Powerup Pool Toggle (All 14 vs Classic 11)
    const btnPupsPool = document.getElementById('btn-toggle-pups-pool');
    if (btnPupsPool) {
      btnPupsPool.onclick = () => {
        Powerup.allPowerupsAllowed = !Powerup.allPowerupsAllowed;
        btnPupsPool.innerText = Powerup.allPowerupsAllowed ? '⚡ PUPS: ALL (14)' : '⚡ PUPS: CLASSIC (11)';
        btnPupsPool.style.color = Powerup.allPowerupsAllowed ? '#00ffcc' : '#ffaa00';
        btnPupsPool.style.borderColor = Powerup.allPowerupsAllowed ? 'rgba(0, 255, 204, 0.4)' : 'rgba(255, 170, 0, 0.4)';
        this.sound.playLaser(0);
      };
    }

    // Options Modal Setup
    this.setupOptionsUI();

    // Sound toggle in menu
    document.getElementById('btn-menu-sound')!.onclick = () => {
      const muted = this.sound.toggleMute();
      document.getElementById('btn-menu-sound')!.innerText = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
    };

    // Pause Menu Handlers
    document.getElementById('btn-pause-resume')!.onclick = () => {
      document.getElementById('pause-modal')?.classList.remove('active');
    };
    document.getElementById('btn-pause-title')!.onclick = () => {
      document.getElementById('pause-modal')?.classList.remove('active');
      this.setDeckActive(true);
    };

    // Modal Deck Buttons
    document.getElementById('btn-modal-deck')!.onclick = () => {
      document.getElementById('match-modal')?.classList.remove('active');
      this.setDeckActive(true);
    };
    const btnRoundMenu = document.getElementById('btn-round-menu');
    if (btnRoundMenu) {
      btnRoundMenu.onclick = () => {
        document.getElementById('round-modal')?.classList.remove('active');
        this.setDeckActive(true);
      };
    }
    document.getElementById('btn-return-solo')!.onclick = () => {
      document.getElementById('disconnect-modal')?.classList.remove('active');
      this.network.disconnect();
      this.setDeckActive(true);
    };

    // Match Victory Buttons
    document.getElementById('btn-play-again')!.onclick = () => {
      document.getElementById('match-modal')?.classList.remove('active');
      const matchModal = document.getElementById('match-modal');
      if (matchModal) {
        matchModal.classList.remove('active');
        matchModal.style.display = 'none';
      }
      this.hazardManager.hazards = [];
      this.hazardManager.mines = [];
      this.bullets = [];
      this.missiles = [];
      this.powerups = [];
      for (const wh of this.wormholes) {
        wh.damageTaken = 0;
      }
      this.respawnPlayer();
      this.simulatedRealm.resetForNewRound();
      for (let i = 1; i < 8; i++) {
        if (this.tablePlayers[i] && this.tablePlayers[i]!.isBot) {
          const realm = this.simulatedRealm.botRealms.get(i);
          if (realm) {
            realm.botShip.respawn(0, this.simulatedRealm.orbitDistance);
            this.tablePlayers[i]!.health = realm.botShip.maxHealth;
            this.tablePlayers[i]!.isAlive = true;
            this.tablePlayers[i]!.wins = 0;
          }
        } else if (this.tablePlayers[i] && !this.tablePlayers[i]!.isLocal) {
          this.tablePlayers[i]!.wins = 0;
        }
      }
      if (this.tablePlayers[0]) this.tablePlayers[0]!.wins = 0;
      this.updateTableRosterUI();

      const targetWins = this.currentMatchConfig?.targetWins || 2;
      this.gameState.startMatch(targetWins, false);

      // Open Rematch Staging
      this.buildShipGrid();
      const roundModal = document.getElementById('round-modal')!;
      const titleEl = document.getElementById('round-modal-title')!;
      const subEl = document.getElementById('round-modal-subtitle')!;
      const scoreEl = document.getElementById('round-modal-score')!;
      const btnNext = document.getElementById('btn-next-round')!;

      titleEl.innerText = 'REMATCH STAGING // STANDBY';
      subEl.innerText = 'SELECT YOUR FIGHTER CLASS & ENGAGE WHEN READY';
      scoreEl.innerText = targetWins >= 999999 ? 'ENDLESS DUEL // STANDBY' : (targetWins <= 4 ? `BEST OF ${(targetWins * 2) - 1} // ROUND 1` : `FIRST TO ${targetWins} WINS // ROUND 1`);
      btnNext.innerText = this.isLanMatchHost || !this.network.isConnected ? 'ENGAGE MATCH [SPACE]' : 'READY TO DEPLOY';

      roundModal.classList.add('active');
      roundModal.style.display = 'block';
      this.modalHangarView.setShip(this.selectedShipIndex);
      this.modalHangarView.startPreview();

      if (this.network.isConnected && this.network.isHost) {
        this.network.sendMatchReset();
      }
    };

    this.hangarView.updateStatsUI();
    this.setupHazardSpawnerModal();
  }

  private setupOptionsUI(): void {
    const optionsModal = document.getElementById('options-modal');
    const btnMenuOptions = document.getElementById('btn-menu-options');
    const btnPauseOptions = document.getElementById('btn-pause-options');
    const btnCloseOptions = document.getElementById('btn-close-options');

    const openOptions = () => {
      if (optionsModal) {
        optionsModal.classList.add('active');
        optionsModal.style.display = 'block';
        this.renderKeybindGrid();
        this.updateGamepadStatusUI();
      }
    };

    if (btnMenuOptions) btnMenuOptions.onclick = openOptions;
    if (btnPauseOptions) btnPauseOptions.onclick = openOptions;
    if (btnCloseOptions && optionsModal) {
      btnCloseOptions.onclick = () => {
        optionsModal.classList.remove('active');
        optionsModal.style.display = 'none';
      };
    }

    // Option Tab Switching
    const optTabBtns = document.querySelectorAll<HTMLButtonElement>('[data-opttab]');
    optTabBtns.forEach((btn) => {
      btn.onclick = () => {
        optTabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-opttab');
        document.querySelectorAll('.opt-tab-pane').forEach((p) => {
          (p as HTMLElement).style.display = 'none';
        });
        const targetPane = document.getElementById(targetId || '');
        if (targetPane) targetPane.style.display = 'block';
      };
    });

    // FPS Counter Toggle (Persistent)
    const chkFps = document.getElementById('chk-opt-fps') as HTMLInputElement | null;
    const fpsCounterEl = document.getElementById('fps-counter');
    const savedFps = localStorage.getItem('wh_opt_fps');
    if (chkFps && fpsCounterEl) {
      if (savedFps !== null) {
        chkFps.checked = savedFps === 'true';
        fpsCounterEl.style.display = chkFps.checked ? 'block' : 'none';
      }
      chkFps.onchange = () => {
        fpsCounterEl.style.display = chkFps.checked ? 'block' : 'none';
        try { localStorage.setItem('wh_opt_fps', chkFps.checked.toString()); } catch {}
      };
    }

    // Scanline Filter Toggle (Persistent)
    const chkScanlines = document.getElementById('chk-opt-scanlines') as HTMLInputElement | null;
    const scanlineEl = document.querySelector('.scanline-overlay') as HTMLElement | null;
    const savedScanlines = localStorage.getItem('wh_opt_scanlines');
    if (chkScanlines && scanlineEl) {
      if (savedScanlines !== null) {
        chkScanlines.checked = savedScanlines === 'true';
        scanlineEl.style.display = chkScanlines.checked ? 'block' : 'none';
      }
      chkScanlines.onchange = () => {
        scanlineEl.style.display = chkScanlines.checked ? 'block' : 'none';
        try { localStorage.setItem('wh_opt_scanlines', chkScanlines.checked.toString()); } catch {}
      };
    }

    // Stick Deadzone Slider (Persistent)
    const deadzoneSlider = document.getElementById('opt-stick-deadzone') as HTMLInputElement | null;
    const deadzoneVal = document.getElementById('opt-deadzone-val');
    if (deadzoneSlider && deadzoneVal) {
      deadzoneSlider.value = this.input.deadzone.toString();
      deadzoneVal.innerText = `${Math.round(this.input.deadzone * 100)}%`;
      deadzoneSlider.oninput = () => {
        const val = parseFloat(deadzoneSlider.value);
        this.input.setDeadzone(val);
        deadzoneVal.innerText = `${Math.round(val * 100)}%`;
      };
    }

    // Reset Keybinds Button
    const btnResetKeybinds = document.getElementById('btn-reset-keybinds');
    if (btnResetKeybinds) {
      btnResetKeybinds.onclick = () => {
        this.input.resetBindings();
        this.renderKeybindGrid();
        this.sound.playPowerup();
      };
    }
  }

  private renderKeybindGrid(): void {
    const grid = document.getElementById('keybind-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const actions: { id: InputAction; label: string }[] = [
      { id: 'up', label: 'THRUSTER / FORWARD' },
      { id: 'left', label: 'STEER LEFT' },
      { id: 'right', label: 'STEER RIGHT' },
      { id: 'fire', label: 'PRIMARY LASERS' },
      { id: 'secondaryFire', label: 'LAUNCH POWERUP [F]' },
      { id: 'tertiaryFire', label: 'SPECIAL ABILITY' },
    ];

    actions.forEach((act) => {
      const row = document.createElement('div');
      row.style.background = 'rgba(0, 0, 0, 0.45)';
      row.style.border = '1px solid rgba(0, 229, 255, 0.2)';
      row.style.borderRadius = '6px';
      row.style.padding = '8px 10px';
      row.style.display = 'flex';
      row.style.flexDirection = 'column';
      row.style.gap = '4px';

      const label = document.createElement('div');
      label.style.fontSize = '10px';
      label.style.fontWeight = '800';
      label.style.color = 'var(--neon-cyan)';
      label.innerText = act.label;

      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.style.padding = '5px 8px';
      btn.style.fontSize = '10px';
      btn.style.width = '100%';
      const keys = this.input.bindings[act.id] || [];
      btn.innerText = keys.length > 0 ? keys[0].replace('Key', '').replace('Arrow', '') : 'NONE';

      btn.onclick = () => {
        btn.innerText = 'PRESS KEY...';
        btn.style.borderColor = '#ff007f';
        btn.style.color = '#ff007f';

        const onKeyDown = (e: KeyboardEvent) => {
          e.preventDefault();
          e.stopPropagation();
          this.input.setBinding(act.id, e.code);
          window.removeEventListener('keydown', onKeyDown, true);
          this.renderKeybindGrid();
          this.sound.playPowerup();
        };

        window.addEventListener('keydown', onKeyDown, { capture: true, once: true });
      };

      row.appendChild(label);
      row.appendChild(btn);
      grid.appendChild(row);
    });
  }

  private updateGamepadStatusUI(): void {
    const statusEl = document.getElementById('opt-gamepad-status');
    if (!statusEl) return;
    if (this.input.isGamepadConnected()) {
      statusEl.innerText = `CONNECTED (${this.input.getGamepadName().substring(0, 20)})`;
      statusEl.style.color = '#00ff88';
    } else {
      statusEl.innerText = 'DISCONNECTED (CONNECT USB/XBOX CONTROLLER)';
      statusEl.style.color = '#ff3344';
    }
  }

  private setupHazardSpawnerModal(): void {
    const spawnerModal = document.getElementById('spawner-modal');
    const targetSelect = document.getElementById('spawner-target-select') as HTMLSelectElement | null;

    const populateTargets = () => {
      if (!targetSelect) return;
      const prevVal = targetSelect.value;
      targetSelect.innerHTML = '';

      // Option 0: Local Player
      const optLocal = document.createElement('option');
      optLocal.value = '0';
      optLocal.innerText = `YOU (${this.playerName.toUpperCase()})`;
      targetSelect.appendChild(optLocal);

      // Options 1..7: All active opponents
      for (let i = 1; i < 8; i++) {
        const p = this.tablePlayers[i];
        if (p) {
          const opt = document.createElement('option');
          opt.value = i.toString();
          opt.innerText = `SLOT ${i + 1}: ${p.name.toUpperCase()}`;
          targetSelect.appendChild(opt);
        }
      }

      if (prevVal && targetSelect.querySelector(`option[value="${prevVal}"]`)) {
        targetSelect.value = prevVal;
      }
    };

    const openSpawner = () => {
      populateTargets();
      spawnerModal?.classList.add('active');
    };
    const closeSpawner = () => {
      spawnerModal?.classList.remove('active');
    };

    const btnMenuSpawner = document.getElementById('btn-menu-spawner');
    if (btnMenuSpawner) btnMenuSpawner.onclick = openSpawner;

    const btnTableSpawner = document.getElementById('btn-match-spawner') || document.getElementById('btn-table-spawner');
    if (btnTableSpawner) btnTableSpawner.onclick = openSpawner;

    const btnCloseSpawner = document.getElementById('btn-close-spawner');
    if (btnCloseSpawner) btnCloseSpawner.onclick = closeSpawner;

    const grid = document.getElementById('spawner-btn-grid');
    if (grid) {
      grid.innerHTML = '';
      for (let type = 6; type <= 19; type++) {
        const btn = document.createElement('button');
        btn.className = 'arena-btn';
        btn.style.padding = '8px 6px';
        btn.style.fontSize = '10px';
        btn.style.textAlign = 'left';
        btn.style.display = 'flex';
        btn.style.justifyContent = 'space-between';
        btn.style.alignItems = 'center';

        const name = POWERUP_NAMES[type] || `HAZARD #${type}`;
        btn.innerHTML = `<span>${type}. ${name}</span><span style="color: #ffaa00;">+</span>`;

        btn.onclick = () => {
          const targetSlot = parseInt(targetSelect?.value || '0', 10);
          if (targetSlot === 0) {
            // Spawn directly in local player's realm
            const targetWh = this.wormholes[0] || new Wormhole('TARGET', 1, 0, 240);
            this.hazardManager.spawnHazard(type, targetWh, this.player, this.missiles);
            this.showAlert(`SPAWNED // ${name} -> YOUR REALM`);
            this.addChatLog(`[SPAWNER] Spawned ${name} in Your Realm`, 'system');
          } else {
            // Spawn in chosen opponent's realm
            this.simulatedRealm.receiveHazardFromPlayer1(type, targetSlot);
            const oppName = this.tablePlayers[targetSlot]?.name || `OPPONENT ${targetSlot + 1}`;
            this.showAlert(`SPAWNED // ${name} -> ${oppName.toUpperCase()}`);
            this.addChatLog(`[SPAWNER] Spawned ${name} in ${oppName}'s Realm`, 'system');
          }
          this.sound.playSpecial(1);
        };

        grid.appendChild(btn);
      }
    }
  }

  private buildShipGrid(): void {
    const hangarShipBar = document.getElementById('hangar-ship-bar');
    const modalRoundBar = document.getElementById('modal-round-ship-bar');
    const modalMatchBar = document.getElementById('modal-match-ship-bar');
    if (hangarShipBar) hangarShipBar.innerHTML = '';
    if (modalRoundBar) modalRoundBar.innerHTML = '';
    if (modalMatchBar) modalMatchBar.innerHTML = '';

    const ships = ShipCatalog.getAll();
    const subLabels = ['TANK', 'WING', 'SQUID', 'RABBIT', 'TURTLE', 'FLASH', 'HUNTER', 'FLAGSHIP'];
    const isRestrictedToClassic = this.currentMatchConfig && this.currentMatchConfig.shipRestriction === 'STANDARD';

    ships.forEach((ship, index) => {
      const isUnlocked = ShipCatalog.isShipUnlocked(index, this.totalMatchWins);

      // 1. Dashboard hangar card (free fleet browsing of all 8 classes)
      if (hangarShipBar) {
        const btn = document.createElement('div');
        btn.className = `ship-card-btn ${index === this.selectedShipIndex ? 'active' : ''}`;
        btn.innerHTML = `
          <span class="ship-card-name">${ship.config.name}</span>
          <span class="ship-card-sub">${subLabels[index] || ''}</span>
        `;
        btn.onclick = () => {
          this.selectShip(index);
          this.hangarView.setShip(index);
          this.modalHangarView.setShip(index);
          this.syncShipSelectionUI(index);
        };
        hangarShipBar.appendChild(btn);
      }

      // 2. In-Modal selector buttons (strictly filter by match restriction)
      const createModalBtn = (container: HTMLElement | null) => {
        if (!container) return;
        if (isRestrictedToClassic && index > 2) return; // Only allow first 3 ships if standard restriction

        const mBtn = document.createElement('button');
        mBtn.className = `modal-ship-btn ${index === this.selectedShipIndex ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;
        mBtn.innerText = isUnlocked ? subLabels[index] : `🔒 ${subLabels[index]}`;
        mBtn.title = ship.config.name;
        mBtn.dataset.shipIndex = index.toString();
        mBtn.onclick = () => {
          if (!isUnlocked) {
            this.showAlert(`SHIP LOCKED: ${ship.config.unlockRequirement}`);
            return;
          }
          this.selectShip(index);
          this.modalHangarView.setShip(index);
          this.hangarView.setShip(index);
          this.syncShipSelectionUI(index);
          this.addChatLog(`Switched ship class -> ${ship.config.name}`, 'player');
        };
        container.appendChild(mBtn);
      };

      createModalBtn(modalRoundBar);
      createModalBtn(modalMatchBar);
    });

    this.modalHangarView.setShip(this.selectedShipIndex);
  }

  private syncShipSelectionUI(selectedIndex: number): void {
    document.querySelectorAll('#hangar-ship-bar .ship-card-btn').forEach((t, i) => {
      t.classList.toggle('active', i === selectedIndex);
    });
    document.querySelectorAll('#modal-round-ship-bar .modal-ship-btn, #modal-match-ship-bar .modal-ship-btn').forEach((btn) => {
      const idx = parseInt((btn as HTMLElement).dataset.shipIndex || '0', 10);
      btn.classList.toggle('active', idx === selectedIndex);
    });
  }

  private updateTableRosterUI(): void {
    const rosterList = document.getElementById('match-roster-list') || document.getElementById('table-roster-list');
    if (!rosterList) return;

    // Persistent event delegation for reliable bot removal and slot selection
    if (!(rosterList as unknown as { _hasBotClickListener?: boolean })._hasBotClickListener) {
      (rosterList as unknown as { _hasBotClickListener?: boolean })._hasBotClickListener = true;
      rosterList.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const removeBtn = target.closest('.btn-remove-bot') as HTMLElement | null;
        if (removeBtn && removeBtn.dataset.slot) {
          e.stopPropagation();
          e.preventDefault();
          const slot = parseInt(removeBtn.dataset.slot, 10);
          this.removeBotFromTable(slot);
          return;
        }

        const card = target.closest('.roster-card.occupied') as HTMLElement | null;
        if (card && card.dataset.slot) {
          const slot = parseInt(card.dataset.slot, 10);
          const p = this.tablePlayers[slot];
          if (p && !p.isLocal) {
            this.selectedOpponentSlot = slot;
            const nameEl = document.getElementById('pip-opponent-name');
            if (nameEl) nameEl.innerText = `FEED // ${p.name.toUpperCase()}`;
            this.updateTableRosterUI();
          }
        }
      });
    }

    rosterList.innerHTML = '';

    let occupiedCount = 0;
    let firstOpponent: TablePlayer | null = null;
    let botCount = 0;

    for (let i = 0; i < 8; i++) {
      const p = this.tablePlayers[i];
      if (p) {
        occupiedCount++;
        if (p.isBot) botCount++;
        if (!p.isLocal && !firstOpponent) {
          firstOpponent = p;
        }
        const isSelectedInPip = i === this.selectedOpponentSlot;
        const card = document.createElement('div');
        card.className = `roster-card occupied ${isSelectedInPip ? 'selected' : ''}`;
        card.dataset.slot = i.toString();
        card.style.setProperty('--slot-color', p.color);
        const hpPct = Math.max(0, Math.min(100, (p.health / p.maxHealth) * 100));
        card.innerHTML = `
          <div class="roster-card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <span class="roster-player-name" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px;">${p.isBot ? '🤖 ' : ''}${p.name}</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="roster-player-stats">W: ${p.wins}</span>
              ${p.isBot && (this.isLanMatchHost || !this.network.isConnected) ? `<button class="btn-remove-bot" data-slot="${i}" title="Remove Bot" style="background: rgba(255, 0, 80, 0.25); border: 1px solid #ff0055; color: #ff0055; font-family: 'Orbitron', sans-serif; font-size: 8px; font-weight: 900; padding: 1px 4px; border-radius: 3px; cursor: pointer; line-height: 1;">✕</button>` : ''}
            </div>
          </div>
          <div class="roster-health-track">
            <div class="roster-health-fill" style="width: ${hpPct}%;"></div>
          </div>
        `;

        rosterList.appendChild(card);
      }
    }

    // Toggle PiP mini-cam bot feed visibility (hide when 0 bots in the match)
    const pipCard = document.getElementById('pip-camera-card');
    if (pipCard) {
      const hasBots = botCount > 0 || this.simulatedRealm.botRealms.size > 0;
      pipCard.style.display = hasBots ? 'flex' : 'none';
    }

    const pipNameEl = document.getElementById('pip-opponent-name');
    if (pipNameEl) {
      const currentOpp = this.tablePlayers[this.selectedOpponentSlot];
      if (currentOpp && !currentOpp.isLocal) {
        pipNameEl.innerText = `FEED // ${currentOpp.name.toUpperCase()}`;
      } else if (firstOpponent) {
        pipNameEl.innerText = `FEED // ${firstOpponent.name.toUpperCase()}`;
      } else {
        pipNameEl.innerText = 'OPPONENT // WAITING FOR PILOT';
      }
    }

    if (occupiedCount < 8) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'roster-card empty';
      emptyCard.innerText = `Slot ${occupiedCount + 1}: [Ready for Pilot / Bot]`;
      rosterList.appendChild(emptyCard);
    }
  }

  public showAlert(text: string): void {
    const banner = document.getElementById('alert-banner')!;
    banner.innerText = text;
    banner.classList.add('active');
    this.alertTimer = 2.5;
  }

  private respawnPlayer(): void {
    const sizeCfg = GAME_CONSTANTS.SIZES[this.currentArenaSize as keyof typeof GAME_CONSTANTS.SIZES] || GAME_CONSTANTS.SIZES.MEDIUM;
    this.player.respawn(0, -sizeCfg.orbitDistance);
    this.player.onDeath = () => this.handlePlayerElimination();
    if (this.tablePlayers[0]) {
      this.tablePlayers[0]!.health = this.player.health;
      this.tablePlayers[0]!.maxHealth = this.player.maxHealth;
      this.tablePlayers[0]!.isAlive = true;
    }
    this.particles.createExplosion(this.player.x, this.player.y, '#33ff33', 20);
    this.sound.playSpecial(1);
  }

  private selectShip(index: number): void {
    this.selectedShipIndex = index;
    this.player.setShip(index);
    this.player.onDeath = () => this.handlePlayerElimination();
    if (this.tablePlayers[0]) {
      this.tablePlayers[0]!.shipId = index;
      this.tablePlayers[0]!.health = this.player.health;
      this.tablePlayers[0]!.maxHealth = this.player.maxHealth;
      this.tablePlayers[0]!.isAlive = true;
    }
    this.particles.createExplosion(this.player.x, this.player.y, (PLAYER_COLORS[this.selectedColorIndex] || PLAYER_COLORS[0]).primary, 10);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.renderer.resize();
      if (this.pipRenderer) this.pipRenderer.resize();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.inArena) {
        const modal = document.getElementById('pause-modal')!;
        modal.classList.toggle('active');
      } else if (e.key === ' ' && this.inArena) {
        const matchModalActive = document.getElementById('match-modal')?.classList.contains('active');
        if (matchModalActive || this.gameState.phase === 'MATCH_OVER') {
          document.getElementById('btn-play-again')?.click();
          return;
        }

        const roundModalActive = document.getElementById('round-modal')?.classList.contains('active');
        if (roundModalActive || !this.player.isAlive || this.gameState.phase === 'ROUND_OVER') {
          this.startNextRound();
        } else if (this.gameState.phase === 'COUNTDOWN') {
          this.gameState.phase = 'PLAYING';
          if (this.gameState.onPhaseChange) this.gameState.onPhaseChange('PLAYING');
        }
      } else if (e.key >= '1' && e.key <= '8') {
        const idx = parseInt(e.key, 10) - 1;
        if (ShipCatalog.isShipUnlocked(idx, this.totalMatchWins)) {
          this.selectShip(idx);
          this.hangarView.setShip(idx);
          document.querySelectorAll('#hangar-ship-bar .ship-card-btn').forEach((t, i) => {
            t.classList.toggle('active', i === idx);
          });
        }
      } else if (e.key === 'm' || e.key === 'M') {
        this.sound.toggleMute();
      }
    });
  }

  private update(dt: number): void {
    if (!this.inArena) {
      this.starfield.update(dt);
      return;
    }

    this.gameState.update(dt);
    this.network.update(dt);

    if (this.gameState.phase === 'COUNTDOWN') {
      const countdownEl = document.getElementById('countdown-overlay')!;
      const sec = Math.max(1, Math.ceil(this.gameState.countdownTimer));
      if (sec !== this.lastCountdownSec) {
        this.lastCountdownSec = sec;
        countdownEl.innerText = sec.toString();
        countdownEl.style.animation = 'none';
        void countdownEl.offsetWidth;
        countdownEl.style.animation = 'countPop 0.35s ease-out';
        this.sound.playCountdownBeep(false);
      }
    }

    if (this.screenFlash > 0) {
      this.screenFlash -= dt * 2.5;
    }

    if (this.alertTimer > 0) {
      this.alertTimer -= dt;
      if (this.alertTimer <= 0) {
        document.getElementById('alert-banner')?.classList.remove('active');
      }
    }

    const sizeCfg = GAME_CONSTANTS.SIZES[this.currentArenaSize as keyof typeof GAME_CONSTANTS.SIZES] || GAME_CONSTANTS.SIZES.MEDIUM;
    const wallHalfW = sizeCfg.boardWidth / 2;
    const wallHalfH = sizeCfg.boardHeight / 2;
    const boundX = wallHalfW - 16;
    const boundY = wallHalfH - 16;
    this.hazardManager.arenaBound = wallHalfW;
    this.simulatedRealm.arenaBound = wallHalfW;

    const inputState = this.input.getState(this.player.isUnderEMP, this.player.empType);

    if (this.isMatchWaitingForPilots || this.gameState.phase === 'COUNTDOWN' || this.gameState.phase === 'ROUND_OVER' || this.gameState.phase === 'MATCH_OVER') {
      inputState.fire = false;
      inputState.secondaryFire = false;
      inputState.tertiaryFire = false;
      inputState.up = false;
      inputState.left = false;
      inputState.right = false;
      if (this.isMatchWaitingForPilots) {
        this.player.vx = 0;
        this.player.vy = 0;
      }
    }

    const playerTargets = [
      ...this.wormholes.map((wh) => ({ x: wh.x, y: wh.y })),
      ...this.hazardManager.hazards.map((h) => ({ x: h.x, y: h.y })),
    ];

    // 1. Update Player 1 Ship
    this.player.update(
      dt,
      inputState,
      this.particles,
      this.sound,
      this.bullets,
      this.missiles,
      playerTargets,
      boundX,
      boundY
    );

    if (this.tablePlayers[0]) {
      this.tablePlayers[0]!.health = this.player.health;
      this.tablePlayers[0]!.maxHealth = this.player.maxHealth;
      this.tablePlayers[0]!.isAlive = this.player.isAlive;
    }

    if (
      !this.isMatchWaitingForPilots &&
      !this.player.isAlive &&
      !document.getElementById('round-modal')?.classList.contains('active') &&
      !document.getElementById('match-modal')?.classList.contains('active')
    ) {
      this.handlePlayerElimination();
    }

    // 2. Update Simulated AI Realms (Only active during PLAYING phase)
    const isRoundActive = this.gameState.phase === 'PLAYING' && !this.isMatchWaitingForPilots;
    this.simulatedRealm.update(dt, this.sound, isRoundActive);

    if (!this.network.isConnected && !this.isLanMatchClient) {
      let anyOpponentAlive = false;
      let hasOpponents = false;

      for (let i = 1; i < 8; i++) {
        if (this.tablePlayers[i] && this.tablePlayers[i]!.isBot) {
          hasOpponents = true;
          const realm = this.simulatedRealm.botRealms.get(i);
          if (realm) {
            const wasAlive = this.tablePlayers[i]!.isAlive;
            this.tablePlayers[i]!.health = realm.botShip.health;
            this.tablePlayers[i]!.maxHealth = realm.botShip.maxHealth;
            this.tablePlayers[i]!.isAlive = realm.botShip.isAlive;
            if (wasAlive && !realm.botShip.isAlive) {
              this.handleBotElimination(i);
            }
            if (realm.botShip.isAlive) {
              anyOpponentAlive = true;
            }
          }
        }
      }

      // Continuous Victory Watchdog: If all opponents are eliminated while player lives, guarantee victory modal is displayed!
      if (
        this.gameState.phase === 'PLAYING' &&
        !this.isMatchWaitingForPilots &&
        hasOpponents &&
        !anyOpponentAlive &&
        this.player.isAlive &&
        !document.getElementById('round-modal')?.classList.contains('active') &&
        !document.getElementById('match-modal')?.classList.contains('active') &&
        !document.getElementById('spawner-modal')?.classList.contains('active')
      ) {
        this.showVictoryModal();
      }
    }

    // 3. Network snapshot streaming
    if (this.inArena && this.currentMatchConfig && (this.isLanMatchHost || this.isLanMatchClient || this.network.isConnected)) {
      this.snapshotTimer += dt;
      if (this.snapshotTimer >= 0.04) {
        this.snapshotTimer = 0;
        const snap = {
          x: this.player.x,
          y: this.player.y,
          angle: this.player.angle,
          hp: this.player.health,
          maxHp: this.player.maxHealth,
          isAlive: this.player.isAlive,
          hasRetros: this.player.hasRetros,
          slot: this.player.slot,
          hazards: this.hazardManager.hazards.map((h) => ({
            type: h.powerupType,
            x: h.x,
            y: h.y,
            hp: h.health,
            radius: h.radius,
          })),
          bullets: this.bullets.map((b) => ({ x: b.x, y: b.y, color: b.color })),
        };

        if (this.isLanMatchHost || this.isLanMatchClient) {
          this.sendLanPacket({
            type: 'MATCH_PACKET',
            matchId: this.currentMatchConfig.id,
            fromSlot: this.player.slot,
            packet: {
              type: 'SNAPSHOT',
              snapshot: snap,
            },
          });
        }
        if (this.network.isConnected) {
          this.network.sendSnapshot(snap);
        }
      }
    }

    // 4. Update Orbital Wormholes
    for (const wh of this.wormholes) {
      wh.update(dt, this.particles, this.sound);
    }

    // 5. Update Hazards & Mines (Strictly active during PLAYING phase)
    if (this.gameState.phase === 'PLAYING' && !this.isMatchWaitingForPilots) {
      this.hazardManager.update(
        dt,
        this.player,
        this.bullets,
        this.particles,
        this.sound,
        this.powerups,
        this.missiles,
        this.wormholes
      );
    }

    // 6. Update Powerups (Strictly active during PLAYING phase)
    if (this.gameState.phase === 'PLAYING' && !this.isMatchWaitingForPilots) {
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const pup = this.powerups[i];

        if (!pup.update(dt, boundX, boundY)) {
          this.powerups.splice(i, 1);
          continue;
        }

        // Authentic physical collision pickup matching original Java ship polygon reach (54px)
        if (
          this.player.isAlive &&
          Collision.testCircleCircle(
            this.player.x,
            this.player.y,
            30,
            pup.x,
            pup.y,
            pup.radius + 7
          )
        ) {
          this.gameState.stats.p1PowerupsCollected++;
          const isZap = this.player.givePowerup(pup.type, this.sound, this.popups);
          if (isZap) {
            this.screenFlash = 1.0;
            this.particles.createExplosion(this.player.x, this.player.y, '#ffffff', 30);
            this.hazardManager.clearAll(this.particles, this.sound);
            this.gameState.stats.p1HazardsCleared += 5;
            this.addChatLog('Zap Screen Cleared All Hazards!', 'system');
          }
          this.particles.createExplosion(pup.x, pup.y, pup.color, 12);
          this.powerups.splice(i, 1);
        }
      }
    }

    // 7. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.update(dt)) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Authentic wall rebound matching legacy Sprite.java handleRebound() (REBOUND_COEFF = -0.5)
      if (Math.abs(b.x) >= wallHalfW) {
        b.x = Math.sign(b.x) * wallHalfW;
        b.vx *= -0.5;
        this.particles.createExplosion(b.x, b.y, b.glowColor, 3);
      }
      if (Math.abs(b.y) >= wallHalfH) {
        b.y = Math.sign(b.y) * wallHalfH;
        b.vy *= -0.5;
        this.particles.createExplosion(b.x, b.y, b.glowColor, 3);
      }

      // Bullet vs floating Powerup capsules (destructible powerups matching legacy PowerupSprite.java)
      if (!b.isPowerup) {
        for (let pIdx = this.powerups.length - 1; pIdx >= 0; pIdx--) {
          const pup = this.powerups[pIdx];
          if (!pup.isInvulnerable && Collision.testCircleCircle(b.x, b.y, b.size, pup.x, pup.y, pup.radius)) {
            pup.takeDamage(b.damage, this.particles, this.sound);
            if (!pup.isAlive) {
              this.powerups.splice(pIdx, 1);
            }
            this.bullets.splice(i, 1);
            break;
          }
        }
      }

      if (b.ownerSlot !== this.player.slot && this.player.isAlive) {
        if (Collision.testCircleCircle(b.x, b.y, b.size, this.player.x, this.player.y, 16)) {
          this.player.takeDamage(b.damage, this.particles, this.sound);
          this.bullets.splice(i, 1);
          continue;
        }
      }

      for (const wh of this.wormholes) {
        // Gravitational vortex funneling for launched powerup bullets near wormhole
        if (b.isPowerup) {
          const distToWh = Math.hypot(wh.x - b.x, wh.y - b.y);
          if (distToWh < 160) {
            const pull = (1 - distToWh / 160) * dt * 20.0;
            b.vx += (wh.x - b.x) * pull;
            b.vy += (wh.y - b.y) * pull;
          }
        }

        const rx = wh.width / 2 + (b.isPowerup ? 26 : 8);
        const ry = wh.height / 2 + (b.isPowerup ? 20 : 8);
        const normDist = ((b.x - wh.x) * (b.x - wh.x)) / (rx * rx) + ((b.y - wh.y) * (b.y - wh.y)) / (ry * ry);

        if (normDist <= 1.0) {
          if (b.isPowerup && b.powerupType >= 6) {
            const hitX = b.x;
            const hitY = b.y;
            const targetWh = wh;
            const hazardType = b.powerupType;
            const hazardColor = b.color;
            const bVx = b.vx;
            const bVy = b.vy;

            // Trigger vortex spiral ingestion animation into singularity!
            this.particles.createHazardIngestion(
              hitX,
              hitY,
              targetWh.x,
              targetWh.y,
              hazardType,
              hazardColor,
              () => {
                targetWh.absorbPowerupShot(hazardType, this.particles, this.sound);
                this.sound.playWormholeCharge();

                const warpPayload: WarpPayload = {
                  hazardId: `haz-${Date.now()}-${Math.random()}`,
                  hazardType: hazardType,
                  fromSlot: this.player.slot,
                  toSlot: targetWh.slot,
                  angle: Math.atan2(bVy, bVx),
                  speed: Math.hypot(bVy, bVx),
                  seed: Math.floor(Math.random() * 10000),
                };

                if (this.isLanMatchHost || this.isLanMatchClient) {
                  if (this.currentMatchConfig) {
                    this.sendLanPacket({
                      type: 'MATCH_PACKET',
                      matchId: this.currentMatchConfig.id,
                      fromSlot: this.player.slot,
                      packet: {
                        type: 'WARP_HAZARD',
                        payload: warpPayload,
                      },
                    });
                  }
                } else if (this.network.isConnected) {
                  this.network.sendWarpHazard(warpPayload);
                } else {
                  this.simulatedRealm.receiveHazardFromPlayer1(hazardType, targetWh.slot);
                }

                this.gameState.stats.p1HazardsSent++;
                this.addChatLog(`Transmitted ${POWERUP_NAMES[hazardType]} -> ${targetWh.ownerName}'s Wormhole`, 'player');
              }
            );

            this.bullets.splice(i, 1);
            break;
          } else {
            wh.absorbDamage(b.damage, this.powerups, this.particles, this.sound, {
              hasRetros: this.player.hasRetros,
              bulletLevel: this.player.bulletLevel,
              isMaxThrust: this.player.maxThrust >= 11,
            });
            this.bullets.splice(i, 1);
            break;
          }
        }
      }
    }

    // 8. Update Homing Missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      if (!m.update(dt, this.player.isAlive ? this.player.x : undefined, this.player.isAlive ? this.player.y : undefined)) {
        this.missiles.splice(i, 1);
        continue;
      }

      if (this.player.isAlive && Collision.testCircleCircle(m.x, m.y, 6, this.player.x, this.player.y, 16)) {
        this.player.takeDamage(m.damage, this.particles, this.sound);
        this.particles.createExplosion(m.x, m.y, '#ffaa00', 16);
        this.missiles.splice(i, 1);
        continue;
      }

      if (m.wormholeImmunity <= 0) {
        for (const wh of this.wormholes) {
          const dist = Math.hypot(wh.x - m.x, wh.y - m.y);
          if (dist < 35) {
            wh.absorbDamage(m.damage, this.powerups, this.particles, this.sound);
            this.particles.createExplosion(m.x, m.y, '#00ffcc', 12);
            this.missiles.splice(i, 1);
            break;
          }
        }
      }
    }

    // 9. Update Particles & Arena Ring
    this.particles.update(dt);
    this.arenaRing.update(dt);

    for (let i = this.popups.length - 1; i >= 0; i--) {
      if (!this.popups[i].update(dt)) {
        this.popups.splice(i, 1);
      }
    }

    // 10. Zoomed Camera Following Player Ship
    const targetCamX = this.player.isAlive ? this.player.x : 0;
    const targetCamY = this.player.isAlive ? this.player.y : 0;
    this.camX += (targetCamX - this.camX) * 0.12;
    this.camY += (targetCamY - this.camY) * 0.12;

    this.rosterThrottleTimer += dt;
    if (this.rosterThrottleTimer >= 0.1) {
      this.rosterThrottleTimer = 0;
      this.updateHUD();
      this.updateTableRosterUI();
    }
  }

  private updateHUD(): void {
    // 1. Update Pilot & Hull Integrity
    const hpRatio = Math.max(0, Math.min(1, this.player.health / this.player.maxHealth));
    const hpFill = document.getElementById('hud-hp-fill');
    if (hpFill) hpFill.style.width = `${hpRatio * 100}%`;
    const hpVal = document.getElementById('hud-hp-val');
    if (hpVal) hpVal.innerText = `${Math.ceil(this.player.health)} / ${this.player.maxHealth} HP`;

    const shipTag = document.getElementById('hud-ship-name-tag');
    if (shipTag) shipTag.innerText = this.player.compiled.config.name.toUpperCase();

    // 2. Update Telemetry
    document.getElementById('hud-classic-gun')!.innerText = `GUN: x${this.player.bulletLevel + 1}`;
    const speed = Math.hypot(this.player.vx, this.player.vy).toFixed(1);
    document.getElementById('hud-classic-thrust')!.innerText = `THRUST: ${speed}`;
    document.getElementById('hud-classic-retros')!.innerText = this.player.hasRetros ? 'RETROS: ON' : 'NO RETROS';
    document.getElementById('hud-classic-retros')!.style.color = this.player.hasRetros ? '#00ff88' : '#ffaa00';

    const specialNames = ['RAPID FIRE', 'TURTLE CANNON', 'SHAPESHIFTER', 'HEAT SEEKER', 'ATTRACTOR/REPULSER'];
    document.getElementById('hud-classic-special')!.innerText = specialNames[this.player.specialType] || 'RAPID FIRE';

    // 3. Update Match Score
    const winsEl = document.getElementById('hud-classic-wins');
    if (winsEl) winsEl.innerText = this.gameState.player1Score.toString();
    const lossEl = document.getElementById('hud-classic-losses');
    if (lossEl) lossEl.innerText = this.gameState.player2Score.toString();
    const roundEl = document.getElementById('hud-round-label');
    if (roundEl) roundEl.innerText = `ROUND ${this.gameState.currentRound} // ARENA`;

    // 4. Update Powerup Mini Slots with clear icons & colored badges
    const inv = this.player.powerupInventory;
    const badgeInfo: Record<number, { label: string; icon: string; col: string }> = {
      6: { label: 'HEAT SEEKER', icon: '🎯 HS', col: '#00ffff' },
      7: { label: 'TURRET', icon: '🗼 TRT', col: '#00ff88' },
      8: { label: 'MINES', icon: '💣 MIN', col: '#ffaa00' },
      9: { label: 'UFO', icon: '🛸 UFO', col: '#ff00cc' },
      10: { label: 'INFLATOR', icon: '🎈 INF', col: '#ff3344' },
      11: { label: 'MINELAYER', icon: '⚓ ML', col: '#ffff00' },
      12: { label: 'GUNSHIP', icon: '🚀 GSH', col: '#ff6600' },
      13: { label: 'SCARAB', icon: '🦂 SCB', col: '#33ff99' },
      14: { label: 'NUKE', icon: '☢ NUK', col: '#ff0033' },
      15: { label: 'WALLCRAWLER', icon: '👾 WC', col: '#ff00ff' },
      16: { label: 'BEAM', icon: '⚡ BEAM', col: '#00e5ff' },
      17: { label: 'EMP', icon: '💥 EMP', col: '#ffffff' },
      18: { label: 'GHOST-PUD', icon: '👻 GHD', col: '#9966ff' },
      19: { label: 'ARTILLERY', icon: '🏰 ART', col: '#ffcc00' },
    };

    for (let i = 0; i < 5; i++) {
      const slotEl = document.getElementById(`slot-${i}`);
      if (!slotEl) continue;
      if (i < inv.length) {
        const type = inv[i];
        const info = badgeInfo[type] || { label: 'HAZARD', icon: `⚡ #${type}`, col: '#00e5ff' };
        slotEl.className = 'mini-pup-slot filled';
        slotEl.style.borderColor = info.col;
        slotEl.style.boxShadow = `0 0 10px ${info.col}`;
        slotEl.title = `[F] Launch ${info.label}`;
        slotEl.innerHTML = `<span style="font-size: 8px; font-weight: 900; color: ${info.col};">${info.icon}</span>`;
      } else {
        slotEl.className = 'mini-pup-slot';
        slotEl.style.borderColor = 'rgba(0, 229, 255, 0.35)';
        slotEl.style.boxShadow = 'none';
        slotEl.title = 'Empty Powerup Slot';
        slotEl.innerHTML = '';
      }
    }
  }

  private render(dt: number): void {
    const bgColor = this.screenFlash > 0 ? '#1a2a44' : '#020612';
    this.renderer.beginFrame(bgColor);

    try {
      this.starfield.draw(this.renderer, this.camX, this.camY);

      if (this.inArena) {
        this.renderer.pushCamera(this.camX, this.camY, this.zoom);

        const borderCol = (PLAYER_COLORS[this.selectedColorIndex] || PLAYER_COLORS[0]).primary;
        this.arenaRing.draw(this.renderer, borderCol);

        for (const wh of this.wormholes) {
          wh.draw(this.renderer);
        }

        for (const pup of this.powerups) {
          pup.draw(this.renderer);
        }

        this.hazardManager.draw(this.renderer);

        for (const b of this.bullets) {
          b.draw(this.renderer);
        }
        for (const m of this.missiles) {
          m.draw(this.renderer);
        }

        this.player.draw(this.renderer);
        this.particles.draw(this.renderer);

        for (const pop of this.popups) {
          pop.draw(this.renderer);
        }

        this.renderer.popCamera();
      }
    } catch (err) {
      console.error('Render error:', err);
    }

    this.renderer.endFrame();

    // Render PiP Opponent View (Throttled to 20 FPS for massive performance boost)
    if (this.inArena && this.pipRenderer) {
      this.pipThrottleTimer += dt;
      if (this.pipThrottleTimer >= 0.05) {
        this.pipThrottleTimer = 0;
        this.pipRenderer.beginFrame('#020612');
        const pipW = this.pipRenderer.width;
        const pipH = this.pipRenderer.height;
        this.simulatedRealm.drawMiniView(this.pipRenderer, 0, 0, pipW, pipH, this.selectedOpponentSlot);
        this.pipRenderer.endFrame();
      }
    }
  }

  private loop(timestamp: number): void {
    requestAnimationFrame(this.loop.bind(this));

    if (!this.lastTime) this.lastTime = timestamp;
    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (dt > 0.1) dt = 0.1;

    // Real-time FPS Measurement (smooth 0.25s sample rate)
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.25) {
      this.currentFps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
      if (!this.fpsElement) {
        this.fpsElement = document.getElementById('fps-counter');
      }
      if (this.fpsElement) {
        this.fpsElement.innerText = `FPS: ${this.currentFps}`;
        if (this.currentFps >= 55) {
          this.fpsElement.style.color = '#00ff88';
          this.fpsElement.style.borderColor = 'rgba(0, 255, 136, 0.4)';
          this.fpsElement.style.textShadow = '0 0 8px rgba(0, 255, 136, 0.6)';
        } else if (this.currentFps >= 35) {
          this.fpsElement.style.color = '#ffaa00';
          this.fpsElement.style.borderColor = 'rgba(255, 170, 0, 0.4)';
          this.fpsElement.style.textShadow = '0 0 8px rgba(255, 170, 0, 0.6)';
        } else {
          this.fpsElement.style.color = '#ff3344';
          this.fpsElement.style.borderColor = 'rgba(255, 51, 68, 0.5)';
          this.fpsElement.style.textShadow = '0 0 8px rgba(255, 51, 68, 0.7)';
        }
      }
    }

    try {
      this.update(dt);
      this.render(dt);
    } catch (err) {
      console.error('Update/Render loop error:', err);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new WormholeGame();
});

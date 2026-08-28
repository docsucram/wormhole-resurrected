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
import { BotController, BotDifficulty } from './entities/ai/BotController';
import { GameStateManager } from './core/GameState';
import { HangarView } from './ui/HangarView';
import { NetworkManager, WarpPayload } from './net/NetworkManager';
import { GlobalRelay } from './net/GlobalRelay';
import { PLAYER_COLORS, GAME_CONSTANTS, POWERUP_NAMES } from './core/Constants';
import { Collision } from './math/Collision';

export interface TablePlayer {
  slot: number;
  clientId?: string;
  name: string;
  isLocal: boolean;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  shipId: number;
  health: number;
  maxHealth: number;
  isAlive: boolean;
  isSpectating?: boolean;
  rank: number;
  wins: number;
  color: string;
  team?: 'A' | 'B';
}

export interface LobbyMatch {
  id: string;
  name: string;
  hostName: string;
  isPasswordProtected: boolean;
  password?: string;
  matchType?: 'FFA' | 'TEAM';
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'HUGE';
  targetWins: number;
  powerupRule: 'STANDARD' | 'EXTENDED';
  shipRestriction: 'STANDARD' | 'ALL';
  botDifficulty: BotDifficulty | 'none';
  maxPlayers: number;
  currentPlayers: number;
  status: 'WAITING' | 'IN_MATCH';
  isCustom?: boolean;
  isTestMode?: boolean;
}

export interface ConnectedPilot {
  id: string;
  callsign: string;
  avatar?: string;
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
  public manualHangarView: HangarView;
  private modalHangarView: HangarView;

  public globalRelay: GlobalRelay;

  // Local Player
  private player: PlayerShip;
  public playerName = 'BrightNomad';
  public playerAvatar = localStorage.getItem('wh_avatar') || 'avatar_1.png';
  public totalMatchWins = 0;
  private localClientId = Math.random().toString(36).substring(2, 9);
  public playerPilotMode: 'human' | BotDifficulty = 'human';
  private playerBotController: BotController | null = null;

  // 8-Player Match Roster & Multi-Opponent PiP
  public tablePlayers: (TablePlayer | null)[] = new Array(8).fill(null);
  public currentArenaSize = 'MEDIUM'; // SMALL, MEDIUM, LARGE, HUGE
  public selectedOpponentSlot = 1;

  // Real LAN & Internet Discovery & Match State
  public lanWs: WebSocket | null = null;
  public lanChannel: BroadcastChannel | null = null;
  public connectedPilots: Map<string, ConnectedPilot> = new Map();
  public lobbyMatches: LobbyMatch[] = [];
  public currentMatchConfig: LobbyMatch | null = null;
  public isMatchWaitingForPilots = false;
  public isLanMatchHost = false;
  public isLanMatchClient = false;
  public isSpectating = false;

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
  private playerLastSeen: Map<number, number> = new Map();
  private heartbeatReaperTimer = 0;

  // Real-time FPS & Performance Diagnostics Monitoring
  private frameCount = 0;
  private fpsTimer = 0;
  private currentFps = 60;
  private totalFrameExecTime = 0;
  private fpsElement: HTMLElement | null = null;
  private pipThrottleTimer = 0;

  private lastTime = 0;
  private roundStartTime = 0;

  // Mobile device adaptation flag
  public isMobile = false;

  private checkIsMobile(): boolean {
    const isMobileUA = /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);
    const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const isCoarseAndSmall = window.matchMedia && window.matchMedia('(pointer: coarse) and (max-width: 900px)').matches;
    return Boolean(isMobileUA || isIPadOS || isCoarseAndSmall);
  }

  constructor() {
    this.isMobile = this.checkIsMobile();
    if (this.isMobile) {
      document.body.classList.add('is-mobile');
      this.zoom = 1.35;
    } else {
      document.body.classList.remove('is-mobile');
      this.zoom = 1.65;
    }

    const savedCallsign = localStorage.getItem('wh_callsign');
    this.playerName = savedCallsign || WormholeGame.generateRandomCallsign();
    if (!savedCallsign) {
      localStorage.setItem('wh_callsign', this.playerName);
    }
    this.globalRelay = new GlobalRelay(this.localClientId);

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new VectorRenderer(canvas);

    const pipCanvas = document.getElementById('pip-canvas') as HTMLCanvasElement;
    if (pipCanvas) {
      this.pipRenderer = new VectorRenderer(pipCanvas, { enableGlow: false });
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
          if (this.pipRenderer) this.pipRenderer.resize();
        });
        ro.observe(pipCanvas);
      }
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
    this.manualHangarView = new HangarView('manual-hangar-canvas', 'manual-');
    this.modalHangarView = new HangarView('modal-ship-canvas', 'modal-');

    // Simulated Bot Realm
    this.simulatedRealm = new SimulatedRealm(0, 1, 'hard', initialSize.orbitDistance, initialSize.boardWidth / 2 - 20);

    // Load persisted wins
    const savedWins = localStorage.getItem('wh_total_wins');
    this.totalMatchWins = savedWins ? parseInt(savedWins, 10) : 0;

    // Load persisted player color
    const savedColor = localStorage.getItem('wh_selected_color');
    this.selectedColorIndex = savedColor !== null ? parseInt(savedColor, 10) % PLAYER_COLORS.length : 0;

    ShipCatalog.initialize();

    // Create Local Player Ship in orbit
    this.player = new PlayerShip(
      this.selectedShipIndex,
      0,
      0,
      -initialSize.orbitDistance,
      this.selectedColorIndex
    );
    this.player.onDeath = () => this.handlePlayerElimination();

    this.manualHangarView.setColor(this.selectedColorIndex);
    this.modalHangarView.setColor(this.selectedColorIndex);

    // Apply persisted glow intensity
    const savedGlow = localStorage.getItem('wh_opt_glow');
    const initialGlow = savedGlow !== null ? parseFloat(savedGlow) : 1.0;
    this.applyGlowIntensity(initialGlow);

    // Apply persisted Geometry Wars & retro graphics options
    const savedDualBloom = localStorage.getItem('wh_opt_dual_bloom');
    const isDualBloom = savedDualBloom !== null ? savedDualBloom === 'true' : true;
    this.renderer.setDualStrokeBloom(isDualBloom);
    if ((this.manualHangarView as any).renderer) (this.manualHangarView as any).renderer.setDualStrokeBloom(isDualBloom);
    if ((this.modalHangarView as any).renderer) (this.modalHangarView as any).renderer.setDualStrokeBloom(isDualBloom);

    const savedVectorGrid = localStorage.getItem('wh_opt_vector_grid');
    this.starfield.showVectorGrid = savedVectorGrid !== null ? savedVectorGrid === 'true' : true;

    const savedSparkShards = localStorage.getItem('wh_opt_spark_shards');
    this.particles.enableSparkShards = savedSparkShards !== null ? savedSparkShards === 'true' : true;

    // Apply persisted Particle lifespan & trail duration scale (0x to 10x)
    const savedParticleScale = localStorage.getItem('wh_opt_particle_scale');
    const initialParticleScale = savedParticleScale !== null ? parseFloat(savedParticleScale) : 1.0;
    this.particles.durationScale = initialParticleScale;

    // Initialize 8-Player Arena Roster with Slot 0 as Local Player
    this.initTableRoster();

    // Authoritative Hazard Routing from Simulated Bot Realms
    this.simulatedRealm.onSendHazardToParticipant = (powerupType: number, sourceBotSlot: number, targetSlot: number) => {
      const sourceBot = this.tablePlayers[sourceBotSlot];
      const botName = sourceBot ? sourceBot.name : `Bot ${sourceBotSlot}`;

      if (targetSlot === this.player.slot) {
        // Target is local host player
        this.showAlert(`INCOMING // ${POWERUP_NAMES[powerupType] || 'HAZARD'} FROM ${botName.toUpperCase()}!`);
        const targetWh = this.wormholes.find((w) => w.slot === sourceBotSlot) || this.wormholes[0] || new Wormhole(botName, sourceBotSlot, 0, initialSize.orbitDistance);
        this.hazardManager.spawnHazard(powerupType, targetWh, this.player, this.missiles);
        this.gameState.stats.p2HazardsSent++;
        this.addChatLog(`${botName} sent ${POWERUP_NAMES[powerupType]} -> Your Realm`, 'bot', this.getPlayerColor(sourceBotSlot));
      } else {
        const destPlayer = this.tablePlayers[targetSlot];
        if (destPlayer && destPlayer.isBot) {
          // Target is another bot on the host
          const destRealm = this.simulatedRealm.botRealms.get(targetSlot);
          if (destRealm) {
            const destWh = destRealm.wormholes.find((w) => w.slot === sourceBotSlot) || destRealm.wormholes[0];
            destRealm.hazardManager.spawnHazard(powerupType, destWh, destRealm.botShip, destRealm.missiles);
          }
        } else {
          // Target is a remote human client connected over LAN / Web!
          if (this.currentMatchConfig && (this.isLanMatchHost || this.isLanMatchClient)) {
            const warpPayload: WarpPayload = {
              hazardId: `haz-${Date.now()}-${Math.random()}`,
              hazardType: powerupType,
              fromSlot: sourceBotSlot,
              toSlot: targetSlot,
              angle: 0,
              speed: 12.0,
              seed: Math.floor(Math.random() * 10000),
            };
            this.sendLanPacket({
              type: 'MATCH_PACKET',
              matchId: this.currentMatchConfig.id,
              fromSlot: sourceBotSlot,
              packet: {
                type: 'WARP_HAZARD',
                payload: warpPayload,
              },
            });
            const targetName = destPlayer ? destPlayer.name : `Slot ${targetSlot + 1}`;
            this.addChatLog(`${botName} sent ${POWERUP_NAMES[powerupType]} -> ${targetName}'s Realm`, 'bot', this.getPlayerColor(sourceBotSlot));
          }
        }
      }
    };

    this.simulatedRealm.onSendHazardToPlayer1 = (powerupType: number, sourceBotSlot = 1) => {
      this.simulatedRealm.onSendHazardToParticipant!(powerupType, sourceBotSlot, 0);
    };

    this.simulatedRealm.onBotDeath = (slot?: number) => {
      this.handleBotElimination(slot || 1);
    };

    this.player.onDeath = () => {
      this.handlePlayerElimination();
    };

    this.hazardManager.onScarabDeploy = (stolenType: number, sourceWh: Wormhole) => {
      this.showAlert(`SCARAB TRIGGERED // ${POWERUP_NAMES[stolenType] || 'HAZARD'} DEPLOYED FROM ${sourceWh.ownerName.toUpperCase()}!`);
      this.addChatLog(`Scarab activated ${POWERUP_NAMES[stolenType] || 'Hazard'} against you!`, 'bot', this.getPlayerColor(sourceWh.slot));
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

      const isMultiplayer = this.isLanMatchHost || this.isLanMatchClient || this.network.isConnected;
      const targetPlayer = this.tablePlayers[targetSlot];
      const isTargetBot = targetPlayer ? targetPlayer.isBot : false;

      if (!isMultiplayer) {
        // Solo Practice / Singleplayer offline: route locally
        this.simulatedRealm.receiveHazardFromPlayer1(hazardType, targetSlot, 0);
      } else if (this.isLanMatchHost && isTargetBot) {
        // Host in MP shooting at bot: route into Host's authoritative bot simulation
        this.simulatedRealm.receiveHazardFromPlayer1(hazardType, targetSlot, this.player.slot);
      } else {
        // Connected Client shooting at anyone (Bot or Human) OR Host shooting at Remote Human Peer:
        // Transmit WARP_HAZARD across network!
        if (this.currentMatchConfig && (this.isLanMatchHost || this.isLanMatchClient)) {
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
        if (this.network.isConnected) {
          this.network.sendWarpHazard(warpPayload);
        }
      }

      const targetName = this.tablePlayers[targetSlot] ? this.tablePlayers[targetSlot]!.name : `Slot ${targetSlot + 1}`;
      this.addChatLog(`Warped ${POWERUP_NAMES[hazardType] || 'Hazard'} -> ${targetName}'s Wormhole!`, 'player', this.getPlayerColor(this.player.slot));
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
    if (this.globalRelay) {
      this.globalRelay.send(packet);
    }
    if (this.lanWs && this.lanWs.readyState === WebSocket.OPEN) {
      try {
        this.lanWs.send(JSON.stringify(packet));
      } catch {
        // ignore
      }
    }
    if (this.lanChannel) {
      try {
        this.lanChannel.postMessage(packet);
      } catch {
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
        avatar: data.avatar || 'avatar_1.svg',
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
        if (!this.inArena && !this.isLanMatchClient) {
          this.renderLobbyMatches();
        }
      }
    } else if (data.type === 'MATCH_JOIN_REQUEST') {
      // Host receives join request from another LAN / Web pilot
      if (this.isLanMatchHost && this.currentMatchConfig && (this.currentMatchConfig.id === data.matchId || !data.matchId)) {
        // 1. Check if this client is already assigned a slot in the current match
        let slot = -1;
        for (let i = 1; i < 8; i++) {
          if (this.tablePlayers[i] && (this.tablePlayers[i]!.clientId === data.clientId || this.tablePlayers[i]!.name === data.playerName)) {
            slot = i;
            break;
          }
        }

        // 2. If not already present, find the first empty slot
        if (slot === -1) {
          for (let i = 1; i < 8; i++) {
            if (!this.tablePlayers[i]) {
              slot = i;
              break;
            }
          }
        }

        // 3. Or replace an existing AI bot slot
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
          let assignedTeam: 'A' | 'B' | undefined = undefined;
          if (this.currentMatchConfig.matchType === 'TEAM') {
            const teamACount = this.tablePlayers.filter((p) => p && p.team === 'A').length;
            const teamBCount = this.tablePlayers.filter((p) => p && p.team === 'B').length;
            assignedTeam = teamACount <= teamBCount ? 'A' : 'B';
          }

          // Ensure unique player name
          let finalPlayerName = (data.playerName || 'Pilot').trim();
          const existingNames = this.tablePlayers
            .filter((p, idx) => p !== null && idx !== slot)
            .map((p) => p!.name);
          if (existingNames.includes(finalPlayerName)) {
            let counter = 2;
            while (existingNames.includes(`${finalPlayerName}-${counter}`)) {
              counter++;
            }
            finalPlayerName = `${finalPlayerName}-${counter}`;
          }

          const isCombatInProgress = this.gameState.phase === 'PLAYING' || this.gameState.phase === 'COUNTDOWN';

          this.tablePlayers[slot] = {
            slot,
            clientId: data.clientId,
            name: finalPlayerName,
            isLocal: false,
            isBot: false,
            shipId: data.shipId || 0,
            health: isCombatInProgress ? 0 : 280,
            maxHealth: 280,
            isAlive: !isCombatInProgress,
            isSpectating: isCombatInProgress,
            rank: 0,
            wins: 0,
            color: PLAYER_COLORS[slot % PLAYER_COLORS.length].primary,
            team: assignedTeam,
          };

          this.isMatchWaitingForPilots = false;
          this.simulatedRealm.isRemotePlayer = true;
          this.rebuildTableWormholes();
          this.updateTableRosterUI();

          if (isCombatInProgress) {
            this.showAlert(`PILOT QUEUED // ${finalPlayerName.toUpperCase()} [WAITING FOR NEXT ROUND]`);
            this.addChatLog(`${finalPlayerName} joined queue (spectating active round).`, 'system');
          } else {
            this.showAlert(`PILOT JOINED // ${finalPlayerName.toUpperCase()}!`);
            this.addChatLog(`${finalPlayerName} joined the match!`, 'system');
          }
          this.sound.playPowerup();

          // Update match player count in lobby list
          const activeCount = this.tablePlayers.filter((p) => p !== null).length;
          this.currentMatchConfig.currentPlayers = activeCount;
          const matchInList = this.lobbyMatches.find((m) => m.id === this.currentMatchConfig!.id);
          if (matchInList) {
            matchInList.currentPlayers = activeCount;
          }
          this.broadcastMatches();

          const sendAcceptance = () => {
            if (this.currentMatchConfig) {
              this.sendLanPacket({
                type: 'MATCH_JOIN_ACCEPT',
                matchId: this.currentMatchConfig.id,
                joinedClientId: data.clientId,
                joinedPlayerName: finalPlayerName,
                assignedSlot: slot,
                roster: this.tablePlayers,
                matchConfig: this.currentMatchConfig,
                targetWins: this.gameState.targetWins,
                currentRound: this.gameState.currentRound,
                inProgress: isCombatInProgress,
              });
            }
          };

          // Send acceptance burst back to ensure reliable web delivery
          sendAcceptance();
          setTimeout(sendAcceptance, 120);
          setTimeout(sendAcceptance, 300);

          // If we were waiting in staging, notify host
          if (!isCombatInProgress) {
            const scoreEl = document.getElementById('round-modal-score');
            if (scoreEl) scoreEl.innerText = `${finalPlayerName.toUpperCase()} READY // CLICK ENGAGE TO START`;
          }
        }
      }
    } else if (data.type === 'MATCH_JOIN_ACCEPT') {
      const isTargetedToMe = (data.joinedClientId && data.joinedClientId === this.localClientId) ||
                             data.joinedPlayerName === this.playerName ||
                             (data.assignedSlot !== undefined && data.roster && data.roster[data.assignedSlot]?.name === this.playerName);

      if (isTargetedToMe) {
        // Local client was accepted into match!
        if (data.joinedPlayerName) {
          this.playerName = data.joinedPlayerName;
        }
        this.player.slot = data.assignedSlot;
        this.isLanMatchClient = true;
        this.isLanMatchHost = false;
        this.isMatchWaitingForPilots = false;
        this.currentMatchConfig = data.matchConfig;
        this.isSpectating = !!data.inProgress;
        Powerup.powerupRule = data.matchConfig.powerupRule || 'STANDARD';

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
        this.simulatedRealm.resetForNewRound();
        this.gameState.startMatch(data.targetWins, false);
        this.gameState.currentRound = data.currentRound || 1;
        this.updateTableRosterUI();
        this.buildShipGrid();
        this.sound.playPowerup();

        if (data.inProgress) {
          // Mid-match drop-in: spectate active round, spawn on next round
          this.player.isAlive = false;
          this.player.health = 0;
          this.gameState.phase = 'STANDBY';
          this.showAlert('ROUND IN PROGRESS // SPECTATING - DEPLOYING ON NEXT ROUND');
          this.addChatLog(`Connected to ${data.matchConfig.name} [Spectating active round - deploying on next round]`, 'system');
        } else {
          this.respawnPlayer();
          this.showAlert(`JOINED MATCH // ${this.playerName.toUpperCase()} READY`);
          this.addChatLog(`Connected to Match: ${data.matchConfig.name}!`, 'system');
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
      } else if (this.currentMatchConfig && this.currentMatchConfig.id === data.matchId) {
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
    } else if (data.type === 'MATCH_PACKET') {
      const pkt = data.packet;
      if (!pkt) return;

      if (pkt.type === 'CHAT_MSG') {
        if (data.fromSlot !== this.player.slot && pkt.senderName !== this.playerName) {
          const senderSlot = pkt.senderSlot ?? data.fromSlot ?? 1;
          const senderColor = this.getPlayerColor(senderSlot);
          this.addChatLog(`${pkt.senderName}: ${pkt.message}`, 'player', senderColor);
        }
        return;
      }

      if (this.inArena && this.currentMatchConfig && this.currentMatchConfig.id === data.matchId) {
        if (data.fromSlot !== undefined) {
          this.playerLastSeen.set(data.fromSlot, Date.now());
        }

        if (pkt.type === 'PLAYER_LEAVE') {
          const leavingSlot = pkt.slot ?? data.fromSlot;
          const leavingPlayer = this.tablePlayers[leavingSlot];
          if (leavingPlayer) {
            const name = leavingPlayer.name;
            this.tablePlayers[leavingSlot] = null;
            this.playerLastSeen.delete(leavingSlot);
            const victimWh = this.wormholes.find((w) => w.slot === leavingSlot);
            if (victimWh) {
              victimWh.killSelf(this.particles, this.sound);
            }
            this.rebuildTableWormholes();
            this.updateTableRosterUI();
            this.showAlert(`PILOT DEPARTED // ${name.toUpperCase()} LEFT`);
            this.addChatLog(`${name} left the match.`, 'system');

            if (this.isLanMatchHost && this.currentMatchConfig) {
              const activeCount = this.tablePlayers.filter((p) => p !== null).length;
              this.currentMatchConfig.currentPlayers = activeCount;
              const matchInList = this.lobbyMatches.find((m) => m.id === this.currentMatchConfig!.id);
              if (matchInList) {
                matchInList.currentPlayers = activeCount;
              }
              this.broadcastMatches();
              this.broadcastRosterSync();

              if (this.gameState.phase === 'PLAYING') {
                const isTeamMode = this.currentMatchConfig?.matchType === 'TEAM';
                if (isTeamMode) {
                  this.checkTeamRoundStatus();
                } else {
                  let opponentsRemaining = false;
                  for (let i = 1; i < 8; i++) {
                    if (this.tablePlayers[i] && this.tablePlayers[i]!.isAlive) {
                      opponentsRemaining = true;
                      break;
                    }
                  }
                  if (!opponentsRemaining) {
                    this.gameState.registerPlayer1Kill();
                    this.showVictoryModal();
                  }
                }
              }
            }
          }
        } else if (pkt.type === 'ROSTER_UPDATE') {
          if (pkt.roster && Array.isArray(pkt.roster) && data.fromSlot !== this.player.slot) {
            const prevNames = this.tablePlayers.filter((p) => p !== null && !p.isLocal).map((p) => p!.name);
            const newNames = pkt.roster.filter((p: any) => p !== null && p.slot !== this.player.slot).map((p: any) => p.name);
            for (const n of newNames) {
              if (!prevNames.includes(n)) {
                this.showAlert(`PILOT JOINED // ${n.toUpperCase()}`);
                this.addChatLog(`${n} joined the arena.`, 'system');
              }
            }

            // Update tablePlayers preserving local slot properties
            this.tablePlayers = pkt.roster.map((p: TablePlayer | null) => {
              if (!p) return null;
              return {
                ...p,
                isLocal: p.slot === this.player.slot,
              };
            });

            // Synchronize simulated bot realms
            for (let i = 1; i < 8; i++) {
              const p = this.tablePlayers[i];
              if (p && p.isBot) {
                if (!this.simulatedRealm.botRealms.has(i)) {
                  const colorIdx = PLAYER_COLORS.findIndex((c) => c.primary.toLowerCase() === p.color.toLowerCase());
                  this.simulatedRealm.addBotRealm(i, p.name, p.shipId || 0, p.botDifficulty || 'medium', colorIdx >= 0 ? colorIdx : i);
                }
              } else {
                if (this.simulatedRealm.botRealms.has(i)) {
                  this.simulatedRealm.removeBotRealm(i);
                }
              }
            }

            this.rebuildTableWormholes();
            this.updateTableRosterUI();
          }
        } else if (pkt.type === 'HEALTH_SYNC' || pkt.type === 'SNAPSHOT') {
          const syncSlot = pkt.slot ?? data.fromSlot;
          const hp = pkt.hp ?? pkt.snapshot?.hp;
          const maxHp = pkt.maxHp ?? pkt.snapshot?.maxHp;
          const isAlive = pkt.isAlive ?? pkt.snapshot?.isAlive;

          if (syncSlot !== this.player.slot && this.tablePlayers[syncSlot]) {
            if (hp !== undefined) this.tablePlayers[syncSlot]!.health = hp;
            if (maxHp !== undefined) this.tablePlayers[syncSlot]!.maxHealth = maxHp;
            if (isAlive !== undefined && this.gameState.phase === 'PLAYING' && Date.now() - this.roundStartTime > 1200) {
              this.tablePlayers[syncSlot]!.isAlive = isAlive;
            }
          }

          if (pkt.type === 'SNAPSHOT' && data.fromSlot !== this.player.slot && pkt.snapshot) {
            this.simulatedRealm.applyRemoteSnapshot(pkt.snapshot);
          }
        } else if (pkt.type === 'WARP_HAZARD') {
          const fromSlot = pkt.payload.fromSlot;
          const toSlot = pkt.payload.toSlot;

          if (toSlot === this.player.slot && fromSlot !== this.player.slot) {
            // Hazard is targeted directly at local human player!
            const senderName = this.tablePlayers[fromSlot]?.name || 'Opponent';
            this.showAlert(`INCOMING // ${POWERUP_NAMES[pkt.payload.hazardType] || 'HAZARD'} FROM ${senderName.toUpperCase()}!`);
            let targetWh = this.wormholes.find((w) => w.slot === fromSlot);
            if (!targetWh) {
              const senderPlayer = this.tablePlayers[fromSlot];
              targetWh = new Wormhole(senderName, fromSlot, 0, 240, true, senderPlayer?.color);
              this.wormholes.push(targetWh);
            }
            this.hazardManager.spawnHazard(pkt.payload.hazardType, targetWh, this.player, this.missiles);
            this.gameState.stats.p2HazardsSent++;
            this.addChatLog(`${senderName} sent ${POWERUP_NAMES[pkt.payload.hazardType]} -> Your Realm`, 'system');
            this.sound.playSpecial(1);
          } else if (this.isLanMatchHost) {
            if (this.tablePlayers[toSlot]?.isBot) {
              // Host receives hazard from a human client targeted at an AI bot
              this.simulatedRealm.receiveHazardFromPlayer1(pkt.payload.hazardType, toSlot, fromSlot);
              const botName = this.tablePlayers[toSlot]?.name || `Bot ${toSlot}`;
              const senderName = this.tablePlayers[fromSlot]?.name || `Player ${fromSlot}`;
              this.addChatLog(`${senderName} sent ${POWERUP_NAMES[pkt.payload.hazardType]} -> ${botName}`, 'system');
            } else if (toSlot !== this.player.slot && this.tablePlayers[toSlot]) {
              // Host forwards hazard across network to the destination human client
              this.sendLanPacket({
                type: 'MATCH_PACKET',
                matchId: this.currentMatchConfig.id,
                fromSlot: fromSlot,
                packet: {
                  type: 'WARP_HAZARD',
                  payload: pkt.payload,
                },
              });
            }
          }
        } else if (pkt.type === 'BOT_DEATH') {
          const deadSlot = pkt.botSlot;
          if (this.tablePlayers[deadSlot]) {
            this.tablePlayers[deadSlot]!.isAlive = false;
            this.tablePlayers[deadSlot]!.health = 0;
          }
          const botWh = this.wormholes.find((w) => w.slot === deadSlot);
          if (botWh) {
            botWh.killSelf(this.particles, this.sound);
          }
          this.updateTableRosterUI();
          this.addChatLog(`${this.tablePlayers[deadSlot]?.name || 'Bot'} was destroyed!`, 'system');
          this.sound.playExplosion(true);
        } else if (pkt.type === 'PLAYER_DEATH') {
          if (this.isLanMatchHost && this.gameState.phase === 'PLAYING') {
            // Guard: ensure round has been active for at least 1.0s before accepting death
            if (Date.now() - this.roundStartTime < 1000) {
              return;
            }
            if (pkt.slot !== this.player.slot && this.tablePlayers[pkt.slot] && this.tablePlayers[pkt.slot]!.isAlive) {
              this.tablePlayers[pkt.slot]!.isAlive = false;
              this.tablePlayers[pkt.slot]!.health = 0;
              const victimWh = this.wormholes.find((w) => w.slot === pkt.slot);
              if (victimWh) {
                victimWh.killSelf(this.particles, this.sound);
              }
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

          if (pkt.victimSlot !== undefined && pkt.victimSlot !== this.player.slot) {
            const victimWh = this.wormholes.find((w) => w.slot === pkt.victimSlot);
            if (victimWh) {
              victimWh.killSelf(this.particles, this.sound);
            }
            if (this.tablePlayers[pkt.victimSlot]) {
              this.tablePlayers[pkt.victimSlot]!.isAlive = false;
              this.tablePlayers[pkt.victimSlot]!.health = 0;
            }
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
            if (isLocalVictim) {
              // Local player died - ensure defeat modal is displayed
              if (!document.getElementById('round-modal')?.classList.contains('active')) {
                this.handlePlayerElimination();
              }
            } else {
              this.showVictoryModal();
            }
            if (this.gameState.onRoundEnd) this.gameState.onRoundEnd(roundWinner, pkt.p1Score, pkt.p2Score);
            if (this.gameState.onPhaseChange) this.gameState.onPhaseChange('ROUND_OVER');
          }
        } else if (pkt.type === 'MATCH_START') {
          this.isSpectating = false;
          if (pkt.roster && Array.isArray(pkt.roster)) {
            this.tablePlayers = pkt.roster.map((p: TablePlayer | null) => {
              if (!p) return null;
              return {
                ...p,
                isLocal: p.slot === this.player.slot,
                isSpectating: false,
                isAlive: true,
              };
            });
          }
          this.setDeckActive(false);
          this.resetArenaForNewRound();
          this.respawnPlayer();
          this.simulatedRealm.resetForNewRound();
          const roundModal = document.getElementById('round-modal');
          if (roundModal) {
            roundModal.classList.remove('active');
            roundModal.style.display = 'none';
          }
          const pauseModal = document.getElementById('pause-modal');
          if (pauseModal) {
            pauseModal.classList.remove('active');
            pauseModal.style.display = 'none';
          }
          this.modalHangarView.stopPreview();
          this.gameState.targetWins = pkt.targetWins;
          this.gameState.currentRound = pkt.round || this.gameState.currentRound + 1;
          this.gameState.startCountdown();
          this.updateTableRosterUI();
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

  public sendPresence(): void {
    this.connectedPilots.set(this.localClientId, {
      id: this.localClientId,
      callsign: this.playerName,
      avatar: this.playerAvatar,
      isHost: true,
      lastSeen: Date.now(),
    });
    this.sendLanPacket({
      type: 'PRESENCE',
      id: this.localClientId,
      callsign: this.playerName,
      avatar: this.playerAvatar,
      timestamp: Date.now(),
    });
  }

  private initLanComms(): void {
    // 1. Setup Global Web & LAN WebSocket Relay
    this.globalRelay.setCallbacks(
      (data) => {
        this.handleLanMessage(data);
      },
      () => {
        this.sendPresence();
        if (this.lobbyMatches.length > 0) {
          this.broadcastMatches();
        }
      }
    );
    this.globalRelay.connect();

    // 2. Setup BroadcastChannel as local multi-tab fallback
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.lanChannel = new BroadcastChannel('wormhole_lan_hub');
      this.lanChannel.onmessage = (event) => {
        this.handleLanMessage(event.data);
      };
    }

    // Broadcast presence immediately and every 2s
    this.sendPresence();
    setInterval(() => this.sendPresence(), 2000);

    // Periodically prune offline peers
    setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, pilot] of this.connectedPilots.entries()) {
        if (id !== this.localClientId && now - pilot.lastSeen > 8000) {
          this.connectedPilots.delete(id);
          changed = true;
        }
      }
      if (changed) {
        this.renderConnectedPilots();
        const activeHostNames = new Set(Array.from(this.connectedPilots.values()).map((p) => p.callsign));
        const prevCount = this.lobbyMatches.length;
        this.lobbyMatches = this.lobbyMatches.filter((m) => activeHostNames.has(m.hostName));
        if (this.lobbyMatches.length !== prevCount) {
          this.renderLobbyMatches();
        }
      }
    }, 4000);

    // Broadcast hosted match list every 2s while hosting
    setInterval(() => {
      if (this.isLanMatchHost && this.currentMatchConfig) {
        this.broadcastMatches();
      }
    }, 2000);

    // Clean up hosted match or notify host if window is closed
    window.addEventListener('beforeunload', () => {
      if (this.currentMatchConfig) {
        if (this.isLanMatchHost) {
          this.sendLanPacket({
            type: 'MATCH_TERMINATED',
            matchId: this.currentMatchConfig.id,
          });
          this.lobbyMatches = this.lobbyMatches.filter((m) => m.id !== this.currentMatchConfig!.id);
          this.broadcastMatches();
        } else if (this.isLanMatchClient) {
          this.sendLanPacket({
            type: 'MATCH_PACKET',
            matchId: this.currentMatchConfig.id,
            fromSlot: this.player.slot,
            packet: {
              type: 'PLAYER_LEAVE',
              slot: this.player.slot,
              playerName: this.playerName,
              clientId: this.localClientId,
            },
          });
        }
      }
    });

    this.renderConnectedPilots();
  }

  public renderConnectedPilots(): void {
    const pilotsListEl = document.getElementById('lobby-pilots-list');
    const onlineCountEl = document.getElementById('lobby-online-count');
    const selfNameEl = document.getElementById('lobby-self-name');
    const displayCallsign = document.getElementById('display-callsign');
    const playerAvatarImg = document.getElementById('player-avatar-img') as HTMLImageElement | null;

    if (selfNameEl) {
      selfNameEl.innerText = `${this.playerName} (YOU)`;
    }
    if (displayCallsign) {
      displayCallsign.innerText = this.playerName;
    }
    if (playerAvatarImg) {
      playerAvatarImg.src = `/avatars/${this.playerAvatar}`;
    }

    const count = Math.max(1, this.connectedPilots.size);
    if (onlineCountEl) {
      onlineCountEl.innerText = `PILOTS IN LOUNGE (${count})`;
    }

    if (!pilotsListEl) return;
    pilotsListEl.innerHTML = '';

    // Render self first
    const selfRow = document.createElement('div');
    selfRow.className = 'pilot-row self';
    selfRow.innerHTML = `
      <img src="/avatars/${this.playerAvatar}" class="pilot-row-avatar" alt="Avatar" onerror="this.src='/avatars/avatar_1.svg'" />
      <span class="pilot-row-name">${this.playerName} (YOU)</span>
      <span class="pilot-ping-pill local">LOCAL</span>
    `;
    pilotsListEl.appendChild(selfRow);

    // Render other connected LAN pilots
    for (const [id, pilot] of this.connectedPilots.entries()) {
      if (id === this.localClientId) continue;
      const row = document.createElement('div');
      row.className = 'pilot-row';
      const pilotAvatar = pilot.avatar || 'avatar_1.png';
      row.innerHTML = `
        <img src="/avatars/${pilotAvatar}" class="pilot-row-avatar" alt="Avatar" onerror="this.src='/avatars/avatar_1.svg'" />
        <span class="pilot-row-name">${pilot.callsign}</span>
        <span class="pilot-ping-pill lan">LAN</span>
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
        <div class="matches-empty-radar-container">
          <div class="radar-scanner-box">
            <div class="radar-binary-bg">0100110 01101111 01110010<br>1100100 1101110 01100101<br>0010101 0111001 01010101<br>1001100 0110101 00101010</div>
            <div class="radar-ring r1"></div>
            <div class="radar-ring r2"></div>
            <div class="radar-ring r3"></div>
            <div class="radar-crosshair-h"></div>
            <div class="radar-crosshair-v"></div>
            <div class="radar-sweep-beam"></div>
            <div class="radar-center-core"></div>
          </div>
          <div class="radar-empty-title">NO ACTIVE MATCHES FOUND.</div>
          <div class="radar-empty-sub">TAP <strong class="btn-host-from-empty" style="color: var(--neon-cyan); cursor: pointer;">'+ HOST NEW MATCH'</strong> TO CREATE ONE!</div>
        </div>
      `;
      const emptyHostBtn = listEl.querySelector('.btn-host-from-empty') as HTMLElement;
      if (emptyHostBtn) {
        emptyHostBtn.onclick = () => {
          const createModal = document.getElementById('create-match-modal');
          if (createModal) {
            createModal.classList.add('active');
            createModal.style.display = 'block';
          }
        };
      }
      return;
    }

    filtered.forEach((match) => {
      const card = document.createElement('div');
      card.className = 'match-row-card';

      const sizeLabel = match.size === 'SMALL' ? '2-P DUEL' : match.size === 'MEDIUM' ? '4-P BATTLE' : match.size === 'LARGE' ? '6-P ARENA' : '8-P MEGA';
      const pupsLabel = match.powerupRule === 'STANDARD' ? 'STANDARD (17)' : 'EXTENDED (20)';
      const isFull = match.currentPlayers >= match.maxPlayers;

      const testBadge = match.isTestMode
        ? `<span class="match-badge badge-rule" style="background: rgba(255, 170, 0, 0.25); border: 1px solid #ffaa00; color: #ffaa00; font-weight: 900; box-shadow: 0 0 8px rgba(255, 170, 0, 0.4);">⚡ TEST MODE</span>`
        : '';
      const modeLabel = match.matchType === 'TEAM' ? '⚔ TEAM' : '🎯 FFA';

      card.innerHTML = `
        <div class="match-info-col">
          <div class="match-title-line">
            <span>${match.isPasswordProtected ? '🔒 ' : ''}${match.name}</span>
            <span style="font-size: 10px; font-weight: 700; color: #88bbdd;">(HOST: ${match.hostName})</span>
          </div>
          <div class="match-meta-line">
            <span class="match-badge badge-rule" style="border-color: ${match.matchType === 'TEAM' ? '#c040ff' : '#00e5ff'}; color: ${match.matchType === 'TEAM' ? '#df70ff' : '#00e5ff'};">${modeLabel}</span>
            ${testBadge}
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
          joinBtn.disabled = true;
          joinBtn.innerText = 'CONNECTING...';

          const sendJoinReq = () => {
            if (this.isLanMatchClient && !this.inArena) {
              this.sendLanPacket({
                type: 'MATCH_JOIN_REQUEST',
                matchId: match.id,
                clientId: this.localClientId,
                playerName: this.playerName,
                shipId: this.selectedShipIndex,
              });
            }
          };

          sendJoinReq();
          setTimeout(sendJoinReq, 1000);
          setTimeout(sendJoinReq, 2200);

          setTimeout(() => {
            if (!this.inArena && this.isLanMatchClient) {
              this.isLanMatchClient = false;
              joinBtn.disabled = false;
              joinBtn.innerText = isFull ? 'SPECTATE' : 'JOIN MATCH';
              this.showAlert('COULD NOT REACH HOST // RETRY JOIN');
            }
          }, 6000);

          this.addChatLog(`Requesting entry into ${match.hostName}'s Match...`, 'system');
        }
      };

      listEl.appendChild(card);
    });
  }

  public resetPilotModeToHuman(): void {
    this.playerPilotMode = 'human';
    this.playerBotController = null;
    const pilotSelect = document.getElementById('spawner-pilot-select') as HTMLSelectElement | null;
    if (pilotSelect) {
      pilotSelect.value = 'human';
    }
  }

  public joinLobbyMatch(match: LobbyMatch): void {
    this.resetPilotModeToHuman();
    this.currentMatchConfig = match;
    this.currentArenaSize = match.size;
    Powerup.powerupRule = match.powerupRule;
    Powerup.allPowerupsAllowed = match.powerupRule === 'EXTENDED';

    // Enforce match ship restriction on local player if currently selecting an extended ship
    if (match.shipRestriction === 'STANDARD' && this.selectedShipIndex > 2) {
      this.selectedShipIndex = 0;
      this.player.setShip(0);
      this.manualHangarView.setShip(0);
      this.modalHangarView.setShip(0);
      this.syncShipSelectionUI(0);
    }

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
    this.player.colorIndex = this.selectedColorIndex;
    this.simulatedRealm.clearAllBots();
    this.tablePlayers = new Array(8).fill(null);
    const isTeamMode = this.currentMatchConfig?.matchType === 'TEAM';
    // Slot 0: Local Player (Defaults to Team Alpha in Team Mode)
    const playerColor = (PLAYER_COLORS[this.selectedColorIndex] || PLAYER_COLORS[0]).primary;
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
      color: playerColor,
      team: isTeamMode ? 'A' : undefined,
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

    // Find all colors already in use by player or other active participants to ensure strict uniqueness
    const takenColors = new Set<number>();
    takenColors.add(this.selectedColorIndex);
    for (let i = 0; i < 8; i++) {
      const p = this.tablePlayers[i];
      if (p) {
        const cIdx = PLAYER_COLORS.findIndex((c) => c.primary.toLowerCase() === p.color.toLowerCase());
        if (cIdx !== -1) takenColors.add(cIdx);
      }
    }

    // Find first unused color
    let botColorIdx = emptySlot % PLAYER_COLORS.length;
    for (let c = 0; c < PLAYER_COLORS.length; c++) {
      if (!takenColors.has(c)) {
        botColorIdx = c;
        break;
      }
    }
    const botColor = (PLAYER_COLORS[botColorIdx] || PLAYER_COLORS[emptySlot % PLAYER_COLORS.length]).primary;

    const diffTag = difficulty === 'hard' ? 'HARD AI' : difficulty === 'insane' ? 'INSANE AI' : difficulty === 'easy' ? 'EASY AI' : 'MED AI';
    const botCallsigns = [
      'Vector', 'Nova', 'Centurion', 'Viper', 'Aegis', 'Titan', 'Spectre',
      'Hyperion', 'ZeroPoint', 'Krypton', 'Vortex', 'Phantom', 'Solaris', 'Raven',
      'Eclipse', 'Apex', 'Nemesis', 'Zenith', 'Orion', 'Pulse', 'Cobalt', 'Glacier',
      'Tempest', 'Valkyrie', 'Matrix', 'Chronos', 'Helios', 'Rogue', 'Phoenix'
    ];
    const existingNames = this.tablePlayers.filter((p) => p !== null).map((p) => p!.name);
    let baseBotName = botCallsigns[(emptySlot - 1) % botCallsigns.length];
    let botName = `${baseBotName} [${diffTag}]`;
    if (existingNames.includes(botName)) {
      let counter = 2;
      while (existingNames.includes(`${baseBotName}-${counter} [${diffTag}]`)) {
        counter++;
      }
      botName = `${baseBotName}-${counter} [${diffTag}]`;
    }

    const isRestrictedToClassic = this.currentMatchConfig && this.currentMatchConfig.shipRestriction === 'STANDARD';
    const botShipId = isRestrictedToClassic ? (emptySlot - 1) % 3 : (emptySlot - 1) % 8;
    const botShip = ShipCatalog.get(botShipId);
    const isTeamMode = this.currentMatchConfig?.matchType === 'TEAM';
    const assignedTeam: 'A' | 'B' | undefined = isTeamMode ? (emptySlot % 2 === 0 ? 'A' : 'B') : undefined;

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
      team: assignedTeam,
    };

    this.showAlert(`BOT PILOT ENTERED // ${botName.toUpperCase()}`);
    this.addChatLog(`${botName} joined the arena${assignedTeam ? ` [TEAM ${assignedTeam === 'A' ? 'ALPHA' : 'OMEGA'}]` : ''}.`, 'bot', botColor);
    this.triggerBotJoinChat(botName, emptySlot);
    this.simulatedRealm.addBotRealm(emptySlot, botName, botShipId, difficulty, botColorIdx);
    this.rebuildTableWormholes();
    this.updateTableRosterUI();
    this.broadcastRosterSync();

    // If waiting in staging, update ready message
    const scoreEl = document.getElementById('round-modal-score');
    if (scoreEl && this.gameState.phase === 'STANDBY') {
      const activeCount = this.tablePlayers.filter((p) => p !== null).length;
      scoreEl.innerText = `${activeCount} PILOTS IN ARENA // READY TO ENGAGE`;
    }

    return true;
  }

  public broadcastRosterSync(): void {
    if (this.currentMatchConfig && (this.isLanMatchHost || this.isLanMatchClient)) {
      this.sendLanPacket({
        type: 'MATCH_PACKET',
        matchId: this.currentMatchConfig.id,
        fromSlot: this.player.slot,
        packet: {
          type: 'ROSTER_UPDATE',
          roster: this.tablePlayers,
          matchConfig: this.currentMatchConfig,
        },
      });
    }
  }

  public removeBotFromTable(slot: number): void {
    const bot = this.tablePlayers[slot];
    if (!bot || !bot.isBot) return;

    this.tablePlayers[slot] = null;
    this.simulatedRealm.removeBotRealm(slot);
    this.addChatLog(`${bot.name} left the arena.`, 'system');

    if (this.selectedOpponentSlot === slot) {
      // Switch pip feed to next available opponent
      const activeSlots: number[] = [];
      for (let i = 1; i < 8; i++) {
        if (this.tablePlayers[i]) activeSlots.push(i);
      }
      this.selectedOpponentSlot = activeSlots.length > 0 ? activeSlots[0] : 1;
    }

    this.rebuildTableWormholes();
    this.updateTableRosterUI();
    this.broadcastRosterSync();
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
    this.setOpponentFeedSlot(activeSlots[idx]);
  }

  public setOpponentFeedSlot(slot: number): void {
    if (slot === 0 || !this.tablePlayers[slot]) return;
    this.selectedOpponentSlot = slot;
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
    const isTeamMode = this.currentMatchConfig?.matchType === 'TEAM';
    const myPlayer = this.tablePlayers[this.player.slot];
    const myTeam = myPlayer?.team || 'A';

    // Active opponents:
    // In TEAM mode: ONLY include participants on opposing team (p.team !== myTeam)
    // In FFA mode: include all participants except local player
    const activeOpponents: TablePlayer[] = [];
    for (let i = 0; i < 8; i++) {
      const p = this.tablePlayers[i];
      if (p && !p.isLocal && p.slot !== this.player.slot) {
        if (isTeamMode) {
          if (p.team !== myTeam) {
            activeOpponents.push(p);
          }
        } else {
          activeOpponents.push(p);
        }
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
          new Wormhole(opp.name, opp.slot, angle, orbitDistance, true, opp.color)
        );
      });
    }

    // Rebuild multi-wormholes across all simulated bot realms so they fight each other (with enemy-only wormhole filter)
    this.simulatedRealm.rebuildTableWormholes(this.tablePlayers, orbitDistance, isTeamMode);
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

    // 3. Reset All Opponent Bot / Remote Realms
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

    // 4. Rebuild & Re-space all active wormholes evenly with warp-in animation
    this.rebuildTableWormholes();
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
    this.inArena = !active;

    if (active) {
      deck.classList.remove('hidden');
      hud.style.display = 'none';
      document.body.classList.remove('in-arena');

      // 2. Clean up active match hosting state and reset pilot control mode to human
      this.resetPilotModeToHuman();
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
    } else {
      deck.classList.add('hidden');
      document.body.classList.add('in-arena');
      this.isMobile = this.checkIsMobile();
      if (this.isMobile) {
        document.body.classList.add('is-mobile');
        hud.style.display = 'none';
        this.zoom = 1.35;
      } else {
        document.body.classList.remove('is-mobile');
        hud.style.display = 'grid';
        this.zoom = 1.65;
      }
      this.renderer.resize();
      if (this.pipRenderer) this.pipRenderer.resize();
      this.resetArenaForNewRound();
    }
  }

  private getPlayerColor(nameOrSlot: string | number): string {
    if (typeof nameOrSlot === 'number') {
      const col = PLAYER_COLORS[nameOrSlot % PLAYER_COLORS.length];
      return col ? col.primary : '#00ffcc';
    }
    const found = this.tablePlayers.find((p) => p && p.name.toLowerCase() === nameOrSlot.toLowerCase());
    if (found) {
      const col = PLAYER_COLORS[found.slot % PLAYER_COLORS.length];
      return col ? col.primary : '#00ffcc';
    }
    return '#00ffcc';
  }

  private addChatLog(text: string, type: 'system' | 'player' | 'bot' = 'system', customColor?: string): void {
    const chatLog = document.getElementById('match-chat-log') || document.getElementById('table-chat-log');
    if (chatLog) {
      const div = document.createElement('div');
      div.className = `chat-msg ${type}`;
      if (customColor) {
        div.style.color = customColor;
        div.style.textShadow = `0 0 6px ${customColor}88`;
      }
      div.innerText = text;
      chatLog.appendChild(div);
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    // Floating Twitch-style comms on mobile
    const mobFloating = document.getElementById('mob-floating-comms');
    if (mobFloating && this.isMobile) {
      const mobItem = document.createElement('div');
      mobItem.className = 'twitch-chat-item';
      if (customColor) {
        mobItem.style.borderLeftColor = customColor;
      }
      mobItem.innerText = text;
      mobFloating.appendChild(mobItem);
      setTimeout(() => {
        mobItem.remove();
      }, 4000);
    }
  }

  private triggerBotJoinChat(botName: string, botSlot = 1): void {
    const greetings = [
      'Vector core online. Ready for battle.',
      'Target lock acquired. Good luck, pilot.',
      'Subspace thrusters primed. Let\'s dance.',
      'Combat subroutines active. Show me what you\'ve got!',
      'Sensors calibrated. Ready to deploy.',
      'Reactor hot. Prepare for dogfight!',
    ];
    const msg = greetings[Math.floor(Math.random() * greetings.length)];
    const color = this.getPlayerColor(botSlot);
    setTimeout(() => {
      this.addChatLog(`${botName}: "${msg}"`, 'bot', color);
    }, 400);
  }

  private triggerBotKillChat(botName: string, botSlot = 1): void {
    const taunts = [
      'Calculation complete. Direct hit!',
      'Too slow on the retro thrusters!',
      'Trajectory intercepted. Better luck next round!',
      'Shields depleted. Flawless strike.',
      'Got you in my crosshairs!',
      'Target neutralized.',
    ];
    const msg = taunts[Math.floor(Math.random() * taunts.length)];
    const color = this.getPlayerColor(botSlot);
    setTimeout(() => {
      this.addChatLog(`${botName}: "${msg}"`, 'bot', color);
    }, 300);
  }

  private triggerBotDeathChat(botName: string, botSlot = 1): void {
    const reactions = [
      'Hull integrity failure... good shot!',
      'Critical damage! Recalibrating next round...',
      'Shield collapsed! You\'ll pay for that!',
      'Wormhole backlash... impressive maneuvering!',
      'Power diverted... see you next round!',
      'My reactor! Well played, pilot.',
    ];
    const msg = reactions[Math.floor(Math.random() * reactions.length)];
    const color = this.getPlayerColor(botSlot);
    setTimeout(() => {
      this.addChatLog(`${botName}: "${msg}"`, 'bot', color);
    }, 300);
  }

  private setupMatchCallbacks(): void {
    const countdownEl = document.getElementById('countdown-overlay')!;
    const matchModal = document.getElementById('match-modal')!;

    this.gameState.onRoundStart = () => {
      this.roundStartTime = Date.now();
      this.respawnPlayer();
      this.simulatedRealm.resetForNewRound();
      this.hazardManager.hazards = [];
      this.hazardManager.mines = [];
      this.bullets = [];
      this.missiles = [];
    };

    this.gameState.onScoreUpdate = (p1, p2) => {
      const isP1Local = this.isLanMatchHost || (!this.isLanMatchClient && !this.network.isConnected) || (this.network.isConnected && this.network.isHost);
      const myWins = isP1Local ? p1 : p2;
      const myLosses = isP1Local ? p2 : p1;

      const winsEl = document.getElementById('hud-classic-wins');
      if (winsEl) winsEl.innerText = myWins.toString();
      const lossesEl = document.getElementById('hud-classic-losses');
      if (lossesEl) lossesEl.innerText = myLosses.toString();
      if (this.tablePlayers[0]) this.tablePlayers[0]!.wins = p1;
      if (this.tablePlayers[1]) this.tablePlayers[1]!.wins = p2;
      this.updateTableRosterUI();
    };

    this.gameState.onRoundEnd = (roundWinner, p1Score, p2Score) => {
      const roundModal = document.getElementById('round-modal')!;
      const titleEl = document.getElementById('round-modal-title')!;
      const subEl = document.getElementById('round-modal-subtitle')!;
      const scoreEl = document.getElementById('round-modal-score')!;

      const isP1Local = this.isLanMatchHost || (!this.isLanMatchClient && !this.network.isConnected) || (this.network.isConnected && this.network.isHost);
      const isLocalRoundWin = (roundWinner === 'PLAYER 1' && isP1Local) || (roundWinner === 'PLAYER 2' && !isP1Local);
      const myWins = isP1Local ? p1Score : p2Score;
      const oppWins = isP1Local ? p2Score : p1Score;

      titleEl.innerText = isLocalRoundWin ? 'ROUND VICTORY!' : 'YOU DIED';
      titleEl.style.color = isLocalRoundWin ? 'var(--neon-cyan)' : '#ff3344';
      titleEl.style.textShadow = isLocalRoundWin ? '0 0 20px var(--neon-cyan)' : '0 0 20px #ff3344';

      subEl.innerText = isLocalRoundWin ? 'ENEMY SHIP ELIMINATED' : 'YOUR SHIP WAS DESTROYED';
      scoreEl.innerText = `${myWins} - ${oppWins}`;

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
        this.roundStartTime = Date.now();
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

      const myWins = isP1 ? this.gameState.player1Score : this.gameState.player2Score;
      const oppWins = isP1 ? this.gameState.player2Score : this.gameState.player1Score;
      document.getElementById('modal-title')!.innerText = isLocalWin ? 'VICTORY!' : 'DEFEAT!';
      document.getElementById('stat-final-score')!.innerText = `${myWins} - ${oppWins}`;
      document.getElementById('modal-title')!.style.color = isLocalWin ? 'var(--neon-cyan)' : '#ff3344';
      document.getElementById('modal-title')!.style.textShadow = isLocalWin ? '0 0 20px var(--neon-cyan)' : '0 0 20px #ff3344';
      document.getElementById('modal-subtitle')!.innerText = isLocalWin ? 'YOU WON THE MATCH!' : 'OPPONENT WON THE MATCH!';
      document.getElementById('stat-final-score')!.innerText = isP1 ? `${this.gameState.player1Score} - ${this.gameState.player2Score}` : `${this.gameState.player2Score} - ${this.gameState.player1Score}`;

      if (isLocalWin) {
        this.sound.playVictoryFanfare();
        const activeBot = this.tablePlayers.find((p) => p && p.isBot);
        if (activeBot) {
          const botColor = this.getPlayerColor(activeBot.slot);
          setTimeout(() => {
            this.addChatLog(`${activeBot.name}: "Match concluded. Commendable piloting, human."`, 'bot', botColor);
          }, 600);
        }
      } else {
        this.sound.playDefeatFanfare();
        const winningBot = this.tablePlayers.find((p) => p && p.isBot);
        if (winningBot) {
          const botColor = this.getPlayerColor(winningBot.slot);
          setTimeout(() => {
            this.addChatLog(`${winningBot.name}: "Match finalized. Dominance confirmed!"`, 'bot', botColor);
          }, 600);
        }
      }
    };
  }

  private checkTeamRoundStatus(): boolean {
    const isTeamMode = this.currentMatchConfig?.matchType === 'TEAM';
    if (!isTeamMode) return false;

    let teamA_Alive = false;
    let teamB_Alive = false;
    for (let i = 0; i < 8; i++) {
      const p = this.tablePlayers[i];
      if (p && p.isAlive) {
        if (p.team === 'A') teamA_Alive = true;
        if (p.team === 'B') teamB_Alive = true;
      }
    }

    const myTeam = this.tablePlayers[this.player.slot]?.team || 'A';

    if (!teamB_Alive) {
      // Team Alpha wins!
      this.gameState.registerPlayer1Kill();
      if (myTeam === 'A') {
        this.showVictoryModal('TEAM ALPHA VICTORIOUS!', 'ALL ENEMY OMEGA SHIPS ELIMINATED');
      } else {
        this.showDefeatModal('TEAM OMEGA DEFEATED', 'ALL SQUADRON SHIPS ELIMINATED');
      }
      return true;
    } else if (!teamA_Alive) {
      // Team Omega wins!
      this.gameState.registerPlayer2Kill();
      if (myTeam === 'B') {
        this.showVictoryModal('TEAM OMEGA VICTORIOUS!', 'ALL ENEMY ALPHA SHIPS ELIMINATED');
      } else {
        this.showDefeatModal('TEAM ALPHA DEFEATED', 'ALL ALLIED SHIPS ELIMINATED');
      }
      return true;
    }

    return false;
  }

  private handlePlayerElimination(): void {
    if (this.gameState.phase === 'ROUND_OVER' || this.gameState.phase === 'MATCH_OVER') {
      return;
    }

    this.addChatLog('Your ship was destroyed!', 'system');

    if (this.tablePlayers[this.player.slot]) {
      this.tablePlayers[this.player.slot]!.health = 0;
      this.tablePlayers[this.player.slot]!.isAlive = false;
    }

    // Trigger bot taunt on player elimination
    const activeBot = this.tablePlayers.find((p) => p && p.isBot && p.isAlive);
    if (activeBot) {
      this.triggerBotKillChat(activeBot.name, activeBot.slot);
    }

    const isTeamMode = this.currentMatchConfig?.matchType === 'TEAM';

    if (isTeamMode) {
      this.updateTableRosterUI();
      const roundOver = this.checkTeamRoundStatus();
      if (!roundOver) {
        // Teammates are still fighting! Keep in spectator standby
        this.showAlert('SHIP DESTROYED // STANDBY AS TEAM FIGHTS');
        this.addChatLog('Your ship was destroyed! Spectating active teammates...', 'system');
      }
      return;
    }

    // FFA Mode Elimination:
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

    // 2. Open round-modal
    this.showDefeatModal();
  }

  public showDefeatModal(customTitle = 'YOU DIED', customSubtitle = 'YOUR SHIP WAS DESTROYED'): void {
    if ((this.gameState.phase as string) === 'MATCH_OVER') return;

    const roundModal = document.getElementById('round-modal')!;
    const titleEl = document.getElementById('round-modal-title')!;
    const subEl = document.getElementById('round-modal-subtitle')!;
    const scoreEl = document.getElementById('round-modal-score')!;
    const btnNext = document.getElementById('btn-next-round')!;

    titleEl.innerText = customTitle;
    titleEl.style.color = '#ff3344';
    titleEl.style.textShadow = '0 0 25px #ff3344';
    subEl.innerText = customSubtitle;

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

    const isP1Local = this.isLanMatchHost || (!this.isLanMatchClient && !this.network.isConnected) || (this.network.isConnected && this.network.isHost);
    const myWins = isP1Local ? this.gameState.player1Score : this.gameState.player2Score;
    const oppWins = isP1Local ? this.gameState.player2Score : this.gameState.player1Score;
    scoreEl.innerText = `${myWins} - ${oppWins}`;
    btnNext.innerText = this.isLanMatchClient ? 'READY FOR NEXT ROUND' : 'NEXT ROUND [SPACE]';

    roundModal.classList.add('active');
    roundModal.style.display = 'block';
    this.buildShipGrid();
    this.modalHangarView.setShip(this.selectedShipIndex);
    this.modalHangarView.startPreview();
    this.sound.playDefeatFanfare();
  }

  public showVictoryModal(customTitle = 'ROUND VICTORY!', customSubtitle = 'ENEMY FLEET ELIMINATED'): void {
    if (this.gameState.phase === 'MATCH_OVER') return;

    const roundModal = document.getElementById('round-modal')!;
    const titleEl = document.getElementById('round-modal-title')!;
    const subEl = document.getElementById('round-modal-subtitle')!;
    const killerEl = document.getElementById('round-modal-killer');
    const scoreEl = document.getElementById('round-modal-score')!;
    const btnNext = document.getElementById('btn-next-round')!;

    titleEl.innerText = customTitle;
    titleEl.style.color = 'var(--neon-cyan)';
    titleEl.style.textShadow = '0 0 25px var(--neon-cyan)';
    subEl.innerText = customSubtitle;
    if (killerEl) {
      killerEl.innerText = '';
      killerEl.style.display = 'none';
    }
    const isP1Local = this.isLanMatchHost || (!this.isLanMatchClient && !this.network.isConnected) || (this.network.isConnected && this.network.isHost);
    const myWins = isP1Local ? this.gameState.player1Score : this.gameState.player2Score;
    const oppWins = isP1Local ? this.gameState.player2Score : this.gameState.player1Score;
    scoreEl.innerText = `${myWins} - ${oppWins}`;
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
    this.triggerBotDeathChat(botName, botSlot);
    this.sound.playExplosion(true);

    if (this.tablePlayers[botSlot]) {
      this.tablePlayers[botSlot]!.health = 0;
      this.tablePlayers[botSlot]!.isAlive = false;
    }

    // Destroy eliminated bot's wormhole with detonation in player's arena & all bot realms
    const botWh = this.wormholes.find((w) => w.slot === botSlot);
    if (botWh) {
      botWh.killSelf(this.particles, this.sound);
    }
    this.simulatedRealm.handleParticipantElimination(botSlot);

    if (this.isLanMatchHost && this.currentMatchConfig) {
      this.sendLanPacket({
        type: 'MATCH_PACKET',
        matchId: this.currentMatchConfig.id,
        fromSlot: this.player.slot,
        packet: {
          type: 'BOT_DEATH',
          botSlot: botSlot,
        },
      });
    }

    this.updateTableRosterUI();

    const isTeamMode = this.currentMatchConfig?.matchType === 'TEAM';
    if (isTeamMode) {
      this.checkTeamRoundStatus();
      return;
    }

    // Check if any opponent remains alive (FFA Mode)
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

  public static generateRandomCallsign(existingNames: string[] = []): string {
    const prefixes = [
      'Ghost', 'Viper', 'Nova', 'Echo', 'Apex', 'Phantom',
      'Vector', 'Titan', 'Shadow', 'Raven', 'Hyper', 'Solar',
      'Pulse', 'Aegis', 'Cyber', 'Striker', 'Blaze', 'Cosmo',
      'Orion', 'Zenith', 'Spectre', 'Vortex', 'Krypton', 'Zero',
      'Quantum', 'Omega', 'Astral', 'Nebula', 'Falcon', 'Raptor',
      'Cobalt', 'Phoenix', 'Obsidian', 'Eclipse', 'Nemesis', 'Chronos',
      'Helios', 'Hyperion', 'Starlight', 'Laser', 'Plasma', 'Static',
      'Turbo', 'Valkyrie', 'Havoc', 'Rogue', 'Gargoyle', 'Matrix',
      'Solstice', 'Tempest', 'Kraken', 'Siren', 'Glacier', 'Apex'
    ];
    const suffixes = [
      'Prime', 'Ace', 'Fox', 'Hawk', 'Wolf', 'Blade', 'Rogue',
      'Dash', 'Nomad', 'Fury', 'Ranger', 'Knight', 'Pilot',
      'Hunter', 'Vanguard', 'Specter', 'Striker', 'Reaper', 'Surfer', 'Runner',
      'Wing', 'Core', 'Flash', 'Shift', 'Storm', 'Fire', 'Drive', 'Drift',
      'Spark', 'Byte', 'Claw', 'Fang', 'Ghost', 'Flare', 'Blaster', 'Pulse'
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    while (suffix === prefix) {
      suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    }
    let candidate = `${prefix}${suffix}`;

    if (existingNames.includes(candidate)) {
      let counter = 2;
      while (existingNames.includes(`${candidate}-${counter}`)) {
        counter++;
      }
      candidate = `${candidate}-${counter}`;
    }

    return candidate;
  }

  private setupFrontEndUI(): void {
    const callsignInput = document.getElementById('input-callsign') as HTMLInputElement | null;
    const displayCallsign = document.getElementById('display-callsign');
    const playerAvatarImg = document.getElementById('player-avatar-img') as HTMLImageElement | null;
    const hudCallsign = document.getElementById('hud-classic-callsign');

    const updateAllCallsignUI = (name: string) => {
      this.playerName = name;
      localStorage.setItem('wh_callsign', this.playerName);
      if (callsignInput) callsignInput.value = this.playerName;
      if (displayCallsign) displayCallsign.innerText = this.playerName;
      if (hudCallsign) hudCallsign.innerText = this.playerName;
      if (this.tablePlayers[0]) {
        this.tablePlayers[0]!.name = this.playerName;
      }
      this.sendPresence();
      this.renderConnectedPilots();
      this.updateTableRosterUI();
    };

    if (displayCallsign) {
      displayCallsign.innerText = this.playerName;
    }
    if (callsignInput) {
      callsignInput.value = this.playerName;
    }

    if (playerAvatarImg) {
      playerAvatarImg.src = `/avatars/${this.playerAvatar}`;
    }

    if (this.tablePlayers[0]) {
      this.tablePlayers[0]!.name = this.playerName;
    }
    if (hudCallsign) hudCallsign.innerText = this.playerName;

    // Inline Callsign Editing in Player Capsule
    const startInlineCallsignEdit = () => {
      if (displayCallsign && callsignInput) {
        callsignInput.value = this.playerName;
        displayCallsign.style.display = 'none';
        callsignInput.style.display = 'inline-block';
        callsignInput.focus();
        callsignInput.select();
        this.sound.playUIClick();
      }
    };

    const commitInlineCallsignEdit = () => {
      if (displayCallsign && callsignInput) {
        let newName = callsignInput.value.trim();
        // Only assign a fallback random name if the user actively confirms an empty string
        if (!newName) {
          newName = WormholeGame.generateRandomCallsign();
        }
        if (newName !== this.playerName) {
          updateAllCallsignUI(newName.slice(0, 16));
          this.sound.playUISelect();
        } else {
          callsignInput.value = this.playerName;
        }
        callsignInput.style.display = 'none';
        displayCallsign.style.display = 'inline';
      }
    };

    const cancelInlineCallsignEdit = () => {
      if (displayCallsign && callsignInput) {
        callsignInput.value = this.playerName;
        callsignInput.style.display = 'none';
        displayCallsign.style.display = 'inline';
        this.sound.playUIClick();
      }
    };

    if (displayCallsign) {
      displayCallsign.onclick = startInlineCallsignEdit;
    }

    const btnEditCallsign = document.getElementById('btn-edit-callsign');
    if (btnEditCallsign) {
      btnEditCallsign.onclick = startInlineCallsignEdit;
    }

    if (callsignInput) {
      callsignInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitInlineCallsignEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelInlineCallsignEdit();
        }
      });
      callsignInput.addEventListener('blur', () => {
        commitInlineCallsignEdit();
      });
    }

    // Callsign Randomize Dice button
    const btnRefreshCallsign = document.getElementById('btn-refresh-callsign');
    if (btnRefreshCallsign) {
      btnRefreshCallsign.onclick = () => {
        updateAllCallsignUI(WormholeGame.generateRandomCallsign());
        this.sound.playUIRandomize();
      };
    }

    // Avatar Selection Modal & Controls
    const btnChangeAvatar = document.getElementById('btn-change-avatar');
    const avatarModal = document.getElementById('avatar-picker-modal');
    const btnCloseAvatarModal = document.getElementById('btn-close-avatar-modal');

    const updateAvatarModalSelection = () => {
      const cards = document.querySelectorAll('.avatar-card-item');
      cards.forEach((card) => {
        const itemAvatar = (card as HTMLElement).dataset.avatar;
        if (itemAvatar === this.playerAvatar) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      });
    };

    if (btnChangeAvatar && avatarModal) {
      btnChangeAvatar.onclick = () => {
        updateAvatarModalSelection();
        avatarModal.classList.add('active');
        avatarModal.style.display = 'block';
        this.sound.playUIOpenModal();
      };
    }

    if (btnCloseAvatarModal && avatarModal) {
      btnCloseAvatarModal.onclick = () => {
        avatarModal.classList.remove('active');
        avatarModal.style.display = 'none';
        this.sound.playUIClick();
      };
    }

    // Avatar Selection Grid items
    const avatarCards = document.querySelectorAll('.avatar-card-item');
    avatarCards.forEach((card) => {
      card.addEventListener('click', () => {
        const selectedAvatar = (card as HTMLElement).dataset.avatar;
        if (selectedAvatar) {
          this.playerAvatar = selectedAvatar;
          localStorage.setItem('wh_avatar', this.playerAvatar);
          if (playerAvatarImg) {
            playerAvatarImg.src = `/avatars/${this.playerAvatar}`;
          }
          updateAvatarModalSelection();
          if (avatarModal) {
            avatarModal.classList.remove('active');
            avatarModal.style.display = 'none';
          }
          this.sound.playUISelect();
          this.sendPresence();
          this.renderConnectedPilots();
        }
      });
    });

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

    // Solo Practice Button (Opens AI Combat Directive Difficulty Picker)
    const soloModal = document.getElementById('solo-difficulty-modal');
    let selectedSoloDiff: BotDifficulty = 'medium';

    document.getElementById('btn-main-engage')!.onclick = () => {
      if (soloModal) {
        soloModal.classList.add('active');
        soloModal.style.display = 'block';
      }
    };

    const diffButtons: { id: string; diff: BotDifficulty }[] = [
      { id: 'btn-solo-diff-easy', diff: 'easy' },
      { id: 'btn-solo-diff-med', diff: 'medium' },
      { id: 'btn-solo-diff-hard', diff: 'hard' },
      { id: 'btn-solo-diff-insane', diff: 'insane' },
    ];

    diffButtons.forEach(({ id, diff }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.onclick = () => {
          selectedSoloDiff = diff;
          diffButtons.forEach((b) => document.getElementById(b.id)?.classList.remove('active'));
          btn.classList.add('active');
        };
      }
    });

    // Delegated click handler for empty matches '+ HOST NEW MATCH' link
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('btn-host-from-empty')) {
        const createModal = document.getElementById('create-match-modal');
        if (createModal) {
          createModal.classList.add('active');
          createModal.style.display = 'block';
        }
      }
    });

    const btnSoloCancel = document.getElementById('btn-solo-cancel');
    if (btnSoloCancel && soloModal) {
      btnSoloCancel.onclick = () => {
        soloModal.classList.remove('active');
        soloModal.style.display = 'none';
      };
    }

    const btnSoloConfirm = document.getElementById('btn-solo-confirm');
    if (btnSoloConfirm && soloModal) {
      btnSoloConfirm.onclick = () => {
        soloModal.classList.remove('active');
        soloModal.style.display = 'none';
        this.joinLobbyMatch({
          id: 'match-practice',
          name: 'Solo Practice Simulation',
          hostName: 'System AI',
          isPasswordProtected: false,
          size: 'MEDIUM',
          targetWins: 5,
          powerupRule: 'STANDARD',
          shipRestriction: 'STANDARD',
          botDifficulty: selectedSoloDiff,
          maxPlayers: 2,
          currentPlayers: 2,
          status: 'WAITING',
        });
      };
    }

    // Host New Match Modal Triggers
    const createModal = document.getElementById('create-match-modal');
    const btnCreateHost = document.getElementById('btn-create-host')!;
    btnCreateHost.onclick = () => {
      if (createModal) {
        (document.getElementById('host-match-name') as HTMLInputElement).value = `${this.playerName}'s Match`;
        const isMobileDevice = this.isMobile || ('ontouchstart' in window) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || window.innerWidth <= 950 || window.innerHeight <= 600;
        const testGroup = document.getElementById('host-test-mode-group');
        if (testGroup) {
          testGroup.style.display = isMobileDevice ? 'none' : 'block';
        }
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
        const matchTypeSelect = ((document.getElementById('host-match-type') as HTMLSelectElement)?.value as 'FFA' | 'TEAM') || 'FFA';
        const sizeSelect = (document.getElementById('host-match-size') as HTMLSelectElement).value as 'SMALL' | 'MEDIUM' | 'LARGE' | 'HUGE';
        const winsSelect = parseInt((document.getElementById('host-target-wins') as HTMLSelectElement).value, 10) || 5;
        const pupsSelect = (document.getElementById('host-powerup-pool') as HTMLSelectElement).value as 'STANDARD' | 'EXTENDED';
        const shipSelect = (document.getElementById('host-ship-restriction') as HTMLSelectElement).value as 'STANDARD' | 'ALL';
        const botDiff = (document.getElementById('host-bot-diff') as HTMLSelectElement).value as BotDifficulty | 'none';
        const passInput = (document.getElementById('host-match-password') as HTMLInputElement).value.trim();
        const testModeCheck = document.getElementById('host-test-mode') as HTMLInputElement | null;
        const isMobileDevice = this.isMobile || ('ontouchstart' in window) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || window.innerWidth <= 950 || window.innerHeight <= 600;
        const isTestMode = isMobileDevice ? false : (testModeCheck ? testModeCheck.checked : false);

        const maxSlots = sizeSelect === 'SMALL' ? 2 : sizeSelect === 'MEDIUM' ? 4 : sizeSelect === 'LARGE' ? 6 : 8;

        const newMatch: LobbyMatch = {
          id: `match-${Date.now()}`,
          name: nameInput,
          hostName: this.playerName,
          isPasswordProtected: passInput.length > 0,
          password: passInput || undefined,
          matchType: matchTypeSelect,
          size: sizeSelect,
          targetWins: winsSelect,
          powerupRule: pupsSelect,
          shipRestriction: shipSelect,
          botDifficulty: botDiff,
          maxPlayers: maxSlots,
          currentPlayers: botDiff === 'none' ? 1 : maxSlots,
          status: 'WAITING',
          isCustom: true,
          isTestMode: isTestMode,
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

        // Unspectate all queued pilots
        for (const p of this.tablePlayers) {
          if (p) {
            p.isSpectating = false;
            p.isAlive = true;
            p.health = p.maxHealth;
          }
        }
        this.isSpectating = false;

        this.resetArenaForNewRound();
        this.gameState.startMatch(this.currentMatchConfig ? this.currentMatchConfig.targetWins : 5);
        this.updateTableRosterUI();
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
              roster: this.tablePlayers,
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
        if (this.currentMatchConfig && this.isLanMatchClient) {
          this.sendLanPacket({
            type: 'MATCH_PACKET',
            matchId: this.currentMatchConfig.id,
            fromSlot: this.player.slot,
            packet: {
              type: 'PLAYER_LEAVE',
              slot: this.player.slot,
              playerName: this.playerName,
              clientId: this.localClientId,
            },
          });
        }
        this.network.disconnect();
        // Remove hosted match if we were host
        if (this.currentMatchConfig && this.currentMatchConfig.hostName === this.playerName) {
          this.sendLanPacket({
            type: 'MATCH_TERMINATED',
            matchId: this.currentMatchConfig.id,
          });
          this.lobbyMatches = this.lobbyMatches.filter((m) => m.id !== this.currentMatchConfig!.id);
          this.broadcastMatches();
        }
        this.isLanMatchClient = false;
        this.isLanMatchHost = false;
        this.currentMatchConfig = null;
        this.setDeckActive(true);
        this.renderLobbyMatches();
      };
    }

    const btnMatchSound = document.getElementById('btn-match-sound') || document.getElementById('btn-table-sound');
    if (btnMatchSound) {
      btnMatchSound.onclick = () => {
        const muted = this.sound.toggleMute();
        btnMatchSound.innerText = muted ? '🔇' : '🔊';
        const menuSound = document.getElementById('btn-menu-sound');
        if (menuSound) menuSound.innerText = muted ? '🔇' : '🔊';
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
      const myColor = this.getPlayerColor(this.player.slot);
      this.addChatLog(`${this.playerName}: ${msg}`, 'player', myColor);

      if (this.currentMatchConfig && (this.isLanMatchHost || this.isLanMatchClient)) {
        this.sendLanPacket({
          type: 'MATCH_PACKET',
          matchId: this.currentMatchConfig.id,
          fromSlot: this.player.slot,
          packet: {
            type: 'CHAT_MSG',
            senderName: this.playerName,
            senderSlot: this.player.slot,
            message: msg,
          },
        });
      }

      inputChat.value = '';
    };
    document.getElementById('btn-chat-send')!.onclick = sendChat;
    inputChat.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChat();
    });

    const emojiPicker = document.getElementById('arena-emoji-picker');
    const btnEmote = document.getElementById('btn-emote-smile');
    if (btnEmote && emojiPicker) {
      btnEmote.onclick = (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('active');
      };

      emojiPicker.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.emoji-opt-btn') as HTMLElement | null;
        if (btn && btn.dataset.emoji) {
          e.stopPropagation();
          const emoji = btn.dataset.emoji;
          if (inputChat) {
            inputChat.value += emoji;
            inputChat.focus();
          }
          this.sound.playLaser(0);
          emojiPicker.classList.remove('active');
        }
      });

      document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target as Node) && e.target !== btnEmote) {
          emojiPicker.classList.remove('active');
        }
      });
    }

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
      const activeTab = document.querySelector('.manual-tab-pane.active');
      if (activeTab && activeTab.id === 'tab-fleet') {
        setTimeout(() => this.manualHangarView.startPreview(), 30);
      }
    };
    const closeManual = () => {
      const m = document.getElementById('manual-modal');
      if (m) m.classList.remove('active');
      this.manualHangarView.stopPreview();
    };
    const modalEl = document.getElementById('manual-modal');
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.id === 'btn-close-manual' || target.id === 'btn-close-manual-top' || target.closest('#btn-close-manual-top') || target.closest('#btn-close-manual')) {
          e.stopPropagation();
          e.preventDefault();
          closeManual();
        }
      });
    }
    const btnCloseTop = document.getElementById('btn-close-manual-top');
    if (btnCloseTop) btnCloseTop.onclick = closeManual;
    const btnCloseBottom = document.getElementById('btn-close-manual');
    if (btnCloseBottom) btnCloseBottom.onclick = closeManual;

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
          if (tabId === 'tab-fleet') {
            setTimeout(() => this.manualHangarView.startPreview(), 30);
          } else {
            this.manualHangarView.stopPreview();
          }
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
      document.getElementById('btn-menu-sound')!.innerText = muted ? '🔇' : '🔊';
      const matchSound = document.getElementById('btn-match-sound');
      if (matchSound) matchSound.innerText = muted ? '🔇' : '🔊';
    };

    // Fullscreen Toggle in Lobby & Pause Menu
    const btnFsLobby = document.getElementById('btn-fullscreen-toggle');
    if (btnFsLobby) {
      btnFsLobby.onclick = () => this.toggleFullscreen();
    }
    const btnFsPause = document.getElementById('btn-pause-fullscreen');
    if (btnFsPause) {
      btnFsPause.onclick = () => this.toggleFullscreen();
    }

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

    this.manualHangarView.updateStatsUI();
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

    // Analog Touch Thrust Option (Persistent)
    const chkAnalogThrust = document.getElementById('chk-opt-analog-thrust') as HTMLInputElement | null;
    if (chkAnalogThrust) {
      chkAnalogThrust.checked = this.input.enableAnalogThrust;
      chkAnalogThrust.onchange = () => {
        this.input.enableAnalogThrust = chkAnalogThrust.checked;
        try { localStorage.setItem('wh_opt_analog_thrust', chkAnalogThrust.checked.toString()); } catch {}
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

    // Glow Intensity Slider (Persistent)
    const glowSlider = document.getElementById('opt-glow-slider') as HTMLInputElement | null;
    const glowVal = document.getElementById('opt-glow-val');
    const savedGlow = localStorage.getItem('wh_opt_glow');
    const initialGlow = savedGlow !== null ? parseFloat(savedGlow) : 1.0;
    if (glowSlider) {
      glowSlider.value = initialGlow.toString();
      if (glowVal) {
        glowVal.innerText = initialGlow === 0 ? 'OFF' : `${Math.round(initialGlow * 100)}%`;
      }
      glowSlider.oninput = () => {
        const val = parseFloat(glowSlider.value);
        if (glowVal) {
          glowVal.innerText = val === 0 ? 'OFF' : `${Math.round(val * 100)}%`;
        }
        this.applyGlowIntensity(val);
        try { localStorage.setItem('wh_opt_glow', val.toString()); } catch {}
      };
    }

    // Particle Lifespan & Trail Duration Slider (Persistent, 0x to 10x)
    const particleSlider = document.getElementById('opt-particle-slider') as HTMLInputElement | null;
    const particleVal = document.getElementById('opt-particle-val');
    const savedParticleScale = localStorage.getItem('wh_opt_particle_scale');
    const initialParticleScale = savedParticleScale !== null ? parseFloat(savedParticleScale) : 1.0;
    if (particleSlider) {
      particleSlider.value = initialParticleScale.toString();
      if (particleVal) {
        particleVal.innerText = `${initialParticleScale.toFixed(1)}x`;
      }
      particleSlider.oninput = () => {
        const val = parseFloat(particleSlider.value);
        if (particleVal) {
          particleVal.innerText = `${val.toFixed(1)}x`;
        }
        this.particles.durationScale = val;
        try { localStorage.setItem('wh_opt_particle_scale', val.toString()); } catch {}
      };
    }

    // Dual-Stroke Geometry Wars Bloom Toggle (Persistent)
    const chkDualBloom = document.getElementById('chk-opt-dual-bloom') as HTMLInputElement | null;
    const savedDualBloom = localStorage.getItem('wh_opt_dual_bloom');
    if (chkDualBloom) {
      if (savedDualBloom !== null) {
        chkDualBloom.checked = savedDualBloom === 'true';
      }
      chkDualBloom.onchange = () => {
        this.renderer.setDualStrokeBloom(chkDualBloom.checked);
        if ((this.manualHangarView as any).renderer) (this.manualHangarView as any).renderer.setDualStrokeBloom(chkDualBloom.checked);
        if ((this.modalHangarView as any).renderer) (this.modalHangarView as any).renderer.setDualStrokeBloom(chkDualBloom.checked);
        try { localStorage.setItem('wh_opt_dual_bloom', chkDualBloom.checked.toString()); } catch {}
      };
    }

    // Retro Ambient Vector Grid Toggle (Persistent)
    const chkVectorGrid = document.getElementById('chk-opt-vector-grid') as HTMLInputElement | null;
    const savedVectorGrid = localStorage.getItem('wh_opt_vector_grid');
    if (chkVectorGrid) {
      if (savedVectorGrid !== null) {
        chkVectorGrid.checked = savedVectorGrid === 'true';
      }
      chkVectorGrid.onchange = () => {
        this.starfield.showVectorGrid = chkVectorGrid.checked;
        try { localStorage.setItem('wh_opt_vector_grid', chkVectorGrid.checked.toString()); } catch {}
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

    const pilotSelect = document.getElementById('spawner-pilot-select') as HTMLSelectElement;
    if (pilotSelect) {
      pilotSelect.value = this.playerPilotMode;
      pilotSelect.onchange = () => {
        this.playerPilotMode = (pilotSelect.value || 'human') as any;
        if (this.playerPilotMode !== 'human') {
          if (!this.playerBotController) {
            this.playerBotController = new BotController(this.playerPilotMode);
          } else {
            this.playerBotController.difficulty = this.playerPilotMode;
          }
          this.showAlert(`AUTOPILOT // PLAYER 1 SET TO AI (${this.playerPilotMode.toUpperCase()})`);
          this.addChatLog(`[TEST] Player 1 switched to AI (${this.playerPilotMode.toUpperCase()})`, 'system');
        } else {
          this.showAlert('AUTOPILOT // PLAYER 1 SET TO MANUAL (HUMAN)');
          this.addChatLog('[TEST] Player 1 switched to Manual (Human)', 'system');
        }
      };
    }

    const openSpawner = () => {
      populateTargets();
      if (pilotSelect) pilotSelect.value = this.playerPilotMode;
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

    const btnCloseSpawnerTop = document.getElementById('btn-close-spawner-top');
    if (btnCloseSpawnerTop) btnCloseSpawnerTop.onclick = closeSpawner;

    // Wormhole Powerup Ejection buttons
    const pupBtns = document.querySelectorAll('#spawner-pups-grid .pup-eject-btn');
    pupBtns.forEach((btn) => {
      (btn as HTMLButtonElement).onclick = () => {
        const rawType = parseInt((btn as HTMLElement).dataset.puptype || '-1', 10);
        const targetSlot = parseInt(targetSelect?.value || '0', 10);
        const name = rawType >= 0 ? (POWERUP_NAMES[rawType] || `POWERUP #${rawType}`) : 'RANDOM POWERUP';

        if (targetSlot === 0) {
          // Eject from local player's wormhole
          const wh = this.wormholes[0];
          if (wh) {
            wh.forceEjectPowerup(this.powerups, this.particles, this.sound, rawType >= 0 ? rawType : undefined);
          } else {
            const pup = rawType >= 0 ? new Powerup(this.player.x, this.player.y - 120, rawType) : Powerup.spawnRandom(this.player.x, this.player.y - 120);
            this.powerups.push(pup);
            this.sound.playPowerup();
          }
          this.showAlert(`EJECTED // ${name.toUpperCase()} FROM WORMHOLE`);
          this.addChatLog(`[TEST] Ejected ${name} from Wormhole`, 'system');
        } else {
          // Eject into chosen opponent's realm
          this.simulatedRealm.receiveHazardFromPlayer1(rawType >= 0 ? rawType : 0, targetSlot);
          const oppName = this.tablePlayers[targetSlot]?.name || `OPPONENT ${targetSlot + 1}`;
          this.showAlert(`SPAWNED // ${name.toUpperCase()} -> ${oppName.toUpperCase()}`);
          this.addChatLog(`[TEST] Sent ${name} -> ${oppName}'s Realm`, 'system');
          this.sound.playSpecial(1);
        }
      };
    });

    const grid = document.getElementById('spawner-btn-grid');
    if (grid) {
      grid.innerHTML = '';
      for (let type = 6; type <= 19; type++) {
        const btn = document.createElement('button');
        btn.className = 'arena-btn';
        btn.style.padding = '6px 6px';
        btn.style.fontSize = '9.5px';
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
            this.addChatLog(`[TEST] Spawned ${name} in Your Realm`, 'system');
          } else {
            // Spawn in chosen opponent's realm
            this.simulatedRealm.receiveHazardFromPlayer1(type, targetSlot);
            const oppName = this.tablePlayers[targetSlot]?.name || `OPPONENT ${targetSlot + 1}`;
            this.showAlert(`SPAWNED // ${name} -> ${oppName.toUpperCase()}`);
            this.addChatLog(`[TEST] Spawned ${name} in ${oppName}'s Realm`, 'system');
          }
          this.sound.playSpecial(1);
        };

        grid.appendChild(btn);
      }
    }
  }

  public applyGlowIntensity(intensity: number): void {
    if (this.renderer) {
      this.renderer.setGlowIntensity(intensity);
    }
    if (this.pipRenderer) {
      this.pipRenderer.setGlowIntensity(intensity);
    }
    if (this.manualHangarView && (this.manualHangarView as any).renderer) {
      (this.manualHangarView as any).renderer.setGlowIntensity(intensity);
    }
    if (this.modalHangarView && (this.modalHangarView as any).renderer) {
      (this.modalHangarView as any).renderer.setGlowIntensity(intensity);
    }
  }

  public selectColor(colorIndex: number): void {
    const newColor = (colorIndex + PLAYER_COLORS.length) % PLAYER_COLORS.length;
    this.selectedColorIndex = newColor;
    try {
      localStorage.setItem('wh_selected_color', newColor.toString());
    } catch {}

    // 1. Ensure all participant colors are strictly unique
    // Collect all colors used by player and peers/bots
    const usedColors = new Set<number>();
    usedColors.add(newColor); // Local player takes newColor

    for (let i = 1; i < 8; i++) {
      const p = this.tablePlayers[i];
      if (!p) continue;
      // Get current participant's color index
      let pColorIdx = PLAYER_COLORS.findIndex(
        (c) => c.primary.toLowerCase() === p.color.toLowerCase()
      );
      if (pColorIdx === -1) pColorIdx = p.slot % PLAYER_COLORS.length;

      // If conflict with player's new color or another already-allocated color
      if (usedColors.has(pColorIdx)) {
        // Find first free unused color index [0..7]
        let freeIdx = -1;
        for (let c = 0; c < PLAYER_COLORS.length; c++) {
          if (!usedColors.has(c)) {
            freeIdx = c;
            break;
          }
        }
        if (freeIdx !== -1) {
          p.color = PLAYER_COLORS[freeIdx].primary;
          usedColors.add(freeIdx);
          // If this is a bot simulated in simulatedRealm, update its botShip slot & color
          const realm = this.simulatedRealm.botRealms.get(p.slot);
          if (realm && realm.botShip) {
            realm.botShip.slot = freeIdx;
          }
        }
      } else {
        usedColors.add(pColorIdx);
      }
    }

    // 2. Update local player ship color & tablePlayer color (preserving seat slot 0)
    this.player.colorIndex = newColor;
    if (this.tablePlayers[0]) {
      this.tablePlayers[0].color = PLAYER_COLORS[newColor].primary;
    }

    // 3. Update Staging Hangar 3D preview mesh
    this.modalHangarView.setColor(newColor);

    // 4. Update UI color swatches across all screens
    this.syncColorSelectionUI(newColor);

    // 5. Update Wormholes and Roster UI
    this.rebuildTableWormholes();
    this.updateTableRosterUI();
  }

  private buildColorSwatches(): void {
    const hangarColorBar = document.getElementById('hangar-color-bar');
    const modalRoundColorBar = document.getElementById('modal-round-color-bar');
    const modalMatchColorBar = document.getElementById('modal-match-color-bar');

    if (hangarColorBar) hangarColorBar.innerHTML = '';
    if (modalRoundColorBar) modalRoundColorBar.innerHTML = '';
    if (modalMatchColorBar) modalMatchColorBar.innerHTML = '';

    PLAYER_COLORS.forEach((profile, index) => {
      const createSwatch = (container: HTMLElement | null) => {
        if (!container) return;
        const btn = document.createElement('button');
        btn.className = `color-swatch-btn ${index === this.selectedColorIndex ? 'active' : ''}`;
        btn.style.backgroundColor = profile.primary;
        btn.style.color = profile.primary;
        btn.title = profile.name;
        btn.dataset.colorIndex = index.toString();
        btn.onclick = () => {
          this.selectColor(index);
          this.sound.playPowerup();
        };
        container.appendChild(btn);
      };

      createSwatch(hangarColorBar);
      createSwatch(modalRoundColorBar);
      createSwatch(modalMatchColorBar);
    });

    this.syncColorSelectionUI(this.selectedColorIndex);
  }

  private syncColorSelectionUI(selectedIndex: number): void {
    document.querySelectorAll('.color-swatch-btn').forEach((btn) => {
      const idx = parseInt((btn as HTMLElement).dataset.colorIndex || '0', 10);
      btn.classList.toggle('active', idx === selectedIndex);
    });
  }

  private buildShipGrid(): void {
    this.buildColorSwatches();

    const manualShipBar = document.getElementById('manual-ship-bar');
    const modalRoundBar = document.getElementById('modal-round-ship-bar');
    const modalMatchBar = document.getElementById('modal-match-ship-bar');
    if (manualShipBar) manualShipBar.innerHTML = '';
    if (modalRoundBar) modalRoundBar.innerHTML = '';
    if (modalMatchBar) modalMatchBar.innerHTML = '';

    const ships = ShipCatalog.getAll();
    const subLabels = ['TANK', 'WING', 'SQUID', 'RABBIT', 'TURTLE', 'FLASH', 'HUNTER', 'FLAGSHIP'];
    const isRestrictedToClassic = this.currentMatchConfig && this.currentMatchConfig.shipRestriction === 'STANDARD';

    ships.forEach((ship, index) => {
      const isUnlocked = ShipCatalog.isShipUnlocked(index, this.totalMatchWins);

      // 1. Guide Flight Manual Hangar selector (free showcase browsing of all 8 classes)
      if (manualShipBar) {
        const mBtn = document.createElement('button');
        mBtn.className = `modal-ship-btn ${index === this.manualHangarView.selectedShipIndex ? 'active' : ''}`;
        mBtn.innerText = subLabels[index];
        mBtn.title = `${ship.config.name} (${ship.config.subtitle || ''})`;
        mBtn.dataset.shipIndex = index.toString();
        mBtn.onclick = () => {
          this.manualHangarView.setShip(index);
          this.syncShipSelectionUI(this.selectedShipIndex);
        };
        manualShipBar.appendChild(mBtn);
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
          this.syncShipSelectionUI(index);
          this.addChatLog(`Switched ship class -> ${ship.config.name}`, 'player');
        };
        container.appendChild(mBtn);
      };

      createModalBtn(modalRoundBar);
      createModalBtn(modalMatchBar);
    });

    this.modalHangarView.setShip(this.selectedShipIndex);
    this.manualHangarView.updateStatsUI();
  }

  private syncShipSelectionUI(selectedIndex: number): void {
    document.querySelectorAll('#manual-ship-bar .modal-ship-btn').forEach((btn) => {
      const idx = parseInt((btn as HTMLElement).dataset.shipIndex || '0', 10);
      btn.classList.toggle('active', idx === this.manualHangarView.selectedShipIndex);
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

        const teamBtn = target.closest('.btn-toggle-team') as HTMLElement | null;
        if (teamBtn && teamBtn.dataset.slot && (this.isLanMatchHost || !this.network.isConnected)) {
          e.stopPropagation();
          e.preventDefault();
          const slot = parseInt(teamBtn.dataset.slot, 10);
          const p = this.tablePlayers[slot];
          if (p) {
            p.team = p.team === 'A' ? 'B' : 'A';
            this.rebuildTableWormholes();
            this.updateTableRosterUI();
            this.broadcastRosterSync();
          }
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

    let firstOpponent: TablePlayer | null = null;
    let botCount = 0;
    let occupiedCount = 0;
    const isTeamMode = this.currentMatchConfig?.matchType === 'TEAM';

    const renderCard = (p: TablePlayer, slot: number) => {
      occupiedCount++;
      if (p.isBot) botCount++;
      if (!p.isLocal && !firstOpponent) {
        firstOpponent = p;
      }
      const isSelectedInPip = slot === this.selectedOpponentSlot;
      const card = document.createElement('div');
      card.className = `roster-card occupied ${isSelectedInPip ? 'selected' : ''}`;
      card.dataset.slot = slot.toString();
      card.style.setProperty('--slot-color', p.color);
      if (p.isSpectating) {
        card.style.opacity = '0.55';
      }
      const hpPct = Math.max(0, Math.min(100, (p.health / p.maxHealth) * 100));
      const pilotTypeIcon = p.isBot
        ? `<span class="roster-pilot-icon bot" title="Computer Bot" style="display: inline-flex; align-items: center; margin-right: 5px; vertical-align: middle; color: var(--neon-cyan); flex-shrink: 0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h6l-2 3v1h8v-1l-2-3h6c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 10H4V5h16v8z"/><circle cx="12" cy="9" r="1.5"/></svg></span>`
        : `<span class="roster-pilot-icon human" title="Human Pilot" style="display: inline-flex; align-items: center; margin-right: 5px; vertical-align: middle; color: #ffffff; flex-shrink: 0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>`;

      const waitingBadge = p.isSpectating
        ? `<span style="font-size: 8px; color: #ffaa00; font-weight: 900; border: 1px solid rgba(255, 170, 0, 0.5); background: rgba(255, 170, 0, 0.15); padding: 1px 4px; border-radius: 3px; margin-left: 4px;">WAITING</span>`
        : '';

      const swapTeamBtn = isTeamMode && (this.isLanMatchHost || !this.network.isConnected)
        ? `<button class="btn-toggle-team" data-slot="${slot}" title="Swap Faction (Alpha / Omega)" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.25); color: #cbd5e1; font-family: 'Orbitron', sans-serif; font-size: 8px; font-weight: 900; padding: 1px 4px; border-radius: 3px; cursor: pointer; line-height: 1;">⇄</button>`
        : '';

      card.innerHTML = `
        <div class="roster-card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="roster-player-name" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 155px; display: flex; align-items: center;">${pilotTypeIcon}${p.name}${waitingBadge}</span>
          <div style="display: flex; align-items: center; gap: 4px;">
            ${swapTeamBtn}
            <span class="roster-player-stats">W: ${p.wins}</span>
            ${p.isBot && (this.isLanMatchHost || !this.network.isConnected) ? `<button class="btn-remove-bot" data-slot="${slot}" title="Remove Bot" style="background: rgba(255, 0, 80, 0.25); border: 1px solid #ff0055; color: #ff0055; font-family: 'Orbitron', sans-serif; font-size: 8px; font-weight: 900; padding: 1px 4px; border-radius: 3px; cursor: pointer; line-height: 1;">✕</button>` : ''}
          </div>
        </div>
        <div class="roster-health-track">
          <div class="roster-health-fill" style="width: ${hpPct}%;"></div>
        </div>
      `;

      return card;
    };

    if (isTeamMode) {
      const teamAPlayers: { p: TablePlayer; slot: number }[] = [];
      const teamBPlayers: { p: TablePlayer; slot: number }[] = [];

      for (let i = 0; i < 8; i++) {
        const p = this.tablePlayers[i];
        if (p) {
          if (p.team === 'A') {
            teamAPlayers.push({ p, slot: i });
          } else {
            teamBPlayers.push({ p, slot: i });
          }
        }
      }

      // 1. Team Alpha Header & Cards
      const headerA = document.createElement('div');
      headerA.className = 'team-group-header';
      headerA.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 3px 7px; margin: 3px 0 5px 0; background: rgba(0, 229, 255, 0.12); border-left: 3px solid #00e5ff; border-radius: 4px; font-family: "Orbitron", sans-serif; font-size: 9px; font-weight: 900; color: #00e5ff; letter-spacing: 1px;';
      headerA.innerHTML = `<span>⚡ TEAM ALPHA (α)</span><span style="font-size: 8px; opacity: 0.85;">${teamAPlayers.length} PILOT${teamAPlayers.length === 1 ? '' : 'S'}</span>`;
      rosterList.appendChild(headerA);

      teamAPlayers.forEach(({ p, slot }) => {
        rosterList.appendChild(renderCard(p, slot));
      });

      // 2. Team Omega Header & Cards
      const headerB = document.createElement('div');
      headerB.className = 'team-group-header';
      headerB.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 3px 7px; margin: 8px 0 5px 0; background: rgba(192, 64, 255, 0.12); border-left: 3px solid #c040ff; border-radius: 4px; font-family: "Orbitron", sans-serif; font-size: 9px; font-weight: 900; color: #c040ff; letter-spacing: 1px;';
      headerB.innerHTML = `<span>🔮 TEAM OMEGA (Ω)</span><span style="font-size: 8px; opacity: 0.85;">${teamBPlayers.length} PILOT${teamBPlayers.length === 1 ? '' : 'S'}</span>`;
      rosterList.appendChild(headerB);

      teamBPlayers.forEach(({ p, slot }) => {
        rosterList.appendChild(renderCard(p, slot));
      });
    } else {
      // Standard Free-For-All Roster
      for (let i = 0; i < 8; i++) {
        const p = this.tablePlayers[i];
        if (p) {
          rosterList.appendChild(renderCard(p, i));
        }
      }
    }

    // Host vs Peer Button & Controls Configuration
    const isSolo = !this.isLanMatchClient && !this.isLanMatchHost && !this.network.isConnected;
    const isPeerClient = this.isLanMatchClient || (!this.isLanMatchHost && this.network.isConnected);

    const btnStart = document.getElementById('btn-match-start') || document.getElementById('btn-table-start');
    const btnPauseStart = document.getElementById('btn-pause-start-match');
    const botAdder = document.querySelector('.arena-bot-adder') as HTMLElement | null;
    const pauseBotAdder = document.getElementById('btn-pause-add-bot');

    if (isPeerClient) {
      if (btnStart) btnStart.style.display = 'none';
      if (btnPauseStart) btnPauseStart.style.display = 'none';
      if (botAdder) botAdder.style.display = 'none';
      if (pauseBotAdder) pauseBotAdder.style.display = 'none';
    } else {
      if (btnStart) btnStart.style.display = 'block';
      if (btnPauseStart) btnPauseStart.style.display = 'block';
      if (botAdder) botAdder.style.display = 'flex';
      if (pauseBotAdder) pauseBotAdder.style.display = 'block';

      const isCombatActive = this.gameState.phase === 'PLAYING' || this.gameState.phase === 'COUNTDOWN';
      if (isCombatActive) {
        if (btnStart) {
          btnStart.innerText = '🔄 RESTART MATCH';
          btnStart.style.borderColor = 'rgba(255, 170, 0, 0.6)';
          btnStart.style.color = '#ffaa00';
        }
        if (btnPauseStart) {
          btnPauseStart.innerText = '🔄 RESTART MATCH';
        }
      } else {
        if (btnStart) {
          btnStart.innerText = '⚡ START MATCH';
          btnStart.style.borderColor = 'rgba(0, 255, 136, 0.5)';
          btnStart.style.color = '#00ff88';
        }
        if (btnPauseStart) {
          btnPauseStart.innerText = '⚡ START MATCH';
        }
      }
    }

    // Toggle PiP mini-cam bot feed visibility & Test controls (Active for solo play or when Host enabled Test Mode)
    const isHostTestMode = this.isLanMatchHost && !!this.currentMatchConfig?.isTestMode;
    const showTestFeatures = isSolo || isHostTestMode;

    const btnSpawner = document.getElementById('btn-match-spawner');
    if (btnSpawner) {
      btnSpawner.style.display = showTestFeatures ? 'block' : 'none';
    }

    const pipCard = document.getElementById('pip-camera-card');
    if (pipCard) {
      const hasBots = botCount > 0 || this.simulatedRealm.botRealms.size > 0;
      pipCard.style.display = (showTestFeatures && hasBots) ? 'flex' : 'none';
    }

    const pipNameEl = document.getElementById('pip-opponent-name');
    if (pipNameEl) {
      const currentOpp = this.tablePlayers[this.selectedOpponentSlot];
      if (currentOpp && !currentOpp.isLocal) {
        pipNameEl.innerText = `FEED // ${currentOpp.name.toUpperCase()}`;
      } else if (firstOpponent) {
        pipNameEl.innerText = `FEED // ${(firstOpponent as TablePlayer).name.toUpperCase()}`;
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
    const isRestrictedToClassic = this.currentMatchConfig && this.currentMatchConfig.shipRestriction === 'STANDARD';
    if (isRestrictedToClassic && index > 2) {
      this.showAlert('SHIP RESTRICTION: MATCH IS SET TO STANDARD SHIPS ONLY');
      return;
    }

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
      this.isMobile = this.checkIsMobile();
      if (this.isMobile) {
        document.body.classList.add('is-mobile');
        this.zoom = 1.35;
      } else {
        document.body.classList.remove('is-mobile');
        this.zoom = 1.65;
      }
      this.renderer.resize();
      if (this.pipRenderer) this.pipRenderer.resize();
    });

    this.setupMobileControls();

    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
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
          this.manualHangarView.setShip(idx);
          this.modalHangarView.setShip(idx);
          this.syncShipSelectionUI(idx);
        }
      } else if (e.key === 'm' || e.key === 'M') {
        this.sound.toggleMute();
      } else if (e.key === 'Backspace' && this.inArena && this.player.isAlive && this.gameState.phase === 'PLAYING') {
        this.player.health = 0;
        this.player.isAlive = false;
        const myColor = this.getPlayerColor(this.player.slot);
        this.particles.createExplosion(this.player.x, this.player.y, myColor, 45);
        this.particles.createExplosion(this.player.x, this.player.y, '#ffffff', 25);
        this.sound.playExplosion(true);
        this.sound.playSpecial(1);
        this.addChatLog('Self-destruct executed!', 'player', myColor);
        this.handlePlayerElimination();
      }
    });
  }

  private setupMobileControls(): void {
    const steerZone = document.getElementById('mob-steer-zone');
    if (steerZone) {
      this.input.setupTouchSteerZone(steerZone, () => this.player.angle);
    }
    this.input.bindTouchButton('btn-touch-fire', 'fire');
    this.input.bindTouchButton('btn-touch-launch', 'secondaryFire');
    this.input.bindTouchButton('btn-touch-special', 'tertiaryFire');

    const btnMobilePause = document.getElementById('btn-mobile-pause');
    if (btnMobilePause) {
      btnMobilePause.onclick = () => {
        const pauseModal = document.getElementById('pause-modal');
        if (pauseModal) {
          pauseModal.classList.add('active');
          this.sound.playClick();
        }
      };
    }

    const btnMobFs = document.getElementById('btn-mob-fullscreen');
    if (btnMobFs) {
      btnMobFs.onclick = () => this.toggleFullscreen();
    }

    const btnPauseStart = document.getElementById('btn-pause-start-match');
    if (btnPauseStart) {
      btnPauseStart.onclick = () => {
        document.getElementById('pause-modal')?.classList.remove('active');
        const startBtn = document.getElementById('btn-match-start') || document.getElementById('btn-table-start');
        if (startBtn) startBtn.click();
      };
    }

    const btnPauseAddBot = document.getElementById('btn-pause-add-bot');
    const pauseBotDiff = document.getElementById('pause-bot-diff') as HTMLSelectElement | null;
    if (btnPauseAddBot && pauseBotDiff) {
      btnPauseAddBot.onclick = () => {
        const diff = (pauseBotDiff.value || 'medium') as BotDifficulty;
        this.addBotToTable(diff);
        this.sound.playClick();
      };
    }

    // Mobile Chat Drawer
    const btnMobChatToggle = document.getElementById('btn-mob-chat-toggle');
    const mobChatDrawer = document.getElementById('mob-chat-drawer');
    const mobChatInput = document.getElementById('mob-chat-input') as HTMLInputElement | null;
    const btnMobChatSend = document.getElementById('btn-mob-chat-send');

    if (btnMobChatToggle && mobChatDrawer) {
      const toggleDrawer = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        const isHidden = mobChatDrawer.style.display === 'none' || !mobChatDrawer.style.display;
        mobChatDrawer.style.display = isHidden ? 'flex' : 'none';
        // Do NOT auto-focus to prevent unprompted keyboard popups on mobile
      };
      btnMobChatToggle.onclick = toggleDrawer;
      btnMobChatToggle.onpointerdown = toggleDrawer;
    }

    if (mobChatDrawer) {
      mobChatDrawer.onpointerdown = (e) => e.stopPropagation();
      mobChatDrawer.ontouchstart = (e) => e.stopPropagation();
    }

    // Tapping elsewhere on screen closes the mobile chat drawer
    window.addEventListener('pointerdown', (e) => {
      if (!this.isMobile || !mobChatDrawer || mobChatDrawer.style.display === 'none') return;
      const target = e.target as HTMLElement | null;
      if (target && (mobChatDrawer.contains(target) || btnMobChatToggle?.contains(target))) {
        return;
      }
      mobChatDrawer.style.display = 'none';
      if (mobChatInput) mobChatInput.blur();
    });

    const sendMobChat = (e?: Event) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (!mobChatInput || !mobChatInput.value.trim()) return;
      const msg = mobChatInput.value.trim();
      mobChatInput.value = '';
      if (mobChatDrawer) mobChatDrawer.style.display = 'none';
      if (mobChatInput) mobChatInput.blur();
      const myColor = this.getPlayerColor(this.player.slot);
      this.addChatLog(`${this.playerName}: ${msg}`, 'player', myColor);

      if (this.currentMatchConfig && (this.isLanMatchHost || this.isLanMatchClient)) {
        this.sendLanPacket({
          type: 'MATCH_PACKET',
          matchId: this.currentMatchConfig.id,
          fromSlot: this.player.slot,
          packet: {
            type: 'CHAT_MSG',
            senderName: this.playerName,
            senderSlot: this.player.slot,
            message: msg,
          },
        });
      }
    };

    if (btnMobChatSend) btnMobChatSend.onclick = sendMobChat;
    if (mobChatInput) {
      mobChatInput.onkeydown = (e) => {
        if (e.key === 'Enter') sendMobChat();
      };
    }
  }

  public toggleFullscreen(): void {
    const doc = document as any;
    const docEl = document.documentElement as any;

    const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    if (!isFullscreen) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
      // Attempt orientation lock to landscape on supported devices
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch {}
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
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

    let inputState = this.input.getState();

    // AI Autopilot mode for Player 1 ship (configured via Test Hazards menu)
    if (this.playerPilotMode !== 'human' && this.player.isAlive) {
      if (!this.playerBotController) {
        this.playerBotController = new BotController(this.playerPilotMode);
      } else {
        this.playerBotController.difficulty = this.playerPilotMode;
      }
      inputState = this.playerBotController.update(
        dt,
        this.player,
        this.wormholes,
        this.powerups,
        this.bullets,
        this.hazardManager.hazards,
        this.hazardManager.mines
      );
    }

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

    // 2. Update Simulated AI Realms (Authoritative: ONLY active on Host or Singleplayer during PLAYING phase)
    const isHostOrSolo = this.isLanMatchHost || (!this.isLanMatchClient && !this.network.isConnected);
    if (isHostOrSolo) {
      const isRoundActive = this.gameState.phase === 'PLAYING' && !this.isMatchWaitingForPilots;
      this.simulatedRealm.update(dt, this.sound, isRoundActive);

      let anyOpponentAlive = false;
      let hasOpponents = false;
      const roundGraceElapsed = Date.now() - this.roundStartTime > 1000;

      for (let i = 1; i < 8; i++) {
        if (this.tablePlayers[i] && this.tablePlayers[i]!.isBot) {
          hasOpponents = true;
          const realm = this.simulatedRealm.botRealms.get(i);
          if (realm) {
            const wasAlive = this.tablePlayers[i]!.isAlive;
            this.tablePlayers[i]!.health = realm.botShip.health;
            this.tablePlayers[i]!.maxHealth = realm.botShip.maxHealth;
            this.tablePlayers[i]!.isAlive = realm.botShip.isAlive;
            if (wasAlive && !realm.botShip.isAlive && roundGraceElapsed && this.gameState.phase === 'PLAYING') {
              this.handleBotElimination(i);
            }
            if (realm.botShip.isAlive) {
              anyOpponentAlive = true;
            }
          }
        }
      }

      // Continuous Victory Watchdog for Host/Solo: If all opponents are eliminated while player lives
      if (
        this.gameState.phase === 'PLAYING' &&
        !this.isMatchWaitingForPilots &&
        roundGraceElapsed &&
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

    // 3. Heartbeat Reaper on Host (clean up abruptly disconnected peers)
    if (this.isLanMatchHost && this.currentMatchConfig && this.inArena) {
      this.heartbeatReaperTimer += dt;
      if (this.heartbeatReaperTimer >= 1.5) {
        this.heartbeatReaperTimer = 0;
        const now = Date.now();
        let changed = false;

        for (let i = 1; i < 8; i++) {
          const p = this.tablePlayers[i];
          if (p && !p.isLocal && !p.isBot) {
            const lastSeen = this.playerLastSeen.get(i) || this.roundStartTime || now;
            if (now - lastSeen > 7000) {
              // Stale peer timed out
              const name = p.name;
              this.tablePlayers[i] = null;
              this.playerLastSeen.delete(i);
              const victimWh = this.wormholes.find((w) => w.slot === i);
              if (victimWh) {
                victimWh.killSelf(this.particles, this.sound);
              }
              this.addChatLog(`${name} timed out / disconnected.`, 'system');
              changed = true;
            }
          }
        }

        if (changed) {
          const activeCount = this.tablePlayers.filter((p) => p !== null).length;
          this.currentMatchConfig.currentPlayers = activeCount;
          const matchInList = this.lobbyMatches.find((m) => m.id === this.currentMatchConfig!.id);
          if (matchInList) {
            matchInList.currentPlayers = activeCount;
          }
          this.rebuildTableWormholes();
          this.updateTableRosterUI();
          this.broadcastMatches();
          this.broadcastRosterSync();
        }
      }
    }

    // 4. Lightweight Health & Telemetry Sync (2Hz heartbeat, zero continuous PiP streaming)
    if (this.inArena && this.currentMatchConfig && (this.isLanMatchHost || this.isLanMatchClient)) {
      this.snapshotTimer += dt;
      if (this.snapshotTimer >= 0.5) {
        this.snapshotTimer = 0;

        // Broadcast local player health & heartbeat
        this.sendLanPacket({
          type: 'MATCH_PACKET',
          matchId: this.currentMatchConfig.id,
          fromSlot: this.player.slot,
          packet: {
            type: 'HEALTH_SYNC',
            slot: this.player.slot,
            hp: this.player.health,
            maxHp: this.player.maxHealth,
            isAlive: this.player.isAlive,
          },
        });

        // Host authoritatively broadcasts health for all simulated bots
        if (this.isLanMatchHost) {
          for (const [bSlot, realm] of this.simulatedRealm.botRealms.entries()) {
            this.sendLanPacket({
              type: 'MATCH_PACKET',
              matchId: this.currentMatchConfig.id,
              fromSlot: bSlot,
              packet: {
                type: 'HEALTH_SYNC',
                slot: bSlot,
                hp: realm.botShip.health,
                maxHp: realm.botShip.maxHealth,
                isAlive: realm.botShip.isAlive,
              },
            });
          }
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
          !pup.isInvulnerable &&
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
        if (!wh.isAlive) continue;
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

                const targetPlayer = this.tablePlayers[targetWh.slot];
                const isTargetBot = targetPlayer ? targetPlayer.isBot : (!this.isLanMatchClient && !this.isLanMatchHost && !this.network.isConnected);

                if (isTargetBot || (!this.isLanMatchClient && !this.isLanMatchHost && !this.network.isConnected)) {
                  this.simulatedRealm.receiveHazardFromPlayer1(hazardType, targetWh.slot);
                } else {
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
                  }
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
          if (!wh.isAlive) continue;
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

    // 5. Update Streamlined Mobile HUD
    if (this.isMobile) {
      const mobHpFill = document.getElementById('mob-hp-fill');
      if (mobHpFill) mobHpFill.style.width = `${hpRatio * 100}%`;
      const mobCallsign = document.getElementById('mob-callsign');
      if (mobCallsign) mobCallsign.innerText = this.playerName;
      const mobShipName = document.getElementById('mob-ship-name');
      if (mobShipName) mobShipName.innerText = this.player.compiled.config.name.toUpperCase();

      const isTeamMode = this.currentMatchConfig?.matchType === 'TEAM';
      const mobTeamBadge = document.getElementById('mob-team-badge');
      if (mobTeamBadge) {
        if (isTeamMode) {
          mobTeamBadge.style.display = 'inline-block';
          const myTeam = this.tablePlayers[this.player.slot]?.team || 'A';
          if (myTeam === 'A') {
            mobTeamBadge.style.color = '#00e5ff';
            mobTeamBadge.style.borderColor = '#00e5ff';
            mobTeamBadge.style.background = 'rgba(0, 229, 255, 0.2)';
            mobTeamBadge.innerText = 'TEAM α';
          } else {
            mobTeamBadge.style.color = '#df70ff';
            mobTeamBadge.style.borderColor = '#df70ff';
            mobTeamBadge.style.background = 'rgba(223, 112, 255, 0.2)';
            mobTeamBadge.innerText = 'TEAM Ω';
          }
        } else {
          mobTeamBadge.style.display = 'none';
        }
      }

      const mobGun = document.getElementById('mob-hud-gun');
      if (mobGun) mobGun.innerText = `G${this.player.bulletLevel + 1}`;

      const mobRetros = document.getElementById('mob-hud-retros');
      if (mobRetros) {
        mobRetros.className = this.player.hasRetros ? 'mob-hud-badge retros-on' : 'mob-hud-badge';
      }

      const mobScore = document.getElementById('mob-score-display');
      if (mobScore) mobScore.innerText = `${this.gameState.player1Score} - ${this.gameState.player2Score}`;

      const btnTouchSpecial = document.getElementById('btn-touch-special');
      if (btnTouchSpecial) {
        btnTouchSpecial.style.display = this.player.specialType > 0 ? 'flex' : 'none';
      }

      for (let i = 0; i < 5; i++) {
        const mSlot = document.getElementById(`mob-slot-${i}`);
        if (!mSlot) continue;
        if (i < inv.length) {
          const type = inv[i];
          const info = badgeInfo[type] || { col: '#ff00ff' };
          mSlot.className = 'mob-pup-slot active';
          mSlot.style.backgroundColor = info.col;
          mSlot.style.borderColor = info.col;
        } else {
          mSlot.className = 'mob-pup-slot';
          mSlot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          mSlot.style.borderColor = 'rgba(0, 229, 255, 0.3)';
        }
      }

      // Update mobile mini roster strip
      const mobRosterStrip = document.getElementById('mob-roster-strip');
      if (mobRosterStrip) {
        let html = '';
        for (const p of this.tablePlayers) {
          if (!p) continue;
          if (p.slot === this.player.slot || p.isLocal) continue; // Filter out local player (already displayed in top-left cluster)
          const ratio = Math.max(0, Math.min(1, p.health / p.maxHealth));
          const isTeamA = p.team === 'A';
          const teamColor = isTeamA ? '#00e5ff' : '#df70ff';
          const teamPrefix = isTeamMode ? (isTeamA ? '[α] ' : '[Ω] ') : '';
          html += `
            <div class="mob-roster-pill" style="${p.isAlive ? '' : 'opacity: 0.4;'}; border-color: ${isTeamMode ? teamColor : 'rgba(0, 229, 255, 0.4)'};">
              <span style="${isTeamMode ? `color: ${teamColor}; font-weight: 800;` : ''}">${teamPrefix}${p.name || 'PILOT'}</span>
              <div class="mob-roster-hp"><div class="mob-roster-hp-fill" style="width: ${ratio * 100}%; background: ${p.isAlive ? '#00ff88' : '#ff3344'};"></div></div>
            </div>`;
        }
        mobRosterStrip.innerHTML = html;
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

        // =========================================================
        // PASS 1: STANDARD SOLID / BASE WIREFRAMES (source-over)
        // =========================================================
        const borderCol = (PLAYER_COLORS[this.selectedColorIndex] || PLAYER_COLORS[0]).primary;
        this.arenaRing.draw(this.renderer, borderCol);

        for (const wh of this.wormholes) {
          wh.draw(this.renderer);
        }

        for (const pup of this.powerups) {
          pup.draw(this.renderer);
        }

        this.hazardManager.draw(this.renderer);
        this.player.draw(this.renderer);

        // =========================================================
        // PASS 2: GLOBAL ADDITIVE BLOOM (Switched ONCE for glow/bullets/sparks)
        // =========================================================
        const ctx = this.renderer.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 1. Batched Bullets (All colors in unified passes - 0% blur stall)
        Bullet.drawAll(this.bullets, this.renderer);

        // 2. Missiles & Trails
        for (const m of this.missiles) {
          m.draw(this.renderer);
        }

        // 3. Batched Particles & Needle Sparks
        this.particles.drawDirect(this.renderer);

        ctx.restore(); // Switched back to source-over ONCE

        // =========================================================
        // PASS 3: FOREGROUND OVERLAYS & TEXT POPUPS (source-over)
        // =========================================================
        for (const pop of this.popups) {
          pop.draw(this.renderer);
        }

        this.renderer.popCamera();

        // =========================================================
        // PASS 4: OFF-SCREEN WORMHOLE DIRECTION CHEVRONS / ARROWS
        // =========================================================
        const w = this.renderer.width;
        const h = this.renderer.height;
        const cx = w / 2;
        const cy = h / 2;
        const margin = 36;

        const ctxScreen = this.renderer.ctx;

        for (const wh of this.wormholes) {
          if (!wh.isAlive) continue;

          // Convert wormhole world position to screen space
          const screenX = cx + (wh.x - this.camX) * this.zoom;
          const screenY = cy + (wh.y - this.camY) * this.zoom;

          // Check if wormhole center is off-screen
          const isOffscreen = screenX < margin || screenX > w - margin ||
                              screenY < margin || screenY > h - margin;

          if (isOffscreen) {
            const angle = Math.atan2(screenY - cy, screenX - cx);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const halfW = cx - margin;
            const halfH = cy - margin;

            const scaleX = cos !== 0 ? Math.abs(halfW / cos) : Infinity;
            const scaleY = sin !== 0 ? Math.abs(halfH / sin) : Infinity;
            const scale = Math.min(scaleX, scaleY);

            const arrowX = cx + cos * scale;
            const arrowY = cy + sin * scale;

            const ownerColor = (PLAYER_COLORS[wh.slot] || PLAYER_COLORS[0]).primary;
            const pulse = 0.85 + Math.sin(Date.now() * 0.007 + wh.slot * 1.5) * 0.15;

            ctxScreen.save();
            ctxScreen.translate(arrowX, arrowY);
            ctxScreen.rotate(angle);

            // Outer glowing neon chevron
            ctxScreen.shadowColor = ownerColor;
            ctxScreen.shadowBlur = 12;
            ctxScreen.strokeStyle = ownerColor;
            ctxScreen.fillStyle = ownerColor;
            ctxScreen.lineWidth = 2;

            ctxScreen.beginPath();
            ctxScreen.moveTo(14 * pulse, 0);
            ctxScreen.lineTo(-9 * pulse, -8 * pulse);
            ctxScreen.lineTo(-4 * pulse, 0);
            ctxScreen.lineTo(-9 * pulse, 8 * pulse);
            ctxScreen.closePath();
            ctxScreen.fill();
            ctxScreen.stroke();

            // Inner white core
            ctxScreen.fillStyle = '#ffffff';
            ctxScreen.beginPath();
            ctxScreen.moveTo(8 * pulse, 0);
            ctxScreen.lineTo(-4 * pulse, -3.5 * pulse);
            ctxScreen.lineTo(-1 * pulse, 0);
            ctxScreen.lineTo(-4 * pulse, 3.5 * pulse);
            ctxScreen.closePath();
            ctxScreen.fill();

            ctxScreen.restore();

            // Tactical Wormhole Owner Callsign Tag
            ctxScreen.save();
            ctxScreen.font = 'bold 9px "Orbitron", sans-serif';
            ctxScreen.textAlign = cos > 0 ? 'right' : 'left';
            ctxScreen.textBaseline = 'middle';
            ctxScreen.fillStyle = '#ffffff';
            ctxScreen.shadowColor = ownerColor;
            ctxScreen.shadowBlur = 8;

            const tagDist = 20;
            const tagX = Math.max(margin, Math.min(w - margin, arrowX - cos * tagDist));
            const tagY = Math.max(margin + 6, Math.min(h - margin - 6, arrowY - sin * tagDist));

            ctxScreen.fillText(`🌀 ${wh.ownerName || 'OPPONENT'}`, tagX, tagY);
            ctxScreen.restore();
          }
        }
      }
    } catch (err) {
      console.error('Render error:', err);
    }

    this.renderer.endFrame();

    // Render PiP Opponent View (Throttled to 30 FPS, skipped on mobile)
    if (this.inArena && this.pipRenderer && !this.isMobile) {
      this.pipThrottleTimer += dt;
      if (this.pipThrottleTimer >= 0.033) {
        this.pipThrottleTimer = 0;
        const rect = this.pipRenderer.canvas.getBoundingClientRect();
        if (rect.width > 0 && (Math.abs(this.pipRenderer.width - rect.width) > 1 || Math.abs(this.pipRenderer.height - rect.height) > 1)) {
          this.pipRenderer.resize();
        }
        this.pipRenderer.beginFrame('#020612');
        const pipW = this.pipRenderer.width;
        const pipH = this.pipRenderer.height;
        this.simulatedRealm.drawMiniView(this.pipRenderer, 0, 0, pipW, pipH, this.selectedOpponentSlot);
        this.pipRenderer.endFrame();
      }
    }

    // Render active Hangar preview models synchronously in single master rAF frame
    if (this.manualHangarView && this.manualHangarView.isAnimating) {
      this.manualHangarView.updateAndRender(dt);
    }
    if (this.modalHangarView.isAnimating) {
      this.modalHangarView.updateAndRender(dt);
    }
  }

  private loop(timestamp: number): void {
    requestAnimationFrame(this.loop.bind(this));

    if (!this.lastTime) this.lastTime = timestamp;
    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (dt > 0.1) dt = 0.1;

    // Real-time FPS & Performance Diagnostics Measurement (smooth 0.25s sample rate)
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.25) {
      this.currentFps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
      this.totalFrameExecTime = 0;

      if (!this.fpsElement) {
        this.fpsElement = document.getElementById('fps-counter');
      }
      if (this.fpsElement) {
        this.fpsElement.innerText = `${this.currentFps}`;
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

    const t0 = performance.now();
    try {
      this.update(dt);
      this.render(dt);
    } catch (err) {
      console.error('Update/Render loop error:', err);
    }
    const t1 = performance.now();
    this.totalFrameExecTime += (t1 - t0);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new WormholeGame();
});

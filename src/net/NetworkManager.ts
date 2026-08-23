import Peer, { DataConnection } from 'peerjs';

export interface WarpPayload {
  hazardId: string;
  hazardType: number;
  fromSlot: number;
  toSlot: number;
  angle: number;
  speed: number;
  seed: number;
}

export interface RealmSnapshot {
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  hasRetros: boolean;
  slot: number;
  hazards: { type: number; x: number; y: number; hp: number; radius: number }[];
  bullets: { x: number; y: number; color: string }[];
}

export type NetMessage =
  | { type: 'SNAPSHOT'; snapshot: RealmSnapshot }
  | { type: 'WARP_HAZARD'; payload: WarpPayload }
  | { type: 'KILL_EVENT'; victimSlot: number; killerSlot: number; p1Score: number; p2Score: number }
  | { type: 'PLAYER_DEATH'; slot: number }
  | { type: 'MATCH_START'; targetWins: number; round: number; seed: number }
  | { type: 'MATCH_RESET' }
  | { type: 'PING'; time: number }
  | { type: 'PONG'; time: number };

export class NetworkManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;

  public isHost = false;
  public isConnected = false;
  public roomId = '';
  public pingMs = 0;

  private pingTimer = 0;

  // Callbacks
  public onConnected?: (isHost: boolean, roomId: string) => void;
  public onDisconnected?: (reason: string) => void;
  public onReceiveHazard?: (payload: WarpPayload) => void;
  public onReceiveSnapshot?: (snapshot: RealmSnapshot) => void;
  public onReceiveKillEvent?: (victimSlot: number, killerSlot: number, p1Score: number, p2Score: number) => void;
  public onReceivePlayerDeath?: (slot: number) => void;
  public onReceiveMatchStart?: (targetWins: number, round: number, seed: number) => void;
  public onReceiveMatchReset?: () => void;
  public onPingUpdate?: (pingMs: number) => void;

  constructor() {}

  public hostRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.disconnect();
      this.isHost = true;

      // Generate clean 4-character room code (e.g. 8IGL)
      const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      const peerId = `wh-res-${randomCode.toLowerCase()}`;
      this.roomId = randomCode;

      this.peer = new Peer(peerId, {
        debug: 1,
      });

      this.peer.on('open', () => {
        resolve(this.roomId);
      });

      this.peer.on('connection', (conn) => {
        this.conn = conn;
        conn.on('open', () => {
          this.isConnected = true;
          if (this.onConnected) this.onConnected(true, this.roomId);
        });
        this.setupConnectionListeners(conn);
      });

      this.peer.on('error', (err) => {
        reject(err);
      });

      this.peer.on('disconnected', () => {
        if (this.onDisconnected) this.onDisconnected('Peer signaling disconnected');
      });

      this.peer.on('close', () => {
        this.handleDisconnect('Host room closed');
      });
    });
  }

  public joinRoom(roomCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.disconnect();
      this.isHost = false;
      this.roomId = roomCode.trim().toUpperCase();
      const hostPeerId = `wh-res-${this.roomId.toLowerCase()}`;

      this.peer = new Peer({
        debug: 1,
      });

      const timeout = setTimeout(() => {
        reject(new Error('Connection timed out'));
      }, 8000);

      this.peer.on('open', () => {
        const conn = this.peer!.connect(hostPeerId, {
          reliable: true,
        });

        this.conn = conn;

        conn.on('open', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.setupConnectionListeners(conn);
          if (this.onConnected) this.onConnected(false, this.roomId);
          resolve();
        });

        conn.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      this.peer.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.peer.on('close', () => this.handleDisconnect('Connection closed'));
    });
  }

  private setupConnectionListeners(conn: DataConnection): void {
    conn.on('data', (data: unknown) => {
      this.handleIncomingMessage(data as NetMessage);
    });

    conn.on('close', () => {
      this.handleDisconnect('Peer disconnected');
    });

    conn.on('error', () => {
      this.handleDisconnect('Connection error');
    });
  }

  private handleIncomingMessage(msg: NetMessage): void {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'SNAPSHOT':
        if (this.onReceiveSnapshot) this.onReceiveSnapshot(msg.snapshot);
        break;

      case 'WARP_HAZARD':
        if (this.onReceiveHazard) this.onReceiveHazard(msg.payload);
        break;

      case 'KILL_EVENT':
        if (this.onReceiveKillEvent) {
          this.onReceiveKillEvent(msg.victimSlot, msg.killerSlot, msg.p1Score, msg.p2Score);
        }
        break;

      case 'PLAYER_DEATH':
        if (this.onReceivePlayerDeath) {
          this.onReceivePlayerDeath(msg.slot);
        }
        break;

      case 'MATCH_START':
        if (this.onReceiveMatchStart) {
          this.onReceiveMatchStart(msg.targetWins, msg.round, msg.seed);
        }
        break;

      case 'MATCH_RESET':
        if (this.onReceiveMatchReset) this.onReceiveMatchReset();
        break;

      case 'PING':
        this.sendMessage({ type: 'PONG', time: msg.time });
        break;

      case 'PONG':
        this.pingMs = Math.round(Date.now() - msg.time);
        if (this.onPingUpdate) this.onPingUpdate(this.pingMs);
        break;
    }
  }

  public sendMessage(msg: NetMessage): void {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  }

  public sendSnapshot(snapshot: RealmSnapshot): void {
    this.sendMessage({ type: 'SNAPSHOT', snapshot });
  }

  public sendWarpHazard(payload: WarpPayload): void {
    this.sendMessage({ type: 'WARP_HAZARD', payload });
  }

  public sendPlayerDeath(slot: number): void {
    this.sendMessage({ type: 'PLAYER_DEATH', slot });
  }

  public sendKillEvent(victimSlot: number, killerSlot: number, p1Score: number, p2Score: number): void {
    this.sendMessage({
      type: 'KILL_EVENT',
      victimSlot,
      killerSlot,
      p1Score,
      p2Score,
    });
  }

  public sendMatchStart(targetWins = 5, round = 1, seed = Math.random()): void {
    this.sendMessage({
      type: 'MATCH_START',
      targetWins,
      round,
      seed,
    });
  }

  public sendMatchReset(): void {
    this.sendMessage({ type: 'MATCH_RESET' });
  }

  public update(dt: number): void {
    if (!this.isConnected) return;

    this.pingTimer += dt;
    if (this.pingTimer >= 2.0) {
      this.pingTimer = 0;
      this.sendMessage({ type: 'PING', time: Date.now() });
    }
  }

  private handleDisconnect(reason: string): void {
    if (this.isConnected) {
      this.isConnected = false;
      if (this.onDisconnected) this.onDisconnected(reason);
    }
  }

  public disconnect(): void {
    this.isConnected = false;
    if (this.conn) {
      try {
        this.conn.close();
      } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }
}

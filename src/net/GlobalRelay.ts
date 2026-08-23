// Global Web & LAN WebSocket Relay with zero external dependencies
// Supports local LAN relay (server.cjs) and Cloudflare Pages public broker failover

export class GlobalRelay {
  private ws: WebSocket | null = null;
  private isConnectedState = false;
  private isMqttMode = false;
  private clientId: string;
  private topic = 'wormhole_resurrected/v1/hub';
  private canonicalBroker = 'wss://broker.emqx.io:8084/mqtt';
  private pingInterval: any = null;
  private reconnectTimer: any = null;
  private onMessageCallback: ((data: any) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  public setCallbacks(onMessage: (data: any) => void, onConnect?: () => void): void {
    this.onMessageCallback = onMessage;
    this.onConnectCallback = onConnect || null;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const host = window.location.hostname;
    const isLocalLan = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');

    if (isLocalLan) {
      // 1. Try local Node.js WebSocket relay first
      this.isMqttMode = false;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const localUrl = `${protocol}//${window.location.host}/lan-relay`;
      this.initWebSocket(localUrl, false);
    } else {
      // 2. Connect to canonical global public MQTT over WebSocket broker
      this.isMqttMode = true;
      this.initWebSocket(this.canonicalBroker, true);
    }
  }

  private initWebSocket(url: string, isMqtt: boolean): void {
    try {
      const ws = isMqtt ? new WebSocket(url, ['mqtt']) : new WebSocket(url);
      if (isMqtt) {
        ws.binaryType = 'arraybuffer';
      }

      ws.onopen = () => {
        if (isMqtt) {
          // Send MQTT CONNECT packet
          ws.send(this.buildMqttConnect(this.clientId));
        } else {
          this.ws = ws;
          this.isConnectedState = true;
          this.startPing();
          if (this.onConnectCallback) this.onConnectCallback();
        }
      };

      ws.onmessage = (event) => {
        if (isMqtt) {
          if (event.data instanceof ArrayBuffer) {
            this.handleMqttMessage(new Uint8Array(event.data), ws);
          }
        } else {
          try {
            const data = JSON.parse(event.data);
            if (this.onMessageCallback) this.onMessageCallback(data);
          } catch (e) {
            console.error('Failed to parse LAN relay JSON:', e);
          }
        }
      };

      ws.onclose = () => {
        this.ws = null;
        this.isConnectedState = false;
        this.stopPing();
        this.scheduleReconnect();
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          // ignore
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (this.isMqttMode) {
          // Send MQTT PINGREQ
          this.ws.send(new Uint8Array([0xc0, 0x00]));
        } else {
          this.ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
        }
      }
    }, 15000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public send(data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const jsonStr = JSON.stringify(data);
      if (this.isMqttMode) {
        const pubPacket = this.buildMqttPublish(this.topic, jsonStr);
        this.ws.send(pubPacket);
      } else {
        this.ws.send(jsonStr);
      }
      return true;
    } catch {
      return false;
    }
  }

  public isConnected(): boolean {
    return this.isConnectedState && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // --- Lightweight MQTT 3.1.1 Encoder / Decoder (Zero Dependencies) ---

  private buildMqttConnect(clientId: string): Uint8Array {
    const enc = new TextEncoder();
    const cidBytes = enc.encode(clientId);
    const protoBytes = enc.encode('MQTT');
    const variableLen = 10 + 2 + cidBytes.length;
    const lenBytes = this.encodeLength(variableLen);
    const packet = new Uint8Array(1 + lenBytes.length + variableLen);
    packet[0] = 0x10; // CONNECT
    packet.set(lenBytes, 1);
    let offset = 1 + lenBytes.length;
    packet[offset++] = 0; packet[offset++] = 4; // Proto len
    packet.set(protoBytes, offset); offset += 4;
    packet[offset++] = 4; // Protocol level 3.1.1
    packet[offset++] = 0x02; // Clean session
    packet[offset++] = 0; packet[offset++] = 60; // Keepalive 60s
    packet[offset++] = (cidBytes.length >> 8) & 0xff;
    packet[offset++] = cidBytes.length & 0xff;
    packet.set(cidBytes, offset);
    return packet;
  }

  private buildMqttSubscribe(topic: string, packetId: number): Uint8Array {
    const enc = new TextEncoder();
    const topicBytes = enc.encode(topic);
    const variableLen = 2 + 2 + topicBytes.length + 1;
    const lenBytes = this.encodeLength(variableLen);
    const packet = new Uint8Array(1 + lenBytes.length + variableLen);
    packet[0] = 0x82; // SUBSCRIBE QoS 1
    packet.set(lenBytes, 1);
    let offset = 1 + lenBytes.length;
    packet[offset++] = (packetId >> 8) & 0xff;
    packet[offset++] = packetId & 0xff;
    packet[offset++] = (topicBytes.length >> 8) & 0xff;
    packet[offset++] = topicBytes.length & 0xff;
    packet.set(topicBytes, offset); offset += topicBytes.length;
    packet[offset] = 0; // Requested QoS 0
    return packet;
  }

  private buildMqttPublish(topic: string, message: string): Uint8Array {
    const enc = new TextEncoder();
    const topicBytes = enc.encode(topic);
    const msgBytes = enc.encode(message);
    const variableLen = 2 + topicBytes.length + msgBytes.length;
    const lenBytes = this.encodeLength(variableLen);
    const packet = new Uint8Array(1 + lenBytes.length + variableLen);
    packet[0] = 0x30; // PUBLISH QoS 0
    packet.set(lenBytes, 1);
    let offset = 1 + lenBytes.length;
    packet[offset++] = (topicBytes.length >> 8) & 0xff;
    packet[offset++] = topicBytes.length & 0xff;
    packet.set(topicBytes, offset); offset += topicBytes.length;
    packet.set(msgBytes, offset);
    return packet;
  }

  private handleMqttMessage(data: Uint8Array, ws: WebSocket): void {
    let index = 0;
    while (index < data.length) {
      if (index + 1 >= data.length) break;
      const header = data[index];
      const packetType = header >> 4;
      const qos = (header >> 1) & 0x03;
      const { length: remainingLength, bytesRead } = this.decodeLength(data, index + 1);
      const packetEnd = index + 1 + bytesRead + remainingLength;
      if (packetEnd > data.length) break;

      if (packetType === 2) {
        // CONNACK -> Subscribe to global wormhole topic
        const subPacket = this.buildMqttSubscribe(this.topic, 1);
        ws.send(subPacket);
      } else if (packetType === 9) {
        // SUBACK -> Ready to send and receive!
        this.ws = ws;
        this.isConnectedState = true;
        this.startPing();
        if (this.onConnectCallback) this.onConnectCallback();
      } else if (packetType === 3) {
        // PUBLISH
        let offset = index + 1 + bytesRead;
        if (offset + 2 <= packetEnd) {
          const topicLen = (data[offset] << 8) | data[offset + 1];
          offset += 2 + topicLen;
          if (qos > 0 && offset + 2 <= packetEnd) {
            // QoS 1/2 has 2 bytes Packet ID
            const packetId = (data[offset] << 8) | data[offset + 1];
            offset += 2;
            // Send PUBACK for QoS 1
            if (qos === 1) {
              ws.send(new Uint8Array([0x40, 0x02, (packetId >> 8) & 0xff, packetId & 0xff]));
            }
          }
          if (offset <= packetEnd) {
            const payloadBytes = data.subarray(offset, packetEnd);
            try {
              const jsonStr = new TextDecoder().decode(payloadBytes);
              const parsed = JSON.parse(jsonStr);
              if (this.onMessageCallback) this.onMessageCallback(parsed);
            } catch (e) {
              console.error('Failed to parse MQTT JSON payload:', e);
            }
          }
        }
      }
      index = packetEnd;
    }
  }

  private encodeLength(len: number): number[] {
    const bytes: number[] = [];
    do {
      let b = len % 128;
      len = Math.floor(len / 128);
      if (len > 0) b |= 128;
      bytes.push(b);
    } while (len > 0);
    return bytes;
  }

  private decodeLength(data: Uint8Array, offset: number): { length: number; bytesRead: number } {
    let mult = 1;
    let val = 0;
    let read = 0;
    let b = 0;
    do {
      if (offset + read >= data.length) break;
      b = data[offset + read];
      val += (b & 127) * mult;
      mult *= 128;
      read++;
    } while ((b & 128) !== 0 && read < 4);
    return { length: val, bytesRead: read };
  }
}

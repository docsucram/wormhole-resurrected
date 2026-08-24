const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Discover local network IPv4 addresses (prioritizing real LAN subnets 192.168.x.x / 10.x.x.x)
function getLanIPs() {
  const interfaces = os.networkInterfaces();
  const primaryIPs = [];
  const secondaryIPs = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address;
        if (ip.startsWith('169.254.')) {
          // Ignore APIPA link-local unconfigured address
          continue;
        }
        if (ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
          primaryIPs.push(ip);
        } else {
          secondaryIPs.push(ip);
        }
      }
    }
  }
  return [...primaryIPs, ...secondaryIPs];
}

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  let filePath = path.join(DIST_DIR, reqPath);

  // Security guard against directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

// -----------------------------------------------------------------------------
// 2. Zero-Dependency Native RFC6455 WebSocket Relay Server
// -----------------------------------------------------------------------------
const wsClients = new Set();

function encodeWsFrame(data) {
  const payload = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));
  const len = payload.length;
  let header;

  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode
    header[1] = len;
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  return Buffer.concat([header, payload]);
}

function broadcastWsMessage(data, senderSocket = null) {
  const frame = encodeWsFrame(data);
  for (const client of wsClients) {
    if (client !== senderSocket && client.writable) {
      try {
        client.write(frame);
      } catch (err) {
        // Socket write error ignored
      }
    }
  }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '',
    '',
  ].join('\r\n');

  socket.write(headers);
  wsClients.add(socket);

  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLen = secondByte & 0x7f;
      let offset = 2;

      // Handle close frame (opcode 0x08)
      if (opcode === 0x08) {
        wsClients.delete(socket);
        socket.end();
        return;
      }
      // Handle ping frame (opcode 0x09) -> reply pong (0x8a)
      if (opcode === 0x09) {
        const pong = Buffer.alloc(2);
        pong[0] = 0x8a;
        pong[1] = 0x00;
        socket.write(pong);
        buffer = buffer.slice(2);
        continue;
      }

      if (payloadLen === 126) {
        if (buffer.length < 4) break;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) break;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskKeyLen = isMasked ? 4 : 0;
      const totalLen = offset + maskKeyLen + payloadLen;

      if (buffer.length < totalLen) {
        break; // Wait for full frame data
      }

      let payload = buffer.slice(offset + maskKeyLen, totalLen);

      if (isMasked) {
        const maskKey = buffer.slice(offset, offset + 4);
        const unmasked = Buffer.alloc(payloadLen);
        for (let i = 0; i < payloadLen; i++) {
          unmasked[i] = payload[i] ^ maskKey[i % 4];
        }
        payload = unmasked;
      }

      buffer = buffer.slice(totalLen);

      // Opcode 1 = text JSON packet
      if (opcode === 0x01) {
        const messageStr = payload.toString('utf-8');
        // Broadcast across all connected LAN clients
        broadcastWsMessage(messageStr, socket);
      }
    }
  });

  socket.on('close', () => {
    wsClients.delete(socket);
  });

  socket.on('error', () => {
    wsClients.delete(socket);
  });
});

// -----------------------------------------------------------------------------
// 3. Start Listener
// -----------------------------------------------------------------------------
server.listen(PORT, '0.0.0.0', () => {
  const lanIPs = getLanIPs();
  console.clear();
  console.log('================================================================');
  console.log('       🌌 WORMHOLE RESURRECTED // PORTABLE LAN SERVER 🌌        ');
  console.log('================================================================\n');
  console.log(`  [+] Local Host URL:   http://localhost:${PORT}`);
  
  if (lanIPs.length > 0) {
    console.log(`  [+] LAN Player URL:   http://${lanIPs[0]}:${PORT}`);
    for (let i = 1; i < lanIPs.length; i++) {
      console.log(`      Alt LAN Adapter:  http://${lanIPs[i]}:${PORT}`);
    }
  } else {
    console.log(`  [!] Notice: No external network adapter detected (Single-PC mode)`);
  }

  console.log('\n----------------------------------------------------------------');
  console.log('  Share the LAN Player URL with anyone on your local Wi-Fi/LAN!');
  console.log('  Press Ctrl + C in this window to stop the server.');
  console.log('================================================================\n');

  // Auto-launch default browser on host machine (local development only)
  if (!process.env.RENDER && !process.env.PORT) {
    const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${startCmd} http://localhost:${PORT}`);
  }
});

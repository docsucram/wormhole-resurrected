const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
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

// In-memory cache for static files & their pre-compressed gzip representations
const fileCache = new Map();

function getCachedFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) return null;

    const cacheKey = `${filePath}:${stats.mtimeMs}:${stats.size}`;
    const cached = fileCache.get(filePath);
    if (cached && cached.cacheKey === cacheKey) {
      return cached;
    }

    const raw = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const isCompressible = ['.html', '.js', '.css', '.json', '.svg'].includes(ext);
    const gzip = isCompressible ? zlib.gzipSync(raw, { level: 9 }) : null;
    const etag = `"${crypto.createHash('md5').update(raw).digest('hex').slice(0, 16)}"`;

    const fileData = {
      cacheKey,
      raw,
      gzip,
      etag,
      mtime: stats.mtime,
      size: stats.size,
      contentType: MIME_TYPES[ext] || 'application/octet-stream',
    };
    fileCache.set(filePath, fileData);
    return fileData;
  } catch (e) {
    return null;
  }
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // 1. Lightweight health check (monitoring & keep-alive pings use < 100 bytes)
  if (urlPath === '/healthz' || urlPath === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
    });
    res.end(JSON.stringify({ status: 'ok', server: 'Wormhole Resurrected Dedicated Relay', activeClients: wsClients.size }));
    return;
  }

  // 2. Fast 200 response for robots.txt (blocks scrapers/crawlers and uses only 26 bytes)
  if (urlPath === '/robots.txt') {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'public, max-age=86400',
    });
    res.end('User-agent: *\nDisallow: /\n');
    return;
  }

  // 3. Fast 204 for missing favicon.ico
  if (urlPath === '/favicon.ico') {
    const iconPath = path.join(DIST_DIR, 'favicon.ico');
    if (!fs.existsSync(iconPath)) {
      res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
      res.end();
      return;
    }
  }

  let reqPath = decodeURI(urlPath);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  let filePath = path.join(DIST_DIR, reqPath);

  // Security guard against directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  let fileData = getCachedFile(filePath);

  // 4. Strict 404 Guard:
  // If the path had a specific file extension (e.g. .txt, .php, .env, .png, .js) and wasn't found,
  // DO NOT fall back to index.html! Return a clean, tiny 13-byte 404.
  if (!fileData) {
    const ext = path.extname(urlPath);
    if (ext && ext !== '.html') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'public, max-age=3600' });
      res.end('404 Not Found');
      return;
    }
    // Single Page App fallback: clean URL navigations (e.g. /lobby) serve index.html
    filePath = path.join(DIST_DIR, 'index.html');
    fileData = getCachedFile(filePath);
  }

  if (!fileData) {
    // Fallback if dist/ was not built yet
    res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-cache' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head><title>Wormhole Relay Online</title><style>body{background:#040714;color:#00ffff;font-family:sans-serif;text-align:center;padding:50px;}</style></head>
        <body>
          <h1>🌌 Wormhole Dedicated Relay Online</h1>
          <p>WebSocket endpoint: <code>/lan-relay</code></p>
          <p>Active Pilots: ${wsClients.size}</p>
        </body>
      </html>
    `);
    return;
  }

  // 5. Conditional GET / ETag check (304 Not Modified -> 0 byte payload)
  const clientEtag = req.headers['if-none-match'];
  if (clientEtag && clientEtag === fileData.etag) {
    res.writeHead(304);
    res.end();
    return;
  }

  // 6. Smart Caching Headers
  const isIndex = filePath.endsWith('index.html');
  const isHashedAsset = reqPath.startsWith('/assets/') || reqPath.startsWith('/avatars/') || reqPath.startsWith('/audio/');
  const cacheControl = isHashedAsset
    ? 'public, max-age=31536000, immutable'
    : (isIndex ? 'no-cache, must-revalidate' : 'public, max-age=3600');

  // 7. Gzip Compression (85% bandwidth reduction on HTML, 74% on JS)
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const canGzip = fileData.gzip && acceptEncoding.includes('gzip');

  const headers = {
    'Content-Type': fileData.contentType,
    'Cache-Control': cacheControl,
    'ETag': fileData.etag,
    'Vary': 'Accept-Encoding',
  };

  if (canGzip) {
    headers['Content-Encoding'] = 'gzip';
    headers['Content-Length'] = fileData.gzip.length;
    res.writeHead(200, headers);
    res.end(fileData.gzip);
  } else {
    headers['Content-Length'] = fileData.raw.length;
    res.writeHead(200, headers);
    res.end(fileData.raw);
  }
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

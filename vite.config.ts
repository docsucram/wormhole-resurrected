import { defineConfig } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';

export default defineConfig({
  server: {
    port: 3000,
    host: true, // Expose on all network interfaces for real LAN play
    open: false
  },
  plugins: [
    {
      name: 'lan-lobby-relay',
      configureServer(server) {
        if (!server.httpServer) return;
        const wss = new WebSocketServer({ noServer: true });

        server.httpServer.on('upgrade', (request, socket, head) => {
          const url = new URL(request.url || '', `http://${request.headers.host}`);
          if (url.pathname === '/lan-relay') {
            wss.handleUpgrade(request, socket, head, (ws) => {
              wss.emit('connection', ws, request);
            });
          }
        });

        wss.on('connection', (ws) => {
          ws.on('message', (message) => {
            const msgStr = message.toString();
            // Broadcast to all other connected clients on LAN
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(msgStr);
              }
            });
          });
        });
      }
    }
  ],
  build: {
    target: 'esnext'
  }
});


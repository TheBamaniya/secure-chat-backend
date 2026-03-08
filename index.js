import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { routeEvent, unregisterUser } from './router.js';

// Use the port Render assigns, or 3000 for local testing
const port = process.env.PORT || 3000;

// 1. Create a basic HTTP server
// Render needs this to know your app is "alive" (Health Check)
const server = createServer((req, res) => {
  res.writeHead(200);
  res.end('RCS Clone Backend is Running!');
});

// 2. Attach WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  console.log('⚡ New client connected');

  // Route incoming messages to router.js
  socket.on('message', (message) => {
    try {
      const parsedData = JSON.parse(message);
      routeEvent(socket, parsedData);
    } catch (e) {
      console.error('❌ Error parsing JSON:', e);
    }
  });

  // Handle disconnections
  socket.on('close', () => {
    unregisterUser(socket);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('WebSocket Error:', error);
  });
});

// 3. Start listening
server.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
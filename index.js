import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import express from 'express';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Map to store active connections: { userId: socket }
const clients = new Map();

// Keep Render alive with a simple health check
app.get('/', (req, res) => {
    res.send('Server is running');
});

wss.on('connection', (ws) => {
    console.log('New client connection initiated.');

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'register':
                    clients.set(message.userId, ws);
                    ws.userId = message.userId;
                    console.log(`User registered: ${message.userId}`);
                    broadcastPresence(message.userId, true);
                    break;

                case 'message':
                    const { to, from } = message.data;
                    const recipientSocket = clients.get(to);

                    if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
                        recipientSocket.send(JSON.stringify(message.data));
                        console.log(`Routed message from ${from} to ${to}`);
                    }
                    break;

                case 'delete':
                    broadcastToAll({ type: 'delete_id', id: message.delete_id });
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        if (ws.userId) {
            clients.delete(ws.userId);
            broadcastPresence(ws.userId, false);
        }
    });
});

function broadcastPresence(userId, isOnline) {
    broadcastToAll({ type: 'presence', userId, isOnline });
}

function broadcastToAll(data) {
    const payload = JSON.stringify(data);
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Secure Chat Backend running on port ${PORT}`);
});
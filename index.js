import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import express from 'express';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Map to store active connections: { userId: socket }
const clients = new Map();

// 🌐 Health Check Route (Required for Render Web Services)
app.get('/', (req, res) => {
    res.send('Secure Chat Server is Online');
});

wss.on('connection', (ws) => {
    console.log('New client connection initiated.');

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'register':
                    // Map the unique userId to this specific socket connection
                    clients.set(message.userId, ws);
                    ws.userId = message.userId;
                    console.log(`User registered: ${message.userId}`);
                    broadcastPresence(message.userId, true);
                    break;

                case 'message':
                    // Route the encrypted message to the target peerId
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
            console.log(`User disconnected: ${ws.userId}`);
            broadcastPresence(ws.userId, false); // Notify others of offline status
        }
    });
});

// Notify all users about online/offline status
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

// Render provides the PORT environment variable
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Secure Chat Backend running on port ${PORT}`);
});
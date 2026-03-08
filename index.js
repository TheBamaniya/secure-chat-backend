const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Map to store active connections: { userId: socket }
const clients = new Map();

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
                    } else {
                        console.log(`Recipient ${to} is offline. Message held or dropped.`);
                    }
                    break;

                case 'delete':
                    // Broadcast a delete request to all clients for a specific message ID
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
            broadcastPresence(ws.userId, false);
        }
    });
});

// Helper: Notify all users about a change in someone's online status
function broadcastPresence(userId, isOnline) {
    broadcastToAll({ type: 'presence', userId, isOnline });
}

// Helper: Send data to every connected client
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
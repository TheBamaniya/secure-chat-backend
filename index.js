import { WebSocketServer, WebSocket } from 'ws';

// 1. Create the server on port 8080 (or process.env.PORT for Render)
const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });

// 2. Map to store: Key = userId, Value = WebSocket instance
const clients = new Map();

console.log(`🚀 WebSocket Server started on port ${port}`);

wss.on('connection', (ws) => {
    let currentUserId = null;

    ws.on('message', (data) => {
        try {
            // Convert Buffer/Blob to String before parsing
            const message = JSON.parse(data.toString());
            console.log("📩 Received:", message);

            // --- A. REGISTRATION ---
            if (message.type === 'register') {
                currentUserId = message.userId;
                clients.set(currentUserId, ws);
                console.log(`✅ User Registered: ${currentUserId}`);
                
                broadcastPresence(currentUserId, true);
                return;
            }

            // --- B. STATUS CHECK ---
            if (message.type === 'check_status') {
                const isOnline = clients.has(message.targetId);
                ws.send(JSON.stringify({
                    type: 'presence',
                    userId: message.targetId,
                    isOnline: isOnline
                }));
                return;
            }

            // --- C. CHAT ROUTING ---
            if (message.to) {
                const receiverSocket = clients.get(message.to);

                if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
                    receiverSocket.send(JSON.stringify(message));
                    console.log(`➡️ Message delivered to ${message.to}`);
                } else {
                    console.log(`⚠️ User ${message.to} is offline.`);
                }
            }

        } catch (e) {
            console.error("❌ Error parsing message:", e);
        }
    });

    ws.on('close', () => {
        if (currentUserId) {
            console.log(`❌ User Disconnected: ${currentUserId}`);
            clients.delete(currentUserId);
            broadcastPresence(currentUserId, false);
        }
    });

    ws.on('error', (error) => {
        console.error(`🛠️ Socket Error for ${currentUserId}:`, error);
    });
});

function broadcastPresence(userId, isOnline) {
    const presenceUpdate = JSON.stringify({
        type: 'presence',
        userId: userId,
        isOnline: isOnline
    });

    clients.forEach((clientSocket) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(presenceUpdate);
        }
    });
}
const WebSocket = require('ws');

// 1. Create the server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

// 2. Map to store: Key = userId, Value = WebSocket instance
const clients = new Map();

console.log("🚀 WebSocket Server started on ws://localhost:8080");

wss.on('connection', (ws) => {
    let currentUserId = null;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log("📩 Received:", message);

            // --- A. REGISTRATION ---
            // When the Flutter app connects, it must send: { "type": "register", "userId": "user_123" }
            if (message.type === 'register') {
                currentUserId = message.userId;
                clients.set(currentUserId, ws);
                console.log(`✅ User Registered: ${currentUserId}`);
                
                // Notify others this user is online
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
            // Flutter sends a Message object with a "to" field
            if (message.to) {
                const receiverSocket = clients.get(message.to);

                if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
                    // Deliver to the recipient
                    receiverSocket.send(JSON.stringify(message));
                    console.log(`➡️ Message delivered to ${message.to}`);
                } else {
                    console.log(`⚠️ User ${message.to} is offline. Message not delivered.`);
                    // Optional: Store in a "Pending" database here
                }
            }

        } catch (e) {
            console.error("❌ Error parsing message:", e);
        }
    });

    // --- D. DISCONNECTION ---
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

// Helper: Tell everyone when someone's status changes
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
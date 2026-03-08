import { WebSocketServer, WebSocket } from 'ws';

const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });
const clients = new Map();

console.log(`🚀 WebSocket Server live on port ${port}`);

wss.on('connection', (ws) => {
    let currentUserId = null;

    // 💓 Heartbeat to keep Render.com connection alive
    const timer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
        else clearInterval(timer);
    }, 30000);

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            // --- 1. REGISTRATION ---
            if (message.type === 'register' || message.type === 'init') {
                currentUserId = message.userId;
                clients.set(currentUserId, ws);
                console.log(`✅ Registered: ${currentUserId}`);
                return;
            }

            // --- 2. DYNAMIC ROUTING ---
            // Fix: Check for 'to' at top level OR inside 'data' object
            const recipientId = message.to || (message.data && message.data.to);

            if (recipientId) {
                const target = clients.get(recipientId);
                if (target && target.readyState === WebSocket.OPEN) {
                    target.send(JSON.stringify(message));
                    console.log(`➡️ Delivered to ${recipientId}`);
                } else {
                    console.log(`⚠️ User ${recipientId} is offline`);
                }
            }
        } catch (e) { console.error("Parse Error:", e); }
    });

    ws.on('close', () => {
        if (currentUserId) {
            clients.delete(currentUserId);
            console.log(`❌ Disconnected: ${currentUserId}`);
        }
        clearInterval(timer);
    });
});
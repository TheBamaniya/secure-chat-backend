// A central "Switchboard" to track who is currently online
// It maps: userId -> WebSocket Connection
const activeUsers = new Map();

export const routeEvent = async (socket, event) => {
  // --------------------------------------------------------
  // 1. REGISTRATION PHASE
  // The phone tells us its ID. We store it in the Switchboard.
  // --------------------------------------------------------
  if (event.type === "register") {
    activeUsers.set(event.userId, socket);
    socket.userId = event.userId; // Tag the socket so we can clean it up later
    console.log(`🟢 User Online: ${event.userId} (Total Active: ${activeUsers.size})`);
    return;
  }

  // --------------------------------------------------------
  // 2. MESSAGE ROUTING PHASE
  // --------------------------------------------------------
  if (event.type === "message") {
    const msgData = event.data;
    
    // Look up the receiver's phone in our Switchboard
    const targetSocket = activeUsers.get(msgData.to);

    // If they have the app open right now, shoot it instantly to their phone!
    if (targetSocket && targetSocket.readyState === 1) { // 1 = OPEN
      targetSocket.send(JSON.stringify(msgData));
      console.log(`📩 Routed instantly: ${msgData.from} -> ${msgData.to}`);
    } else {
      console.log(`📭 ${msgData.to} is offline. Dropping socket push (relying on DB sync).`);
    }
    return;
  }

  // --------------------------------------------------------
  // 3. DELETE ROUTING PHASE
  // --------------------------------------------------------
  if (event.type === "delete") {
    // A delete command applies to everyone, so we broadcast it to all active sockets 
    // EXCEPT the person who sent it.
    activeUsers.forEach((clientSocket) => {
      if (clientSocket !== socket && clientSocket.readyState === 1) {
        clientSocket.send(JSON.stringify({ delete_id: event.delete_id }));
      }
    });
    console.log(`🗑️ Delete broadcasted for message ID: ${event.delete_id}`);
    return;
  }
};

// --------------------------------------------------------
// CLEANUP PHASE (Called from index.js when a user closes the app)
// --------------------------------------------------------
export const unregisterUser = (socket) => {
  if (socket.userId) {
    activeUsers.delete(socket.userId);
    console.log(`🔴 User Offline: ${socket.userId} (Total Active: ${activeUsers.size})`);
  }
};
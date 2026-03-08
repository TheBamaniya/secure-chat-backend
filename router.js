const activeUsers = new Map();

export const routeEvent = async (socket, event) => {
  // 1. REGISTRATION (User comes Online)
  if (event.type === "register") {
    activeUsers.set(event.userId, socket);
    socket.userId = event.userId;
    console.log(`🟢 User Online: ${event.userId}`);

    // Broadcast to everyone that this user is now Online
    broadcastPresence(event.userId, true);
    return;
  }

  // 2. STATUS CHECK (User asks: "Is this person online?")
  if (event.type === "check_status") {
    const isOnline = activeUsers.has(event.targetId);
    socket.send(JSON.stringify({
      type: 'presence',
      userId: event.targetId,
      isOnline: isOnline
    }));
    return;
  }

  // 3. MESSAGE ROUTING
  if (event.type === "message") {
    const msgData = event.data;
    const targetSocket = activeUsers.get(msgData.to);

    if (targetSocket && targetSocket.readyState === 1) { 
      targetSocket.send(JSON.stringify(msgData));
    }
    return;
  }

  // 4. DELETE ROUTING
  if (event.type === "delete") {
    activeUsers.forEach((clientSocket) => {
      if (clientSocket !== socket && clientSocket.readyState === 1) {
        clientSocket.send(JSON.stringify({ delete_id: event.delete_id }));
      }
    });
    return;
  }
};

// Helper: Tell everyone a user's status changed
const broadcastPresence = (userId, isOnline) => {
  const message = JSON.stringify({
    type: 'presence',
    userId: userId,
    isOnline: isOnline
  });

  activeUsers.forEach((clientSocket) => {
    if (clientSocket.readyState === 1) {
      clientSocket.send(message);
    }
  });
};

// CLEANUP (User goes Offline)
export const unregisterUser = (socket) => {
  if (socket.userId) {
    activeUsers.delete(socket.userId);
    console.log(`🔴 User Offline: ${socket.userId}`);
    // Broadcast to everyone that this user is now Offline
    broadcastPresence(socket.userId, false);
  }
};
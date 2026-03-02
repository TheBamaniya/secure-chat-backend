import { Message } from "./models/Message.js";

// Map to keep track of active users: { userId: socket }
const activeUsers = new Map();

export async function routeEvent(socket, event) {
  const { type, payload } = event;

  switch (type) {
    case "REGISTER":
      // Example payload: { userId: "user123" }
      activeUsers.set(payload.userId, socket);
      socket.userId = payload.userId;
      console.log(`User registered: ${payload.userId}`);
      break;

    case "MESSAGE":
      // Example payload: { to: "user456", message: "Hello!" }
      try {
        // 1. Create and save the message to MongoDB
        const chatMessage = new Message({
          senderId: socket.userId,
          receiverId: payload.to,
          message: payload.message,
        });
        await chatMessage.save();
        console.log(`Message saved from ${socket.userId} to ${payload.to}`);

        // 2. Forward to the recipient if they are online
        const recipientSocket = activeUsers.get(payload.to);
        if (recipientSocket) {
          recipientSocket.send(JSON.stringify({
            type: "MESSAGE",
            payload: { from: socket.userId, message: payload.message }
          }));
        } else {
          console.log(`User ${payload.to} is offline. Message is saved in DB.`);
        }
      } catch (err) {
        console.error("Error handling message:", err.message);
      }
      break;

    default:
      console.warn("Unknown event type:", type);
  }
}

export function unregisterUser(socket) {
  if (socket.userId) {
    activeUsers.delete(socket.userId);
    console.log(`User disconnected: ${socket.userId}`);
  }
}
import Message from "./models/message.js";

const users = new Map();

export function registerUser(userId, socket) {
  socket.userId = userId; // Attach the ID to the socket for easy tracking
  users.set(userId, socket);
  console.log(`🟢 User registered: ${userId} | Total online: ${users.size}`);
}

export function unregisterUser(socket) {
  if (socket.userId) {
    users.delete(socket.userId);
    console.log(`🔴 User disconnected: ${socket.userId} | Total online: ${users.size}`);
  }
}

export async function routeEvent(socket, event) {
  // Log every single event that arrives at the server
  console.log(`📩 [${event.event_type}] from ${socket.userId || 'Unknown'}`);

  switch (event.event_type) {
    case "IDENTIFY":
      registerUser(event.user_id, socket);
      
      // Check for messages they missed while offline
      const undelivered = await Message.find({ to: event.user_id, delivered: false });
      if (undelivered.length > 0) {
        console.log(`📦 Sending ${undelivered.length} offline messages to ${event.user_id}`);
      }

      for (const msg of undelivered) {
        socket.send(JSON.stringify({ event_type: "MESSAGE_RECEIVE", ...msg._doc }));
        msg.delivered = true;
        await msg.save();
      }
      break;

    case "MESSAGE_SEND":
      console.log(`✉️ Routing message from ${event.from} to ${event.to}`);
      const message = new Message({
        messageId: event.messageId,
        from: event.from,
        to: event.to,
        payload: event.payload,
        sentAt: event.sentAt
      });
      await message.save();

      const receiver = users.get(event.to);
      if (receiver) {
        receiver.send(JSON.stringify({ event_type: "MESSAGE_RECEIVE", ...message._doc }));
        message.delivered = true;
        await message.save();
        console.log(`✅ Delivered live to ${event.to}`);
      } else {
        console.log(`💤 ${event.to} is offline. Saved securely to database.`);
      }
      break;

    case "MESSAGE_ACK":
      console.log(`👍 Delivery confirmed for message: ${event.messageId}`);
      const ackMsg = await Message.findOne({ messageId: event.messageId });
      if (ackMsg) {
        ackMsg.confirmed = true;
        await ackMsg.save();
      }
      break;

    case "DELETE_FOR_EVERYONE":
      console.log(`🗑️ Delete request received for message: ${event.messageId}`);
      const msg = await Message.findOne({ messageId: event.messageId });
      if (!msg) return;

      const now = Date.now();
      if (now - msg.sentAt < 24 * 60 * 60 * 1000) {
        msg.deletedForEveryone = true;
        await msg.save();

        const receiverSocket = users.get(msg.to);
        if (receiverSocket) {
          receiverSocket.send(JSON.stringify({ event_type: "MESSAGE_DELETED", messageId: msg.messageId }));
        }
        socket.send(JSON.stringify({ event_type: "MESSAGE_DELETED", messageId: msg.messageId }));
        console.log(`✅ Message ${event.messageId} successfully deleted for everyone`);
      } else {
        console.log(`❌ Delete failed: Message ${event.messageId} is older than 24 hours`);
      }
      break;
  }
}
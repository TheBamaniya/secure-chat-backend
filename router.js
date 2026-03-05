import Message from "./models/Message.js";

const users = new Map();

export function registerUser(userId, socket) {
  users.set(userId, socket);
}

export function unregisterUser(socket) {
  for (const [id, s] of users.entries()) {
    if (s === socket) {
      users.delete(id);
      break;
    }
  }
}

export async function routeEvent(socket, event) {
  switch (event.event_type) {
    case "IDENTIFY":
      registerUser(event.user_id, socket);
      const undelivered = await Message.find({ to: event.user_id, delivered: false });
      
      for (const msg of undelivered) {
        socket.send(JSON.stringify({ event_type: "MESSAGE_RECEIVE", ...msg._doc }));
        msg.delivered = true;
        await msg.save();
      }
      break;

    case "MESSAGE_SEND":
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
      }
      break;

    case "MESSAGE_ACK":
      const ackMsg = await Message.findOne({ messageId: event.messageId });
      if (ackMsg) {
        ackMsg.confirmed = true;
        await ackMsg.save();
      }
      break;

    case "DELETE_FOR_EVERYONE":
      const msg = await Message.findOne({ messageId: event.messageId });
      if (!msg) return;

      const now = Date.now();
      // Only allow deletion if sent within the last 24 hours
      if (now - msg.sentAt < 24 * 60 * 60 * 1000) {
        msg.deletedForEveryone = true;
        await msg.save();

        const receiverSocket = users.get(msg.to);
        if (receiverSocket) {
          receiverSocket.send(JSON.stringify({ event_type: "MESSAGE_DELETED", messageId: msg.messageId }));
        }
        socket.send(JSON.stringify({ event_type: "MESSAGE_DELETED", messageId: msg.messageId }));
      }
      break;
  }
}
import { Message } from "./models/Message.js";

const connectedUsers = new Map();

export function routeEvent(socket, event) {
  switch (event.event_type) {
    case "IDENTIFY":
      socket.userId = event.user_id;
      connectedUsers.set(event.user_id, socket);
      console.log(`User registered: ${event.user_id}`);
      break;
    case "MESSAGE_SEND":
      handleMessageSend(socket, event);
      break;
    case "FETCH_HISTORY":
      handleFetchHistory(socket, event);
      break;
  }
}

async function handleMessageSend(socket, event) {
  const { to, payload, message_id, sent_at } = event;
  
  // Save to MongoDB
  const newMessage = new Message({
    message_id: message_id || Date.now().toString(),
    from: socket.userId,
    to,
    payload,
    sent_at: sent_at || Date.now()
  });
  await newMessage.save();

  const target = connectedUsers.get(to);
  if (target) {
    target.send(JSON.stringify({
      event_type: "MESSAGE_RECEIVE",
      from: socket.userId,
      payload,
      message_id: newMessage.message_id,
      sent_at: newMessage.sent_at
    }));
  }
}

async function handleFetchHistory(socket, event) {
  const history = await Message.find({
    $or: [
      { from: socket.userId, to: event.with_user },
      { from: event.with_user, to: socket.userId }
    ]
  }).sort({ sent_at: 1 });

  socket.send(JSON.stringify({ event_type: "HISTORY_DATA", payload: history }));
}

export function unregisterUser(socket) {
  if (socket.userId) connectedUsers.delete(socket.userId);
}
// router.js

import { startVerification, completeVerification } from "./verify.js";

const connectedUsers = new Map();
const publicKeys = new Map();     // Stores keys so latecomers can get them
const messageQueue = new Map();   // user_id -> [messagePacket]

export function registerUser(socket, userId, publicKey) {
  socket.userId = userId;
  connectedUsers.set(userId, socket);

  if (publicKey) {
    publicKeys.set(userId, publicKey);
    // Broadcast this new user's key to everyone else
    broadcastPublicKey(userId, publicKey);
  }

  // FIX: Send already-registered public keys to THIS newly connected user
  for (const [existingUserId, existingKey] of publicKeys) {
    if (existingUserId !== userId) {
      socket.send(JSON.stringify({
        event_type: "PUBLIC_DH",
        user_id: existingUserId,
        dh_public: existingKey
      }));
    }
  }

  console.log(`User registered: ${userId}`);

  // Deliver any messages that were queued while they were offline
  if (messageQueue.has(userId)) {
    const queued = messageQueue.get(userId);
    console.log(`Delivering ${queued.length} queued messages to ${userId}`);
    queued.forEach((msg) => socket.send(JSON.stringify(msg)));
    messageQueue.delete(userId);
  }
}

export function unregisterUser(socket) {
  if (socket.userId) {
    connectedUsers.delete(socket.userId);
    console.log(`User disconnected: ${socket.userId}`);
  }
}

export function routeEvent(socket, event) {
  switch (event.event_type) {
    case "IDENTIFY":
      // Fallback for different payload naming conventions
      registerUser(socket, event.user_id, event.dh_public || event.public_key);
      break;
    case "MESSAGE_SEND":
      handleMessageSend(socket, event);
      break;
    case "MESSAGE_DELIVERED":
      forwardReceipt("MESSAGE_DELIVERED", event);
      break;
    case "MESSAGE_SEEN":
      forwardReceipt("MESSAGE_SEEN", event);
      break;
    case "VERIFY_START":
      handleVerifyStart(socket, event);
      break;
    case "VERIFY_COMPLETE":
      handleVerifyComplete(socket, event);
      break;
    default:
      console.log(`Unknown event: ${event.event_type}`);
  }
}

function handleMessageSend(socket, event) {
  if (!socket.userId) return;

  const { to, message_id, payload, sent_at } = event;

  const messagePacket = {
    event_type: "MESSAGE_RECEIVE",
    from: socket.userId,
    message_id: message_id || Date.now().toString(), // Fallback if missing
    payload,
    sent_at: sent_at || new Date().toISOString()
  };

  const targetSocket = connectedUsers.get(to);

  if (targetSocket) {
    console.log(`Routing message: ${socket.userId} → ${to}`);
    targetSocket.send(JSON.stringify(messagePacket));
  } else {
    console.log(`User ${to} offline, queueing message`);
    if (!messageQueue.has(to)) {
      messageQueue.set(to, []);
    }
    messageQueue.get(to).push(messagePacket);
  }
}

function forwardReceipt(type, event) {
  const { to, message_id, delivered_at, seen_at } = event;
  const senderSocket = connectedUsers.get(to);
  if (!senderSocket) return;

  senderSocket.send(JSON.stringify({
    event_type: type,
    message_id,
    ...(type === "MESSAGE_DELIVERED" ? { delivered_at } : { seen_at })
  }));
}

function broadcastPublicKey(userId, publicKey) {
  for (const [id, socket] of connectedUsers) {
    // FIX: Do not broadcast the key back to the person who just sent it
    if (id !== userId) {
      socket.send(JSON.stringify({
        event_type: "PUBLIC_DH",
        user_id: userId,
        dh_public: publicKey
      }));
    }
  }
}

// Modularized by using your existing verify.js file
function handleVerifyStart(socket, event) {
  const challenge = startVerification(event.phone, event.public_key);
  socket.send(JSON.stringify({ event_type: "VERIFY_CHALLENGE", challenge }));
}

function handleVerifyComplete(socket, event) {
  const success = completeVerification(event.phone, event.signature);
  socket.send(JSON.stringify({ event_type: "VERIFY_RESULT", success }));
}
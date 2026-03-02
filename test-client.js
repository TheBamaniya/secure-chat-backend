// test-client.js 

import WebSocket from "ws";
import crypto from "crypto";

// FIX: Allow dynamic user assignment via terminal arguments
const MY_USER_ID = process.argv[2] || "userA";   
const SEND_TO = process.argv[3] || "userB";

function generateDH() {
  return crypto.generateKeyPairSync("x25519");
}

let dhKeyPair = generateDH();
let rootKey = null;
let chainKey = null;

function kdf(keyMaterial, info) {
  return crypto.createHmac("sha256", keyMaterial).update(info).digest();
}

function nextChainKey() {
  const messageKey = kdf(chainKey, "message");
  chainKey = kdf(chainKey, "chain");
  return messageKey;
}

function encrypt(message, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let enc = cipher.update(message, "utf8", "base64");
  enc += cipher.final("base64");
  return {
    ciphertext: enc,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64")
  };
}

function decrypt(payload, key) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  let dec = decipher.update(payload.ciphertext, "base64", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

const socket = new WebSocket("ws://localhost:8080");

socket.on("open", () => {
  console.log(`Connected as ${MY_USER_ID}. Trying to reach ${SEND_TO}...`);

  socket.send(JSON.stringify({
    event_type: "IDENTIFY",
    user_id: MY_USER_ID,
    dh_public: dhKeyPair.publicKey.export({ type: "spki", format: "pem" })
  }));
});

function sendMessage() {
  const msgKey = nextChainKey();
  const encrypted = encrypt(`Hello via Double Ratchet from ${MY_USER_ID}`, msgKey);

  socket.send(JSON.stringify({
    event_type: "MESSAGE_SEND",
    to: SEND_TO,
    payload: encrypted
  }));

  console.log("🔐 Message sent securely!");
}

socket.on("message", (data) => {
  const event = JSON.parse(data.toString());

  switch (event.event_type) {
    case "PUBLIC_DH": {
      // Ignore keys not meant for our target to keep the test simple
      if (event.user_id !== SEND_TO) return; 

      const peerPublicKey = crypto.createPublicKey(event.dh_public);
      const sharedSecret = crypto.diffieHellman({
        privateKey: dhKeyPair.privateKey,
        publicKey: peerPublicKey
      });

      rootKey = kdf(sharedSecret, "root");
      chainKey = kdf(rootKey, "chain");

      console.log(`🔁 DH ratchet completed with ${event.user_id}`);

      // We add a slight delay so both clients have time to establish keys 
      // before one fires off a message.
      setTimeout(sendMessage, 1000); 
      break;
    }

    case "MESSAGE_RECEIVE": {
      const msgKey = nextChainKey();
      const text = decrypt(event.payload, msgKey);
      console.log(`📩 Decrypted message from ${event.from}: ${text}`);
      break;
    }
  }
});
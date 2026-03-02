// crypto-helper.js

import crypto from "crypto";

/* =========================
   DEVICE RSA KEYS
   ========================= */

export function generateKeyPair() {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" }
  });
}

/* =========================
   SESSION KEY STORE
   ========================= */

// user_id -> { key, createdAt, counter }
const sessionKeys = new Map();

const ROTATION_LIMIT = 10;          // rotate after 10 messages
const ROTATION_TIME = 5 * 60 * 1000; // or 5 minutes

function generateSessionKey() {
  return crypto.randomBytes(32); // AES-256
}

function shouldRotate(session) {
  return (
    session.counter >= ROTATION_LIMIT ||
    Date.now() - session.createdAt > ROTATION_TIME
  );
}

/* =========================
   SESSION KEY MANAGEMENT
   ========================= */

export function getSessionKey(peerId) {
  let session = sessionKeys.get(peerId);

  if (!session || shouldRotate(session)) {
    session = {
      key: generateSessionKey(),
      createdAt: Date.now(),
      counter: 0
    };
    sessionKeys.set(peerId, session);
  }

  session.counter++;
  return session.key;
}

export function destroySession(peerId) {
  sessionKeys.delete(peerId);
}

/* =========================
   AES ENCRYPTION (SESSION)
   ========================= */

export function encryptWithSessionKey(plainText, sessionKey) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    sessionKey,
    iv
  );

  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");

  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64")
  };
}

export function decryptWithSessionKey(payload, sessionKey) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    sessionKey,
    Buffer.from(payload.iv, "base64")
  );

  decipher.setAuthTag(
    Buffer.from(payload.authTag, "base64")
  );

  let decrypted = decipher.update(
    payload.ciphertext,
    "base64",
    "utf8"
  );
  decrypted += decipher.final("utf8");

  return decrypted;
}

/* =========================
   RSA KEY WRAPPING
   ========================= */

export function wrapSessionKey(sessionKey, publicKey) {
  return crypto.publicEncrypt(
    publicKey,
    sessionKey
  ).toString("base64");
}

export function unwrapSessionKey(encryptedKey, privateKey) {
  return crypto.privateDecrypt(
    privateKey,
    Buffer.from(encryptedKey, "base64")
  );
}
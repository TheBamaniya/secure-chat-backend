// verify.js

import crypto from "crypto";

const sessions = new Map(); // phone -> { challenge, publicKey, expires }

export function startVerification(phone, publicKey) {
  const challenge = crypto.randomBytes(32).toString("hex");

  sessions.set(phone, {
    challenge,
    publicKey,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes
  });

  return challenge;
}

export function completeVerification(phone, signature) {
  const session = sessions.get(phone);
  if (!session) return false;
  if (Date.now() > session.expires) return false;

  const verified = crypto.verify(
    "sha256",
    Buffer.from(session.challenge),
    session.publicKey,
    Buffer.from(signature, "base64")
  );

  if (verified) {
    sessions.delete(phone);
  }

  return verified;
}
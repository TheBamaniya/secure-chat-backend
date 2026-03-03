import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  message_id: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  payload: { type: Object, required: true }, // Stores the encrypted ciphertext/iv/tag
  sent_at: { type: Number, required: true }
});

export const Message = mongoose.model("Message", messageSchema);
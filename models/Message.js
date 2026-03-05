import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  messageId: String,
  from: String,
  to: String,
  payload: Object,
  sentAt: Number,
  delivered: { type: Boolean, default: false },
  confirmed: { type: Boolean, default: false },
  deletedForEveryone: { type: Boolean, default: false },
  deletedFor: [String]
});

export default mongoose.model("Message", MessageSchema);
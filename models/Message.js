import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  // Core Message Data
  messageId: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  
  // CRITICAL FIX: 'Mixed' allows the payload to be a simple text String right now, 
  // but also allows it to be a complex Object later when you add image/file sharing!
  payload: { type: mongoose.Schema.Types.Mixed, required: true }, 
  
  sentAt: { type: Number, required: true },

  // Delivery & Cleanup Tracking
  delivered: { type: Boolean, default: false },
  confirmed: { type: Boolean, default: false },

  // Deletion Tracking
  deletedForEveryone: { type: Boolean, default: false },
  
  // Tracks an array of User IDs if they chose "Delete for me"
  // (Useful if the user logs in on a second device later and needs to sync deletions)
  deletedFor: { type: [String], default: [] } 
});

export default mongoose.model("Message", MessageSchema);
 
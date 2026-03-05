import Message from "./models/message.js";

export function startCleanupJob() {
  setInterval(async () => {
    try {
      const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      const result = await Message.deleteMany({
        confirmed: true,
        sentAt: { $lt: dayAgo }
      });
      
      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned ${result.deletedCount} old confirmed messages`);
      }
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }, 60 * 60 * 1000); // Runs every hour
}
import http from "http";
import { WebSocketServer } from "ws";
import mongoose from "mongoose";
import { routeEvent, unregisterUser } from "./router.js";
import { startCleanupJob } from "./cleanup.js";

const PORT = process.env.PORT || 8080;

// 1. Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🟢 Mongo connected successfully"))
  .catch(err => console.error("🔴 Database connection error:", err));

// 2. Create HTTP Server (For Render's Health Checks)
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Secure Chat Server is running");
});

// 3. Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// ---------------------------------------------------------
// 4. THE HEARTBEAT (Fixes ghost users & dropped messages)
// ---------------------------------------------------------
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    // If the client didn't respond to our last ping, they closed the app
    if (ws.isAlive === false) {
      console.log("👻 Ghost connection detected. Terminating.");
      unregisterUser(ws); // Remove them from the active routing map
      return ws.terminate(); // Kill the dead socket
    }
    
    // Assume dead until they respond with a pong
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Check every 30 seconds

// 5. Handle Live Connections
wss.on("connection", (socket) => {
  console.log("⚡ New client connected");
  
  // Set up the heartbeat for this specific socket
  socket.isAlive = true;
  socket.on("pong", () => {
    socket.isAlive = true; // They responded! Mark as alive.
  });

  // Handle incoming messages
  socket.on("message", (data) => {
    try {
      const event = JSON.parse(data);
      routeEvent(socket, event);
    } catch (err) {
      console.error("⚠️ Invalid JSON received:", err);
    }
  });

  // Handle clean disconnections
  socket.on("close", () => {
    unregisterUser(socket);
  });
});

// Clean up the interval if the whole server shuts down
wss.on("close", () => {
  clearInterval(interval);
});

// 6. Start the hourly background wipe for delivered messages
startCleanupJob();

// 7. Boot up the server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
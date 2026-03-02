import http from "http";
import mongoose from "mongoose";
import { WebSocketServer } from "ws";
import { routeEvent, unregisterUser } from "./router.js";

// Render automatically provides a PORT (usually 10000)
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

// Connect to MongoDB Atlas using the URI from Render Environment Variables
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("New connection established");

  socket.on("message", (data) => {
    try {
      const event = JSON.parse(data.toString());
      routeEvent(socket, event);
    } catch (err) {
      console.error("Invalid JSON received:", err.message);
    }
  });

  socket.on("close", () => {
    unregisterUser(socket);
  });

  socket.on("error", (err) => {
    console.error("WebSocket connection error:", err.message);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Secure chat server running on http://${HOST}:${PORT}`);
});
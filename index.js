// index.js

import http from "http";
import { WebSocketServer } from "ws";
import mongoose from "mongoose"; 
import { routeEvent, unregisterUser } from "./router.js";

const PORT = process.env.PORT || 8080;

// 👇 Your exact link with "SecureChat" added in the middle
// 🔴 REMEMBER: Replace the username and password before running!
const MONGO_URI = "mongodb+srv://pushpbamne:MMK848fFZEj9x7P9@cluster0.eeo719o.mongodb.net/SecureChat?appName=Cluster0";

const server = http.createServer();
const wss = new WebSocketServer({ server });

mongoose.connect(MONGO_URI)
  .then(() => console.log("📦 Connected to MongoDB successfully"))
  .catch((err) => console.error("Database connection error:", err));

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

server.listen(PORT, () => {
  console.log(`Secure chat server running on port ${PORT}`);
});
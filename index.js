import http from "http";
import { WebSocketServer } from "ws";
import mongoose from "mongoose";
import { routeEvent, unregisterUser } from "./router.js";

const PORT = process.env.PORT || 8080;
// 🔴 REPLACE with your actual password from MongoDB Atlas
const MONGO_URI = "mongodb+srv://pushpbamne:MMK848fFZEj9x7P9@cluster0.eeo719o.mongodb.net/SecureChat?appName=Cluster0";

const server = http.createServer();
const wss = new WebSocketServer({ server });

// Connect to MongoDB with IPv4 force to bypass local DNS blocks
mongoose.connect(MONGO_URI, { family: 4 })
  .then(() => console.log("📦 Connected to MongoDB successfully"))
  .catch((err) => console.error("Database connection error:", err.message));

wss.on("connection", (socket) => {
  console.log("New connection");
  socket.on("message", (data) => {
    try {
      const event = JSON.parse(data.toString());
      routeEvent(socket, event);
    } catch (err) {
      console.error("Invalid JSON:", err.message);
    }
  });
  socket.on("close", () => unregisterUser(socket));
  socket.on("error", (err) => console.error("Socket error:", err.message));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
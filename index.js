import http from "http";
import { WebSocketServer } from "ws";
import mongoose from "mongoose";
import { routeEvent, unregisterUser } from "./router.js";

const PORT = process.env.PORT || 8080;

// Mongo connect (assuming fixed URI)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected"))
  .catch(err => console.error("Database connection error:", err));

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Server is running");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("New connection");

  socket.on("message", (data) => {
    try {
      const event = JSON.parse(data);
      routeEvent(socket, event);
    } catch (err) {
      console.error("Invalid JSON:", err);
    }
  });

  socket.on("close", () => {
    unregisterUser(socket);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
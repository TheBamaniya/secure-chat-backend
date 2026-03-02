import http from "http";
import { WebSocketServer } from "ws";
import { routeEvent, unregisterUser } from "./router.js";

const PORT = process.env.PORT || 8080;

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("New connection established");

  socket.on("message", (data) => {
    try {
      // .toString() guarantees safe parsing even if data arrives as a raw Buffer
      const event = JSON.parse(data.toString());
      routeEvent(socket, event);
    } catch (err) {
      console.error("Invalid JSON received:", err.message);
    }
  });

  socket.on("close", () => {
    unregisterUser(socket);
  });

  // Catches sudden network drops from mobile devices so the server doesn't crash
  socket.on("error", (err) => {
    console.error("WebSocket connection error:", err.message);
  });
});

server.listen(PORT, () => {
  console.log(`Secure chat server running on port ${PORT}`);
});
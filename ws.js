import { WebSocketServer } from "ws";
import { routeEvent, registerUser, unregisterUser } from "./router.js";

export function startWebSocket(port) {
  const server = new WebSocketServer({ port });

  console.log("WebSocket server listening on port", port);

  server.on("connection", (socket) => {
    console.log("New connection (not yet identified)");

    socket.on("message", (data) => {
      const event = JSON.parse(data.toString());
      routeEvent(socket, event);
    });

    socket.on("close", () => {
      unregisterUser(socket);
      console.log("Connection closed");
    });
  });
}
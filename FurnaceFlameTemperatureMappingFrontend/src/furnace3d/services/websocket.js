// src/furnace3d/services/websocket.js
let socket = null;

export function connectWebSocket(runId, onMessage) {
  const wsUrl = `wss://abhiftm.com/api/ws/${runId}`; // adjust to real endpoint
  socket = new WebSocket(wsUrl);
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "update" && data.payload) {
      onMessage(data.payload);
    }
  };
  socket.onerror = (err) => console.error("WebSocket error", err);
  return socket;
}

export function disconnectWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}
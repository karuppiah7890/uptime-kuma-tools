// Create WebSocket connection.
const socket = new WebSocket("ws://localhost:3001");

// Connection opened
socket.addEventListener("open", (event) => {
  console.log("Connection to Server is Opened!", event.data);
});

// Listen for messages
socket.addEventListener("message", (event) => {
  console.log("Message from server ", event.data);
});


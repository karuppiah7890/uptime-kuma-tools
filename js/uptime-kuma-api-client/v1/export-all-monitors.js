const { io } = require("socket.io-client");
const fs = require('fs')

console.log("starting now")

const socket = io(process.env.UPTIME_KUMA_URI)

console.log("listening for events");

// For Debugging
socket.onAny((eventName, ...args) => {
  console.log(`OnAny event. Event Name: ${eventName}. onAny Args: ${args}`); // [ 1, '2', { 3: '4', 5: ArrayBuffer (1) [ 6 ] } ]
});
socket.onAnyOutgoing((eventName, ...args) => {
  console.log(`onAnyOutgoing event. Event Name: ${eventName}. onAny Args: ${args}`); // [ 1, '2', { 3: '4', 5: ArrayBuffer (1) [ 6 ] } ]
});

socket.io.on("error", (error) => {
  console.log(`connection error. cause: ${error.cause}. message: ${error.message}. name: ${error.name}. stack: ${error.stack}`);
  console.log(error);
});

socket.io.on("ping", () => {
  console.log("ping");
});

socket.io.on("reconnect", (attempt) => {
  console.log(`reconnect. attempt ${attempt} `);
});

socket.io.on("reconnect_attempt", (attempt) => {
  console.log(`reconnect_attempt. attempt ${attempt} `);
});

socket.io.on("reconnect_error", (error) => {
  console.log(`reconnect error: ${error}`);
  console.log(error);
});

function login() {
    const loginCredentials = {
        username: process.env.UPTIME_KUMA_USERNAME,
        password: process.env.UPTIME_KUMA_PASSWORD
    }

    // Listen to monitorList event before logging in, so that you can capture the event
    socket.emit("login", loginCredentials, (response) => {
        console.log(`Login Response: ${JSON.stringify(response)}`)
        if (response.ok) {
            console.log("We are logged in! :D")
        }
    })
}

socket.on("monitorList", (data) => {
    console.log(`Monitor List is: ${JSON.stringify(data)}`)
})

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    login()
})

socket.on("connect_error", (error) => {
  if (socket.active) {
    // temporary failure, the socket will automatically try to reconnect
    console.log("socket is active. temporary failure. the socket will automatically try to reconnect");
    console.log(error);
  } else {
    // the connection was denied by the server
    // in that case, `socket.connect()` must be manually called in order to reconnect
    console.log(`socket is inactive. the connection was denied by the server. in that case, socket.connect() must be manually called in order to reconnect. Error: ${error} Error message: ${error.message}`);
    console.log(error);
  }
});

socket.on("disconnect", () => {
  console.log(`We are connected to the server (True/False): ${socket.connected}`); // false
});

// client-side. Socket ID
socket.on("connect", () => {
  console.log(`We are on client side. Socket ID is: ${socket.id}`); // For Example: x8WIv7-mJelg7on_ALbx
  console.log(`We are connected to the server (True/False): ${socket.connected}`); // For Example: true
});

console.log("maybe not getting loginRequired event. logging in on our own");
login()

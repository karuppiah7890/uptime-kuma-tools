const { io } = require("socket.io-client");

const socket = io("http://localhost:3001");

// client-side. Socket ID
socket.on("connect", () => {
  console.log(`We are on client side. Socket ID is: ${socket.id}`); // For Example: x8WIv7-mJelg7on_ALbx
  console.log(`We are connected to the server (True/False): ${socket.connected}`); // For Example: true
});

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    const loginCredentials = {
        username: "admin",
        password: "admin123"
    }

    // Listen to monitorList event before logging in, so that you can capture the event
    socket.emit("login", loginCredentials, (response) => {
        console.log(`Login Response: ${JSON.stringify(response)}`)
        if (response.ok) {
            console.log("We are logged in! :D")
        }

        const addMonitorRequestData = {
            type: "group",
            name: `Group ${Math.random()*1000}`,
            accepted_statuscodes: []
        }

        socket.emit("add", addMonitorRequestData, (response) => {
            console.log(`Monitor Addition Response: ${JSON.stringify(response)}`)

            if (response.ok) {
                console.log("Monitor Added Successfully")
            }
        })
    })
})

socket.on("monitorList", (data) => {
    console.log(`Monitor List is: ${JSON.stringify(data)}`)
})

socket.on("disconnect", () => {
  console.log(`We are connected to the server (True/False): ${socket.connected}`); // false
});

const utils = require('../utils.js')
const { io } = require("socket.io-client");
const fs = require('fs')

console.log("starting now")

const socket = io(process.env.UPTIME_KUMA_URI)

console.log("listening for events");

utils.listenOnSocketManager(socket)

socket.on("monitorList", (data) => {
    console.log(`Monitor List is: ${JSON.stringify(data)}`)
    fs.writeFileSync(`list-of-monitors-${Date.now()}.json`, JSON.stringify(data, null, 2))

    for (const monitorID in data) {
        console.log(`deleting ${monitorID}`);
        // Please ensure you are connected to the v2.0.0-beta.3 version of Uptime Kuma. Please comment this line in the source code to proceed
        throw new Error("Please ensure you are connected to the v2.0.0-beta.3 version of Uptime Kuma. Please comment this line in the source code to proceed. And uncomment the delete monitor event emission");
        // socket.emit("deleteMonitor", monitorID, (response) => {
        //     console.log(response);
        // })
    }
})

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    utils.login(socket)
})

utils.listenOnSocket(socket)

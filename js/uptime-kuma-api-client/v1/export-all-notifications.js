const utils = require('../utils.js')
const { io } = require("socket.io-client");
const fs = require('fs')

console.log("starting now")

const socket = io(process.env.UPTIME_KUMA_URI)

console.log("listening for events");

utils.listenOnSocketManager(socket)

socket.on("notificationList", (data) => {
    console.log(`Notification List is: ${JSON.stringify(data)}`)
    fs.writeFileSync(`list-of-notifications-${Date.now()}.json`, JSON.stringify(data, null, 2))
})

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    utils.login(socket)
})

utils.listenOnSocket(socket)

// console.log("maybe not getting loginRequired event. logging in on our own");
// utils.login(socket)

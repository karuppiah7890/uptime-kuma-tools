const utils = require('../utils.js')
const { io } = require("socket.io-client");
const fs = require('fs')

console.log("starting now")

const socket = io(process.env.UPTIME_KUMA_URI)

console.log("listening for events");

utils.listenOnSocketManager(socket)

socket.on("statusPageList", (statusPages) => {
    console.log(`Status Pages List is: ${JSON.stringify(statusPages)}`)
    fs.writeFileSync(`list-of-status-pages-${Date.now()}.json`, JSON.stringify(statusPages, null, 2))

    for (const statusPageID in statusPages) {
        const statusPage = statusPages[statusPageID]
        const statusPageSlug = statusPage.slug;
        console.log(`deleting status page slug: ${statusPageSlug}`);
        // Please ensure you are connected to the v2.0.0-beta.3 version of Uptime Kuma. Please comment this line in the source code to proceed
        // throw new Error("Please ensure you are connected to the v2.0.0-beta.3 version of Uptime Kuma. Please comment this line in the source code to proceed. And uncomment the delete status page event emission");
        socket.emit("deleteStatusPage", statusPageSlug, (response) => {
            console.log(`response for deleting slug ${statusPageSlug}: ${JSON.stringify(response)}`);

            if (response.ok) {
                console.log(`deleted slug ${statusPageSlug} successfully: ${JSON.stringify(response)}`);
            } else {
                console.log(`slug ${statusPageSlug} deletion failed. response: ${JSON.stringify(response)}`);
                throw Error(`slug ${statusPageSlug} deletion failed. response: ${JSON.stringify(response)}`)
            }
        })
    }
})

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    utils.login(socket)
})

utils.listenOnSocket(socket)

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
})

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    utils.login(socket, () => {
        const monitorsAdded = {}

        const monitors = JSON.parse(String(fs.readFileSync("all-monitors.json")))

        while(monitors.length !== Object.keys(monitorsAdded).length) {

            for (const monitorID in monitors) {
                if (monitorID in monitorsAdded) {
                    continue
                }

                const monitor = monitors[monitorID]

                // Only add group monitors for now
                if (monitor.type !== "group") {
                    monitorsAdded[monitorID] = "some-dummy-bad-non-number-value"
                    continue
                }

                let parent = null

                if (monitor.parent) {
                    if (monitor.parent in monitorsAdded) {
                        parent = monitorsAdded[monitor.parent]
                    } else {
                        console.log("Found a parent that is NOT added yet!");
                        continue
                    }
                }

                const addMonitorRequestData = {
                    type: monitor.type,
                    name: monitor.name,
                    accepted_statuscodes: [], // Not used I think. Check once and verify
                    notificationIDList: [], // Not used I think. Check once and verify
                    interval: monitor.interval,
                    maxretries: monitor.maxretries,
                    retryInterval: monitor.retryInterval,
                    resendInterval: monitor.resendInterval,
                    upsideDown: monitor.upsideDown,
                    parent: parent,
                    description: monitor.description,
                }

                console.log(addMonitorRequestData);

                socket.emit("add", addMonitorRequestData, (response) => {
                    console.log(`Monitor Addition Response: ${JSON.stringify(response)}`)

                    if (response.ok) {
                        console.log("Monitor Added Successfully")
                        monitorsAdded[monitorID] = response.monitorID

                        console.log(`monitors added: ${JSON.stringify(monitorsAdded)}`);
                    }
                })
            }
        }
    })
})

utils.listenOnSocket(socket)

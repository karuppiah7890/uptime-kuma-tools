const utils = require('../utils.js')
const { io } = require("socket.io-client");
const fs = require('fs');

console.log("starting now")

const socket = io(process.env.UPTIME_KUMA_URI)

console.log("listening for events");

utils.listenOnSocketManager(socket)

socket.on("monitorList", (data) => {
    console.log(`Monitor List is: ${JSON.stringify(data)}`)
    fs.writeFileSync(`list-of-monitors-${Date.now()}.json`, JSON.stringify(data, null, 2))
})

// mapping of Old Monitor ID to New Monitor ID
const monitorsAdded = {}

const oldMonitors = JSON.parse(String(fs.readFileSync("all-monitors.json")))

function addMonitorsWithParent(oldMonitorIDOfTheParentToLookFor) {
    for (const oldMonitorID in oldMonitors) {
        console.log(`current monitors added: ${JSON.stringify(monitorsAdded)}`);

        if (oldMonitorID in monitorsAdded) {
            continue
        }

        const oldMonitor = oldMonitors[oldMonitorID]

        // Only add group monitors for now
        if (oldMonitor.type !== "group") {
            monitorsAdded[oldMonitorID] = "some-dummy-bad-non-number-value"
            continue
        }

        if (oldMonitor.parent != oldMonitorIDOfTheParentToLookFor) {
            continue
        }

        let parent = null

        if (oldMonitor.parent) {
            if (oldMonitor.parent in monitorsAdded) {
                parent = monitorsAdded[oldMonitor.parent]
            } else {
                console.log("Found a parent that is NOT added yet!");
                continue
            }
        }

        const addMonitorRequestData = {
            type: oldMonitor.type,
            name: oldMonitor.name,
            accepted_statuscodes: [], // Not used I think. Check once and verify
            notificationIDList: [], // Not used I think. Check once and verify
            interval: oldMonitor.interval,
            maxretries: oldMonitor.maxretries,
            retryInterval: oldMonitor.retryInterval,
            resendInterval: oldMonitor.resendInterval,
            upsideDown: oldMonitor.upsideDown,
            parent: parent,
            description: oldMonitor.description,
        }

        console.log(addMonitorRequestData);

        socket.emit("add", addMonitorRequestData, (response) => {
            console.log(`Monitor Addition Response: ${JSON.stringify(response)}`)

            if (response.ok) {
                console.log("Monitor Added Successfully")
                const newMonitorID = response.monitorID
                monitorsAdded[oldMonitorID] = newMonitorID
                addMonitorsWithParent(oldMonitorID)

                console.log(`updated monitors added: ${JSON.stringify(monitorsAdded)}`);
            }
        })
    }
}

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    utils.login(socket, () => {
        addMonitorsWithParent(null)
    })
})

utils.listenOnSocket(socket)

// get old monitors list (in v1)

// get new monitors list (in v2)

// iterate through each old monitor {
//     - if old monitor has notifications, get the notification IDs (in v1) and check if it's enabled
//     - get the new notification ID (in v2) given the old notification ID (in v1)

//     - get the corresponding new monitor given the old monitor ID and the mapping of old monitor ID to new monitor ID

//     - modify local new monitor with notifications - using the new notification ID. and don't modify any existing notifications
//     - save the new monitor to uptime kuma
// }

const utils = require('../utils.js')
const { io } = require("socket.io-client");
const fs = require('fs')

console.log("starting now")

const socket = io(process.env.UPTIME_KUMA_URI)

console.log("listening for events");

utils.listenOnSocketManager(socket)

// mapping of Old Monitor ID to New Monitor ID for updated monitors
const monitorsUpdated = {}

// get old monitors list (in v1)
const oldMonitors = JSON.parse(String(fs.readFileSync(process.env.UPTIME_KUMA_MONITORS_TO_UPDATE_JSON)))

const notificationIDMapping = JSON.parse(String(fs.readFileSync(process.env.UPTIME_KUMA_NOTIFICATION_ID_MAPPING_JSON)))

const listOfMonitorsAdded = JSON.parse(String(fs.readFileSync(process.env.UPTIME_KUMA_LIST_OF_MONITORS_ADDED_JSON)))

function writeToListOfMonitorsUpdatedFile(monitorsUpdated) {
    fs.writeFileSync(`list-of-monitors-updated-${Date.now()}.json`, JSON.stringify(monitorsUpdated, null, 2))
}

function editMonitor(oldMonitorID, correspondingNewMonitor) {
    return new Promise((resolve, reject) => {
        // save the new monitor to uptime kuma
        socket.emit("editMonitor", correspondingNewMonitor, (response) => {
            console.log(`monitor edition response: ${JSON.stringify(response)}`)

            if (response.ok) {
                console.log("monitor edited successfully")
                const newMonitorID = response.monitorID
                monitorsUpdated[oldMonitorID] = newMonitorID

                console.log(`updated monitors edited: ${JSON.stringify(monitorsUpdated)}`);
                writeToListOfMonitorsUpdatedFile(monitorsUpdated)
                resolve()
            } else {
                reject(new Error(`error editing monitor id ${correspondingNewMonitor.id}! response: ${JSON.stringify(response, null, 2)}`))
            }
        })
    })
}

let workStarted = false

// get new monitors list (in v2)
socket.on("monitorList", async (data) => {
    console.log(`Monitor List is: ${JSON.stringify(data)}`)
    fs.writeFileSync(`list-of-monitors-${Date.now()}.json`, JSON.stringify(data, null, 2))

    if (workStarted) {
        console.log("work has already started. we are already updating the notification list in all the monitors");
        return
    }

    // iterate through each old monitor
    for (const oldMonitorID in oldMonitors) {
        workStarted = true

        const oldMonitor = oldMonitors[oldMonitorID]

        const oldNotificationIDList = oldMonitor.notificationIDList
        const newNotificationIDList = {}

        //  if old monitor has notifications, get the notification IDs (in v1) and check if it's enabled
        for (const oldNotificationID in oldNotificationIDList) {
            const isOldNotificationEnabled = oldNotificationIDList[oldNotificationID]
            // check if it's enabled
            if (isOldNotificationEnabled) {
                // get the new notification ID (in v2) given the old notification ID (in v1)
                const newNotificationID = notificationIDMapping[oldNotificationID]
                newNotificationIDList[newNotificationID] = true
            }
        }

        // get the corresponding new monitor given the old monitor ID and the mapping of old monitor ID to new monitor ID
        const correspondingNewMonitorID = listOfMonitorsAdded[oldMonitorID]

        const correspondingNewMonitor = data[correspondingNewMonitorID]

        const existingNotificationIDList = correspondingNewMonitor.notificationIDList

        // modify local new monitor with notifications - using the new notification ID.
        // and don't modify any existing notifications
        correspondingNewMonitor.notificationIDList = {
            ...newNotificationIDList,
            ...existingNotificationIDList
        }

        try {
            // save the new monitor to uptime kuma
            await editMonitor(oldMonitorID, correspondingNewMonitor)
        } catch (err) {
            throw err
        }
    }

})

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    utils.login(socket)
})

utils.listenOnSocket(socket)

// console.log("maybe not getting loginRequired event. logging in on our own");
// utils.login(socket)

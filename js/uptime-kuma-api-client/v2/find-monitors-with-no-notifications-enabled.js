const fs = require('fs');

const monitors = JSON.parse(String(fs.readFileSync(process.env.UPTIME_KUMA_MONITORS_JSON)))

const monitorIDsWithNoNotificationsEnabled = []

for (const monitorID in monitors) {
    console.log(`Processing ${monitorID}`)

    const monitor = monitors[monitorID]

    if (monitor.type === "group") {
        // ignore group monitors
        continue
    }

    if (monitor.type !== "http" && monitor.type !== "json-query") {
        // ignore all monitors that are neither http nor json-query
        continue
    }

    const {notificationIDList} = monitor

    const notificationIDs = Object.keys(notificationIDList)

    if (notificationIDs.length === 0) {
        monitorIDsWithNoNotificationsEnabled.push(monitorID)
        continue
    }

    const notificationEnabledStatus = Object.values(notificationIDList)

    for (const isNotificationEnabled of notificationEnabledStatus) {
        if (!isNotificationEnabled) {
            monitorIDsWithNoNotificationsEnabled.push(monitorID)
            break
        }
    }
}

console.log("Monitor IDs with No Notification Enabled:");

console.log(monitorIDsWithNoNotificationsEnabled);

console.log(`Number of Monitors with No Notification Enabled: ${monitorIDsWithNoNotificationsEnabled.length}`);

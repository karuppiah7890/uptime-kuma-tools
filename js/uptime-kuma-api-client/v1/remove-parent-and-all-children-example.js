const fs = require('fs');
const { getMonitorsAndTheirParents } = require("../v2/utils");

const monitors = JSON.parse(String(fs.readFileSync(process.env.UPTIME_KUMA_MONITORS_TO_PROCESS_JSON)))

const {
    monitorIDsWithoutParent,
    monitorIDsWithTheirChildren,
} = getMonitorsAndTheirParents(monitors)

function removeAll(name) {
    for (const monitorIDWithoutParent of monitorIDsWithoutParent) {
        const monitor = monitors[monitorIDWithoutParent]

        if (monitor.name.toLowerCase().includes(name.toLowerCase()) || monitor.pathName.toLowerCase().includes(name.toLowerCase())) {
            removeAllChildrenOf(monitor.id)

            delete monitors[monitor.id]
        }
    }
}

function removeAllChildrenOf(monitorID) {
    const childrenMonitors = monitorIDsWithTheirChildren[monitorID]
    for (const childMonitorID of childrenMonitors) {
        removeAllChildrenOf(childMonitorID)

        delete monitors[childMonitorID]
    }
}

// For example, remove SGCRM root level parent and all it's children
removeAll("sgcrm")

fs.writeFileSync(`list-of-filtered-monitors-${Date.now()}.json`, JSON.stringify(monitors, null, 2))

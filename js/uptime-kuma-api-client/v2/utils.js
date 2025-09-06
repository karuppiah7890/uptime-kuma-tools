function getMonitorsAndTheirParents(oldMonitors) {
    const oldMonitorIDsWithoutParent = []
    const oldMonitorIDsWithTheirChildren = {}
    for (const oldMonitorID in oldMonitors) {
        if (!(oldMonitorID in oldMonitorIDsWithTheirChildren)) {
            oldMonitorIDsWithTheirChildren[oldMonitorID] = []
        }

        const oldMonitor = oldMonitors[oldMonitorID]

        if (!oldMonitor.parent) {
            oldMonitorIDsWithoutParent.push(oldMonitorID)
            continue
        }

        if (!(oldMonitor.parent in oldMonitorIDsWithTheirChildren)) {
            oldMonitorIDsWithTheirChildren[oldMonitor.parent] = []
        }

        oldMonitorIDsWithTheirChildren[oldMonitor.parent].push(oldMonitorID)
    }

    return {
        oldMonitorIDsWithoutParent,
        oldMonitorIDsWithTheirChildren,
    }
}

module.exports = {
    getMonitorsAndTheirParents,
}

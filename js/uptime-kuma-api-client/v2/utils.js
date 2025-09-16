function getMonitorsAndTheirParents(monitors) {
    const monitorIDsWithoutParent = []
    const monitorIDsWithTheirChildren = {}
    for (const monitorID in monitors) {
        if (!(monitorID in monitorIDsWithTheirChildren)) {
            monitorIDsWithTheirChildren[monitorID] = []
        }

        const monitor = monitors[monitorID]

        if (!monitor.parent) {
            monitorIDsWithoutParent.push(monitorID)
            continue
        }

        if (!(monitor.parent in monitorIDsWithTheirChildren)) {
            monitorIDsWithTheirChildren[monitor.parent] = []
        }

        monitorIDsWithTheirChildren[monitor.parent].push(monitorID)
    }

    return {
        monitorIDsWithoutParent,
        monitorIDsWithTheirChildren,
    }
}

module.exports = {
    getMonitorsAndTheirParents,
}

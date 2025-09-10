const utils = require('../utils.js')
const { io } = require("socket.io-client")
const fs = require('fs')
const { group } = require('console')

console.log("starting now")

const socket = io(process.env.UPTIME_KUMA_URI)

console.log("listening for events")

utils.listenOnSocketManager(socket)

const statusPageSlugsWithMonitorGroups = {
    incrm: [],
    tatacrm: [],
    eucrm: [],
    uscrm: [],
    asiacrm: [],
    nightly: [],
    staging: [],
}

const aliasNameMapping = {
    // top level path / status page slug aliases
    stage: "staging",
    staging: "stage",

    // second level path / group name aliases
    developertools: "devlopertools",
    devlopertools: "developertools",
}

const preferredNameFor = {
    // top level path / status page slug preferred names
    stage: "staging",

    // second level path / group name preferred names
    devlopertools: "Developer Tools",
    mongo: "Mongo DB",
    redis: "Redis",
    elasticsearch: "Elastic Search",
    events: "Kafka",
    rmq: "RabbitMQ",
    others: "Others"
}

const statusPageSlugs = Object.keys(statusPageSlugsWithMonitorGroups)

const topLevelPathsToConsider = statusPageSlugs

const secondLevelPathsToConsider = ["mongo", "redis", "events", "others", "elasticsearch", "developertools", "rmq"]

socket.on("monitorList", (monitors) => {
    console.log(`Monitor List is: ${JSON.stringify(monitors)}`)
    fs.writeFileSync(`list-of-monitors-${Date.now()}.json`, JSON.stringify(monitors, null, 2))

    for (const monitorID in monitors) {
        console.log(`processing monitor id: ${monitorID}`)

        const monitor = monitors[monitorID]
        if (monitor.type === "group") {
            console.log("skipping group monitors")
            continue
        }

        if (monitor.type !== "http" & monitor.type !== "json-query") {
            console.log("skipping monitors that are neither http type nor json-query type")
            continue
        }

        if (!monitor.path) {
            throw new Error(`monitor id ${monitorID} does NOT have a path field!!! check if you are working with v1. v2 has path field for every monitor and also pathName, unlike v1 which has only pathName field`)
        }

        if (!Array.isArray(monitor.path)) {
            throw new Error(`monitor id ${monitorID} path field is not an array!!! it should be an array!!`)
        }

        if (monitor.path.length !== 3) {
            // TODO: Ideally we should throw error here, but, for now, we are just logging it so that we can understand the data and clean it
            console.log(`expected monitor to have path[] array length of 3, but that was not the case for monitor id: ${monitorID}`)
            continue
        }

        const topLevelPath = monitor.path[0].toLowerCase()

        if (!strinArrayIncludes(topLevelPathsToConsider, topLevelPath)) {
            console.log(`encountered top level path that we don't consider: ${topLevelPath}. monitor id: ${monitorID}`)
            continue
        }

        const secondLevelPath = monitor.path[1].toLowerCase()

        if (!strinArrayIncludes(secondLevelPathsToConsider, secondLevelPath)) {
            console.log(`encountered second level path that we don't consider: ${secondLevelPath}. monitor id: ${monitorID}`)
            continue
        }

        const thirdLevelPath = monitor.path[2].toLowerCase()

        if (!thirdLevelPath.includes(topLevelPath)) {
            throw new Error(`encountered third level path to NOT contain top level path. third level path: ${thirdLevelPath}. top level path: ${topLevelPath}. monitor id: ${monitorID}`)
        }

        if (["mongo", "redis", "elasticsearch", "events", "rmq"].includes(secondLevelPath)) {
            if (!thirdLevelPath.includes(secondLevelPath)) {
                throw new Error(`encountered third level path to NOT contain second level path. third level path: ${thirdLevelPath}. second level path: ${topLevelPath}. top level path: ${topLevelPath}. monitor: ${monitorID}`)
            }
        }

        const groupName = getPreferredName(secondLevelPath)
        const statusPageSlug = getPreferredName(topLevelPath)

        const monitorGroups = statusPageSlugsWithMonitorGroups[statusPageSlug]

        let groupIndex = findGroupIndex(monitorGroups, groupName)

        if (groupIndex) {
            statusPageSlugsWithMonitorGroups[statusPageSlug][groupIndex].monitorList.push({ id: monitorID })
        } else {
            statusPageSlugsWithMonitorGroups[statusPageSlug].push({ name: groupName, monitorList: [{ id: monitorID }] })
        }
    }

    console.log(`Status Page Slugs With Monitor Groups is: ${JSON.stringify(statusPageSlugsWithMonitorGroups)}`)
    fs.writeFileSync(`status-page-slugs-with-monitor-groups-${Date.now()}.json`, JSON.stringify(statusPageSlugsWithMonitorGroups, null, 2))
})

function getPreferredName(name) {
    if (name in preferredNameFor) {
        return preferredNameFor[name]
    }

    return name
}

function strinArrayIncludes(stringArray, elementToLookFor) {
    if (stringArray.includes(elementToLookFor)) {
        return true
    }

    if (elementToLookFor in aliasNameMapping) {
        const aliasNameOfElementToLookFor = aliasNameMapping[elementToLookFor]
        if (stringArray.includes(aliasNameOfElementToLookFor)) {
            return true
        }
    }

    return false
}

function findGroupIndex(monitorGroups, groupName) {
    let groupIndex = null

    for (index in monitorGroups) {
        const group = monitorGroups[index]

        if (group.name === groupName) {
            groupIndex = index
            break
        }
    }

    return groupIndex
}

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    utils.login(socket)
})

utils.listenOnSocket(socket)

// console.log("maybe not getting loginRequired event. logging in on our own")
// utils.login(socket)

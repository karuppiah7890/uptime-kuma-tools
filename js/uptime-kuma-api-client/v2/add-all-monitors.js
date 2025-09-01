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

function getRequestDataForAddMonitorOperation(oldMonitor, parent) {

    // TODO:
    // 1. Check if we need to add timeout for group
    // 2. Check if we need to add weight for everything

    // Ignoring a lot of the fields for the different types we use

    const {
        active,
        // forceInactive,
        type,
        name,
        interval,
        maxretries,
        retryInterval,
        resendInterval,
        upsideDown,
        description,
        // maintenance,
    } = oldMonitor

    const base = {
        active,
        // forceInactive,
        type,
        name,
        accepted_statuscodes: [], // Not used I think. Check once and verify
        notificationIDList: [], // DONT Setup Notification for now
        interval,
        maxretries,
        retryInterval,
        resendInterval,
        upsideDown,
        parent: parent,
        description,
        // maintenance,
    }

    if (oldMonitor.type === "group") {
        return base
    }

    if (oldMonitor.type === "json-query" || oldMonitor.type === "http") {
        const {
            method,
            headers,
            body,
            url,
            httpBodyEncoding,
            accepted_statuscodes,
            maxredirects,
            timeout,
            expiryNotification,
            ignoreTls,
            authMethod,
            basic_auth_user,
            basic_auth_pass,
            oauth_client_id,
            oauth_client_secret,
            oauth_token_url,
            oauth_scopes,
            oauth_auth_method,
            authWorkstation,
            authDomain,
            tlsCa,
            tlsCert,
            tlsKey,
        } = oldMonitor


        const addMonitorRequestDataForHTTPMonitor = {
            ...base,
            method,
            headers,
            body,
            url,
            httpBodyEncoding,
            accepted_statuscodes,
            maxredirects,
            timeout,
            expiryNotification,
            ignoreTls,
            authMethod,
            basic_auth_user,
            basic_auth_pass,
            oauth_client_id,
            oauth_client_secret,
            oauth_token_url,
            oauth_scopes,
            oauth_auth_method,
            authWorkstation,
            authDomain,
            tlsCa,
            tlsCert,
            tlsKey,
        }

        if (oldMonitor.type === "http") {
            return addMonitorRequestDataForHTTPMonitor
        }

        const {
            jsonPath,
            expectedValue
        } = oldMonitor

        let {
            jsonPathOperator
        } = oldMonitor

        if (!jsonPathOperator) {
            jsonPathOperator = "=="
            // Other values for JSON Path Operator are: < , > , <= , >= , contains
        }

        const addMonitorRequestDataForJSONQueryMonitor = {
            ...addMonitorRequestDataForHTTPMonitor,
            jsonPath,
            jsonPathOperator,
            expectedValue,
        }

        return addMonitorRequestDataForJSONQueryMonitor
    }

    return null
}

function addMonitorsWithParent(oldMonitorIDOfTheParentToLookFor) {
    for (const oldMonitorID in oldMonitors) {
        console.log(`current monitors added: ${JSON.stringify(monitorsAdded)}`);

        if (oldMonitorID in monitorsAdded) {
            continue
        }

        const oldMonitor = oldMonitors[oldMonitorID]

        if (oldMonitor.type !== "group" && oldMonitor.type !== "json-query" && oldMonitor.type !== "http") {
            monitorsAdded[oldMonitorID] = "dummy"
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

        const addMonitorRequestData = getRequestDataForAddMonitorOperation(oldMonitor, parent)

        if (addMonitorRequestData === null) {
            continue
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

// console.log("maybe not getting loginRequired event. logging in on our own");
// utils.login(socket, () => {
//     addMonitorsWithParent(null)
// })

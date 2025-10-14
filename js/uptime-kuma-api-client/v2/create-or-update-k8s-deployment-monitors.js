// This takes care of adding and updating monitors for deployments in the Kubernetes cluster. It gets it's data about deployments using Prometheus which has
// metrics about the kubernetes clusters. This DOES NOT take care of adding monitors for other resources / resource types - like daemonsets, statefulsets etc
const utils = require('../utils.js')
const { io } = require("socket.io-client");
const fs = require('fs');

console.log("starting now")
const socket = io(process.env.UPTIME_KUMA_URI)

console.log("listening for events");
utils.listenOnSocketManager(socket)

socket.on("monitorList", (data) => {
    console.log(`monitor List is: ${JSON.stringify(data)}`)
    fs.writeFileSync(`list-of-monitors-${Date.now()}.json`, JSON.stringify(data, null, 2))
})

async function buildMonitorData() {
    const deploymentMonitorJSONPath = "($count(data.result) = 0)"

    const allMonitors = JSON.parse(String(fs.readFileSync(process.env.UPTIME_KUMA_MONITORS_JSON)))

    // Get monitor names and IDs from Uptime Kuma API
    const monitorInfo = []

    for (const monitorID in allMonitors) {
        const monitor = allMonitors[monitorID]
        monitorInfo.push({
            "name": monitor.name,
            "id": monitorID
        })
    }

    // Dictionary containing URLs and their corresponding environment names
    const deploymentInfoURLMapping = {
        "https://prometheus.tools-a-crm-seacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
            "env": "seacrm",
            "basicAuthPass": process.env.SEACRM_TOOLS_USER_PASSWORD
        },
        "https://prometheus.tools-a-crm-incrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
            "env": "incrm",
            "basicAuthPass": process.env.INCRM_TOOLS_USER_PASSWORD
        },
        "https://prometheus.tools-a-crm-eucrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
            "env": "eucrm",
            "basicAuthPass": process.env.EUCRM_TOOLS_USER_PASSWORD
        },
        "https://prometheus.tools-a-crm-asiacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
            "env": "asiacrm",
            "basicAuthPass": process.env.ASIACRM_TOOLS_USER_PASSWORD
        },
        "https://prometheus.tools-a-crm-tatacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
            "env": "tatacrm",
            "basicAuthPass": process.env.TATACRM_TOOLS_USER_PASSWORD
        },
        "https://prometheus.tools-a-crm-uscrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
            "env": "uscrm",
            "basicAuthPass": process.env.USCRM_TOOLS_USER_PASSWORD
        },
        "https://prometheus.tools-a-crm-ushc-crm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
            "env": "ushc",
            "basicAuthPass": process.env.USHC_CRM_TOOLS_USER_PASSWORD
        },
        // Add more URL-prefix pairs here
    }


    // Define filtering conditions
    const filterConditions = [
        { "prefix": "coredns" },
        { "prefix": "ebs-csi-controller" },
        { "prefix": "efs-csi-controller" },
        { "prefix": "facets-mutating-webhook" },
        // Add more conditions here
    ]

    //  In-memory lists to store valid deployment names
    const existingDeploymentMonitorsToUpdate = []
    const newDeploymentMonitorsToAdd = []

    console.log("Processing names of all deployments")

    // Process each URL
    for (const url in deploymentInfoURLMapping) {
        console.log(`Processing URL: ${url}`)

        const config = deploymentInfoURLMapping[url]
        const environment = config.env
        const basicAuthPass = config.basicAuthPass
        const basicAuth = `tools-auser:${basicAuthPass}`
        const authPrefix = Buffer.from(basicAuth).toString('base64')

        let response

        try {
            response = await fetch(url, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${authPrefix}`
                }
            })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, url: ${url}`);
            }
        } catch (error) {
            console.error(`Error fetching data from URL: ${url}`, error);
            process.exit(1)
        }

        let jsonData

        try {
            jsonData = await response.json();
            console.log(`Response for ${url}:`)
            console.log(jsonData);
        } catch (error) {
            console.error(`Error getting JSON from URL response body for URL ${url}`, error);
            process.exit(1)
        }

        if (jsonData.data && jsonData.data.result) {
            const deployments = jsonData.data.result

            for (const deployment of deployments) {
                const deploymentName = deployment.metric.deployment

                for (const condition of filterConditions) {
                    const prefixCondition = condition.prefix

                    if (!deploymentName.startsWith(prefixCondition)) {
                        continue
                    }

                    const forbiddenSubstring = condition.forbiddenSubstring
                    let validSubstring = true

                    if (forbiddenSubstring && deploymentName.includes(forbiddenSubstring)) {
                        validSubstring = false
                    }

                    if (!validSubstring) {
                        continue
                    }

                    const fullDeploymentName = `${environment}-${deploymentName}`

                    let monitorFound = false

                    for (const monitor of monitorInfo) {
                        if (fullDeploymentName.includes(monitor.name)) {
                            monitorFound = true
                            existingDeploymentMonitorsToUpdate.push({
                                id: monitor.id,
                                name: fullDeploymentName,
                            })
                            break
                        }
                    }

                    if (!monitorFound) {
                        newDeploymentMonitorsToAdd.push(fullDeploymentName)
                    }
                }
            }
        }
    }

    // Print the lists of existing and new deployment monitors
    console.log("Existing Deployment Monitors To Update:")
    for (const existingDeploymentMonitor of existingDeploymentMonitorsToUpdate) {
        console.log(existingDeploymentMonitor)
    }

    console.log("\nNew Deployment Monitors To Add:")
    for (const newDeploymentMonitor of newDeploymentMonitorsToAdd) {
        console.log(newDeploymentMonitor)
    }

    // Object to store information based on prefixes
    const deploymentStatusInfoMapping = {
        "seacrm": {
            "urlTemplate": "https://prometheus.tools-a-crm-seacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
            "basicAuthPass": process.env.SEACRM_TOOLS_USER_PASSWORD,
            "parentMonitorInfo": {
                "coredns": process.env.SEACRM_OTHERS_PARENT,
                "ebs-csi-controller": process.env.SEACRM_OTHERS_PARENT,
                "efs-csi-controller": process.env.SEACRM_OTHERS_PARENT,
                "facets-mutating-webhook": process.env.SEACRM_OTHERS_PARENT,
            }
        },
        "incrm": {
            "urlTemplate": "https://prometheus.tools-a-crm-incrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
            "basicAuthPass": process.env.INCRM_TOOLS_USER_PASSWORD,
            "parentMonitorInfo": {
                "coredns": process.env.INCRM_OTHERS_PARENT,
                "ebs-csi-controller": process.env.INCRM_OTHERS_PARENT,
                "efs-csi-controller": process.env.INCRM_OTHERS_PARENT,
                "facets-mutating-webhook": process.env.INCRM_OTHERS_PARENT,
            }
        },
        "eucrm": {
            "urlTemplate": "https://prometheus.tools-a-crm-eucrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
            "basicAuthPass": process.env.EUCRM_TOOLS_USER_PASSWORD,
            "parentMonitorInfo": {
                "coredns": process.env.EUCRM_OTHERS_PARENT,
                "ebs-csi-controller": process.env.EUCRM_OTHERS_PARENT,
                "efs-csi-controller": process.env.EUCRM_OTHERS_PARENT,
                "facets-mutating-webhook": process.env.EUCRM_OTHERS_PARENT,
            }
        },
        "asiacrm": {
            "urlTemplate": "https://prometheus.tools-a-crm-asiacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
            "basicAuthPass": process.env.ASIACRM_TOOLS_USER_PASSWORD,
            "parentMonitorInfo": {
                "coredns": process.env.ASIACRM_OTHERS_PARENT,
                "ebs-csi-controller": process.env.ASIACRM_OTHERS_PARENT,
                "efs-csi-controller": process.env.ASIACRM_OTHERS_PARENT,
                "facets-mutating-webhook": process.env.ASIACRM_OTHERS_PARENT,
            }
        },
        "tatacrm": {
            "urlTemplate": "https://prometheus.tools-a-crm-tatacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
            "basicAuthPass": process.env.TATACRM_TOOLS_USER_PASSWORD,
            "parentMonitorInfo": {
                "coredns": process.env.TATACRM_OTHERS_PARENT,
                "ebs-csi-controller": process.env.TATACRM_OTHERS_PARENT,
                "efs-csi-controller": process.env.TATACRM_OTHERS_PARENT,
                "facets-mutating-webhook": process.env.TATACRM_OTHERS_PARENT,
            }
        },
        "uscrm": {
            "urlTemplate": "https://prometheus.tools-a-crm-uscrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
            "basicAuthPass": process.env.USCRM_TOOLS_USER_PASSWORD,
            "parentMonitorInfo": {
                "coredns": process.env.USCRM_OTHERS_PARENT,
                "ebs-csi-controller": process.env.USCRM_OTHERS_PARENT,
                "efs-csi-controller": process.env.USCRM_OTHERS_PARENT,
                "facets-mutating-webhook": process.env.USCRM_OTHERS_PARENT,
            }
        },
        "ushc": {
            "urlTemplate": "https://prometheus.tools-a-crm-ushc-crm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
            "basicAuthPass": process.env.USHC_CRM_TOOLS_USER_PASSWORD,
            "parentMonitorInfo": {
                "coredns": process.env.USHC_CRM_OTHERS_PARENT,
                "ebs-csi-controller": process.env.USHC_CRM_OTHERS_PARENT,
                "efs-csi-controller": process.env.USHC_CRM_OTHERS_PARENT,
                "facets-mutating-webhook": process.env.USHC_CRM_OTHERS_PARENT,
            }
        },
        // Add more environment information as needed
    }

    // # List to store monitors to add
    const monitorsToAdd = []

    for (const newDeploymentMonitor of newDeploymentMonitorsToAdd) {
        console.log(`Processing New Deployment Monitor: ${newDeploymentMonitor}`)

        // Extract environment (prefix) from new deployment monitor name
        const environment = newDeploymentMonitor.split("-")[0]

        if (!deploymentStatusInfoMapping[environment]) {
            console.log(`No information found for environment: ${environment}`)
            continue
        }

        const deploymentStatusInfo = deploymentStatusInfoMapping[environment]
        const urlTemplate = deploymentStatusInfo.urlTemplate
        const basicAuthPass = deploymentStatusInfo.basicAuthPass
        const parentMonitorInfo = deploymentStatusInfo.parentMonitorInfo
        let parent

        for (const parentName in parentMonitorInfo) {
            if (newDeploymentMonitor.includes(parentName.toLowerCase())) {
                const parentID = parentMonitorInfo[parentName]
                parent = parentID
                break
            }
        }

        const url = urlTemplate.replaceAll("<deployment>", newDeploymentMonitor)

        monitorsToAdd.push({
            type: "json-query",
            name: newDeploymentMonitor,
            url: url,
            method: "GET",
            // body: null,
            // httpBodyEncoding: null,
            // expiryNotification: false,
            // ignoreTls: false,
            authMethod: "basic",
            basic_auth_user: "tools-auser",
            basic_auth_pass: basicAuthPass,
            maxredirects: 10,
            accepted_statuscodes: ["200-299"],
            jsonPath: deploymentMonitorJSONPath,
            jsonPathOperator: "==",
            expectedValue: "true",
            interval: 60,
            retryInterval: 30,
            maxretries: 1,
            parent,
            notificationIDList: {
                "1": true
            },
            resendInterval: 0,
            upsideDown: false,
        })
    }

    // # List to store monitors to update
    const monitorsToUpdate = []

    for (const existingDeploymentMonitor of existingDeploymentMonitorsToUpdate) {
        const existingDeploymentMonitorName = existingDeploymentMonitor.name
        const existingDeploymentMonitorID = existingDeploymentMonitor.id
        console.log(`Processing Existing Deployment Monitor: ${existingDeploymentMonitorName}`)

        // Extract environment (prefix) from new deployment monitor name
        const environment = existingDeploymentMonitorName.split("-")[0]

        if (!deploymentStatusInfoMapping[environment]) {
            console.log(`No information found for environment: ${environment}`)
            continue
        }

        const deploymentStatusInfo = deploymentStatusInfoMapping[environment]
        const urlTemplate = deploymentStatusInfo.urlTemplate
        const basicAuthPass = deploymentStatusInfo.basicAuthPass
        const parentMonitorInfo = deploymentStatusInfo.parentMonitorInfo
        let parent

        for (const parentName in parentMonitorInfo) {
            if (existingDeploymentMonitorName.includes(parentName.toLowerCase())) {
                const parentID = parentMonitorInfo[parentName]
                parent = parentID
                break
            }
        }

        const url = urlTemplate.replaceAll("<deployment>", existingDeploymentMonitorName)

        monitorsToUpdate.push({
            id: existingDeploymentMonitorID,
            type: "json-query",
            name: existingDeploymentMonitorName,
            url: url,
            method: "GET",
            // body: null,
            // httpBodyEncoding: null,
            // expiryNotification: false,
            // ignoreTls: false,
            authMethod: "basic",
            basic_auth_user: "tools-auser",
            basic_auth_pass: basicAuthPass,
            maxredirects: 10,
            accepted_statuscodes: ["200-299"],
            jsonPath: deploymentMonitorJSONPath,
            jsonPathOperator: "==",
            expectedValue: "true",
            interval: 60,
            retryInterval: 30,
            maxretries: 1,
            parent,
            notificationIDList: {
                "1": true
            },
            resendInterval: 0,
            upsideDown: false,
        })
    }

    console.log("Monitors To Add:");
    for (const monitor of monitorsToAdd) {
        console.log(monitor)
    }

    console.log("\nMonitors To Update:");
    for (const monitor of monitorsToUpdate) {
        console.log(monitor)
    }

    return [monitorsToAdd, monitorsToUpdate]
}

function writeToListOfMonitorsUpdatedFile(monitorsUpdated) {
    fs.writeFileSync(`list-of-monitors-updated-${Date.now()}.json`, JSON.stringify(monitorsUpdated, null, 2))
}

function writeToListOfMonitorsAddedFile(monitorsAdded) {
    fs.writeFileSync(`list-of-monitors-added-${Date.now()}.json`, JSON.stringify(monitorsAdded, null, 2))
}

function addMonitor(monitor) {
    return new Promise((resolve, reject) => {
        // save the new monitor to uptime kuma
        socket.emit("add", monitor, (response) => {
            console.log(`monitor addition response: ${JSON.stringify(response)}`)

            if (response.ok) {
                console.log("monitor added successfully")
                resolve()
            } else {
                reject(new Error(`error adding monitor! response: ${JSON.stringify(response, null, 2)}`))
            }
        })
    })
}

function editMonitor(monitor) {
    return new Promise((resolve, reject) => {
        // save the new monitor to uptime kuma
        socket.emit("editMonitor", monitor, (response) => {
            console.log(`monitor edition response: ${JSON.stringify(response)}`)

            if (response.ok) {
                console.log("monitor edited successfully")
                resolve()
            } else {
                reject(new Error(`error editing monitor id ${monitor.id}! response: ${JSON.stringify(response, null, 2)}`))
            }
        })
    })
}

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    utils.login(socket, async () => {
        const [monitorsToAdd, monitorsToUpdate] = await buildMonitorData()

        // console.log(monitorsToAdd);
        // console.log(monitorsToUpdate);

        const monitorsAdded = []
        const monitorsUpdated = []
        for (const monitor of monitorsToAdd) {
            try {
                // save the new monitor in uptime kuma
                await addMonitor(monitor)
                monitorsAdded.push(monitor)
                writeToListOfMonitorsAddedFile(monitorsAdded)
            } catch (err) {
                throw err
            }
        }

        for (const monitor of monitorsToUpdate) {
            try {
                // edit the existing monitor in uptime kuma
                await editMonitor(monitor)
                monitorsUpdated.push(monitor)
                writeToListOfMonitorsUpdatedFile(monitorsUpdated)
            } catch (err) {
                throw err
            }
        }
    })
})

utils.listenOnSocket(socket)

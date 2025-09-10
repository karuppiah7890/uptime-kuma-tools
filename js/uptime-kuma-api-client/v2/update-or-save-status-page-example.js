const utils = require('../utils.js')
const { io } = require("socket.io-client")
const fs = require('fs')

console.log("starting now")

const socket = io(process.env.UPTIME_KUMA_URI)

console.log("listening for events")

utils.listenOnSocketManager(socket)

const statusPagesToSave = [
  {
    slug: "incrm",
    title: "INCRM Status Page",
    description: "",
    logo: "/icon.svg",
    theme: "auto",
    showTags: false,
    domainNameList: [],
    customCSS: "body {\n\n\n}\n",
    footerText: "Capillary Technologies",
    showPoweredBy: false,
    googleAnalyticsId: null,
    showCertificateExpiry: false,
    autoRefreshInterval: 60
  },
  {
    slug: "tatacrm",
    title: "TATACRM Status Page",
    description: "",
    logo: "/icon.svg",
    theme: "auto",
    showTags: false,
    domainNameList: [],
    customCSS: "body {\n\n\n}\n",
    footerText: "Capillary Technologies",
    showPoweredBy: false,
    googleAnalyticsId: null,
    showCertificateExpiry: false,
    autoRefreshInterval: 60
  },
  {
    slug: "eucrm",
    title: "EUCRM Status Page",
    description: "",
    logo: "/icon.svg",
    theme: "auto",
    showTags: false,
    domainNameList: [],
    customCSS: "body {\n\n\n}\n",
    footerText: "Capillary Technologies",
    showPoweredBy: false,
    googleAnalyticsId: null,
    showCertificateExpiry: false,
    autoRefreshInterval: 60
  },
  {
    slug: "uscrm",
    title: "USCRM Status Page",
    description: "",
    logo: "/icon.svg",
    theme: "auto",
    showTags: false,
    domainNameList: [],
    customCSS: "body {\n\n\n}\n",
    footerText: "Capillary Technologies",
    showPoweredBy: false,
    googleAnalyticsId: null,
    showCertificateExpiry: false,
    autoRefreshInterval: 60
  },
  {
    slug: "asiacrm",
    title: "ASIACRM Status Page",
    description: "",
    logo: "/icon.svg",
    theme: "auto",
    showTags: false,
    domainNameList: [],
    customCSS: "body {\n\n\n}\n",
    footerText: "Capillary Technologies",
    showPoweredBy: false,
    googleAnalyticsId: null,
    showCertificateExpiry: false,
    autoRefreshInterval: 60
  },
  {
    slug: "nightly",
    title: "Nightly Status Page",
    description: "",
    logo: "/icon.svg",
    theme: "auto",
    showTags: false,
    domainNameList: [],
    customCSS: "body {\n\n\n}\n",
    footerText: "Capillary Technologies",
    showPoweredBy: false,
    googleAnalyticsId: null,
    showCertificateExpiry: false,
    autoRefreshInterval: 60
  },
  {
    slug: "staging",
    title: "Staging Status Page",
    description: "",
    logo: "/icon.svg",
    theme: "auto",
    showTags: false,
    domainNameList: [],
    customCSS: "body {\n\n\n}\n",
    footerText: "Capillary Technologies",
    showPoweredBy: false,
    googleAnalyticsId: null,
    showCertificateExpiry: false,
    autoRefreshInterval: 60
  }
]

const statusPagesWithMonitorGroups = {
    incrm: [],
    tatacrm: [],
    eucrm: [],
    uscrm: [],
    asiacrm: [],
    nightly: [],
    staging: [],
}

function saveStatusPage(slug, config, imageDataUrl, publicGroupList) {
    return new Promise((resolve, reject) => {
        console.log(`saving status page slug ${slug}`)
        socket.emit("saveStatusPage", slug, config, imageDataUrl, publicGroupList, (response) => {
            console.log(`response for saving status page slug ${slug}: ${JSON.stringify(response)}`)

            if (response.ok) {
                console.log(`saved status page ${slug} successfully: ${JSON.stringify(response)}`)
                resolve()
            } else {
                reject(new Error(`error saving status page ${slug}! response: ${JSON.stringify(response, null, 2)}`))
            }
        })
    })
}

socket.on("statusPageList", async (statusPages) => {
    console.log(`Status Pages List is: ${JSON.stringify(statusPages)}`)
    fs.writeFileSync(`list-of-status-pages-${Date.now()}.json`, JSON.stringify(statusPages, null, 2))

    for (const statusPage of statusPagesToSave) {
        console.log(`processing status page: ${JSON.stringify(statusPage)}`);

        const publicGroupList = statusPagesWithMonitorGroups[statusPage.slug]

        try {
            await saveStatusPage(statusPage.slug, statusPage, statusPage.logo, publicGroupList)
        } catch(err) {
            throw err
        }
    }
})

socket.on("loginRequired", () => {
    console.log(`Server says login is required`)
    utils.login(socket)
})

utils.listenOnSocket(socket)

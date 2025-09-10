const utils = require('../utils.js')
const { io } = require("socket.io-client")
const fs = require('fs')

console.log("starting now")

const socket = io(process.env.UPTIME_KUMA_URI)

console.log("listening for events")

utils.listenOnSocketManager(socket)

const statusPagesToAdd = [
  {
    slug: "incrm",
    title: "INCRM Status Page",
  },
  {
    slug: "tatacrm",
    title: "TATACRM Status Page",
  },
  {
    slug: "eucrm",
    title: "EUCRM Status Page",
  },
  {
    slug: "uscrm",
    title: "USCRM Status Page",
  },
  {
    slug: "asiacrm",
    title: "ASIACRM Status Page",
  },
  {
    slug: "nightly",
    title: "Nightly Status Page",
  },
  {
    slug: "staging",
    title: "Staging Status Page",
  }
]

function addStatusPage(title, slug) {
    return new Promise((resolve, reject) => {
        console.log(`adding status page slug ${slug}`)
        socket.emit("addStatusPage", title, slug, (response) => {
            console.log(`response for adding status page slug ${slug}: ${JSON.stringify(response)}`)

            if (response.ok) {
                console.log(`added status page ${slug} successfully: ${JSON.stringify(response)}`)
                resolve()
            } else {
                reject(new Error(`error adding status page ${slug}! response: ${JSON.stringify(response, null, 2)}`))
            }
        })
    })
}

socket.on("statusPageList", async (statusPages) => {
    console.log(`Status Pages List is: ${JSON.stringify(statusPages)}`)
    fs.writeFileSync(`list-of-status-pages-${Date.now()}.json`, JSON.stringify(statusPages, null, 2))

    for (const statusPage of statusPagesToAdd) {
        console.log(`processing status page: ${JSON.stringify(statusPage)}`);

        try {
            await addStatusPage(statusPage.title, statusPage.slug)
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

const Client = require("./lib/connection-v6")

aucusername = "chatterbox-bridge"
aucpassword = "abc123"
aucip = "104.236.25.60"

client = new Client("ChB-Bridge", aucip, "6767", "3034")
pluginutil = null
token = ""
async function setup() {
    token = await client.login(aucusername, aucpassword)
    token = token.split("|")[0]
}
setup()
async function onmessage(data) {
    console.log("Recieved:", data);
    await client.send(token, "from "+data.data.author.name+": "+data.data.content, "general", "Web", null)
}

function onAucMsg(data) {
    if (data.username != aucusername) {
        console.log("auc: ", data)
        pluginutil.sendMessage({"author": { "id": 0, "name": data.username }, "content": data.message, "room": data.room, "pfp": data.pfp, "platform": "img/plt/auc.png"})
    }
}
client.onMessage = onAucMsg;

function init(pluginutilarg) {
    pluginutil = pluginutilarg;
    return onmessage
}

module.exports = init;
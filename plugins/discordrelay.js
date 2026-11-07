const { Client, Events, GatewayIntentBits, WebhookClient, DefaultWebSocketManagerOptions } = require('discord.js');

function init(util) {
    DefaultWebSocketManagerOptions.identifyProperties.os = "Android"
    DefaultWebSocketManagerOptions.identifyProperties.browser = "Discord VR"
    DefaultWebSocketManagerOptions.identifyProperties.device = "Discord VR"

    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
    });
    var channel = null
    var webhook = null
    
    client.on(Events.ClientReady, async readyClient => {
        channel = await client.channels.fetch(util.pconf.channelid)
        channel.send("Chatterbox Discord relay active!")
        log(`Discord Bot Logged in as ${readyClient.user.tag}!`)
        const webhooks = await channel.fetchWebhooks();
		webhook = webhooks.find((wh) => wh.token && wh.name == "Chatterbox");
        if (!webhook) {
            webhook = await channel.createWebhook({
		        name: 'Chatterbox'
	        })
        }
    })

    function senddiscordmsg(data) {
        var files = data.image ? [data.image] : null
        webhook.send({
            username: `${data.author.name} [${data.platform}]`,
            avatarURL: data.author.pfp,
            content: data.content,
            files: files
        })
    }

    client.on(Events.MessageCreate, message => {
        if(message.author.id == util.pconf.userid || message.author.id == webhook.id) return
        if(message.channel.id !== util.pconf.channelid) return
        var image = null;
        if (message.attachments.first() && message.attachments.first().contentType.startsWith("image/")) {
            image = message.attachments.first().url;
        }
        util.sendChatMessage({
            "author": {
                "id": 0,
                "name": message.member.displayName || message.member.username,
                "pfp": message.member.avatarURL() || message.author.avatarURL()
            },
            "room": util.pconf.room,
            "content": message.content,
            "platform": "Discord",
            "image": image
        })
    })

    function onmessage(msg) {
        if (msg.type == "chatmessage") {
            if(msg.data.platform == "Discord") return msg
            if(msg.data.room == util.pconf.room) {
                senddiscordmsg(msg.data)
            }
        }
        return msg
    }

    function log(...args) {
        console.log("[discordrelay]", ...args)
    }

    log('Loaded')
    client.login(util.pconf.token)
    
    return onmessage
}

module.exports = init
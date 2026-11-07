config = {
    "token_secret": "replace with a randomly generated string", // JWT secret key
    "session_secret": "replace with a (different) randomly generated string", // Secret key for admin panel cookies
    "port": 3035,
    "rooms": [
        "general",
        "announcements",
        "bots",
        "roleplay",
        "testing channel"
    ],
    "username_limit": 30,
    "history_limit": 100,
    "message_limit": 1000,
    "using_proxy": false,
    "proxy_ip_header": "X-Real-IP",
    "plugin_config": {
        "discordrelay": {
            "token": "",
            "userid": "1234567890",
            "room": "general",
            "channelid": "1234567890"
        }
    }
}
module.exports = config
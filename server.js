const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const websocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { globbySync } = require('globby');

const censor = require('./censor');
const admin = require("./admin");
const { UserDatabase, MessageDatabase } = require("./db");
const config = require('./config');

const { send } = require('process');

// Plugin handling
const plugins = [];

class PluginUtility {
  constructor(pluginName, config) {
    this.pconf = config.plugin_config[pluginName];
    this.gconf = config;
  }
  sendChatMessage(data) {
    if (chatHistory[data.room]) {
      chatHistory[data.room].push(data);

      // drop the oldest message if we exceed it
      if (chatHistory[data.room].length > config.history_limit) {
        chatHistory[data.room].splice(0, chatHistory[data.room].length - config.history_limit)
      }
    }
    console.log("sent", JSON.stringify(data))
    ws_server.clients.forEach(client => {
      client.send(JSON.stringify(data));
    });
  }
}
const pluginFileNames = globbySync("./plugins/*.js");
pluginFileNames.forEach(filename => {
  const pluginName = filename.match("(plugins/)(.*)(?=\.js)")[2]
  const pluginInit = require("./plugins/"+pluginName);
  const pluginUtility = new PluginUtility(pluginName, config)
  const pluginOnMsg = pluginInit(pluginUtility);
  plugins.push(pluginOnMsg)
});

function sendPluginData(data) {
  plugins.forEach(pluginOnMsg => {
    pluginOnMsg(data);
  })
}

const userdb = new UserDatabase();

const userMessageTimes = {};
const userRecentMessages = {};
const app = express(); // Create the http server
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent']
}));

const chatHistory = {};

// Initialize an empty history array for every single room
for(const room of config.rooms) {
  chatHistory[room] = []
}

// The amount of rooms the client should parse (calculate dynamically in the future when user-created rooms exist)
const roomCount = config.rooms.length;

// Get IP via proxy header if needed
function getRealIp(req, isWs) {
  if (isWs) {
    real_ip = req.socket.remoteAddress;
  } else {
    real_ip = req.ip;
  }
  if (config.using_proxy) {
    real_ip = req.headers[config.proxy_ip_header];
  }
  return real_ip
}
app.use(function(req, res, next) {
  req.real_ip = getRealIp(req, false);
  next();
});

// Verify the JWT token provided by the client
function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    console.log(`[${req.real_ip}]: Error: Invalid Token.`);
    console.log(token)
    return res.send({"error": "Invalid token"});
  }

  try {
    const decoded = jwt.verify(token, config.token_secret);
    req.uid = decoded.id;
    next();
  } catch (err) {
    console.log(`Token error: ${err}`);
    return res.send({"error": "Token verification error"});
  }
}

// Check if an IP is banned
async function checkBan(req, res, next) {
  result = await userdb.isIpBanned(req.real_ip);
  if (result) {
      console.log(`Banned user attempted access: ${result.id}`);
      return res.send({"error": "Banned", "reason": result.reason});
  } else {
    next();
  }
}
app.use(checkBan);

function getServerUrl() {
  return `http${config.is_secure ? "s" : ""}://${config.host}:${config.port}/`
}

// web version
app.use('/web', express.static('web'));
app.get('/', (req, res) => {
  return res.redirect("/web");
})

// Unused, simple API test
app.get('/api/test', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.status(200).send({"result": "Online"});
  console.log(`${req.real_ip} requested API status`);
});

// Grab rooms
app.get('/api/rooms', verifyToken, (req, res) => {
  res.set('Content-Type', 'application/json');
  res.status(200).send(config.rooms);
  console.log("Sent room list");
});

// {"room": "general", "content": "test", "platform": "Web", "img": "[image url]"}
app.post('/api/chat', verifyToken, async (req, res) => {
  var data = req.body
  if (!config.rooms.includes(data.room)) {
    return res.status(200).send({"error": "Room not found"});
  }
  if (data.room == "announcements") {
    console.log("Message in announcements:");
    if (!(await userdb.isAdmin(req.uid))) {
      console.log("Not enough rights");
      return res.send({"error": "No permission"});
    }
  }
  const isbanned = await userdb.isUserBanned(req.uid);
  if (isbanned) {
    const reason = isbanned.reason;
    return res.status(200).send({"error": "Banned", "reason": reason});
  }
  if (data.content.length > config.message_limit) {
    return res.status(200).send({"error": "Message too long", "limit": config.message_limit});
  }
  console.log(`[${req.real_ip}] ${req.uid}: ${JSON.stringify(req.body)}`);

  var censored = censor(data.content)
  var name = (await userdb.getUser(req.uid)).username
  var result = {
    "author": {
      "id": req.uid,
      "name": name,
      "pfp": getServerUrl()+"web/img/pfp.png" // placeholder
    },
    "content": censored,
    "room": data.room,
    "platform": data.platform,
    "image": data.image
  }

  if (chatHistory[data.room]) {
    chatHistory[data.room].push(result);

    // drop the oldest message if we exceed it
    if (chatHistory[data.room].length > config.history_limit) {
      chatHistory[data.room].splice(0, chatHistory[data.room].length - config.history_limit)
    }
  }

  console.log("sent", JSON.stringify(result))
  ws_server.clients.forEach(client => {
    client.send(JSON.stringify(result));
  });
  sendPluginData({"type": "chatmessage", "data": result})
  return res.status(200).send({"result": "Success"});
});


// {"username": "orstando", "password": "wowsopassword"}
app.post('/api/signup', async (req, res) => {
  const data = req.body
  const username = data.username;
  const password = data.password;

  if (!username || !password) {
    console.log("Signup: missing fields");
    return res.send({"error": "Missing fields"});
  }
  if (username.length > config.username_limit) {
    console.log("Signup: Username too long");
    return res.send({"error": "Username too long", "limit": config.username_limit});
  }
  if (await userdb.doesUnameExist(username)) {
    console.log("Signup: account already in use");
    return res.send({"error": "Username unavailable"});
  }
  await userdb.createUser(username, password);
  const newUserId = await userdb.getUIDByName(username)
  console.log(newUserId)
  await userdb.updateIp(newUserId, req.real_ip)
  const token = jwt.sign({id: newUserId}, config.token_secret, { expiresIn: '1h' });
  console.log("Account created!");
  return res.status(200).send({"token": token});
});

// {"username": "orstando", "password": "wowsopassword"}
app.post('/api/login', async (req, res) => {
  const data = req.body
  const username = data.username;
  const password = data.password;

  const id = await userdb.getUIDByName(username);
  const user = await userdb.getUser(id)
  if (!user || !(await bcrypt.compare(password, user.password))) {
    console.log("Wrong password");
    return res.send({"error": "Incorrect username or password"});
  }

  const isbanned = await userdb.isUserBanned(user.id);
  if (isbanned) {
    const reason = isbanned.reason;
    return res.status(200).send({"error": "Banned", "reason": reason});
  }

  await userdb.updateIp(id, req.real_ip)
  const token = jwt.sign({ id: user.id }, config.token_secret, { expiresIn: '1h' });
  console.log("Client logged in!");
  return res.status(200).send({"token": token});
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: config.session_secret,
    resave: false,
    saveUninitialized: false,
    cookie: function (req) {
      return {
        path: '/',
        httpOnly: true,
        secure: req.secure,
        maxAge: 3600000
      }
    }
}));

app.use(express.text());
app.get('/api/rules', async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'rules.txt');
  res.sendFile(filePath, (err) => {
      if (err) {
          console.error(err);
          if (!res.headersSent) {
              res.status(404).send('An error occurred while fetching rules.');
          }
      }
  });
});
app.get('/api/faq', async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'faq.txt');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(err);
      if (!res.headersSent) {
        res.status(404).send('An error occurred while fetching FAQ.');
      }
    }
  });
});
app.get('/api/changelog', async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'changelog.txt');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(err);
      if (!res.headersSent) {
        res.status(404).send('An error occurred while fetching changelog.');
      }
    }
  });
});

app.use(express.json());

app.get('/api/online', async (req, res) => {
  room = req.query.room;
  // get online count for room, currently placeholder
  res.status(200).send({"count": 1})
})

app.get('/api/isadmin', async (req, res) => {
  const id = req.query.id;
  const result = !!userdb.isAdmin(id)
  res.status(200).send({"result": result})
});
app.get('/api/idfromname', async (req, res) => {
  const username = req.query.name;
  const result = userdb.getUIDByName(username);
  res.status(200).send({"result": result});
})

app.get('/api/history', verifyToken, async (req, res) => {
  const room = req.query.room;
  let messages = []
  if(room) {
    const history = chatHistory[room]
    if(history) {
      for(const msg of history) {
        messages.push(msg);
      }
    }
  } else {
    console.log(`${req.real_ip} requested message history for nonexistent room (${data.room})`)
    return res.status(404).send({
      "error": "Room not found"
    });
  }
  res.status(200).send(messages)
  console.log(`${req.real_ip} requested message history`)
  return
})

app.use("/admin", admin); // admin panel

server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Chatterbox running on port ${config.port}`);
});

// Websocket server
ws_server = new websocket.Server({ server: server, clientTracking: true });
// WSS connection handling
ws_server.on('connection', (ws, req) => {
  var real_ip = getRealIp(req, true)
  console.log(`[${real_ip}] Client connected`);

  ws.on('message', (data) => {
    console.log(`${real_ip} tried sending data: ${data}`);
  });

  ws.on('close', (code, reason) => {
    console.log(`[${real_ip}] Client disconnected`);
  });

  ws.on('error', (err) => {
    console.log(`[${real_ip}] error: ${err.message}`);
  });
});

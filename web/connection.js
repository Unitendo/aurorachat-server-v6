class Client {
  constructor(useragent, url, is_secure) {
    this.ua = useragent || "ChB-WebLib";
    var http_prefix = is_secure ? "https://" : "http://"
    var ws_prefix = is_secure ? "wss://" : "ws://"
    this.url = url ? http_prefix+url : ''; // if url is empty, use current server ip/port (as in, the server that this web client is on)
    this.ws = new WebSocket(ws_prefix+url);
    this.ws.onopen = function() {
      console.log('Connected via WebSocket');
    }
    this.ws.onmessage = (event) => {
      var data = JSON.parse(event.data)
      if (this.onMessage) { // check if callback has been created yet
        this.onMessage(data);
      };
    }
    this.ws.onerror = (err) => {
      if (this.onError) {
        this.onError(err);
      };
    }
    this.ws.onclose = () => {
      if (this.onClose) {
        this.onClose();
      };
    }
  }
  async signup(username, password) {
    const response = await fetch(this.url+"/api/signup", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.ua
      },
      body: JSON.stringify({"username": username, "password": password})
    })
    const data = await response.json();
    return data;
  }
  async login(username, password) {
    const response = await fetch(this.url+"/api/login", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.ua
        },
        body: JSON.stringify({"username": username, "password": password})
    })
    const data = await response.json();
    console.log(data)
    return data;
  }
  async send(token, msg, room, platform, img) {
    if (!platform) {platform="Web"}
    const response = await fetch(this.url+"/api/chat", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.ua,
          'Authorization': token
        },
        body: JSON.stringify({"room": room, "content": msg, "platform": platform, "image": img})
    })
    const data = await response.json();
    return data;
  }
  async test() {
    const response = await fetch(this.url+"/api/test", {
        method: 'GET'
    })
    const data = await response.json();
    return data.result;
  }
  async rooms(token) {
    const response = await fetch(this.url+"/api/rooms", {
        method: 'GET',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': this.ua,
          'Authorization': token
        }
    })
    const data = await response.json();
    return data
  }
  async info(token, infotype) {
    const response = await fetch(this.url+"/api/"+infotype, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': this.ua,
        'Authorization': token
      }
    })
    const data = await response.text();
    return data;
  }
  async online(token, room) {
    const url = this.url+"/api/online?"+new URLSearchParams({room: room});
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': this.ua,
        'Authorization': token
      }
    })
    const data = await response.json();
    return data.count;
  }
  async history(token, room) {
    const url = this.url+"/api/history?"+new URLSearchParams({room: room});
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': this.ua,
        'Authorization': token
      }
    })
    const data = await response.json();
    return data
  }
  async isAdmin(token, username) {
    const url = this.url+"/api/isadmin?"+new URLSearchParams({username: username});
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': this.ua,
        'Authorization': token
      }
    })
    const data = await response.json();
    return data.result
  }
}

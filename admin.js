const express = require("express");
const session = require('express-session');
const bcrypt = require('bcryptjs');
const ejs = require('ejs')

const { UserDatabase, MessageDatabase } = require("./db");
const { config } = require('./config');

const router = express.Router();

const userdb = new UserDatabase();

router.get('/login', async (req, res) => {
  res.send(`
    <form method="POST">
        <input name="username" placeholder="Username" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
    </form>
    `);
});
router.post('/login', async (req, res) => {
  const {username, password} = req.body;
  const uid = await userdb.getUIDByName(username)
  const user = await userdb.getUser(uid)
  if (!(await userdb.isAdmin(uid)) || !(await bcrypt.compare(password, (new TextDecoder().decode(user.password))))) {
    console.log("Wrong password");
    return res.status(403).send(`<p>Incorrect username or password.</p><a href='/admin/login'>Go back</a>`);
  }

  req.session.admin = true;
  if (user.staff === true) {
    req.session.staff = true;
  }

  return res.redirect("/admin");
});

router.get('/', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  res.send(`
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" onload="this.onload=null;this.rel='stylesheet'">
        <noscript>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap">
        </noscript>

        <style>
          h1, p, h2, a {
            font-family: 'Roboto', Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <h2>User Negative Actions</h2>
        <a style='color: red;' href='/admin/ban'>Ban User</a><br>
        <a style='color: red;' href='/admin/delete'>Delete User</a><br>
        <h2>User Positive Actions</h2>
        <a style='color: #e79b0d;' href='/admin/unban'>Unban User</a><br>
        <h2>Miscellaneous</h2>
        <a style='color: blue;' href='/admin/userinfo'>Check User Information</a><br>
        <a style='color: blue;' href='/admin/userswithip'>Check Users with IP</a><br>
      </body>
    </html>
  `);
});

router.get('/ban', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  return res.send(`
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" onload="this.onload=null;this.rel='stylesheet'">

        <style>
          h1, p, h2, a {
            font-family: 'Roboto', Arial, sans-serif;
          }
        </style>
      </head>
      <body>
      <h1>Ban User</h1>
      <form method="POST">
        <input name="username" placeholder="Username" required /><br><br>
        <input name="reason" placeholder="Reason" style="width: 300px;" /><br><br>
        <button type="submit">Ban</button>
    </form>
    </body>
    </html>
  `);
});

router.post('/ban', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  const {username, reason} = req.body;
  const uid = await userdb.getUIDByName(username);
  const user = await userdb.getUser(uid);
  if (user) {
    userdb.banUser(uid, reason)
  }

  return res.send(`
    <p>User banned!</p>
    <p>Reason: ${reason || "No reason specified"}</p>
    <a href="/admin">Go back</a>
    `);
});
router.get('/unban', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  return res.send(`
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" onload="this.onload=null;this.rel='stylesheet'">

        <style>
          h1, p, h2, a {
            font-family: 'Roboto', Arial, sans-serif;
          }
        </style>
      </head>
      <body>
      <h1>Unban User</h1>
      <form method="POST">
        <input name="username" placeholder="Username to unban" /><br>
        <button type="submit">Unban</button>
    </form>
    </body>
    </html>
  `);
});

router.post('/unban', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  const {username} = req.body;
  const uid = await userdb.getUIDByName(username);
  await userdb.unbanUser(uid);

  return res.send(`
    <p>User unbanned!</p>
    <a href="/admin">Go back</a>
  `);
});

router.get('/delete', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  return res.send(`
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" onload="this.onload=null;this.rel='stylesheet'">

        <style>
          h1, p, h2, a {
            font-family: 'Roboto', Arial, sans-serif;
          }
        </style>
      </head>
      <body>
      <h1 style='color: red;'>Delete User</h1>
      <form method="POST">
        <input name="username" placeholder="Username" /><br>
        <button type="submit">Delete</button>
    </form>
    </body>
    </html>
  `);
});

router.post('/delete', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  const { username } = req.body;
  const uid = await userdb.getUIDByName(username);
  await userdb.deleteUser(uid);

  return res.send(`
    <p>User deleted!</p>
    <a href="/admin">Go back</a>
  `);
});

router.get('/userinfo', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  return res.send(`
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" onload="this.onload=null;this.rel='stylesheet'">

        <style>
          h1, p, h2, a {
            font-family: 'Roboto', Arial, sans-serif;
          }
        </style>
      </head>
      <body>
      <h1 style='color: green;'>Check User Information</h1>
      <form method="POST">
        <input name="username" placeholder="Username" required /><br>
        <button type="submit">Grab Info</button>
    </form>
    </body>
    </html>
  `);
});

router.post('/userinfo', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  const { username } = req.body;
  
  const uid = await userdb.getUIDByName(username);
  var user = await userdb.getUser(uid);
  user.banReason = (await userdb.isUserBanned(uid)).reason;
  user.banned = !!user.banReason;
  return res.send(`
    <p>Username: ${user.username}<br>Password Hash: ${(new TextDecoder().decode(user.password))}<br>ID: ${user.id}<br>Banned: ${user.banned}<br>Ban Reason: ${user.banReason || "None"}<br>IP: <a href="#" onclick="return postName(this)">${user.ip}</a></p>
    <a href="/admin">Go back</a>
    <script>
      function postName(el) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/admin/userswithip';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'ip';
        input.value = '${user.ip}';

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();

        return false;
      }
    </script>
  `);
});

router.get('/userswithip', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  return res.send(`
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" onload="this.onload=null;this.rel='stylesheet'">

        <style>
          h1, p, h2, a {
            font-family: 'Roboto', Arial, sans-serif;
          }
        </style>
      </head>
      <body>
      <h1 style='color: green;'>Check Users with IP</h1>
      <form method="POST">
        <input name="ip" placeholder="IP" required /><br>
        <button type="submit">Submit</button>
    </form>
    </body>
    </html>
  `);
});

router.post('/userswithip', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  const { ip } = req.body;
  const dbresult = await userdb.usersWithIp(ip);
  var result = "";
  dbresult.forEach((user) => {
    result += "<li><a href='#'' onclick='return postName(this)'>"+user.username+"</a></li>";
  })
  return res.send(`
    <ul>
      ${result}
    </ul>
    <a href="/admin">Go back</a>
    <script>
    function postName(el) {
        const username = el.textContent.trim();

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/admin/userinfo';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'username';
        input.value = username;

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();

        return false;
    }
    </script>
    `);
});

module.exports = router;
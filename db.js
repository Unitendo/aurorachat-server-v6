const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

class UserDatabase {
  constructor() {
    this.db = new DatabaseSync(path.join(__dirname, 'data', 'users.db'));
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TINYTEXT,
        password TEXT(40),
        ip TEXT(15)
      );
      CREATE TABLE IF NOT EXISTS bannedusers (
        id INTEGER PRIMARY KEY,
        ip TEXT(15),
        reason TEXT
      );
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY,
        type TEXT
      );
    `);
  }
  async getUIDByName(username) {
    const prepared = this.db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (prepared) {
      return prepared.id;
    } else {
      return null; // user doesnt exist
    }
  }
  async getUser(uid) {
    return this.db.prepare("SELECT * FROM users WHERE id = ?").get(uid);
  }
  async createUser(username, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.db.prepare("INSERT INTO users (username, password, ip) VALUES (?, ?, ?)").run(username, hashedPassword, "x.x.x.x");
  }
  async updateIp(uid, ip) {
    this.db.prepare("UPDATE users SET ip = ? WHERE id = ?").run(ip, uid);
  }
  async isIpBanned(ip) {
    return this.db.prepare("SELECT * FROM bannedusers WHERE ip = ?").get(ip);
  }
  async isUserBanned(uid) {
    return this.db.prepare("SELECT * FROM bannedusers WHERE id = ?").get(uid);
  }
  async isAdmin(uid) {
    return this.db.prepare("SELECT type FROM admins WHERE id = ?").get(uid);
  }
  async banUser(uid, reason) {
    reason = reason || "No reason specified"
    const ip = this.db.prepare("SELECT ip FROM users WHERE id = ?").get(uid).ip;
    this.db.prepare("INSERT OR REPLACE INTO bannedusers (id, ip, reason) VALUES (?, ?, ?)").run(uid, ip, reason);
  }
  async unbanUser(uid) {
    this.db.prepare("DELETE FROM bannedusers WHERE id = ?").run(uid);
  }
  async deleteUser(uid) {
    this.db.prepare("DELETE FROM users WHERE id = ?").run(uid);
  }
  async usersWithIp(ip) {
    return this.db.prepare("SELECT * FROM users WHERE ip = ?").all(ip);
  }
  async doesUnameExist(username) {
    return !!this.db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  }
}

// wip
class MessageDatabase {
  constructor() {
    this.db = new DatabaseSync(path.join(__dirname, 'data', 'messages.db'));
  }
}

module.exports = { UserDatabase, MessageDatabase }
require('dotenv').config();
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const args = process.argv.slice(2);
const username = args[0] || 'admin';
const newPassword = args[1];

if (!newPassword) {
  console.error('Usage: node scripts/set-admin-password.js <username> <new-password>');
  process.exit(1);
}

const db = new Database(path.join(__dirname, '..', 'data', 'school.db'));
const hash = bcrypt.hashSync(newPassword, 12);

const user = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
if (user) {
  db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(hash, username);
  console.log(`Password successfully updated for admin user "${username}".`);
} else {
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`Created new admin user "${username}".`);
}

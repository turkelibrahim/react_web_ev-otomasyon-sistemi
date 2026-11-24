const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const databasePath = path.join(__dirname, '..', 'data', 'home-automation.sqlite');

function openDatabase() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  return db;
}

function initializeDatabase(db) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.transaction(() => db.exec(schema))();
}

module.exports = { databasePath, openDatabase, initializeDatabase };
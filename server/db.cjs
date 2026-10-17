const path = require('node:path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'game.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    match_wins INTEGER DEFAULT 0,
    match_losses INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id),
    result TEXT NOT NULL,
    player_hp INTEGER,
    cpu_hp INTEGER,
    rounds INTEGER,
    played_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'researchproof.sqlite');

// Ensure directory exists
const dir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new DatabaseSync(path.resolve(dbPath));

// Enable foreign keys, WAL mode, and busy timeout for high performance and concurrency
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

/**
 * Execute a function within a strict database transaction.
 * Automatically rolls back if an error is thrown.
 */
function transaction(callback) {
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = callback();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch (rollbackErr) {
      // Ignore rollback error if transaction was already aborted
    }
    throw err;
  }
}

module.exports = {
  db,
  transaction,
  prepare: (sql) => db.prepare(sql),
  exec: (sql) => db.exec(sql)
};

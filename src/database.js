const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'inventory.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  }
});

// Ensure foreign keys on this connection
db.run('PRAGMA foreign_keys = ON');

// Create a secondary raw connection to use when wrapping methods,
// so we keep access to the original sqlite3 callbacks and avoid
// recursive replacements on `db` itself.
const rawDb = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('✗ Raw DB connection failed:', err.message);
    process.exit(1);
  }
});
rawDb.run('PRAGMA foreign_keys = ON');

// Async helpers for sqlite3 methods with correct return values
const runAsync = (...args) =>
  new Promise((resolve, reject) => {
    rawDb.run(...args, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const getAsync = (...args) =>
  new Promise((resolve, reject) => {
    rawDb.get(...args, function (err, row) {
      if (err) return reject(err);
      resolve(row);
    });
  });

const allAsync = (...args) =>
  new Promise((resolve, reject) => {
    rawDb.all(...args, function (err, rows) {
      if (err) return reject(err);
      resolve(rows);
    });
  });

// Attach promise-based helpers onto exported `db` object
db.run = runAsync;
db.get = getAsync;
db.all = allAsync;

// Close helper (closes both connections)
db.close = async () => {
  await new Promise((resolve, reject) => rawDb.close((err) => (err ? reject(err) : resolve())));
  await new Promise((resolve, reject) => db.close((err) => (err ? reject(err) : resolve())));
};

// Transações seguras
db.transaction = async (fn) => {
  try {
    await db.run('BEGIN IMMEDIATE');
    await fn(db);
    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
};

// Init DB
async function initializeDatabase() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS stock_events (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUST')),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_stock_events_product_id
    ON stock_events(product_id)
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_stock_events_created_at
    ON stock_events(created_at)
  `);
}

module.exports = db;
module.exports.initializeDatabase = initializeDatabase;

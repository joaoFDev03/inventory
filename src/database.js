const { Pool } = require('pg');

// PostgreSQL connection config from env or defaults
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'inventario_db',
  // SSL required for Render remote connections
  ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false
});

// Connection error handler
pool.on('error', (err) => {
  console.error('✗ Unexpected error on idle client:', err);
  process.exit(1);
});

// Wrapper for promise-based queries (using parametrized queries for safety)
const db = {
  run: async (sql, params = []) => {
    try {
      const result = await pool.query(sql, params);
      return { 
        lastID: result.rows[0]?.id, 
        changes: result.rowCount 
      };
    } catch (err) {
      throw err;
    }
  },

  get: async (sql, params = []) => {
    try {
      const result = await pool.query(sql, params);
      return result.rows[0] || null;
    } catch (err) {
      throw err;
    }
  },

  all: async (sql, params = []) => {
    try {
      const result = await pool.query(sql, params);
      return result.rows || [];
    } catch (err) {
      throw err;
    }
  },

  close: async () => {
    await pool.end();
  }
};

// Initialize schema
async function initializeDatabase() {
  try {
    // Enable UUID extension
    await db.run('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create products table
    await db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create stock_events table
    await db.run(`
      CREATE TABLE IF NOT EXISTS stock_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUST')),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_stock_events_product_id
      ON stock_events(product_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_stock_events_created_at
      ON stock_events(created_at)
    `);

    console.log('✓ Database schema initialized');
  } catch (err) {
    console.error('✗ Database initialization failed:', err.message);
    throw err;
  }
}

module.exports = db;
module.exports.initializeDatabase = initializeDatabase;

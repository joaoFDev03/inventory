const Database = require('better-sqlite3');
const path = require('path');

// Usar ficheiro local para armazenar dados
const dbPath = path.join(process.cwd(), 'data', 'inventory.db');

// Criar diretório se não existir
const fs = require('fs');
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inicializar conexão com a BD
const db = new Database(dbPath);

// Ativar foreign keys e WAL mode para melhor performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

/**
 * Inicializar esquema da base de dados
 */
function initializeDatabase() {
  // Criar tabela de produtos
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Criar tabela de eventos de stock (histórico imutável)
  db.exec(`
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

  // Criar índices para melhorar queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stock_events_product_id ON stock_events(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_events_created_at ON stock_events(created_at);
  `);
}

// Executar inicialização
try {
  initializeDatabase();
  console.log('✓ Database initialized successfully at:', dbPath);
} catch (error) {
  console.error('✗ Database initialization failed:', error.message);
  process.exit(1);
}

module.exports = db;

const { v4: uuidv4 } = require('uuid');
const db = require('./database');

/**
 * Modelo para operações com produtos
 */
class ProductModel {
  /**
   * Criar novo produto com stock inicial
   */
  static create(name, initialStock = 0) {
    if (!name || name.trim() === '') {
      throw new Error('Product name is required');
    }
    if (initialStock < 0) {
      throw new Error('Initial stock cannot be negative');
    }

    const productId = uuidv4();

    // Usar transação para garantir consistência
    const transaction = db.transaction(() => {
      // 1. Criar produto
      const stmt = db.prepare(`
        INSERT INTO products (id, name, stock)
        VALUES (?, ?, ?)
      `);
      stmt.run(productId, name.trim(), 0);

      // 2. Se houver stock inicial, registar evento
      if (initialStock > 0) {
        const eventId = uuidv4();
        const eventStmt = db.prepare(`
          INSERT INTO stock_events (id, product_id, type, quantity, notes)
          VALUES (?, ?, ?, ?, ?)
        `);
        eventStmt.run(eventId, productId, 'IN', initialStock, 'Initial stock');

        // 3. Atualizar stock do produto
        const updateStmt = db.prepare(`
          UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateStmt.run(initialStock, productId);
      }
    });

    transaction();
    return this.getById(productId);
  }

  /**
   * Obter produto por ID
   */
  static getById(id) {
    const stmt = db.prepare(`
      SELECT * FROM products WHERE id = ?
    `);
    return stmt.get(id);
  }

  /**
   * Obter todos os produtos
   */
  static getAll() {
    const stmt = db.prepare(`
      SELECT * FROM products
      ORDER BY created_at DESC
    `);
    return stmt.all();
  }

  /**
   * Deletar produto (remove histórico associado por cascata)
   */
  static delete(id) {
    const product = this.getById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

/**
 * Modelo para operações de stock (eventos)
 */
class StockModel {
  /**
   * Entrada de stock (IN)
   */
  static addStock(productId, quantity, notes = '') {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    return this._recordEvent(productId, 'IN', quantity, notes);
  }

  /**
   * Saída de stock (OUT)
   */
  static removeStock(productId, quantity, notes = '') {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // Verificar se há stock suficiente
    const product = ProductModel.getById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock. Available: ${product.stock}, requested: ${quantity}`);
    }

    return this._recordEvent(productId, 'OUT', quantity, notes);
  }

  /**
   * Ajuste de stock (ADJUST)
   * Usado para correções de inventário
   */
  static adjustStock(productId, newQuantity, notes = '') {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (newQuantity < 0) {
      throw new Error('New stock quantity cannot be negative');
    }

    const product = ProductModel.getById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const difference = newQuantity - product.stock;
    if (difference === 0) {
      // Sem mudanças
      return {
        event: null,
        product: product,
        message: 'Stock quantity unchanged'
      };
    }

    // Registar evento com quantidade absoluta (utilizamos quantidade positiva e tipo ADJUST)
    const eventId = uuidv4();

    const transaction = db.transaction(() => {
      const eventStmt = db.prepare(`
        INSERT INTO stock_events (id, product_id, type, quantity, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      eventStmt.run(eventId, productId, 'ADJUST', Math.abs(difference), 
        `${notes} (From ${product.stock} to ${newQuantity})`);

      const updateStmt = db.prepare(`
        UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateStmt.run(newQuantity, productId);
    });

    transaction();

    return {
      event: this.getEventById(eventId),
      product: ProductModel.getById(productId)
    };
  }

  /**
   * Registar evento de stock (função privada)
   */
  static _recordEvent(productId, type, quantity, notes) {
    const eventId = uuidv4();

    const transaction = db.transaction(() => {
      // 1. Registar evento
      const eventStmt = db.prepare(`
        INSERT INTO stock_events (id, product_id, type, quantity, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      eventStmt.run(eventId, productId, type, quantity, notes);

      // 2. Atualizar stock do produto
      const operation = type === 'OUT' ? '-' : '+';
      const updateStmt = db.prepare(`
        UPDATE products 
        SET stock = stock ${operation} ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateStmt.run(quantity, productId);
    });

    transaction();

    return {
      event: this.getEventById(eventId),
      product: ProductModel.getById(productId)
    };
  }

  /**
   * Obter evento de stock por ID
   */
  static getEventById(id) {
    const stmt = db.prepare(`
      SELECT * FROM stock_events WHERE id = ?
    `);
    return stmt.get(id);
  }

  /**
   * Obter todos os eventos de stock
   */
  static getAllEvents(limit = 100, offset = 0) {
    const stmt = db.prepare(`
      SELECT * FROM stock_events
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  }

  /**
   * Obter eventos de um produto específico
   */
  static getEventsByProductId(productId, limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT * FROM stock_events
      WHERE product_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(productId, limit, offset);
  }

  /**
   * Obter resumo estatístico de eventos
   */
  static getEventsSummary() {
    const stmt = db.prepare(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM stock_events
      GROUP BY type
    `);
    return stmt.all();
  }
}

module.exports = {
  ProductModel,
  StockModel
};

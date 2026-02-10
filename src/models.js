const { v4: uuidv4 } = require('uuid');
const db = require('./database');

/**
 * Modelo para operações com produtos
 */
class ProductModel {
  /**
   * Criar novo produto com stock inicial
   */
  static async create(name, initialStock = 0) {
    if (!name || name.trim() === '') {
      throw new Error('Product name is required');
    }
    if (initialStock < 0) {
      throw new Error('Initial stock cannot be negative');
    }

    const productId = uuidv4();

    try {
      // Usar transação para garantir consistência
      await db.run('BEGIN TRANSACTION');

      try {
        // 1. Criar produto
        await db.run(
          'INSERT INTO products (id, name, stock) VALUES (?, ?, ?)',
          [productId, name.trim(), 0]
        );

        // 2. Se houver stock inicial, registar evento
        if (initialStock > 0) {
          const eventId = uuidv4();
          await db.run(
            'INSERT INTO stock_events (id, product_id, type, quantity, notes) VALUES (?, ?, ?, ?, ?)',
            [eventId, productId, 'IN', initialStock, 'Initial stock']
          );

          // 3. Atualizar stock do produto
          await db.run(
            'UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [initialStock, productId]
          );
        }

        await db.run('COMMIT');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

      return this.getById(productId);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Product with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Obter produto por ID
   */
  static async getById(id) {
    return await db.get('SELECT * FROM products WHERE id = ?', [id]);
  }

  /**
   * Obter todos os produtos
   */
  static async getAll() {
    return await db.all('SELECT * FROM products ORDER BY created_at DESC');
    
  }

  /**
   * Deletar produto (remove histórico associado por cascata)
   */
  static async delete(id) {
    const product = await this.getById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    await db.run('DELETE FROM products WHERE id = ?', [id]);
    return true;
  }
}

/**
 * Modelo para operações de stock (eventos)
 */
class StockModel {
  /**
   * Entrada de stock (IN)
   */
  static async addStock(productId, quantity, notes = '') {
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
  static async removeStock(productId, quantity, notes = '') {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // Verificar se há stock suficiente
    const product = await ProductModel.getById(productId);
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
  static async adjustStock(productId, newQuantity, notes = '') {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (newQuantity < 0) {
      throw new Error('New stock quantity cannot be negative');
    }

    const product = await ProductModel.getById(productId);
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

    // Registar evento com quantidade absoluta
    const eventId = uuidv4();

    try {
      await db.run('BEGIN TRANSACTION');

      try {
        await db.run(
          'INSERT INTO stock_events (id, product_id, type, quantity, notes) VALUES (?, ?, ?, ?, ?)',
          [eventId, productId, 'ADJUST', Math.abs(difference), 
           `${notes} (From ${product.stock} to ${newQuantity})`]
        );

        await db.run(
          'UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newQuantity, productId]
        );

        await db.run('COMMIT');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

      return {
        event: await this.getEventById(eventId),
        product: await ProductModel.getById(productId)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Registar evento de stock (função privada)
   */
  static async _recordEvent(productId, type, quantity, notes) {
    const eventId = uuidv4();

    try {
      await db.run('BEGIN TRANSACTION');

      try {
        // 1. Registar evento
        await db.run(
          'INSERT INTO stock_events (id, product_id, type, quantity, notes) VALUES (?, ?, ?, ?, ?)',
          [eventId, productId, type, quantity, notes]
        );

        // 2. Atualizar stock do produto
        const operation = type === 'OUT' ? '-' : '+';
        await db.run(
          `UPDATE products SET stock = stock ${operation} ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [quantity, productId]
        );

        await db.run('COMMIT');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

      return {
        event: await this.getEventById(eventId),
        product: await ProductModel.getById(productId)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obter evento de stock por ID
   */
  static async getEventById(id) {
    return await db.get('SELECT * FROM stock_events WHERE id = ?', [id]);
  }

  /**
   * Obter todos os eventos de stock
   */
  static async getAllEvents(limit = 100, offset = 0) {
    return await db.all(
      'SELECT * FROM stock_events ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }

  /**
   * Obter eventos de um produto específico
   */
  static async getEventsByProductId(productId, limit = 50, offset = 0) {
    return await db.all(
      'SELECT * FROM stock_events WHERE product_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [productId, limit, offset]
    );
  }

  /**
   * Obter resumo estatístico de eventos
   */
  static async getEventsSummary() {
    return await db.all(
      'SELECT type, COUNT(*) as count, SUM(quantity) as total_quantity FROM stock_events GROUP BY type'
    );
  }
}

module.exports = {
  ProductModel,
  StockModel
};

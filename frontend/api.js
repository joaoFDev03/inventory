/**
 * API Service
 * Wrapper para comunicação com o backend
 */

const API_BASE = '/api';

class InventoryAPI {
  // ============ Helpers ============

  static async handleResponse(response, defaultError) {
    if (response.ok) {
      return response.json();
    }

    let errorMessage = defaultError;
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // resposta não era JSON
    }

    throw new Error(errorMessage);
  }

  // ============ Products ============

  /**
   * GET /api/products
   */
  static async getProducts() {
    try {
      const response = await fetch(`${API_BASE}/products`);
      return await this.handleResponse(response, 'Falha ao obter produtos');
    } catch (error) {
      throw new Error('Servidor indisponível');
    }
  }

  /**
   * POST /api/products
   */
  static async createProduct(name, initialStock = 0) {
    try {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, initialStock })
      });

      return await this.handleResponse(response, 'Falha ao criar produto');
    } catch {
      throw new Error('Servidor indisponível');
    }
  }

  /**
   * DELETE /api/products/:id
   */
  static async deleteProduct(productId) {
    try {
      const response = await fetch(`${API_BASE}/products/${productId}`, {
        method: 'DELETE'
      });

      return await this.handleResponse(response, 'Falha ao deletar produto');
    } catch {
      throw new Error('Servidor indisponível');
    }
  }

  // ============ Stock Operations ============

  /**
   * POST /api/stock/in
   */
  static async addStock(productId, quantity, notes = '') {
    try {
      const response = await fetch(`${API_BASE}/stock/in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity, notes })
      });

      return await this.handleResponse(response, 'Falha ao adicionar stock');
    } catch {
      throw new Error('Servidor indisponível');
    }
  }

  /**
   * POST /api/stock/out
   */
  static async removeStock(productId, quantity, notes = '') {
    try {
      const response = await fetch(`${API_BASE}/stock/out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity, notes })
      });

      return await this.handleResponse(response, 'Falha ao remover stock');
    } catch {
      throw new Error('Servidor indisponível');
    }
  }

  /**
   * POST /api/stock/adjust
   */
  static async adjustStock(productId, newQuantity, notes = '') {
    try {
      const response = await fetch(`${API_BASE}/stock/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, newQuantity, notes })
      });

      return await this.handleResponse(response, 'Falha ao ajustar stock');
    } catch {
      throw new Error('Servidor indisponível');
    }
  }

  // ============ Events ============

  /**
   * GET /api/stock/events
   */
  static async getEvents(limit = 100, offset = 0) {
    try {
      const response = await fetch(
        `${API_BASE}/stock/events?limit=${limit}&offset=${offset}`
      );

      return await this.handleResponse(response, 'Falha ao obter eventos');
    } catch {
      throw new Error('Servidor indisponível');
    }
  }

  /**
   * GET /api/stock/events/:productId
   */
  static async getProductEvents(productId, limit = 50, offset = 0) {
    try {
      const response = await fetch(
        `${API_BASE}/stock/events/${productId}?limit=${limit}&offset=${offset}`
      );

      return await this.handleResponse(
        response,
        'Falha ao obter eventos do produto'
      );
    } catch {
      throw new Error('Servidor indisponível');
    }
  }

  // ============ Health ============

  /**
   * GET /health
   */
  static async checkHealth() {
    try {
      const response = await fetch('/health', { cache: 'no-store' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

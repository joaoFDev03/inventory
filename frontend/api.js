/**
 * API Service
 * Wrapper para comunicação com o backend
 */

const API_BASE = '/api';

class InventoryAPI {
  /**
   * GET /api/products
   */
  static async getProducts() {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) throw new Error('Falha ao obter produtos');
    return response.json();
  }

  /**
   * POST /api/products
   */
  static async createProduct(name, initialStock = 0) {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, initialStock })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Falha ao criar produto');
    }
    return response.json();
  }

  /**
   * DELETE /api/products/:id
   */
  static async deleteProduct(productId) {
    const response = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Falha ao deletar produto');
    return response.json();
  }

  /**
   * POST /api/stock/in
   */
  static async addStock(productId, quantity, notes = '') {
    const response = await fetch(`${API_BASE}/stock/in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity, notes })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Falha ao adicionar stock');
    }
    return response.json();
  }

  /**
   * POST /api/stock/out
   */
  static async removeStock(productId, quantity, notes = '') {
    const response = await fetch(`${API_BASE}/stock/out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity, notes })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Falha ao remover stock');
    }
    return response.json();
  }

  /**
   * POST /api/stock/adjust
   */
  static async adjustStock(productId, newQuantity, notes = '') {
    const response = await fetch(`${API_BASE}/stock/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, newQuantity, notes })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Falha ao ajustar stock');
    }
    return response.json();
  }

  /**
   * GET /api/stock/events
   */
  static async getEvents(limit = 100, offset = 0) {
    const response = await fetch(
      `${API_BASE}/stock/events?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error('Falha ao obter eventos');
    return response.json();
  }

  /**
   * GET /api/stock/events/:productId
   */
  static async getProductEvents(productId, limit = 50, offset = 0) {
    const response = await fetch(
      `${API_BASE}/stock/events/${productId}?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error('Falha ao obter eventos do produto');
    return response.json();
  }

  /**
   * GET /health
   */
  static async checkHealth() {
    try {
      const response = await fetch('/health');
      return response.ok;
    } catch {
      return false;
    }
  }
}

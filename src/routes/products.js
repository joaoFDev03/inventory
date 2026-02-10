const express = require('express');
const router = express.Router();
const { ProductModel, StockModel } = require('../models');

/**
 * GET /products
 * Obter todos os produtos com stock atual
 */
router.get('/', (req, res) => {
  try {
    const products = ProductModel.getAll();
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /products/:id
 * Obter detalhes de um produto
 */
router.get('/:id', (req, res) => {
  try {
    const product = ProductModel.getById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Obter eventos recentes do produto
    const events = StockModel.getEventsByProductId(product.id, 10);

    res.json({
      success: true,
      data: {
        product,
        recentEvents: events
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /products
 * Criar novo produto
 * Body: { name: string, initialStock?: number }
 */
router.post('/', (req, res) => {
  try {
    const { name, initialStock } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Product name is required and must be a string'
      });
    }

    const stock = initialStock ?? 0;
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        error: 'Initial stock must be a non-negative integer'
      });
    }

    const product = ProductModel.create(name, stock);
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    // Verificar se é erro de nome duplicado
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'Product with this name already exists'
      });
    }

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /products/:id
 * Deletar produto (remove histórico associado)
 */
router.delete('/:id', (req, res) => {
  try {
    const product = ProductModel.getById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    ProductModel.delete(req.params.id);
    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

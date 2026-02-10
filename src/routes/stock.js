const express = require('express');
const router = express.Router();
const { StockModel, ProductModel } = require('../models');

/**
 * POST /stock/in
 * Adicionar stock (entrada)
 * Body: { productId: string, quantity: number, notes?: string }
 */
router.post('/in', (req, res) => {
  try {
    const { productId, quantity, notes } = req.body;

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive integer'
      });
    }

    // Verificar se produto existe
    const product = ProductModel.getById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const result = StockModel.addStock(productId, quantity, notes || '');

    res.status(201).json({
      success: true,
      message: 'Stock added successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /stock/out
 * Remover stock (saída)
 * Body: { productId: string, quantity: number, notes?: string }
 */
router.post('/out', (req, res) => {
  try {
    const { productId, quantity, notes } = req.body;

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive integer'
      });
    }

    // Verificar se produto existe
    const product = ProductModel.getById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const result = StockModel.removeStock(productId, quantity, notes || '');

    res.status(201).json({
      success: true,
      message: 'Stock removed successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /stock/adjust
 * Ajustar stock (correção de inventário)
 * Body: { productId: string, newQuantity: number, notes?: string }
 */
router.post('/adjust', (req, res) => {
  try {
    const { productId, newQuantity, notes } = req.body;

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    if (!Number.isInteger(newQuantity) || newQuantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'New quantity must be a non-negative integer'
      });
    }

    // Verificar se produto existe
    const product = ProductModel.getById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const result = StockModel.adjustStock(productId, newQuantity, notes || '');

    res.status(201).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /stock/events
 * Obter histórico de eventos de stock
 * Query: { limit?: number, offset?: number }
 */
router.get('/events', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;

    const events = StockModel.getAllEvents(limit, offset);
    const summary = StockModel.getEventsSummary();

    res.json({
      success: true,
      data: {
        events,
        summary,
        pagination: {
          limit,
          offset,
          count: events.length
        }
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
 * GET /stock/events/:productId
 * Obter eventos de um produto específico
 * Query: { limit?: number, offset?: number }
 */
router.get('/events/:productId', (req, res) => {
  try {
    const { productId } = req.params;

    // Verificar se produto existe
    const product = ProductModel.getById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;

    const events = StockModel.getEventsByProductId(productId, limit, offset);

    res.json({
      success: true,
      data: {
        product,
        events,
        pagination: {
          limit,
          offset,
          count: events.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

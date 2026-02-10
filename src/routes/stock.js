const express = require('express');
const router = express.Router();
const { StockModel, ProductModel } = require('../models');

/* =======================
   Helpers
   ======================= */
function isValidId(id) {
  return typeof id === 'string' && id.trim().length > 0;
}

function parsePositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseNonNegativeInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/* =======================
   POST /stock/in
   ======================= */
router.post('/in', async (req, res, next) => {
  try {
    const { productId, quantity, notes } = req.body;

    if (!isValidId(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    const qty = parsePositiveInt(quantity);
    if (!qty) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive integer'
      });
    }

    const product = await ProductModel.getById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const result = await StockModel.addStock(productId, qty, notes ?? '');

    res.status(201).json({
      success: true,
      message: 'Stock added successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/* =======================
   POST /stock/out
   ======================= */
router.post('/out', async (req, res, next) => {
  try {
    const { productId, quantity, notes } = req.body;

    if (!isValidId(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    const qty = parsePositiveInt(quantity);
    if (!qty) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive integer'
      });
    }

    const product = await ProductModel.getById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const result = await StockModel.removeStock(productId, qty, notes ?? '');

    res.status(201).json({
      success: true,
      message: 'Stock removed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/* =======================
   POST /stock/adjust
   ======================= */
router.post('/adjust', async (req, res, next) => {
  try {
    const { productId, newQuantity, notes } = req.body;

    if (!isValidId(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    const qty = parseNonNegativeInt(newQuantity);
    if (qty === null) {
      return res.status(400).json({
        success: false,
        error: 'New quantity must be a non-negative integer'
      });
    }

    const product = await ProductModel.getById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const result = await StockModel.adjustStock(productId, qty, notes ?? '');

    res.status(201).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/* =======================
   GET /stock/events
   ======================= */
router.get('/events', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const events = await StockModel.getAllEvents(limit, offset);
    const summary = await StockModel.getEventsSummary();

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
    next(error);
  }
});

/* =======================
   GET /stock/events/:productId
   ======================= */
router.get('/events/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!isValidId(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    const product = await ProductModel.getById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const events = await StockModel.getEventsByProductId(productId, limit, offset);

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
    next(error);
  }
});

module.exports = router;

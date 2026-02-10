const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Import routes
const productsRouter = require('./routes/products');
const stockRouter = require('./routes/stock');

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

/**
 * GET /health
 * Endpoint para health check (ping do Render)
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * GET /api
 * Endpoint raiz com informações da API
 */
app.get('/api', (req, res) => {
  res.json({
    name: 'Inventário API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      products: {
        list: 'GET /api/products',
        create: 'POST /api/products',
        detail: 'GET /api/products/:id',
        delete: 'DELETE /api/products/:id'
      },
      stock: {
        addStock: 'POST /api/stock/in',
        removeStock: 'POST /api/stock/out',
        adjustStock: 'POST /api/stock/adjust',
        allEvents: 'GET /api/stock/events',
        productEvents: 'GET /api/stock/events/:productId'
      }
    }
  });
});

// Rotas da API (com prefixo /api)
app.use('/api/products', productsRouter);
app.use('/api/stock', stockRouter);

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✓ Server running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ API docs: http://localhost:${PORT}/\n`);
});

module.exports = app;

require('dotenv').config();

const express = require('express');
const path = require('path');
const database = require('./database');

const app = express();

/* =======================
   Logging (PRIMEIRO)
   ======================= */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

/* =======================
   Middleware base
   ======================= */
app.use(express.json());

/* =======================
   Frontend estático
   ======================= */
app.use(express.static(path.join(__dirname, '../frontend')));

/* =======================
   Rotas
   ======================= */
const productsRouter = require('./routes/products');
const stockRouter = require('./routes/stock');

app.use('/api/products', productsRouter);
app.use('/api/stock', stockRouter);

/* =======================
   Health check
   ======================= */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* =======================
   Info da API
   ======================= */
app.get('/api', (req, res) => {
  res.json({
    name: 'Inventário API',
    version: '1.0.0',
    status: 'running'
  });
});

/* =======================
   SPA fallback (opcional, mas seguro)
   ======================= */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') return next();
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

/* =======================
   404
   ======================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

/* =======================
   Error handler global
   ======================= */
app.use((err, req, res, next) => {
  const status = err.status || 500;

  console.error(err);

  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

/* =======================
   Start server
   ======================= */
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await database.initializeDatabase();
    console.log('✓ Database initialized successfully');

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/* =======================
   Graceful shutdown
   ======================= */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  database.close?.();
  process.exit(0);
});

startServer();

module.exports = app;

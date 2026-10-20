const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  try {
    // Verify database responsiveness
    const dbCheck = db.prepare('SELECT 1 as alive').get();
    const isDbAlive = dbCheck && dbCheck.alive === 1;

    // Verify AI key presence safely without leaking secret
    const aiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

    return res.json({
      status: 'healthy',
      service: 'Collaborative Research Ecosystem API',
      timestamp: new Date().toISOString(),
      database: isDbAlive ? 'connected' : 'error',
      aiConfigured,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    return res.status(500).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

module.exports = router;

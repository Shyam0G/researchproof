const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const profilesRouter = require('./routes/profiles');
const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const submissionsRouter = require('./routes/submissions');
const creditsRouter = require('./routes/credits');
const ledgerRouter = require('./routes/ledger');
const notificationsRouter = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// REST Route Groups
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', tasksRouter); // Handles both /api/projects/:id/tasks and /api/tasks/:id
app.use('/api/submissions', submissionsRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/notifications', notificationsRouter);

// Catch-all 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `API route ${req.method} ${req.originalUrl} does not exist.`
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: process.env.NODE_ENV === 'production' && status === 500 ? 'An unexpected error occurred.' : message
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Research Ecosystem API Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;

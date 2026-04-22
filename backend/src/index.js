require('dotenv').config();
const express = require('express');
const cors = require('cors');

const usersRouter = require('./routes/users');
const batchesRouter = require('./routes/batches');
const sessionsRouter = require('./routes/sessions');
const attendanceRouter = require('./routes/attendance');
const institutionsRouter = require('./routes/institutions');

const app = express();

// CORS — allow frontend origin
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Railway health checks, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => o && origin.startsWith(o))) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SkillBridge API',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/institutions', institutionsRouter);

// Programme summary endpoint (mounted under institutions router but exposed here too)
app.get('/api/programme/summary', (req, res, next) => {
  req.url = '/programme/summary';
  institutionsRouter(req, res, next);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🚀 SkillBridge API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;

// api/index.js — Vercel Serverless Function entry point
// This file wraps the entire Express backend so Vercel can run it as a serverless function.
// Vercel automatically serves any file inside the /api directory as a serverless endpoint.
// All requests to /api/* are rewritten here by vercel.json.
// MongoDB connection is cached globally so it survives across serverless warm invocations.

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Resolve backend module paths correctly (this file lives in /api, backend lives in /backend)
const backendPath = (p) => path.join(__dirname, '..', 'backend', p);

const connectDB = require(backendPath('config/db'));
const { errorHandler } = require(backendPath('middleware/errorMiddleware'));
const seedData = require(backendPath('utils/seedData'));

// Initialize express app
const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);

// Logging (only in non-production)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Ensure MongoDB Atlas is connected before any route handler runs
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[Vercel] MongoDB connection error:', err.message);
    res.status(503).json({ success: false, error: 'Database connection failed. Check your MONGODB_URI.' });
  }
});

// Mount all API routes (strip /api prefix — Vercel's rewrite passes the full path)
app.use('/api/auth', require(backendPath('routes/auth')));
app.use('/api/transactions', require(backendPath('routes/transactions')));
app.use('/api/budgets', require(backendPath('routes/budgets')));
app.use('/api/goals', require(backendPath('routes/goals')));
app.use('/api/activities', require(backendPath('routes/activities')));

// Seed endpoint
app.post('/api/seed', async (req, res, next) => {
  try {
    const { userId } = req.body;
    const result = await seedData(userId);
    res.status(200).json({
      success: true,
      message: 'Demo database seeded successfully!',
      details: result,
    });
  } catch (err) {
    next(err);
  }
});

// Health check
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Budget Tracker Pro API is active on Vercel!',
    mode: 'MongoDB Atlas via Mongoose',
    databaseConfigured: Boolean(process.env.MONGODB_URI),
  });
});

// Error handler
app.use(errorHandler);

// Export the app as a Vercel serverless handler — do NOT call app.listen()
module.exports = app;

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const seedData = require('./utils/seedData');

// Load environment variables
dotenv.config();

// Connect to MongoDB Atlas
connectDB().catch((err) => {
  console.error('[Server] Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

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

// HTTP Request logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/activities', require('./routes/activities'));

// Express on-demand seed trigger for the frontend Settings panel
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

// Root check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Budget Tracker Pro API is active!',
    mode: 'MongoDB Atlas via Mongoose',
    databaseConfigured: Boolean(process.env.MONGODB_URI),
  });
});

// Centralized error handling middleware
app.use(errorHandler);

// Unhandled Promise Rejections & Server Start
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`[Server] running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`[API URL] http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

// Catch unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection ERROR]: ${err.message}`);
});

module.exports = app;

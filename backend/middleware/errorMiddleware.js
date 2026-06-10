const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const technicalMessage = err.message || '';

  const isFilesystemError =
    ['ENOENT', 'EACCES', 'EROFS'].includes(err.code) ||
    technicalMessage.includes('/var/task') ||
    technicalMessage.includes('backend/data');

  console.error('[API Error]', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code: err.code,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  if (err.publicMessage) {
    return res.status(statusCode >= 500 ? 500 : statusCode).json({
      success: false,
      error: err.publicMessage,
    });
  }

  if (isFilesystemError) {
    return res.status(500).json({
      success: false,
      error: 'Unable to process your request right now. Please try again.',
    });
  }

  // MongoDB duplicate key error (e.g. duplicate email on registration)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      error: `An account with this ${field} already exists.`,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: messages.join('. '),
    });
  }

  // Mongoose CastError — invalid ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid resource identifier.',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Your session is invalid or has expired. Please log in again.',
    });
  }

  // General fallback
  const message =
    statusCode < 500 && err.message
      ? err.message
      : 'Unable to process your request right now. Please try again.';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

module.exports = { errorHandler };

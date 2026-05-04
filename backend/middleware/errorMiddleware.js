// ── Not Found handler ────────────────────────────────────────────────────────
exports.notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// ── Centralized error handler ─────────────────────────────────────────────────
// Returns structured errors compatible with frontend Formik field mapping:
// { success: false, message: '...', errors: [{ field, message }] }
exports.errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // Mongoose validation errors — convert to structured field errors
  if (err.name === 'ValidationError') {
    const errors = Object.keys(err.errors).map(field => ({
      field,
      message: err.errors[field].message,
    }));
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // Mongoose duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue?.[field];
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' is already registered.`,
      errors: [{ field, message: `This ${field} is already in use.` }],
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      errors: [{ field: err.path, message: `'${err.value}' is not a valid ID.` }],
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token has expired.' });
  }

  // Generic fallback
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
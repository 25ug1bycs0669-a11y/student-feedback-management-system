function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body must contain valid JSON' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation failed', errors: Object.values(error.errors).map((item) => item.message) });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid resource identifier' });
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `An account with this ${field} already exists` });
  }
  if (error.message === 'Origin is not allowed by CORS') {
    return res.status(403).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: 'An unexpected server error occurred' });
}

module.exports = { notFound, errorHandler };

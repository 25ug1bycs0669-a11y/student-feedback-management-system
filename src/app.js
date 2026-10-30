const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') && allowedOrigins.length === 0) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'student-feedback-api' });
});
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;

const { rateLimit } = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 180,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

module.exports = { apiLimiter };

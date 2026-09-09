const { rateLimit } = require('express-rate-limit');
const RESULT_CODES = require('../constants/resultCodes');
const { sendError } = require('../utils/responseFormatter');

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 180,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, RESULT_CODES.RATE_LIMIT_EXCEEDED),
});

module.exports = { apiLimiter };

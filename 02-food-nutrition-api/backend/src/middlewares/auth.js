const { createHash, timingSafeEqual } = require('node:crypto');
const RESULT_CODES = require('../constants/resultCodes');
const { ApiError } = require('./errorHandler');

function requireAdmin(adminKey) {
  return (req, _res, next) => {
    if (!adminKey) return next(new ApiError(RESULT_CODES.ADMIN_KEY_NOT_CONFIGURED));
    const authorization = req.headers.authorization || '';
    const received = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const digest = (value) => createHash('sha256').update(value).digest();
    if (!received || !timingSafeEqual(digest(received), digest(adminKey)))
      return next(new ApiError(RESULT_CODES.ADMIN_AUTH_REQUIRED));
    next();
  };
}

module.exports = { requireAdmin };

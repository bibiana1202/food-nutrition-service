const { randomUUID } = require('node:crypto');
const logger = require('../utils/logger');

module.exports = function apiLogger(enabled = true) {
  return (req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    const startedAt = performance.now();
    if (enabled)
      res.on('finish', () =>
        logger.info('HTTP 요청', {
          request_id: req.requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration_ms: Math.round(performance.now() - startedAt),
        }),
      );
    next();
  };
};

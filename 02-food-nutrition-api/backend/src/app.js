const express = require('express');
const helmet = require('helmet');
const { setupSwagger } = require('./config/swagger');
const createApiRoutes = require('./routes/api');
const healthRoutes = require('./routes/health');
const { apiLimiter } = require('./middlewares/rateLimiter');
const apiLogger = require('./middlewares/api_logger');
const { ApiError, errorHandler } = require('./middlewares/errorHandler');

function createApplication(adminKey = '', logging = true) {
  const app = express();
  app.disable('x-powered-by');
  app.use(apiLogger(logging));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '32kb' }));
  if (logging) app.use('/api', apiLimiter);
  app.use('/health', healthRoutes);
  app.use('/api', createApiRoutes(adminKey));
  setupSwagger(app);
  app.use((_req, _res, next) =>
    next(new ApiError(404, 'NOT_FOUND', '요청한 경로를 찾을 수 없습니다.')),
  );
  app.use(errorHandler);
  return app;
}

module.exports = createApplication;
module.exports.createApplication = createApplication;

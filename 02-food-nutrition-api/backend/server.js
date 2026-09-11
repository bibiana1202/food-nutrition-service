const { createServer } = require('node:http');
const express = require('express');
const helmet = require('helmet');
const { connectDatabase, closeDatabase } = require('./src/config/database');
const { migrateDatabase } = require('./src/config/migrator');
const { setupSwagger } = require('./src/config/swagger');
const RESULT_CODES = require('./src/constants/resultCodes');
const apiLogger = require('./src/middlewares/api_logger');
const { ApiError, errorHandler } = require('./src/middlewares/errorHandler');
const { apiLimiter } = require('./src/middlewares/rateLimiter');
const apiRoutes = require('./src/routes/api');
const healthRoutes = require('./src/routes/health');
const logger = require('./src/utils/logger');

/**
 * 공통 미들웨어와 라우터를 등록한 Express 애플리케이션을 생성한다.
 * 테스트에서는 실제 포트를 열지 않고 이 함수의 반환값만 사용한다.
 */
function createApplication(adminKey = '', logging = true) {
  const app = express();

  app.disable('x-powered-by');
  // 로컬은 프런트엔드 컨테이너 Nginx 1단계, 
  // 운영은 호스트 Nginx(HTTPS 종료) + 프런트엔드 컨테이너 Nginx까지 2단계를 거치므로 
  // 환경마다 실제 프록시 단계 수만큼만 신뢰해야 한다. 
  // 신뢰 단계를 실제보다 적게 잡으면 Rate Limit이 중간 프록시 IP 하나로 뭉뚱그려져 모든 사용자가 같은 제한을
  // 공유하고, 반대로 필요 이상으로 크게 잡으면 클라이언트가 X-Forwarded-For를 조작해 Rate Limit을 우회할 수 있다.
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 2 : 1);
  app.locals.adminKey = adminKey;

  // 공통 미들웨어 -----------------------------------------------------------------------------
  app.use(apiLogger(logging));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '32kb' }));
  if (logging) app.use('/api', apiLimiter);

  // 라우트 -------------------------------------------------------------------------------------
  app.use('/health', healthRoutes);
  app.use('/api', apiRoutes);
  setupSwagger(app);

  // 등록되지 않은 경로와 처리 중 발생한 오류를 공통 응답 형식으로 반환한다.
  app.use((_req, _res, next) => next(new ApiError(RESULT_CODES.ROUTE_NOT_FOUND)));
  app.use(errorHandler);

  return app;
}

/**
 * DB 연결과 migration을 완료한 뒤 HTTP 서버를 시작한다.
 */
async function startServer() {
  const port = Number(process.env.PORT || 3000);

  await connectDatabase();
  await migrateDatabase();

  const app = createApplication(process.env.ADMIN_API_KEY || '');
  const server = createServer(app);

  server.listen(port, process.env.HOST || '0.0.0.0', () => {
    logger.info(`API 서버 시작: ${port}`);
  });

  // 컨테이너 종료 신호를 받으면 새 연결을 중단하고 DB 연결 풀을 정리한다.
  const shutdown = () => server.close(() => closeDatabase().finally(() => process.exit(0)));
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  return server;
}

// node server.js로 직접 실행할 때만 DB와 HTTP 서버를 시작한다.
// 테스트에서 require('../server')로 불러올 때는 자동으로 실행되지 않는다.
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('API 서버 시작 실패', { error: error.message });
    process.exitCode = 1;
  });
}

module.exports = { createApplication, startServer };

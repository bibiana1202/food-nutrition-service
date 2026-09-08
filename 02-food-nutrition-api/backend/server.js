require('dotenv').config();
const { createServer } = require('node:http');
const createApplication = require('./src/app');
const { connectDatabase, closeDatabase } = require('./src/config/database');
const { migrateDatabase } = require('./src/config/migrator');
const logger = require('./src/utils/logger');

async function startServer() {
  const port = Number(process.env.PORT || 3000);
  await connectDatabase();
  await migrateDatabase();
  const server = createServer(createApplication(process.env.ADMIN_API_KEY || ''));
  server.listen(port, process.env.HOST || '0.0.0.0', () => logger.info(`API 서버 시작: ${port}`));
  const shutdown = () => server.close(() => closeDatabase().finally(() => process.exit(0)));
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((error) => {
  logger.error('API 서버 시작 실패', { error: error.message });
  process.exitCode = 1;
});

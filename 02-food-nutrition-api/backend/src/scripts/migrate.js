const { connectDatabase, closeDatabase } = require('../config/database');
const { migrateDatabase } = require('../config/migrator');
const logger = require('../utils/logger');

async function migrate() {
  await connectDatabase();
  try {
    const migrations = await migrateDatabase();
    logger.info('마이그레이션 완료', { migrations: migrations.map(({ name }) => name) });
  } finally {
    await closeDatabase();
  }
}

if (require.main === module)
  migrate().catch((error) => {
    logger.error('마이그레이션 실패', { error: error.message });
    process.exitCode = 1;
  });
module.exports = { migrate };

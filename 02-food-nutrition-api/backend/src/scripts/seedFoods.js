const path = require('node:path');
const { connectDatabase, closeDatabase } = require('../config/database');
const { migrateDatabase } = require('../config/migrator');
const { importFoods } = require('../services/ImportService');
const logger = require('../utils/logger');

async function seedFoods(filename = path.join(__dirname, '../../data/foods.xlsx')) {
  await connectDatabase();
  try {
    await migrateDatabase();
    const result = await importFoods(filename);
    logger.info('식품 데이터 적재 완료', result);
    return result;
  } finally {
    await closeDatabase();
  }
}

if (require.main === module)
  seedFoods(process.argv[2]).catch((error) => {
    logger.error('식품 데이터 적재 실패', { error: error.message });
    process.exitCode = 1;
  });
module.exports = { seedFoods };

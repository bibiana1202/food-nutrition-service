const { connectDatabase, closeDatabase } = require('../config/database');
const { migrateDatabase } = require('../config/migrator');
const { Food } = require('../models');

async function verifyData() {
  await connectDatabase();
  try {
    await migrateDatabase();
    const count = await Food.count();
    const sample = await Food.findOne({ where: { food_cd: 'D000006' }, raw: true });
    if (!count || !sample || sample.food_name !== '꿩불고기' || sample.calorie !== 368.8)
      throw new Error('데이터 검증 실패');
    console.log(JSON.stringify({ count, sample }, null, 2));
    return { count, sample };
  } finally {
    await closeDatabase();
  }
}

if (require.main === module)
  verifyData().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { verifyData };

const path = require('node:path');
const { SequelizeStorage, Umzug } = require('umzug');
const { sequelize } = require('./database');
const logger = require('../utils/logger');

const migrator = new Umzug({
  migrations: { glob: path.join(__dirname, '../migrations/*.js') },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger,
});

async function migrateDatabase() {
  return migrator.up();
}

module.exports = { migrator, migrateDatabase };

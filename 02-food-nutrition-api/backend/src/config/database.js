const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize({
  dialect: 'mariadb',
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: Number(process.env.DATABASE_PORT || 3306),
  database: process.env.MARIADB_DATABASE,
  username: process.env.MARIADB_USER,
  password: process.env.MARIADB_PASSWORD,
  timezone: '+00:00',
  logging: (message) => logger.debug(message),
  pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },
  define: { timestamps: false, underscored: true },
});

async function connectDatabase() {
  await sequelize.authenticate();
  logger.info('MariaDB 연결 성공');
  return sequelize;
}

async function closeDatabase() {
  await sequelize.close();
  logger.info('MariaDB 연결 종료');
}

module.exports = { sequelize, connectDatabase, closeDatabase };

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// 접속 정보는 실행 환경에서 주입한다. 로컬 개발은 .env.local을 사용하고,
// 운영 환경은 배포 시스템이나 비밀 저장소가 process.env에 값을 전달한다.
const sequelize = new Sequelize({
  dialect: 'mariadb',
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: Number(process.env.DATABASE_PORT || 3306),
  database: process.env.MARIADB_DATABASE,
  username: process.env.MARIADB_USER,
  password: process.env.MARIADB_PASSWORD,

  // 애플리케이션과 DB의 시간 기준을 UTC로 통일한다.
  timezone: '+00:00',

  // Sequelize가 실행한 SQL은 debug 레벨에서만 확인할 수 있다.
  logging: (message) => logger.debug(message),

  // 요청마다 연결을 만들지 않고 제한된 연결 풀을 재사용한다.
  pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },

  // 모든 업무 모델에서 생성·수정 시각을 사용하고 DB 컬럼명은 snake_case로 통일한다.
  // 실제 컬럼 생성은 이 설정이 아니라 migration에서 수행한다.
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

async function connectDatabase() {
  // authenticate()는 접속 가능 여부만 확인하며 스키마를 변경하지 않는다.
  // 실제 스키마 변경은 Umzug migration을 별도로 실행해 적용한다.
  await sequelize.authenticate();
  logger.info('MariaDB 연결 성공');
  return sequelize;
}

async function closeDatabase() {
  // 종료 신호를 받을 때 풀의 연결을 정리해 프로세스가 안전하게 끝나도록 한다.
  await sequelize.close();
  logger.info('MariaDB 연결 종료');
}

module.exports = { sequelize, connectDatabase, closeDatabase };

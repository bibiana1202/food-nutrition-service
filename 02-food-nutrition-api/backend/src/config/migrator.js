const path = require('node:path');
const { SequelizeStorage, Umzug } = require('umzug');
const { sequelize } = require('./database');
const logger = require('../utils/logger');

// Umzug의 실행 환경을 정의한다. 이 설정만으로 migration이 실행되지는 않으며, migrateDatabase()를 호출하거나 npm run db:migrate를 실행해야 DB에 반영된다.
const migrator = new Umzug({
  // 파일명 순서대로 src/migrations 아래의 JavaScript migration을 찾는다.
  migrations: { glob: path.join(__dirname, '../migrations/*.js') },

  // 각 migration의 up/down 함수가 테이블과 컬럼을 변경할 때 사용할 Sequelize API다.
  context: sequelize.getQueryInterface(),

  // 실행이 끝난 migration 이름을 MariaDB의 SequelizeMeta 테이블에 기록한다.
  // 이미 기록된 migration은 다음 실행에서 건너뛴다.
  storage: new SequelizeStorage({ sequelize }),

  // 실행, 완료 및 실패 내역을 애플리케이션 로그 형식으로 남긴다.
  logger,
});

async function migrateDatabase() {
  // 아직 적용되지 않은 모든 migration의 up 함수를 순서대로 실행한다.
  return migrator.up();
}

module.exports = { migrator, migrateDatabase };

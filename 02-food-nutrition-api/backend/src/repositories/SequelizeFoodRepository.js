const {
  Op,
  fn,
  col,
  where: sqlWhere,
  UniqueConstraintError,
  BaseError,
  DatabaseError,
} = require('sequelize');
const { Food } = require('../models');
const { sequelize } = require('../config/database');
const { DuplicateFoodCodeError, StorageBusyError, StorageError } = require('../errors/foodErrors');
const logger = require('../utils/logger');

// JSON 응답과 같은 값으로 변환하여 모델 메서드/메타데이터와 Date 객체를 내보내지 않는다.
const toFood = (row) => (row ? JSON.parse(JSON.stringify(row.get({ plain: true }))) : null);

function translateError(error) {
  if (error instanceof UniqueConstraintError) return new DuplicateFoodCodeError();
  if (
    error instanceof DatabaseError &&
    ['ER_LOCK_WAIT_TIMEOUT', 'ER_LOCK_DEADLOCK'].includes(error.parent?.code)
  )
    return new StorageBusyError();
  logger.error('식품 저장소 작업 실패', { error: error.message });
  return new StorageError();
}

async function access(operation) {
  try {
    return await operation();
  } catch (error) {
    throw translateError(error);
  }
}

/** @implements {import('./FoodRepository').FoodRepository} */
class SequelizeFoodRepository {
  search(search) {
    return access(async () => {
      const conditions = [];
      // %, _도 일반 문자로 검색한다. SQL 구성은 저장소 구현 안에서만 수행한다.
      if (search.food_name)
        conditions.push(sqlWhere(fn('LOCATE', search.food_name, col('food_name')), { [Op.gt]: 0 }));
      if (search.maker_name)
        conditions.push(
          sqlWhere(fn('LOCATE', search.maker_name, col('maker_name')), { [Op.gt]: 0 }),
        );
      if (search.research_year !== undefined)
        conditions.push({ research_year: search.research_year });
      if (search.food_code) conditions.push({ food_cd: search.food_code });
      if (search.cursor !== undefined) conditions.push({ id: { [Op.gt]: search.cursor } });
      const rows = await Food.findAll({
        where: conditions.length ? { [Op.and]: conditions } : undefined,
        order: [['id', 'ASC']],
        limit: search.limit,
      });
      return rows.map(toFood);
    });
  }

  findById(id) {
    return access(async () => toFood(await Food.findByPk(id)));
  }

  create(input) {
    return access(async () => {
      const food = await Food.create(input);
      await food.reload();
      return toFood(food);
    });
  }

  update(id, input) {
    return access(async () => {
      const [affected] = await Food.update(input, { where: { id } });
      return affected ? toFood(await Food.findByPk(id)) : null;
    });
  }

  remove(id) {
    return access(async () => (await Food.destroy({ where: { id } })) > 0);
  }

  async importBatches(batches) {
    try {
      return await sequelize.transaction(async (transaction) => {
        const before = await Food.count({ transaction });
        for await (const batch of batches) {
          await Food.bulkCreate(batch, { ignoreDuplicates: true, transaction, validate: true });
        }
        return (await Food.count({ transaction })) - before;
      });
    } catch (error) {
      // 배치 생성기의 입력 검증 오류는 저장소 오류로 바꾸지 않는다.
      if (error instanceof BaseError) throw translateError(error);
      throw error;
    }
  }
}
module.exports = SequelizeFoodRepository;

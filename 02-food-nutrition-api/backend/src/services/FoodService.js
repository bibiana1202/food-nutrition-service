const { Op, fn, col, where: sqlWhere, UniqueConstraintError } = require('sequelize');
const RESULT_CODES = require('../constants/resultCodes');
const { Food } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * 식품 조회와 변경에 필요한 업무 로직을 담당한다.
 * Controller에서 검증된 값만 전달받고, DB 결과 또는 업무 오류를 반환한다.
 */
class FoodService {
  /**
   * 검색 조건과 ID 커서를 이용해 식품 목록을 조회한다.
   *
   * @param {object} search 검증이 끝난 검색 조건과 페이지 크기
   * @returns {Promise<object>} 식품 목록과 다음 커서 정보
   */
  async list(search) {
    const conditions = [];

    // LOCATE를 사용해 %, _ 같은 문자를 와일드카드가 아닌 일반 검색어로 처리한다.
    if (search.food_name)
      conditions.push(sqlWhere(fn('LOCATE', search.food_name, col('food_name')), { [Op.gt]: 0 }));
    if (search.maker_name)
      conditions.push(sqlWhere(fn('LOCATE', search.maker_name, col('maker_name')), { [Op.gt]: 0 }));
    if (search.research_year !== undefined)
      conditions.push({ research_year: search.research_year });
    if (search.food_code) conditions.push({ food_cd: search.food_code });

    // 마지막으로 조회한 ID보다 큰 행부터 가져와 큰 OFFSET에서 발생하는 스캔 비용을 피한다.
    if (search.cursor !== undefined) conditions.push({ id: { [Op.gt]: search.cursor } });

    // 한 건을 더 조회해 별도의 COUNT 쿼리 없이 다음 페이지 존재 여부를 판단한다.
    const rows = await Food.findAll({
      where: conditions.length ? { [Op.and]: conditions } : undefined,
      order: [['id', 'ASC']],
      limit: search.page_size + 1,
    });

    const hasNext = rows.length > search.page_size;
    const items = hasNext ? rows.slice(0, search.page_size) : rows;

    return {
      items,
      page_size: search.page_size,
      next_cursor: hasNext ? String(items.at(-1).id) : null,
      has_next: hasNext,
    };
  }

  /**
   * ID에 해당하는 식품을 조회한다.
   *
   * @throws {ApiError} 식품이 존재하지 않으면 FOOD_NOT_FOUND
   */
  async get(id) {
    const food = await Food.findByPk(id);
    if (!food) throw new ApiError(RESULT_CODES.FOOD_NOT_FOUND);
    return food;
  }

  /**
   * 식품을 등록하고 DB에 저장된 최종 데이터를 반환한다.
   *
   * @throws {ApiError} food_cd가 이미 존재하면 DUPLICATE_FOOD_CODE
   */
  async create(input) {
    let food;
    try {
      food = await Food.create(input);
    } catch (error) {
      // food_cd UNIQUE 제약 위반만 구체적인 코드로 변환한다. 다른 UNIQUE 제약(다른 테이블 등)이
      // 생기더라도 여기는 "식품 등록"이라는 맥락을 알고 있으므로 오판 없이 정확히 판단할 수 있다.
      if (error instanceof UniqueConstraintError) throw new ApiError(RESULT_CODES.DUPLICATE_FOOD_CODE);
      throw error;
    }
    return this.get(food.id);
  }

  /**
   * 전달된 필드만 수정하고 변경된 식품 정보를 다시 조회한다.
   *
   * @throws {ApiError} 수정할 식품이 존재하지 않으면 FOOD_NOT_FOUND
   */
  async update(id, input) {
    const [affected] = await Food.update(input, { where: { id } });
    if (!affected) throw new ApiError(RESULT_CODES.FOOD_NOT_FOUND);
    return this.get(id);
  }

  /**
   * ID에 해당하는 식품을 삭제한다.
   *
   * @throws {ApiError} 삭제할 식품이 존재하지 않으면 FOOD_NOT_FOUND
   */
  async remove(id) {
    const affected = await Food.destroy({ where: { id } });
    if (!affected) throw new ApiError(RESULT_CODES.FOOD_NOT_FOUND);
  }
}

// 상태를 보관하지 않는 서비스이므로 하나의 인스턴스를 애플리케이션 전체에서 공유한다.
module.exports = new FoodService();

const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { Food } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');

class FoodService {
  async list(search) {
    const where = { [Op.and]: [] };
    if (search.food_name)
      where[Op.and].push(
        sqlWhere(fn('LOCATE', search.food_name, col('food_name')), { [Op.gt]: 0 }),
      );
    if (search.maker_name)
      where[Op.and].push(
        sqlWhere(fn('LOCATE', search.maker_name, col('maker_name')), { [Op.gt]: 0 }),
      );
    if (search.research_year !== undefined) where.research_year = search.research_year;
    if (search.food_code) where.food_cd = search.food_code;
    const { rows, count } = await Food.findAndCountAll({
      where,
      order: [['id', 'ASC']],
      offset: (search.page - 1) * search.page_size,
      limit: search.page_size,
    });
    return {
      items: rows,
      page: search.page,
      page_size: search.page_size,
      total: count,
      total_pages: Math.ceil(count / search.page_size),
    };
  }

  async get(id) {
    const food = await Food.findByPk(id);
    if (!food) throw new ApiError(404, 'NOT_FOUND', '식품 정보를 찾을 수 없습니다.');
    return food;
  }

  async create(input) {
    const food = await Food.create(input);
    return this.get(food.id);
  }

  async update(id, input) {
    const [affected] = await Food.update(input, { where: { id } });
    if (!affected) throw new ApiError(404, 'NOT_FOUND', '수정할 식품 정보를 찾을 수 없습니다.');
    return this.get(id);
  }

  async remove(id) {
    const affected = await Food.destroy({ where: { id } });
    if (!affected) throw new ApiError(404, 'NOT_FOUND', '삭제할 식품 정보를 찾을 수 없습니다.');
  }
}

module.exports = new FoodService();

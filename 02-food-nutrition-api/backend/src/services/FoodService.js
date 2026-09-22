const { FoodNotFoundError } = require('../errors/foodErrors');

// 저장소는 조립 지점에서 주입한다. 이 모듈을 불러와도 DB 모듈은 로드되지 않는다.
class FoodService {
  /** @param {import('../repositories/FoodRepository').FoodRepository} repository */
  constructor(repository) {
    this.repository = repository;
  }

  async list(search) {
    const { page_size, ...filters } = search;
    const rows = await this.repository.search({ ...filters, limit: page_size + 1 });
    const hasNext = rows.length > page_size;
    const items = hasNext ? rows.slice(0, page_size) : rows;
    return {
      items,
      page_size,
      next_cursor: hasNext ? String(items.at(-1).id) : null,
      has_next: hasNext,
    };
  }

  async get(id) {
    const food = await this.repository.findById(id);
    if (!food) throw new FoodNotFoundError();
    return food;
  }

  create(input) {
    return this.repository.create(input);
  }

  async update(id, input) {
    const food = await this.repository.update(id, input);
    if (!food) throw new FoodNotFoundError();
    return food;
  }

  async remove(id) {
    if (!(await this.repository.remove(id))) throw new FoodNotFoundError();
  }
}
module.exports = FoodService;

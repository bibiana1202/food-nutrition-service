const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const FoodService = require('../src/services/FoodService');
const { ImportService } = require('../src/services/ImportService');
const { FoodNotFoundError, DuplicateFoodCodeError } = require('../src/errors/foodErrors');

test('서비스를 불러올 때 ORM, DB 설정, 구체 저장소, HTTP 계층을 로드하지 않는다', () => {
  execFileSync(
    process.execPath,
    [
      '-e',
      `
    const Module = require('node:module');
    const original = Module._load;
    Module._load = function(name, ...args) {
      if (/sequelize|mariadb|config\\/database|models|SequelizeFoodRepository|middlewares|[/]container$/.test(name))
        throw new Error('금지된 의존성: ' + name);
      return original.call(this, name, ...args);
    };
    require('./src/services/FoodService');
    require('./src/services/ImportService');
  `,
    ],
    { cwd: require('node:path').join(__dirname, '..') },
  );
});

test('저장소 결과로 다음 커서를 계산하고 추가 조회 행은 응답에서 제외한다', async () => {
  const rows = [{ id: '7' }, { id: '11' }, { id: '19' }];
  const service = new FoodService({
    async search(query) {
      assert.deepEqual(query, { food_name: '국', cursor: 3, limit: 3 });
      return rows;
    },
  });
  assert.deepEqual(await service.list({ food_name: '국', cursor: 3, page_size: 2 }), {
    items: [{ id: '7' }, { id: '11' }],
    page_size: 2,
    next_cursor: '11',
    has_next: true,
  });
  assert.equal(rows.length, 3);
  const empty = new FoodService({ search: async () => [] });
  assert.deepEqual(await empty.list({ page_size: 2 }), {
    items: [],
    page_size: 2,
    next_cursor: null,
    has_next: false,
  });
  const last = new FoodService({ search: async () => [{ id: 7 }] });
  assert.equal((await last.list({ page_size: 1 })).next_cursor, null);
});

test('없음과 삭제 실패를 DB 타입 없이 업무 오류로 처리한다', async () => {
  const service = new FoodService({
    findById: async () => null,
    update: async () => null,
    remove: async () => false,
  });
  await assert.rejects(service.get(1), FoodNotFoundError);
  await assert.rejects(service.update(1, { calorie: 0 }), FoodNotFoundError);
  await assert.rejects(service.remove(1), FoodNotFoundError);
});

test('대체 저장소로 CRUD를 수행하고 중복 오류를 보존한다', async () => {
  let record = null;
  const service = new FoodService({
    async create(input) {
      if (record) throw new DuplicateFoodCodeError();
      record = { id: 1, ...input };
      return { ...record };
    },
    async findById() {
      return record && { ...record };
    },
    async update(_id, input) {
      Object.assign(record, input);
      return { ...record };
    },
    async remove() {
      record = null;
      return true;
    },
  });
  assert.equal((await service.create({ food_cd: 'A', calorie: 1 })).id, 1);
  await assert.rejects(service.create({ food_cd: 'A' }), DuplicateFoodCodeError);
  assert.equal((await service.update(1, { calorie: null })).calorie, null);
  assert.equal((await service.get(1)).food_cd, 'A');
  await service.remove(1);
  await assert.rejects(service.get(1), FoodNotFoundError);
});

test('원본 엑셀 정규화와 적재 집계는 DB 없이 검증할 수 있다', async () => {
  let rowCount = 0;
  let sample;
  const service = new ImportService({
    async importBatches(batches) {
      for await (const batch of batches) {
        rowCount += batch.length;
        sample ||= batch.find((food) => food.food_cd === 'D000006');
        assert.ok(batch.every((food) => Object.getPrototypeOf(food) === Object.prototype));
      }
      return rowCount - 1;
    },
  });
  assert.deepEqual(await service.importFoods('data/foods.xlsx'), {
    rows: 7683,
    inserted: 7682,
    skipped: 1,
  });
  assert.equal(sample.food_name, '꿩불고기');
  assert.equal(sample.calorie, 368.8);
});

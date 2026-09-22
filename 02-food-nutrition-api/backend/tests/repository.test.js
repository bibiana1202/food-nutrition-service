const { test } = require('node:test');
const assert = require('node:assert/strict');
const { UniqueConstraintError, DatabaseError, ConnectionError } = require('sequelize');
const { Food } = require('../src/models');
const SequelizeFoodRepository = require('../src/repositories/SequelizeFoodRepository');
const {
  DuplicateFoodCodeError,
  StorageBusyError,
  StorageError,
} = require('../src/errors/foodErrors');
const { errorHandler } = require('../src/middlewares/errorHandler');

const repository = new SequelizeFoodRepository();

test('DB 모델과 날짜를 외부에 노출하지 않고 JSON 값으로 반환한다', async (t) => {
  const date = new Date('2026-09-01T00:00:00.000Z');
  const row = Food.build({ id: 1, food_cd: 'A', food_name: '국', created_at: date });
  t.mock.method(Food, 'findByPk', async () => row);
  const food = await repository.findById(1);
  assert.equal(Object.getPrototypeOf(food), Object.prototype);
  assert.equal(food.created_at, date.toISOString());
  assert.equal(food.save, undefined);
  assert.equal(food.dataValues, undefined);
  food.food_name = '변경';
  assert.equal(row.food_name, '국');
});

test('등록과 수정의 중복 코드 오류를 ORM 정보 없는 공통 오류로 변환한다', async (t) => {
  const failure = new UniqueConstraintError({ message: 'private SQL details' });
  t.mock.method(Food, 'create', async () => {
    throw failure;
  });
  t.mock.method(Food, 'update', async () => {
    throw failure;
  });
  for (const action of [() => repository.create({}), () => repository.update(1, {})]) {
    await assert.rejects(action, (error) => {
      assert.ok(error instanceof DuplicateFoodCodeError);
      assert.equal(error.cause, undefined);
      assert.equal(error.sql, undefined);
      assert.ok(!error.message.includes('private'));
      return true;
    });
  }
});

test('잠금 오류와 연결 오류도 ORM 예외를 외부에 전달하지 않는다', async (t) => {
  let failure = new DatabaseError(Object.assign(new Error('locked'), { code: 'ER_LOCK_DEADLOCK' }));
  t.mock.method(Food, 'findByPk', async () => {
    throw failure;
  });
  await assert.rejects(repository.findById(1), StorageBusyError);
  failure = new ConnectionError(new Error('connection failed'));
  await assert.rejects(repository.findById(1), (error) => {
    assert.ok(error instanceof StorageError);
    assert.equal(error.cause, undefined);
    return true;
  });
});

test('공통 오류는 기존 HTTP 계약으로 변환한다', () => {
  for (const [error, status, code] of [
    [new DuplicateFoodCodeError(), 409, 'DUPLICATE_FOOD_CODE'],
    [new StorageBusyError(), 503, 'DATABASE_BUSY'],
  ]) {
    const headers = {};
    const response = {
      locals: {},
      req: { requestId: 'test-request' },
      setHeader(key, value) {
        headers[key] = value;
      },
      status(value) {
        this.statusCode = value;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    errorHandler(error, {}, response, () => {});
    assert.equal(response.statusCode, status);
    assert.equal(response.body.code, code);
    if (status === 503) assert.equal(headers['Retry-After'], '1');
  }
});

const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { createApplication } = require('../server');
const { connectDatabase, closeDatabase } = require('../src/config/database');
const { migrateDatabase } = require('../src/config/migrator');
const { Food } = require('../src/models');

const adminKey = 'test-admin-key-at-least-thirty-two-characters';
let server;
let baseUrl;

async function request(path, method = 'GET', body, token = adminKey) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, body: response.status === 204 ? null : await response.json() };
}

before(async () => {
  await connectDatabase();
  await migrateDatabase();
  await Food.destroy({ where: {}, truncate: true });
  const app = createApplication(adminKey, false);
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

test('CRUD와 nullable 필드 초기화', async () => {
  const created = await request('/api/foods', 'POST', {
    food_cd: ' d-test ',
    food_name: ' 김치찌개 ',
    research_year: 2020,
    calorie: 123.5,
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.success, true);
  assert.equal(created.body.code, 'FOOD_CREATED');
  assert.equal(created.body.data.food_cd, 'D-TEST');
  assert.equal(created.body.data.food_name, '김치찌개');
  assert.equal(created.body.data.protein, null);
  assert.ok(created.body.data.created_at);
  assert.ok(created.body.data.updated_at);
  const url = `/api/foods/${created.body.data.id}`;
  assert.equal((await request(url)).body.data.calorie, 123.5);
  assert.equal((await request(url, 'PATCH', { calorie: 0 })).body.data.calorie, 0);
  assert.equal((await request(url, 'PATCH', { calorie: null })).body.data.calorie, null);
  assert.equal((await request(url, 'DELETE')).response.status, 204);
  assert.equal((await request(url)).response.status, 404);
});

test('검색 조건 조합과 커서 페이지네이션', async () => {
  for (const [food_cd, food_name, research_year, maker_name] of [
    ['SEARCH-1', '김치찌개', 2020, '서울'],
    ['SEARCH-2', '김치볶음', 2020, '서울'],
    ['SEARCH-3', '김치찌개', 2019, '부산'],
    ['SEARCH-4', 'Soup 100%_Real', 2020, 'Maker'],
  ])
    await request('/api/foods', 'POST', { food_cd, food_name, research_year, maker_name });
  const first = await request(
    '/api/foods?food_name=김치&research_year=2020&maker_name=서울&page_size=1',
  );
  assert.equal(first.body.data.items.length, 1);
  assert.equal(first.body.data.items[0].food_cd, 'SEARCH-1');
  assert.equal(first.body.data.has_next, true);
  const second = await request(
    `/api/foods?food_name=김치&research_year=2020&maker_name=서울&page_size=1&cursor=${first.body.data.next_cursor}`,
  );
  assert.equal(second.body.data.items[0].food_cd, 'SEARCH-2');
  assert.equal(second.body.data.has_next, false);
  assert.equal((await request('/api/foods?food_name=%25_')).body.data.items.length, 1);
  assert.equal(
    (await request('/api/foods?food_code=%20search-3%20')).body.data.items[0].food_cd,
    'SEARCH-3',
  );
});

test('중복 식품코드는 409', async () => {
  await request('/api/foods', 'POST', { food_cd: 'DUPE-A', food_name: 'A' });
  assert.equal(
    (await request('/api/foods', 'POST', { food_cd: 'dupe-a', food_name: 'B' })).response.status,
    409,
  );
});

test('없는 리소스는 일관된 404 응답', async () => {
  const { response, body } = await request('/api/foods/999999');
  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.code, 'FOOD_NOT_FOUND');
  assert.equal(body.request_id, response.headers.get('x-request-id'));
  const patched = await request('/api/foods/999999', 'PATCH', { calorie: 1 });
  assert.equal(patched.response.status, 404);
  assert.equal(patched.body.code, 'FOOD_NOT_FOUND');
  const deleted = await request('/api/foods/999999', 'DELETE');
  assert.equal(deleted.response.status, 404);
  assert.equal(deleted.body.code, 'FOOD_NOT_FOUND');
  assert.equal((await request('/api')).body.code, 'ROUTE_NOT_FOUND');
});

test('잘못된 입력과 쿼리를 거부', async () => {
  for (const body of [
    {},
    { food_cd: 'X', food_name: ' ' },
    { food_cd: 'X', food_name: 'X', protein: -1 },
    { food_cd: 'X', food_name: 'X', extra: true },
  ]) {
    assert.equal((await request('/api/foods', 'POST', body)).response.status, 400);
  }
  for (const query of [
    'cursor=0',
    'cursor=abc',
    'page_size=101',
    'unknown=x',
    'cursor=1&cursor=2',
  ]) {
    assert.equal((await request(`/api/foods?${query}`)).response.status, 400);
  }
});

test('쓰기 인증과 공개 조회 및 헬스 체크', async () => {
  const payload = { food_cd: 'LOCKED', food_name: '보호됨' };
  assert.equal((await request('/api/foods', 'POST', payload, null)).response.status, 401);
  assert.equal((await request('/api/foods', 'POST', payload, 'wrong')).response.status, 401);
  assert.equal((await request('/api/foods', 'GET', undefined, null)).response.status, 200);
  assert.equal((await request('/api/admin/verify', 'POST')).response.status, 200);
  assert.equal((await request('/health/ready')).response.status, 200);
  assert.ok((await request('/api/docs-json')).body.paths['/api/foods']);
});

test('동시 중복 생성은 하나만 성공', async () => {
  const responses = await Promise.all(
    Array.from({ length: 5 }, () =>
      request('/api/foods', 'POST', { food_cd: 'CONCURRENT', food_name: '동시 등록' }),
    ),
  );
  assert.equal(responses.filter(({ response }) => response.status === 201).length, 1);
  assert.equal(responses.filter(({ response }) => response.status === 409).length, 4);
});

test('잘못된 JSON과 큰 본문도 공통 오류 형식', async () => {
  for (const [body, status] of [
    ['{bad', 400],
    [JSON.stringify({ text: 'x'.repeat(40_000) }), 413],
  ]) {
    const response = await fetch(`${baseUrl}/api/foods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body,
    });
    assert.equal(response.status, status);
    assert.ok((await response.json()).code);
  }
});

test('관리자 키가 없으면 읽기 전용', async () => {
  const app = createApplication('', false);
  const readonlyServer = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  try {
    const response = await fetch(`http://127.0.0.1:${readonlyServer.address().port}/api/foods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food_cd: 'READONLY', food_name: 'X' }),
    });
    assert.equal(response.status, 503);
  } finally {
    await new Promise((resolve) => readonlyServer.close(resolve));
  }
});

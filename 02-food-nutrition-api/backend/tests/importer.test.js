const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const ExcelJS = require('exceljs');
const { connectDatabase, closeDatabase } = require('../src/config/database');
const { migrateDatabase } = require('../src/config/migrator');
const { Food } = require('../src/models');
const { columnMapping, importFoods, numericValue } = require('../src/services/ImportService');

before(async () => {
  await connectDatabase();
  await migrateDatabase();
});
after(closeDatabase);

async function createFixture(rows, missingHeader = false) {
  const directory = await mkdtemp(join(tmpdir(), 'food-import-'));
  const filename = join(directory, 'fixture.xlsx');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Foods');
  const fields = Object.keys(columnMapping);
  sheet.addRow(
    fields.map((field) =>
      missingHeader && field === 'food_cd' ? '잘못된열' : columnMapping[field],
    ),
  );
  for (const row of rows) sheet.addRow(fields.map((field) => row[field] ?? '-'));
  await workbook.xlsx.writeFile(filename);
  return { filename, cleanup: () => rm(directory, { recursive: true, force: true }) };
}

test('엑셀 매핑, 0, 단위, 미만 표현, 중복 방지', async () => {
  const fixture = await createFixture([
    {
      food_cd: 'F-1',
      food_name: '국',
      research_year: '2020',
      calorie: '1,234.5',
      sugars: '0',
      serving_unit: 'mL',
      serving_size: '200',
    },
    { food_cd: 'F-2', food_name: '밥', research_year: '2021', protein: '1g 미만' },
  ]);
  await Food.destroy({ where: {}, truncate: true });
  try {
    assert.deepEqual(await importFoods(fixture.filename), { rows: 2, inserted: 2, skipped: 0 });
    const food = await Food.findOne({ where: { food_cd: 'F-1' } });
    assert.equal(food.calorie, 1234.5);
    assert.equal(food.sugars, 0);
    assert.equal(food.serving_unit, 'mL');
    const uncertain = await Food.findOne({ where: { food_cd: 'F-2' } });
    assert.equal(uncertain.protein, null);
    assert.equal(uncertain.source_notes, 'protein: 1g 미만');
    await Food.update({ food_name: '수정한 국' }, { where: { id: food.id } });
    assert.deepEqual(await importFoods(fixture.filename), { rows: 2, inserted: 0, skipped: 2 });
    assert.equal((await Food.findByPk(food.id)).food_name, '수정한 국');
  } finally {
    await fixture.cleanup();
  }
});

test('잘못된 행은 전체 트랜잭션 롤백', async () => {
  const rows = Array.from({ length: 251 }, (_, index) => ({
    food_cd: `F-${index}`,
    food_name: '국',
    protein: '1',
  }));
  rows[250].protein = 'not a number';
  const fixture = await createFixture(rows);
  await Food.destroy({ where: {}, truncate: true });
  try {
    await assert.rejects(importFoods(fixture.filename), /252행/);
    assert.equal(await Food.count(), 0);
  } finally {
    await fixture.cleanup();
  }
});

test('필수 열 누락을 명확히 보고', async () => {
  const fixture = await createFixture([{ food_cd: 'F-1', food_name: '국' }], true);
  try {
    await assert.rejects(importFoods(fixture.filename), /필수 열 누락: 식품코드/);
  } finally {
    await fixture.cleanup();
  }
});

test('모호하거나 잘못된 숫자를 거부', () => {
  for (const value of ['1,2', '1mg', '-1', 'NaN', 'Infinity', '1e999'])
    assert.throws(() => numericValue(value));
  assert.equal(numericValue(null), null);
  assert.equal(numericValue('0'), 0);
});

test('원본 7,683건 적재와 재실행 멱등성', async () => {
  await Food.destroy({ where: {}, truncate: true });
  assert.deepEqual(await importFoods('data/foods.xlsx'), {
    rows: 7683,
    inserted: 7683,
    skipped: 0,
  });
  assert.deepEqual(await importFoods('data/foods.xlsx'), {
    rows: 7683,
    inserted: 0,
    skipped: 7683,
  });
  const sample = await Food.findOne({ where: { food_cd: 'D000006' } });
  assert.equal(sample.food_name, '꿩불고기');
  assert.equal(sample.calorie, 368.8);
  assert.equal(sample.sodium, 1264.31);
  assert.equal(await Food.count(), 7683);
});

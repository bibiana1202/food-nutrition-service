const ExcelJS = require('exceljs');
const { sequelize } = require('../config/database');
const { Food } = require('../models');
const { foodCreateSchema, nutrientFields } = require('../utils/validator');

const columnMapping = {
  food_cd: '식품코드',
  food_name: '식품명',
  group_name: '식품대분류',
  research_year: '연도',
  maker_name: '지역 / 제조사',
  ref_name: '성분표출처',
  serving_size: '1회제공량',
  serving_unit: '내용량_단위',
  calorie: '에너지(㎉)',
  carbohydrate: '탄수화물(g)',
  protein: '단백질(g)',
  fat: '지방(g)',
  sugars: '총당류(g)',
  sodium: '나트륨(㎎)',
  cholesterol: '콜레스테롤(㎎)',
  saturated_fatty_acids: '총 포화 지방산(g)',
  trans_fat: '트랜스 지방산(g)',
};
const missing = new Set(['', '-', 'N/A', 'NA', 'NULL']);
const normalizeHeader = (value) => value.normalize('NFKC').replace(/\s/g, '');

function cellText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    return missing.has(text.toUpperCase()) ? null : text;
  }
  if (typeof value === 'object' && 'richText' in value)
    return cellText(value.richText.map((part) => part.text).join(''));
  if (typeof value === 'object' && 'formula' in value) {
    if (value.result === undefined) throw new Error('계산 결과가 없는 수식 셀');
    return cellText(value.result);
  }
  throw new Error('지원하지 않는 셀 형식');
}

function numericValue(text) {
  if (text === null) return null;
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text))
    throw new Error(`올바르지 않은 숫자: ${text}`);
  const number = Number(text.replaceAll(',', ''));
  if (!Number.isFinite(number)) throw new Error('유한한 숫자가 아닙니다.');
  return number;
}

async function importFoods(filename) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filename);
  const result = { rows: 0, inserted: 0, skipped: 0 };
  await sequelize.transaction(async (transaction) => {
    const before = await Food.count({ transaction });
    for (const [sheetIndex, sheet] of workbook.worksheets.entries()) {
      const columns = new Map();
      sheet
        .getRow(1)
        .eachCell((cell, index) => columns.set(normalizeHeader(cellText(cell.value) || ''), index));
      for (const title of Object.values(columnMapping))
        if (!columns.has(normalizeHeader(title))) throw new Error(`필수 열 누락: ${title}`);
      const batch = [];
      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
        const row = sheet.getRow(rowNumber);
        if (!row.hasValues) continue;
        try {
          const values = {};
          const notes = [];
          for (const [field, title] of Object.entries(columnMapping)) {
            const text = cellText(row.getCell(columns.get(normalizeHeader(title))).value);
            if (
              nutrientFields.includes(field) &&
              text &&
              /^\d+(?:\.\d+)?\s*(?:g|mg)?\s*미만$/.test(text)
            ) {
              values[field] = null;
              notes.push(`${field}: ${text}`);
            } else
              values[field] =
                field === 'research_year' || nutrientFields.includes(field)
                  ? numericValue(text)
                  : text;
          }
          values.source_notes = notes.length ? notes.join('; ') : null;
          batch.push(foodCreateSchema.parse(values));
          result.rows++;
        } catch (error) {
          throw new Error(`${sheetIndex + 1}번 시트 ${row.number}행 적재 실패: ${error.message}`, {
            cause: error,
          });
        }
      }
      await Food.bulkCreate(batch, { ignoreDuplicates: true, transaction, validate: true });
    }
    result.inserted = (await Food.count({ transaction })) - before;
  });
  if (!result.rows) throw new Error('적재할 식품 데이터가 없습니다.');
  result.skipped = result.rows - result.inserted;
  return result;
}

module.exports = { cellText, columnMapping, importFoods, numericValue };

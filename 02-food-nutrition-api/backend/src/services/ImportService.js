const ExcelJS = require('exceljs');
const { sequelize } = require('../config/database');
const { Food } = require('../models');
const { foodCreateSchema, nutrientFields } = require('../utils/validator');

// 애플리케이션 필드와 원본 엑셀의 열 제목을 연결한다.
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
// 다음 표기는 값이 없는 것으로 간주해 null로 변환한다.
const missing = new Set(['', '-', 'N/A', 'NA', 'NULL']);
// 유니코드 표현과 공백 차이로 같은 열을 찾지 못하는 상황을 방지한다.
const normalizeHeader = (value) => value.normalize('NFKC').replace(/\s/g, '');

/**
 * ExcelJS 셀 값을 검증 가능한 일반 문자열로 변환한다.
 * 일반 값, 서식 있는 문자열, 계산 결과가 포함된 수식 셀을 지원한다.
 *
 * @param {*} value ExcelJS 셀 값
 * @returns {string | null} 정규화한 셀 문자열
 */
function cellText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    // 결측 표기(빈 문자열, '-', 'N/A' 등)는 값이 있는 셀과 구분해 null로 통일한다.
    return missing.has(text.toUpperCase()) ? null : text;
  }
  // 서식이 섞인 문자열은 스타일을 버리고 이어붙인 텍스트만 취해 같은 규칙을 다시 적용한다.
  if (typeof value === 'object' && 'richText' in value)
    return cellText(value.richText.map((part) => part.text).join(''));
  if (typeof value === 'object' && 'formula' in value) {
    // 수식을 다시 계산하지 않고 엑셀이 저장해 둔 결과값만 읽는다.
    if (value.result === undefined) throw new Error('계산 결과가 없는 수식 셀');
    return cellText(value.result);
  }
  throw new Error('지원하지 않는 셀 형식');
}

/**
 * 숫자 셀의 문자열에서 천 단위 구분자를 제거하고 유한한 Number로 변환한다.
 * 임의 문자열이 일부만 숫자로 해석되지 않도록 전체 형식을 먼저 검사한다.
 *
 * @param {string | null} text 정규화된 셀 문자열
 * @returns {number | null} 변환된 숫자
 */
function numericValue(text) {
  if (text === null) return null;
  // 정수, 소수, '1,234' 같은 천 단위 구분 표기만 허용해 '1,2'나 '12mg' 같은 값을 걸러낸다.
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text))
    throw new Error(`올바르지 않은 숫자: ${text}`);
  const number = Number(text.replaceAll(',', ''));
  if (!Number.isFinite(number)) throw new Error('유한한 숫자가 아닙니다.');
  return number;
}

/**
 * 엑셀 파일의 모든 워크시트를 읽어 식품 데이터를 일괄 적재한다.
 * 전체 작업을 하나의 트랜잭션으로 묶어 어느 행에서든 실패하면 모두 롤백한다.
 *
 * @param {string} filename 적재할 엑셀 파일 경로
 * @returns {Promise<{rows: number, inserted: number, skipped: number}>} 적재 결과
 */
async function importFoods(filename) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filename);
  const result = { rows: 0, inserted: 0, skipped: 0 };
  await sequelize.transaction(async (transaction) => {
    const before = await Food.count({ transaction });
    for (const [sheetIndex, sheet] of workbook.worksheets.entries()) {
      // 첫 행의 제목을 실제 열 번호로 변환하고 필수 열이 모두 존재하는지 확인한다.
      const columns = new Map();
      sheet
        .getRow(1)
        .eachCell((cell, index) => columns.set(normalizeHeader(cellText(cell.value) || ''), index));
      for (const title of Object.values(columnMapping))
        if (!columns.has(normalizeHeader(title))) throw new Error(`필수 열 누락: ${title}`);
      // 워크시트별로 검증이 끝난 행을 모아 한 번에 INSERT한다.
      const batch = [];
      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
        const row = sheet.getRow(rowNumber);
        if (!row.hasValues) continue;
        try {
          const values = {};
          const notes = [];
          for (const [field, title] of Object.entries(columnMapping)) {
            const text = cellText(row.getCell(columns.get(normalizeHeader(title))).value);
            // '1g 미만'처럼 한정 표현이 붙은 영양성분은 확정 수치로 만들지 않고
            // null로 저장한 뒤 원문을 source_notes에 보존한다.
            if (
              nutrientFields.includes(field) &&
              text &&
              /^\d+(?:\.\d+)?\s*(?:g|mg)?\s*미만$/.test(text)
            ) {
              values[field] = null;
              notes.push(`${field}: ${text}`);
            } else
              // 연도와 영양성분만 숫자로 변환하고, 나머지 텍스트 필드는 그대로 둔다.
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
      // 식품코드가 이미 존재하면 기존 관리자 수정값을 덮어쓰지 않고 건너뛴다.
      await Food.bulkCreate(batch, { ignoreDuplicates: true, transaction, validate: true });
    }
    // 트랜잭션 안에서 전후 건수를 비교해 실제 추가된 행 수를 계산한다.
    result.inserted = (await Food.count({ transaction })) - before;
  });
  if (!result.rows) throw new Error('적재할 식품 데이터가 없습니다.');
  result.skipped = result.rows - result.inserted;
  return result;
}

module.exports = { cellText, columnMapping, importFoods, numericValue };

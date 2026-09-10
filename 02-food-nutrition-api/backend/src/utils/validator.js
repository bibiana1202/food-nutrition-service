const { z } = require('zod');

// 등록·수정 스키마와 엑셀 적재(ImportService)가 같은 영양성분 필드 목록을 공유한다.
const nutrientFields = [
  'serving_size',
  'calorie',
  'carbohydrate',
  'protein',
  'fat',
  'sugars',
  'sodium',
  'cholesterol',
  'saturated_fatty_acids',
  'trans_fat',
];
// 상한 1e12는 실제 영양성분 범위가 아니라 비정상적으로 큰 값을 막기 위한 안전장치다.
// finite()는 NaN·Infinity를 막고, nullable()은 결측값을 값이 있는 0과 구분해 허용한다.
const nutrient = z.number().finite().min(0).max(1e12).nullable().optional();
const optionalText = (max) => z.string().trim().max(max).nullable().optional();

const foodCreateSchema = z
  .object({
    food_cd: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(64)
      // 원본 데이터의 코드(D000006 등)와 관리자가 새로 등록하는 코드를 함께 허용하되
      // 특수문자로 시작하는 값은 막는다.
      .regex(/^[A-Z0-9][A-Z0-9_-]*$/),
    food_name: z.string().trim().min(1).max(300),
    group_name: optionalText(300),
    research_year: z.number().int().min(1900).max(2100).nullable().optional(),
    maker_name: optionalText(300),
    ref_name: optionalText(1000),
    source_notes: optionalText(1000),
    serving_unit: z.enum(['g', 'mL']).nullable().optional(),
    ...Object.fromEntries(nutrientFields.map((field) => [field, nutrient])),
  })
  // 정의하지 않은 필드가 오면 조용히 무시하지 않고 검증 오류로 알려준다.
  .strict();

// 등록 스키마를 그대로 재사용해 필드 정의가 어긋나지 않게 하되, PATCH는 모든 필드를
// 선택으로 바꾸고 빈 객체 요청( {} )만 별도로 막는다.
const foodPatchSchema = foodCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, '수정할 항목을 하나 이상 입력해주세요.');

// 쿼리 문자열과 경로 파라미터는 항상 string으로 들어오므로 형식을 정규식으로 먼저
// 걸러낸 뒤 숫자로 변환한다. '0', 앞자리 0, 음수, 소수는 정규식에서 이미 거부된다.
const positiveIntegerString = (max) =>
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().max(max));
const searchSchema = z
  .object({
    food_name: z.string().trim().min(1).max(300).optional(),
    // 2100은 형식 단계의 상한이고, 1900 이상이라는 의미(연도) 검증은 변환 후 pipe에서 한다.
    research_year: positiveIntegerString(2100).pipe(z.number().min(1900)).optional(),
    maker_name: z.string().trim().min(1).max(300).optional(),
    food_code: z.string().trim().toUpperCase().min(1).max(64).optional(),
    // 커서는 연도처럼 의미 있는 범위가 아니라 이전 응답의 id를 그대로 돌려받는 값이라
    // 안전한 정수 범위까지만 허용한다.
    cursor: positiveIntegerString(Number.MAX_SAFE_INTEGER).optional(),
    // 대량 데이터를 한 번에 끌어오지 못하도록 1~100 사이로 제한하고 기본값은 20이다.
    page_size: positiveIntegerString(100).default(20),
  })
  // 정의하지 않은 쿼리 키는 오류로 거부한다. 같은 키를 여러 번 보내면 Express가 배열로
  // 파싱하는데, 이 스키마는 string만 허용하므로 그 경우도 자동으로 걸러진다.
  .strict();

const idSchema = positiveIntegerString(Number.MAX_SAFE_INTEGER);

module.exports = { foodCreateSchema, foodPatchSchema, idSchema, nutrientFields, searchSchema };

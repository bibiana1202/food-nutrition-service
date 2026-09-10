const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: '식품 ID',
  schema: { type: 'integer', minimum: 1, example: 1 },
};

const json = (schema, example) => ({
  'application/json': { schema, ...(example ? { example } : {}) },
});

// 실제 목록 조회 응답과 같은 형태를 보여주는 대표 식품 예시다.
const foodExample = {
  id: 6760,
  food_cd: 'D018000',
  food_name: '가래떡',
  group_name: '곡류 및 서류',
  research_year: 2020,
  maker_name: '전국(대표)',
  ref_name: '식품영양성분 자료집',
  source_notes: null,
  serving_unit: 'g',
  serving_size: 100,
  calorie: 195.16,
  carbohydrate: 43.73,
  protein: 3.92,
  fat: 0.51,
  sugars: 0,
  sodium: 240.57,
  cholesterol: 0,
  saturated_fatty_acids: 0.19,
  trans_fat: 0,
  created_at: '2026-09-09T06:58:08.027Z',
  updated_at: '2026-09-09T06:58:08.033Z',
};

const foodListExample = {
  success: true,
  code: 'FOOD_LIST_SUCCESS',
  message: '식품 목록 조회 성공',
  data: {
    items: [foodExample],
    page_size: 20,
    next_cursor: '6760',
    has_next: true,
  },
  request_id: '04895a54-badc-4edf-85b0-3a8be9cd6223',
};

module.exports = {
  '/api/foods': {
    get: {
      tags: ['Food'],
      summary: '식품 목록 조회 및 검색',
      description: '식품명, 조사연도, 제조사명, 식품코드로 검색하고 커서 단위로 조회합니다.',
      parameters: [
        {
          name: 'food_name',
          in: 'query',
          description: '식품명 부분 검색',
          schema: { type: 'string', example: '김치' },
        },
        {
          name: 'research_year',
          in: 'query',
          description: '조사연도',
          schema: { type: 'integer', minimum: 1900, maximum: 2100, example: 2020 },
        },
        {
          name: 'maker_name',
          in: 'query',
          description: '제조사명 부분 검색',
          schema: { type: 'string', example: '서울' },
        },
        {
          name: 'food_code',
          in: 'query',
          description: '식품코드 정확히 검색',
          schema: { type: 'string', example: 'D000006' },
        },
        {
          name: 'cursor',
          in: 'query',
          description: '이전 응답의 next_cursor. 첫 조회에서는 생략합니다.',
          schema: { type: 'string', pattern: '^[1-9]\\d*$', example: '20' },
        },
        {
          name: 'page_size',
          in: 'query',
          description: '페이지당 항목 수',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        200: {
          description: '조회 성공',
          content: json({ $ref: '#/components/schemas/FoodListResponse' }, foodListExample),
        },
        400: { $ref: '#/components/responses/BadRequest' },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
    post: {
      tags: ['Food'],
      summary: '식품 등록',
      security: [{ AdminKey: [] }],
      requestBody: {
        required: true,
        content: json({ $ref: '#/components/schemas/FoodCreate' }),
      },
      responses: {
        201: {
          description: '등록 성공',
          content: json({ $ref: '#/components/schemas/FoodCreatedResponse' }),
        },
        400: { $ref: '#/components/responses/BadRequestBody' },
        401: { $ref: '#/components/responses/Unauthorized' },
        409: { $ref: '#/components/responses/Conflict' },
        413: { $ref: '#/components/responses/PayloadTooLarge' },
        429: { $ref: '#/components/responses/TooManyRequests' },
        503: { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/api/foods/{id}': {
    get: {
      tags: ['Food'],
      summary: '식품 상세 조회',
      parameters: [idParameter],
      responses: {
        200: {
          description: '조회 성공',
          content: json({ $ref: '#/components/schemas/FoodResponse' }),
        },
        400: { $ref: '#/components/responses/BadRequest' },
        404: { $ref: '#/components/responses/NotFound' },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
    patch: {
      tags: ['Food'],
      summary: '식품 정보 수정',
      security: [{ AdminKey: [] }],
      parameters: [idParameter],
      requestBody: {
        required: true,
        content: json({ $ref: '#/components/schemas/FoodUpdate' }),
      },
      responses: {
        200: {
          description: '수정 성공',
          content: json({ $ref: '#/components/schemas/FoodUpdatedResponse' }),
        },
        400: { $ref: '#/components/responses/BadRequestBody' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
        413: { $ref: '#/components/responses/PayloadTooLarge' },
        429: { $ref: '#/components/responses/TooManyRequests' },
        503: { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
    delete: {
      tags: ['Food'],
      summary: '식품 삭제',
      security: [{ AdminKey: [] }],
      parameters: [idParameter],
      responses: {
        204: { description: '삭제 성공' },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        429: { $ref: '#/components/responses/TooManyRequests' },
        503: { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
};

const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: '식품 ID',
  schema: { type: 'integer', minimum: 1, example: 1 },
};

const json = (schema) => ({
  'application/json': { schema },
});

module.exports = {
  '/api/foods': {
    get: {
      tags: ['Food'],
      summary: '식품 목록 조회 및 검색',
      description: '식품명, 조사연도, 제조사명, 식품코드로 검색하고 페이지 단위로 조회합니다.',
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
          name: 'page',
          in: 'query',
          description: '페이지 번호',
          schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 },
        },
        {
          name: 'page_size',
          in: 'query',
          description: '페이지당 항목 수',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        200: { description: '조회 성공', content: json({ $ref: '#/components/schemas/FoodList' }) },
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
        201: { description: '등록 성공', content: json({ $ref: '#/components/schemas/Food' }) },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        409: { $ref: '#/components/responses/Conflict' },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/api/foods/{id}': {
    get: {
      tags: ['Food'],
      summary: '식품 상세 조회',
      parameters: [idParameter],
      responses: {
        200: { description: '조회 성공', content: json({ $ref: '#/components/schemas/Food' }) },
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
        200: { description: '수정 성공', content: json({ $ref: '#/components/schemas/Food' }) },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
        429: { $ref: '#/components/responses/TooManyRequests' },
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
      },
    },
  },
};

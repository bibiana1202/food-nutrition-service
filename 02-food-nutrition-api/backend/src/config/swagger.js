const swaggerUi = require('swagger-ui-express');
const { z } = require('zod');
const RESULT_CODES = require('../constants/resultCodes');
const { foodCreateSchema, foodPatchSchema } = require('../utils/validator');

const adminPaths = require('./swagger_admin');
const foodPaths = require('./swagger_food');
const healthPaths = require('./swagger_health');

function toOpenApiSchema(input) {
  const { $schema, ...schema } = z.toJSONSchema(input, { io: 'input' });
  return schema;
}

const foodCreate = toOpenApiSchema(foodCreateSchema);
const foodUpdate = toOpenApiSchema(foodPatchSchema);
const errorSchema = {
  type: 'object',
  required: ['success', 'code', 'message', 'details', 'request_id'],
  properties: {
    success: { type: 'boolean', const: false, example: false },
    code: { type: 'string', description: '오류를 식별하는 Result Code' },
    message: { type: 'string', description: '오류 안내 메시지' },
    details: { type: 'array', items: { type: 'object' }, example: [] },
    request_id: {
      type: 'string',
      format: 'uuid',
      example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    },
  },
};

const successSchema = (data, result) => ({
  type: 'object',
  required: ['success', 'code', 'message', 'data', 'request_id'],
  properties: {
    success: { type: 'boolean', const: true, example: true },
    code: { type: 'string', example: result.code },
    message: { type: 'string', example: result.message },
    data,
    request_id: { type: 'string', format: 'uuid' },
  },
});

const errorResponse = (result) => ({
  description: result.message,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: {
        success: false,
        code: result.code,
        message: result.message,
        details: [],
        request_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      },
    },
  },
});

const environment = process.env.NODE_ENV || 'local';
// 기본값은 현재 Swagger 화면과 같은 origin을 사용해 Docker/Nginx 환경에서도 CORS 없이 호출한다.
const serverUrl = process.env.API_BASE_URL || '/';
const serverDescription =
  environment === 'production' ? '운영 서버' : environment === 'test' ? '테스트 서버' : '로컬 서버';

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: '식품영양성분 API',
    version: '1.0.0',
    description: [
      '식품 영양정보를 검색하고 관리하는 Express API입니다.',
      '',
      '## 관리자 인증',
      '등록·수정·삭제 요청은 `Authorization: Bearer {ADMIN_API_KEY}` 헤더가 필요합니다.',
      '',
      '## 전역 Rate Limit',
      'API 요청은 IP당 1분에 최대 180회로 제한됩니다.',
      '한도를 초과하면 HTTP 429 응답을 반환합니다.',
    ].join('\n'),
  },
  servers: [{ url: serverUrl, description: serverDescription }],
  tags: [
    { name: 'Food', description: '식품 영양정보 조회 및 관리 API' },
    { name: 'Admin', description: '관리자 인증 확인 API' },
    { name: 'Health', description: '프로세스 및 데이터베이스 상태 확인 API' },
  ],
  components: {
    securitySchemes: {
      AdminKey: {
        type: 'http',
        scheme: 'bearer',
        description: '관리자 API 키 인증 (Authorization: Bearer {ADMIN_API_KEY})',
      },
    },
    schemas: {
      FoodCreate: foodCreate,
      FoodUpdate: foodUpdate,
      Food: {
        type: 'object',
        description: '저장된 식품 기본 정보와 영양성분',
        required: [
          'id',
          'food_cd',
          'food_name',
          'group_name',
          'research_year',
          'maker_name',
          'ref_name',
          'source_notes',
          'serving_unit',
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
          'created_at',
          'updated_at',
        ],
        properties: {
          id: { type: 'integer', example: 6760 },
          food_cd: { type: 'string', example: 'D018000' },
          food_name: { type: 'string', example: '가래떡' },
          group_name: { type: ['string', 'null'], example: '곡류 및 서류' },
          research_year: { type: ['integer', 'null'], example: 2020 },
          maker_name: { type: ['string', 'null'], example: '전국(대표)' },
          ref_name: { type: ['string', 'null'], example: '식품영양성분 자료집' },
          source_notes: { type: ['string', 'null'], example: null },
          serving_unit: { type: ['string', 'null'], enum: ['g', 'mL', null], example: 'g' },
          serving_size: { type: ['number', 'null'], example: 100 },
          calorie: { type: ['number', 'null'], example: 195.16 },
          carbohydrate: { type: ['number', 'null'], example: 43.73 },
          protein: { type: ['number', 'null'], example: 3.92 },
          fat: { type: ['number', 'null'], example: 0.51 },
          sugars: { type: ['number', 'null'], example: 0 },
          sodium: { type: ['number', 'null'], example: 240.57 },
          cholesterol: { type: ['number', 'null'], example: 0 },
          saturated_fatty_acids: { type: ['number', 'null'], example: 0.19 },
          trans_fat: { type: ['number', 'null'], example: 0 },
          created_at: {
            type: 'string',
            format: 'date-time',
            example: '2026-09-09T06:58:08.027Z',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            example: '2026-09-09T06:58:08.033Z',
          },
        },
      },
      FoodList: {
        type: 'object',
        required: ['items', 'page_size', 'next_cursor', 'has_next'],
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Food' } },
          page_size: { type: 'integer', example: 20 },
          next_cursor: {
            type: ['string', 'null'],
            description: '다음 조회에 전달할 cursor. 다음 데이터가 없으면 null',
            example: '6779',
          },
          has_next: { type: 'boolean', example: true },
        },
      },
      AdminVerification: {
        type: 'object',
        required: ['authenticated'],
        properties: { authenticated: { type: 'boolean', example: true } },
      },
      Liveness: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', example: 'ok' } },
      },
      Readiness: {
        type: 'object',
        required: ['status', 'database'],
        properties: {
          status: { type: 'string', example: 'ok' },
          database: { type: 'string', example: 'ok' },
        },
      },
      FoodResponse: successSchema(
        { $ref: '#/components/schemas/Food' },
        RESULT_CODES.FOOD_GET_SUCCESS,
      ),
      FoodListResponse: successSchema(
        { $ref: '#/components/schemas/FoodList' },
        RESULT_CODES.FOOD_LIST_SUCCESS,
      ),
      FoodCreatedResponse: successSchema(
        { $ref: '#/components/schemas/Food' },
        RESULT_CODES.FOOD_CREATED,
      ),
      FoodUpdatedResponse: successSchema(
        { $ref: '#/components/schemas/Food' },
        RESULT_CODES.FOOD_UPDATED,
      ),
      AdminVerificationResponse: successSchema(
        { $ref: '#/components/schemas/AdminVerification' },
        RESULT_CODES.ADMIN_VERIFIED,
      ),
      LivenessResponse: successSchema(
        { $ref: '#/components/schemas/Liveness' },
        RESULT_CODES.HEALTH_LIVE,
      ),
      ReadinessResponse: successSchema(
        { $ref: '#/components/schemas/Readiness' },
        RESULT_CODES.HEALTH_READY,
      ),
      Error: errorSchema,
    },
    responses: {
      BadRequest: errorResponse(RESULT_CODES.VALIDATION_ERROR),
      Unauthorized: errorResponse(RESULT_CODES.ADMIN_AUTH_REQUIRED),
      NotFound: errorResponse(RESULT_CODES.FOOD_NOT_FOUND),
      Conflict: errorResponse(RESULT_CODES.DUPLICATE_FOOD_CODE),
      TooManyRequests: errorResponse(RESULT_CODES.RATE_LIMIT_EXCEEDED),
    },
  },
  paths: {
    ...foodPaths,
    ...adminPaths,
    ...healthPaths,
  },
};

function setupSwagger(app) {
  app.get('/api/docs-json', (_req, res) => res.json(openApiDocument));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      swaggerOptions: { persistAuthorization: false },
    }),
  );
}

module.exports = { openApiDocument, setupSwagger };

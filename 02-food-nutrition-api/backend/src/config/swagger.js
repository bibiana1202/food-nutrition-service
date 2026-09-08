const swaggerUi = require('swagger-ui-express');
const { z } = require('zod');
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
  required: ['error', 'request_id'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message', 'details'],
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: '입력값을 확인해주세요.' },
        details: { type: 'array', items: { type: 'object' } },
      },
    },
    request_id: { type: 'string', format: 'uuid' },
  },
};

const errorResponse = (description) => ({
  description,
  content: {
    'application/json': { schema: { $ref: '#/components/schemas/Error' } },
  },
});

const environment = process.env.NODE_ENV || 'local';
const serverUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
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
        allOf: [
          { $ref: '#/components/schemas/FoodCreate' },
          {
            type: 'object',
            required: ['id', 'created_at', 'updated_at'],
            properties: {
              id: { type: 'integer', example: 1 },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-09-08T07:00:00.000Z',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-09-08T07:00:00.000Z',
              },
            },
          },
        ],
      },
      FoodList: {
        type: 'object',
        required: ['items', 'page', 'page_size', 'total', 'total_pages'],
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Food' } },
          page: { type: 'integer', example: 1 },
          page_size: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 7683 },
          total_pages: { type: 'integer', example: 385 },
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
      ReadinessFailure: {
        type: 'object',
        required: ['status', 'database'],
        properties: {
          status: { type: 'string', example: 'unavailable' },
          database: { type: 'string', example: 'error' },
        },
      },
      Error: errorSchema,
    },
    responses: {
      BadRequest: errorResponse('잘못된 요청'),
      Unauthorized: errorResponse('관리자 인증 실패'),
      NotFound: errorResponse('리소스를 찾을 수 없음'),
      Conflict: errorResponse('중복된 식품코드'),
      TooManyRequests: errorResponse('요청 횟수 제한 초과'),
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

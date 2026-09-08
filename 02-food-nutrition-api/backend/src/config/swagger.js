const swaggerUi = require('swagger-ui-express');
const { z } = require('zod');
const { foodCreateSchema } = require('../utils/validator');
const schema = (input) => {
  const { $schema, ...output } = z.toJSONSchema(input, { io: 'input' });
  return output;
};
const food = schema(foodCreateSchema.required().extend({ id: z.number().int().positive() }));
const error = {
  type: 'object',
  required: ['error', 'request_id'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message', 'details'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'array', items: { type: 'object' } },
      },
    },
    request_id: { type: 'string', format: 'uuid' },
  },
};
const errors = {
  400: {
    description: '\uC798\uBABB\uB41C \uC694\uCCAD',
    content: { 'application/json': { schema: error } },
  },
  404: {
    description: '\uC874\uC7AC\uD558\uC9C0 \uC54A\uB294 \uC2DD\uD488',
    content: { 'application/json': { schema: error } },
  },
};
const id = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: '\uC2DD\uD488\uC601\uC591\uC131\uBD84 API',
    version: '1.0.0',
    description: 'Express + MariaDB \uC2DD\uD488 \uAC80\uC0C9 \uBC0F \uAD00\uB9AC API',
  },
  components: {
    securitySchemes: { adminKey: { type: 'http', scheme: 'bearer' } },
    schemas: { Food: food, Error: error },
  },
  paths: {
    '/api/foods': {
      get: {
        summary: '\uC2DD\uD488 \uAC80\uC0C9 \uBC0F \uD398\uC774\uC9C0\uB124\uC774\uC158',
        parameters: [
          { name: 'food_name', in: 'query', schema: { type: 'string' } },
          { name: 'research_year', in: 'query', schema: { type: 'integer' } },
          { name: 'maker_name', in: 'query', schema: { type: 'string' } },
          { name: 'food_code', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          {
            name: 'page_size',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 },
          },
        ],
        responses: { 200: { description: '\uAC80\uC0C9 \uACB0\uACFC' }, ...errors },
      },
      post: {
        summary: '\uC2DD\uD488 \uB4F1\uB85D',
        security: [{ adminKey: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: food } } },
        responses: {
          201: { description: '\uC0DD\uC131 \uC131\uACF5' },
          409: { description: '\uC911\uBCF5 \uC2DD\uD488\uCF54\uB4DC' },
          ...errors,
        },
      },
    },
    '/api/foods/{id}': {
      get: {
        summary: '\uC2DD\uD488 \uC0C1\uC138 \uC870\uD68C',
        parameters: [id],
        responses: { 200: { description: '\uC2DD\uD488' }, ...errors },
      },
      patch: {
        summary: '\uC2DD\uD488 \uBD80\uBD84 \uC218\uC815',
        security: [{ adminKey: [] }],
        parameters: [id],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: schema(foodCreateSchema.partial()) },
          },
        },
        responses: {
          200: { description: '\uC218\uC815 \uC131\uACF5' },
          409: { description: '\uC911\uBCF5 \uC2DD\uD488\uCF54\uB4DC' },
          ...errors,
        },
      },
      delete: {
        summary: '\uC2DD\uD488 \uC0AD\uC81C',
        security: [{ adminKey: [] }],
        parameters: [id],
        responses: { 204: { description: '\uC0AD\uC81C \uC131\uACF5' }, ...errors },
      },
    },
    '/api/admin/verify': {
      post: {
        summary: '\uAD00\uB9AC\uC790 \uD0A4 \uD655\uC778',
        security: [{ adminKey: [] }],
        responses: {
          200: { description: '\uC778\uC99D \uC131\uACF5' },
          401: { description: '\uC778\uC99D \uC2E4\uD328' },
        },
      },
    },
    '/health/live': {
      get: {
        summary: '\uD504\uB85C\uC138\uC2A4 \uC0C1\uD0DC',
        responses: { 200: { description: '\uC815\uC0C1' } },
      },
    },
    '/health/ready': {
      get: {
        summary: 'DB \uC900\uBE44 \uC0C1\uD0DC',
        responses: {
          200: { description: '\uC815\uC0C1' },
          503: { description: 'DB \uC624\uB958' },
        },
      },
    },
  },
};
function setupSwagger(app) {
  app.get('/api/docs-json', (_req, res) => res.json(openApiDocument));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, { swaggerOptions: { persistAuthorization: false } }),
  );
}

module.exports = { openApiDocument, setupSwagger };

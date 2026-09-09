const RESULT_CODES = require('../constants/resultCodes');

module.exports = {
  '/api': {
    get: {
      tags: ['System'],
      summary: 'API 기본 정보 조회',
      responses: {
        200: {
          description: RESULT_CODES.API_INFO_SUCCESS.message,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiInfoResponse' },
            },
          },
        },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
};

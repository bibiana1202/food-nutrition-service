const { rateLimit } = require('express-rate-limit');
const RESULT_CODES = require('../constants/resultCodes');
const { sendError } = require('../utils/responseFormatter');

/**
 * 단일 클라이언트가 1분 동안 호출할 수 있는 API 요청 수를 제한한다.
 * 제한을 초과하면 공통 응답 규격의 RATE_LIMIT_EXCEEDED 오류를 반환한다.
 */
const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 180,
  // 표준 RateLimit 응답 헤더를 사용하고 이전 X-RateLimit 헤더는 보내지 않는다.
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, RESULT_CODES.RATE_LIMIT_EXCEEDED),
});

module.exports = { apiLimiter };

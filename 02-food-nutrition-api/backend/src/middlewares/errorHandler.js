const { DatabaseError } = require('sequelize');
const { ZodError } = require('zod');
const RESULT_CODES = require('../constants/resultCodes');
const logger = require('../utils/logger');
const { sendError } = require('../utils/responseFormatter');

/**
 * 애플리케이션에서 예상한 오류와 Result Code를 함께 전달하기 위한 오류 타입이다.
 */
class ApiError extends Error {
  constructor(result, details = []) {
    super(result.message);
    this.result = result;
    this.details = details;
  }
}

/**
 * 라우터와 서비스에서 전달된 예외를 공통 API 오류 응답으로 변환한다.
 * 알려진 예외는 구체적인 Result Code로 매핑하고, 나머지는 내부 서버 오류로 처리한다.
 *
 * @type {import('express').ErrorRequestHandler}
 */
function errorHandler(exception, request, response, _next) {
  let error = exception instanceof ApiError ? exception : new ApiError(RESULT_CODES.INTERNAL_ERROR);

  // 요청 값 검증 실패 시 필드별 오류를 details 배열로 제공한다.
  if (exception instanceof ZodError) {
    error = new ApiError(
      RESULT_CODES.VALIDATION_ERROR,
      exception.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  } else if (exception?.type === 'entity.parse.failed') {
    // JSON 파싱 실패
    error = new ApiError(RESULT_CODES.INVALID_JSON);
  } else if (exception?.type === 'entity.too.large') {
    // payload 크기 초과
    error = new ApiError(RESULT_CODES.PAYLOAD_TOO_LARGE);
  } else if (
    // 잠금 대기 초과와 교착 상태는 잠시 후 재시도할 수 있는 일시적 DB 오류로 처리한다.
    exception instanceof DatabaseError &&
    ['ER_LOCK_WAIT_TIMEOUT', 'ER_LOCK_DEADLOCK'].includes(exception.parent?.code)
  ) {
    error = new ApiError(RESULT_CODES.DATABASE_BUSY);
    response.setHeader('Retry-After', '1');
  }

  // 예상하지 못한 서버 오류만 error 레벨로 기록해 운영 로그의 불필요한 소음을 줄인다.
  if (error.result.httpStatus === 500) {
    logger.error('요청 처리 실패', {
      request_id: request.requestId,
      error: exception instanceof Error ? exception.message : String(exception),
    });
  }

  return sendError(response, error.result, error.details);
}

module.exports = { ApiError, errorHandler };

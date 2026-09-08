const { DatabaseError, UniqueConstraintError } = require('sequelize');
const { ZodError } = require('zod');
const logger = require('../utils/logger');

class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function errorHandler(exception, request, response, _next) {
  let error =
    exception instanceof ApiError
      ? exception
      : new ApiError(500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');

  if (exception instanceof ZodError) {
    error = new ApiError(
      400,
      'VALIDATION_ERROR',
      '입력값을 확인해주세요.',
      exception.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  } else if (exception?.type === 'entity.parse.failed') {
    error = new ApiError(400, 'INVALID_JSON', '요청 본문을 확인해주세요.');
  } else if (exception?.type === 'entity.too.large') {
    error = new ApiError(413, 'PAYLOAD_TOO_LARGE', '요청 본문을 확인해주세요.');
  } else if (exception instanceof UniqueConstraintError) {
    error = new ApiError(409, 'DUPLICATE_FOOD_CODE', '이미 등록된 식품코드입니다.');
  } else if (
    exception instanceof DatabaseError &&
    ['ER_LOCK_WAIT_TIMEOUT', 'ER_LOCK_DEADLOCK'].includes(exception.parent?.code)
  ) {
    error = new ApiError(503, 'DATABASE_BUSY', '잠시 후 다시 시도해주세요.');
    response.setHeader('Retry-After', '1');
  }

  if (error.status === 500)
    logger.error('요청 처리 실패', {
      request_id: request.requestId,
      error: exception instanceof Error ? exception.message : String(exception),
    });
  response.status(error.status).json({
    error: { code: error.code, message: error.message, details: error.details },
    request_id: request.requestId,
  });
}

module.exports = { ApiError, errorHandler };

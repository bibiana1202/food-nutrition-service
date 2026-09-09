const { DatabaseError, UniqueConstraintError } = require('sequelize');
const { ZodError } = require('zod');
const RESULT_CODES = require('../constants/resultCodes');
const logger = require('../utils/logger');
const { sendError } = require('../utils/responseFormatter');

class ApiError extends Error {
  constructor(result, details = []) {
    super(result.message);
    this.result = result;
    this.details = details;
  }
}

function errorHandler(exception, request, response, _next) {
  let error = exception instanceof ApiError ? exception : new ApiError(RESULT_CODES.INTERNAL_ERROR);

  if (exception instanceof ZodError) {
    error = new ApiError(
      RESULT_CODES.VALIDATION_ERROR,
      exception.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  } else if (exception?.type === 'entity.parse.failed') {
    error = new ApiError(RESULT_CODES.INVALID_JSON);
  } else if (exception?.type === 'entity.too.large') {
    error = new ApiError(RESULT_CODES.PAYLOAD_TOO_LARGE);
  } else if (exception instanceof UniqueConstraintError) {
    error = new ApiError(RESULT_CODES.DUPLICATE_FOOD_CODE);
  } else if (
    exception instanceof DatabaseError &&
    ['ER_LOCK_WAIT_TIMEOUT', 'ER_LOCK_DEADLOCK'].includes(exception.parent?.code)
  ) {
    error = new ApiError(RESULT_CODES.DATABASE_BUSY);
    response.setHeader('Retry-After', '1');
  }

  if (error.result.httpStatus === 500) {
    logger.error('요청 처리 실패', {
      request_id: request.requestId,
      error: exception instanceof Error ? exception.message : String(exception),
    });
  }

  return sendError(response, error.result, error.details);
}

module.exports = { ApiError, errorHandler };

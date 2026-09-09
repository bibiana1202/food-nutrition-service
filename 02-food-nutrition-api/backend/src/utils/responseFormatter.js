const RESULT_CODES = require('../constants/resultCodes');

/**
 * 성공 응답을 공통 형식으로 반환한다.
 */
function sendSuccess(res, result = RESULT_CODES.REQUEST_SUCCESS, data = null) {
  return res.status(result.httpStatus).json({
    success: true,
    code: result.code,
    message: result.message,
    data,
    request_id: res.req.requestId,
  });
}

/**
 * 오류 응답을 공통 형식으로 반환한다.
 */
function sendError(res, result = RESULT_CODES.INTERNAL_ERROR, details = []) {
  return res.status(result.httpStatus).json({
    success: false,
    code: result.code,
    message: result.message,
    details,
    request_id: res.req.requestId,
  });
}

/**
 * 응답 본문이 없는 성공 결과를 반환한다.
 */
function sendNoContent(res) {
  return res.status(204).end();
}

module.exports = { sendError, sendNoContent, sendSuccess };

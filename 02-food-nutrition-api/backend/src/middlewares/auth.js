const { createHash, timingSafeEqual } = require('node:crypto');
const RESULT_CODES = require('../constants/resultCodes');
const { ApiError } = require('./errorHandler');

/**
 * 관리자 API에 Bearer 인증을 적용한다.
 * 서버에 주입된 관리자 키와 요청 헤더의 키를 해시한 뒤 일정한 시간으로 비교한다.
 *
 * @param {string | undefined} adminKey 서버에 설정된 관리자 키
 * @returns {import('express').RequestHandler} Express 인증 미들웨어
 */
function requireAdmin(adminKey) {
  return (req, _res, next) => {
    // 운영 설정에 관리자 키가 없으면 쓰기 요청을 허용하지 않는다.
    if (!adminKey) return next(new ApiError(RESULT_CODES.ADMIN_KEY_NOT_CONFIGURED));

    const authorization = req.headers.authorization || '';
    const received = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    // 같은 길이의 SHA-256 digest를 비교해 키 길이 차이와 비교 시간 노출을 줄인다.
    const digest = (value) => createHash('sha256').update(value).digest();
    if (!received || !timingSafeEqual(digest(received), digest(adminKey)))
      return next(new ApiError(RESULT_CODES.ADMIN_AUTH_REQUIRED));

    next();
  };
}

module.exports = { requireAdmin };

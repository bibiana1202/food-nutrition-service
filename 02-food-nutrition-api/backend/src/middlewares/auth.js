const { createHash, timingSafeEqual } = require('node:crypto');
const { ApiError } = require('./errorHandler');

function requireAdmin(adminKey) {
  return (req, _res, next) => {
    if (!adminKey)
      return next(
        new ApiError(503, 'UNAVAILABLE', '관리자 키가 설정되지 않아 읽기 전용으로 운영 중입니다.'),
      );
    const authorization = req.headers.authorization || '';
    const received = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const digest = (value) => createHash('sha256').update(value).digest();
    if (!received || !timingSafeEqual(digest(received), digest(adminKey)))
      return next(new ApiError(401, 'UNAUTHORIZED', '관리자 인증이 필요합니다.'));
    next();
  };
}

module.exports = { requireAdmin };

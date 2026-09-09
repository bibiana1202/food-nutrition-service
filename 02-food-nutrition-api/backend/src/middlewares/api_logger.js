const { randomUUID } = require('node:crypto');
const logger = require('../utils/logger');

/**
 * 각 HTTP 요청에 추적 ID를 부여하고 처리 결과를 구조화된 로그로 남긴다.
 *
 * @param {boolean} enabled 요청 완료 로그 기록 여부
 * @returns {import('express').RequestHandler} Express 미들웨어
 */
module.exports = function apiLogger(enabled = true) {
  return (req, res, next) => {
    // 클라이언트와 서버 로그에서 동일한 요청을 찾을 수 있도록 응답 헤더에도 ID를 전달한다.
    req.requestId = randomUUID();
    res.setHeader('X-Request-ID', req.requestId);

    const startedAt = performance.now();

    // finish 이벤트는 응답 전송이 끝난 시점이므로 최종 상태 코드와 처리 시간을 기록할 수 있다.
    if (enabled)
      res.on('finish', () =>
        logger.info('HTTP 요청', {
          request_id: req.requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration_ms: Math.round(performance.now() - startedAt),
        }),
      );

    next();
  };
};

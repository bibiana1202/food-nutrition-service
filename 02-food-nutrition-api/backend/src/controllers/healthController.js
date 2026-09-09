const RESULT_CODES = require('../constants/resultCodes');
const { Food } = require('../models');
const logger = require('../utils/logger');
const { sendError, sendSuccess } = require('../utils/responseFormatter');

class HealthController {
  /**
   * 프로세스 생존 상태 확인
   * GET /health/live
   *
   * 애플리케이션 프로세스가 HTTP 요청에 응답할 수 있는지 확인한다.
   */
  static async live(_req, res) {
    return sendSuccess(res, RESULT_CODES.HEALTH_LIVE, { status: 'ok' });
  }

  /**
   * 서비스 준비 상태 확인
   * GET /health/ready
   *
   * MariaDB에 실제 조회를 실행해 API가 요청을 처리할 준비가 되었는지 확인한다.
   */
  static async ready(_req, res) {
    try {
      await Food.findOne({ attributes: ['id'], raw: true });
      return sendSuccess(res, RESULT_CODES.HEALTH_READY, { status: 'ok', database: 'ok' });
    } catch (error) {
      logger.error('MariaDB 준비 상태 확인 실패', { error: error.message });
      return sendError(res, RESULT_CODES.DATABASE_UNAVAILABLE);
    }
  }
}

module.exports = HealthController;

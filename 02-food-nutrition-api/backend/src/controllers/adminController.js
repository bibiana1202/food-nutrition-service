const RESULT_CODES = require('../constants/resultCodes');
const { sendSuccess } = require('../utils/responseFormatter');

class AdminController {
  /**
   * 관리자 키 확인
   * POST /api/admin/verify
   *
   * 라우트의 관리자 인증 미들웨어를 통과했다면 유효한 키로 판단한다.
   */
  static async verify(_req, res) {
    return sendSuccess(res, RESULT_CODES.ADMIN_VERIFIED, { authenticated: true });
  }
}

module.exports = AdminController;

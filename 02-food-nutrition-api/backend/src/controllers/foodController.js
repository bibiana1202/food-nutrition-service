const RESULT_CODES = require('../constants/resultCodes');
const FoodService = require('../services/FoodService');
const { sendNoContent, sendSuccess } = require('../utils/responseFormatter');
const { foodCreateSchema, foodPatchSchema, idSchema, searchSchema } = require('../utils/validator');

class FoodController {
  /**
   * 식품 목록 조회 및 검색
   * GET /api/foods
   *
   * 쿼리 문자열을 검증한 뒤 검색 조건과 페이지 정보를 서비스 계층에 전달한다.
   */
  static async listFoods(req, res) {
    const search = searchSchema.parse(req.query);
    const result = await FoodService.list(search);
    return sendSuccess(res, RESULT_CODES.FOOD_LIST_SUCCESS, result);
  }

  /**
   * 식품 상세 조회
   * GET /api/foods/:id
   *
   * 경로의 ID를 양의 정수로 검증하고 해당 식품을 조회한다.
   */
  static async getFood(req, res) {
    const id = idSchema.parse(req.params.id);
    const food = await FoodService.get(id);
    return sendSuccess(res, RESULT_CODES.FOOD_GET_SUCCESS, food);
  }

  /**
   * 식품 등록
   * POST /api/foods
   *
   * 관리자 인증을 통과한 요청 본문을 검증하고 새로운 식품을 등록한다.
   */
  static async createFood(req, res) {
    const input = foodCreateSchema.parse(req.body);
    const food = await FoodService.create(input);
    res.location(`/api/foods/${food.id}`);
    return sendSuccess(res, RESULT_CODES.FOOD_CREATED, food);
  }

  /**
   * 식품 정보 부분 수정
   * PATCH /api/foods/:id
   *
   * ID와 변경할 필드를 각각 검증하고 전달된 필드만 수정한다.
   */
  static async updateFood(req, res) {
    const id = idSchema.parse(req.params.id);
    const input = foodPatchSchema.parse(req.body);
    const food = await FoodService.update(id, input);
    return sendSuccess(res, RESULT_CODES.FOOD_UPDATED, food);
  }

  /**
   * 식품 삭제
   * DELETE /api/foods/:id
   *
   * 관리자 인증을 통과한 요청의 식품을 삭제하고 본문 없는 204 응답을 반환한다.
   */
  static async deleteFood(req, res) {
    const id = idSchema.parse(req.params.id);
    await FoodService.remove(id);
    return sendNoContent(res);
  }
}

module.exports = FoodController;

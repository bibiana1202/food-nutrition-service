const express = require('express');
const FoodController = require('../../controllers/foodController');
const { requireAdmin } = require('../../middlewares/auth');

const router = express.Router();

// 공개 라우트 -------------------------------------------------------------------------------
// 검색 조건과 커서를 이용한 식품 목록 조회
router.get('/', FoodController.listFoods);
// 식품 ID를 이용한 상세 조회
router.get('/:id', FoodController.getFood);

// 관리자 보호 라우트 -------------------------------------------------------------------------
// 새로운 식품 등록
router.post('/', requireAdmin, FoodController.createFood);
// 기존 식품의 전달된 필드만 수정
router.patch('/:id', requireAdmin, FoodController.updateFood);
// 식품 삭제
router.delete('/:id', requireAdmin, FoodController.deleteFood);

module.exports = router;

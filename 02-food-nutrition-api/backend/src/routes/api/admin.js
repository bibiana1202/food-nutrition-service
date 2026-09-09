const express = require('express');
const AdminController = require('../../controllers/adminController');
const { requireAdmin } = require('../../middlewares/auth');

const router = express.Router();

// 전달한 Bearer 키가 현재 관리자 키와 일치하는지 확인한다.
router.post('/verify', requireAdmin, AdminController.verify);

module.exports = router;

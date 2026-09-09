const express = require('express');
const RESULT_CODES = require('../constants/resultCodes');
const { sendSuccess } = require('../utils/responseFormatter');

const adminRoutes = require('./api/admin');
const foodRoutes = require('./api/food');

const router = express.Router();

// 각 도메인 라우트 마운트 --------------------------------------------------------------------
router.use('/foods', foodRoutes);
router.use('/admin', adminRoutes);

// API 기본 정보 ------------------------------------------------------------------------------
router.get('/', (_req, res) =>
  sendSuccess(res, RESULT_CODES.API_INFO_SUCCESS, {
    name: 'Food Nutrition API',
    version: '1.0.0',
    endpoints: {
      foods: '/api/foods',
      admin: '/api/admin',
      docs: '/api/docs',
      health: '/health',
    },
  }),
);

module.exports = router;

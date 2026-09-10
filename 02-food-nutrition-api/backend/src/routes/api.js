const express = require('express');

const adminRoutes = require('./api/admin');
const foodRoutes = require('./api/food');

const router = express.Router();

// 각 도메인 라우트 마운트 --------------------------------------------------------------------
router.use('/foods', foodRoutes);
router.use('/admin', adminRoutes);

module.exports = router;

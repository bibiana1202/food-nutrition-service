const express = require('express');
const adminController = require('../../controllers/adminController');
const { requireAdmin } = require('../../middlewares/auth');

function createAdminRoutes(adminKey) {
  const router = express.Router();
  router.post('/verify', requireAdmin(adminKey), adminController.verify);
  return router;
}

module.exports = createAdminRoutes;

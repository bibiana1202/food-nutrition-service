const express = require('express');
const createFoodRoutes = require('./api/food');
const createAdminRoutes = require('./api/admin');

function createApiRoutes(adminKey) {
  const router = express.Router();
  router.use('/foods', createFoodRoutes(adminKey));
  router.use('/admin', createAdminRoutes(adminKey));
  return router;
}

module.exports = createApiRoutes;

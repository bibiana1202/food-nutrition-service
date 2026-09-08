const express = require('express');
const foodController = require('../../controllers/foodController');
const { requireAdmin } = require('../../middlewares/auth');

function createFoodRoutes(adminKey) {
  const router = express.Router();
  const admin = requireAdmin(adminKey);
  router.get('/', foodController.listFoods);
  router.get('/:id', foodController.getFood);
  router.post('/', admin, foodController.createFood);
  router.patch('/:id', admin, foodController.updateFood);
  router.delete('/:id', admin, foodController.deleteFood);
  return router;
}

module.exports = createFoodRoutes;

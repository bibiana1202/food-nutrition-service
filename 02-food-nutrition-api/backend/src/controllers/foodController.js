const FoodService = require('../services/FoodService');
const { foodCreateSchema, foodPatchSchema, idSchema, searchSchema } = require('../utils/validator');

exports.listFoods = async (req, res) => {
  res.json(await FoodService.list(searchSchema.parse(req.query)));
};

exports.getFood = async (req, res) => {
  res.json(await FoodService.get(idSchema.parse(req.params.id)));
};

exports.createFood = async (req, res) => {
  const food = await FoodService.create(foodCreateSchema.parse(req.body));
  res.location(`/api/foods/${food.id}`).status(201).json(food);
};

exports.updateFood = async (req, res) => {
  const food = await FoodService.update(
    idSchema.parse(req.params.id),
    foodPatchSchema.parse(req.body),
  );
  res.json(food);
};

exports.deleteFood = async (req, res) => {
  await FoodService.remove(idSchema.parse(req.params.id));
  res.status(204).end();
};

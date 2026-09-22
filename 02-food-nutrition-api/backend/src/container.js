// 구체적인 저장소 선택과 서비스 조립은 이 파일에서만 수행한다.
const SequelizeFoodRepository = require('./repositories/SequelizeFoodRepository');
const FoodService = require('./services/FoodService');
const { ImportService } = require('./services/ImportService');
const repository = new SequelizeFoodRepository();
const foodService = new FoodService(repository);
const importService = new ImportService(repository);
module.exports = { foodService, importFoods: importService.importFoods.bind(importService) };

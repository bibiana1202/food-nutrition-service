const { DataTypes } = require('sequelize');

const nutrients = [
  'serving_size',
  'calorie',
  'carbohydrate',
  'protein',
  'fat',
  'sugars',
  'sodium',
  'cholesterol',
  'saturated_fatty_acids',
  'trans_fat',
];

module.exports = {
  async up({ context: queryInterface }) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) =>
      typeof table === 'string' ? table : table.tableName || Object.values(table)[0],
    );
    if (tableNames.some((table) => String(table).toLowerCase() === 'foods')) return;
    await queryInterface.createTable(
      'foods',
      {
        id: {
          type: DataTypes.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        food_cd: { type: DataTypes.STRING(64), allowNull: false, unique: true },
        food_name: { type: DataTypes.STRING(300), allowNull: false },
        group_name: { type: DataTypes.STRING(300), allowNull: true },
        research_year: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
        maker_name: { type: DataTypes.STRING(300), allowNull: true },
        ref_name: { type: DataTypes.TEXT, allowNull: true },
        source_notes: { type: DataTypes.TEXT, allowNull: true },
        serving_unit: { type: DataTypes.STRING(2), allowNull: true },
        ...Object.fromEntries(
          nutrients.map((field) => [field, { type: DataTypes.DOUBLE, allowNull: true }]),
        ),
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci', engine: 'InnoDB' },
    );
    await queryInterface.addIndex('foods', ['research_year', 'id'], { name: 'idx_foods_year_id' });
  },
  async down({ context: queryInterface }) {
    await queryInterface.dropTable('foods');
  },
};

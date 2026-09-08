const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const nutrientColumns = [
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

const Food = sequelize.define(
  'Food',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    food_cd: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    food_name: { type: DataTypes.STRING(300), allowNull: false },
    group_name: { type: DataTypes.STRING(300), allowNull: true },
    research_year: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    maker_name: { type: DataTypes.STRING(300), allowNull: true },
    ref_name: { type: DataTypes.TEXT, allowNull: true },
    source_notes: { type: DataTypes.TEXT, allowNull: true },
    serving_unit: { type: DataTypes.STRING(2), allowNull: true },
    ...Object.fromEntries(
      nutrientColumns.map((field) => [field, { type: DataTypes.DOUBLE, allowNull: true }]),
    ),
  },
  { tableName: 'foods' },
);

module.exports = Food;

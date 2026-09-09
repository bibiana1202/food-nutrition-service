const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * 식품 기본 정보와 1회 제공량 기준 영양성분을 저장하는 모델이다.
 * 운영 스키마 생성과 변경은 migration이 담당하며, 이 정의는 애플리케이션의 조회와 저장에 사용한다.
 */
const Food = sequelize.define(
  'Food',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
      comment: '식품 내부 식별자',
    },
    food_cd: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: '원본 데이터의 식품코드',
    },
    food_name: {
      type: DataTypes.STRING(300),
      allowNull: false,
      comment: '식품명',
    },
    group_name: {
      type: DataTypes.STRING(300),
      allowNull: true,
      comment: '식품 대분류',
    },
    research_year: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: true,
      comment: '영양성분 조사 연도',
    },
    maker_name: {
      type: DataTypes.STRING(300),
      allowNull: true,
      comment: '지역 또는 제조사',
    },
    ref_name: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '영양성분 자료 출처',
    },
    source_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '수치로 변환하지 않은 원본 표현',
    },
    serving_unit: {
      type: DataTypes.STRING(2),
      allowNull: true,
      comment: '1회 제공량 단위(g 또는 mL)',
    },
    serving_size: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: '1회 제공량',
    },
    calorie: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: '열량(kcal)',
    },
    carbohydrate: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: '탄수화물(g)',
    },
    protein: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: '단백질(g)',
    },
    fat: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: '지방(g)',
    },
    sugars: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: '당류(g)',
    },
    sodium: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: '나트륨(mg)',
    },
    cholesterol: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: '콜레스테롤(mg)',
    },
    saturated_fatty_acids: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: '포화지방산(g)',
    },
    trans_fat: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: '트랜스지방(g)',
    },
  },
  {
    tableName: 'foods',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    comment: '식품 영양성분 정보',
    indexes: [
      {
        name: 'idx_foods_year_id',
        fields: ['research_year', 'id'],
      },
    ],
  },
);

module.exports = Food;

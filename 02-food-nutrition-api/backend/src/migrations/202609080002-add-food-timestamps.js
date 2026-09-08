const { DataTypes, Sequelize } = require('sequelize');

module.exports = {
  async up({ context: queryInterface }) {
    const columns = await queryInterface.describeTable('foods');

    if (!columns.created_at) {
      await queryInterface.addColumn('foods', 'created_at', {
        type: DataTypes.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
      });
    }

    if (!columns.updated_at) {
      await queryInterface.addColumn('foods', 'updated_at', {
        type: DataTypes.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
      });
    }
  },

  async down({ context: queryInterface }) {
    const columns = await queryInterface.describeTable('foods');

    if (columns.updated_at) await queryInterface.removeColumn('foods', 'updated_at');
    if (columns.created_at) await queryInterface.removeColumn('foods', 'created_at');
  },
};

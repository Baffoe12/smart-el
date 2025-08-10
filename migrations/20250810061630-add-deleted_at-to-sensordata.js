module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('SensorData', 'deleted_at', {
      type: Sequelize.DATE,
      field: 'deleted_at',
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('SensorData', 'deleted_at');
  }
};
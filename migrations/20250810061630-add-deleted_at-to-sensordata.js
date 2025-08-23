module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sensor_data', 'deleted_at', {
      type: Sequelize.DATE,
      field: 'deleted_at',
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sensor_data', 'deleted_at');
  }
};

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('SensorData', 'energy_kwh', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0.0
    });
    
    await queryInterface.addColumn('SensorData', 'cost_ghs', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0.0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('SensorData', 'energy_kwh');
    await queryInterface.removeColumn('SensorData', 'cost_ghs');
  }
};

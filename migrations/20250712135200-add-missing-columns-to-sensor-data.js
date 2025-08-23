'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sensor_data', 'energy_kwh', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0.0
    });

    await queryInterface.addColumn('sensor_data', 'cost_ghs', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0.0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sensor_data', 'energy_kwh');
    await queryInterface.removeColumn('sensor_data', 'cost_ghs');
  }
};
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('sensor_data');

    if (!tableInfo.energy_kwh) {
      await queryInterface.addColumn('sensor_data', 'energy_kwh', {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      });
    }

    if (!tableInfo.cost_ghs) {
      await queryInterface.addColumn('sensor_data', 'cost_ghs', {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('sensor_data');

    if (tableInfo.cost_ghs) {
      await queryInterface.removeColumn('sensor_data', 'cost_ghs');
    }

    if (tableInfo.energy_kwh) {
      await queryInterface.removeColumn('sensor_data', 'energy_kwh');
    }
  }
};
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('sensor_data');

    if (tableInfo.deleted_at) {
      console.log('Column `deleted_at` already exists. Skipping.');
      return;
    }

    console.log('Adding `deleted_at` column to `sensor_data`');
    await queryInterface.addColumn('sensor_data', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('sensor_data');

    if (tableInfo.deleted_at) {
      console.log('Removing `deleted_at` column from `sensor_data`');
      await queryInterface.removeColumn('sensor_data', 'deleted_at');
    }
  }
};
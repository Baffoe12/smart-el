// migrations/20250712136000-add-device-id-to-devices.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('devices');

    if (!tableInfo.deviceId) {
      await queryInterface.addColumn('devices', 'deviceId', {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true // So it can be referenced
      });

      // Optional: Create index
      await queryInterface.addIndex('devices', ['deviceId']);
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('devices');
    if (tableInfo.deviceId) {
      await queryInterface.removeColumn('devices', 'deviceId');
    }
  }
};